import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from catalog import artifacts
from catalog.facts import Facts, cached, content_version_key, find_content_version, lookup, prune, update_note
from catalog.github import GitHubError
from catalog.records import Record

from helpers import record, reservation

DATA = record(
    titleid="PPSA01234", version="0.6.0",
    artifact_url="https://github.com/example/example-app/releases/download/v0.6.0/PPSA01234.zip",
    icon_url="https://raw.githubusercontent.com/example/example-app/v0.6.0/app/sce_sys/icon0.png",
)


def param(titleid="PPSA01234", version="01.000.020"):
    return json.dumps({"titleId": titleid, "contentVersion": version})


class FakeGitHub:
    def __init__(self, files=None, fail=False):
        self.files = files or {}
        self.fail = fail
        self.calls = 0
        self.body = None
        self.downloads = None
        self.earlier = []           # download counts of the same file in older releases (tags v0.5.0, v0.4.0, ...)
        self.releases_fail = False

    def all_releases(self, owner, name, max_pages=10):
        if self.releases_fail:
            raise GitHubError("GitHub API rate limit reached")
        older = [{"tag_name": f"v0.{5 - i}.0", "assets": [{"name": "PPSA01234.zip", "download_count": n}]}
                 for i, n in enumerate(self.earlier)]
        return [{"tag_name": "v0.6.0", "assets": [{"name": "PPSA01234.zip", "download_count": self.downloads},
                                                  {"name": "other.zip", "download_count": 99}]}] + older

    def release_by_tag(self, owner, name, tag):
        self.calls += 1
        if self.fail:
            raise GitHubError("GitHub API rate limit reached")
        return {"published_at": "2026-09-01T10:00:00Z", "prerelease": True, "body": self.body,
                "assets": [{"name": "PPSA01234.zip", "size": 4096, "download_count": self.downloads},
                           {"name": "other.zip", "size": 1, "download_count": 99}]}

    def tree(self, owner, name, ref):
        return list(self.files)

    def file_text(self, owner, name, path, ref):
        return self.files.get(path)


def no_download(url, limit):
    raise artifacts.DownloadError("not found")


class ContentVersionTests(unittest.TestCase):
    def setUp(self):
        self.record = Record(Path("apps/PPSA01234.json"), DATA)
        patcher = mock.patch.object(artifacts, "read_zip_member", return_value=None)
        self.zip_member = patcher.start()
        self.addCleanup(patcher.stop)

    def test_falls_back_to_the_release_zip_when_the_repository_has_none(self):
        self.zip_member.return_value = ("PPSA01234/sce_sys/param.json", param(version="01.000.033").encode())
        self.assertEqual(find_content_version(self.record, FakeGitHub(), fetch=no_download),
                         ("01.000.033", "release:PPSA01234/sce_sys/param.json"))
        self.assertEqual(self.zip_member.call_args.args[:2], (DATA["artifact_url"], "sce_sys/param.json"))

    def test_the_release_zip_must_hold_this_titles_param_json(self):
        self.zip_member.return_value = ("sce_sys/param.json", param("PPSA09999").encode())
        self.assertEqual(find_content_version(self.record, FakeGitHub(), fetch=no_download), (None, None))
        self.zip_member.side_effect = artifacts.DownloadError("no ranges")
        self.assertEqual(find_content_version(self.record, FakeGitHub(), fetch=no_download), (None, None))

    def test_read_next_to_the_icon_without_an_api_request(self):
        github = FakeGitHub()
        fetched = []
        found = find_content_version(self.record, github, fetch=lambda url, limit: fetched.append(url) or param().encode())
        self.assertEqual(found, ("01.000.020", "app/sce_sys/param.json"))
        self.assertEqual(fetched, ["https://raw.githubusercontent.com/example/example-app/v0.6.0/app/sce_sys/param.json"])

    def test_an_icon_on_a_branch_still_reads_the_param_json_at_the_tag(self):
        data = dict(DATA, icon_url="https://raw.githubusercontent.com/example/example-app/master/app/sce_sys/icon0.png")
        fetched = []
        found = find_content_version(Record(self.record.path, data), FakeGitHub(),
                                     fetch=lambda url, limit: fetched.append(url) or param().encode())
        self.assertEqual(found, ("01.000.020", "app/sce_sys/param.json"))
        self.assertEqual(fetched, ["https://raw.githubusercontent.com/example/example-app/v0.6.0/app/sce_sys/param.json"])

    def test_falls_back_to_the_tree_and_skips_other_titles(self):
        github = FakeGitHub({"vendor/sample/sce_sys/param.json": param("PPSA09999", "01.000.900"),
                             "ps5/sce_sys/param.json": param(version="01.000.021"), "README.md": "x"})
        self.assertEqual(find_content_version(self.record, github, fetch=no_download),
                         ("01.000.021", "ps5/sce_sys/param.json"))

    def test_malformed_or_missing_versions_are_unknown(self):
        for files in ({}, {"sce_sys/param.json": param(version="1.0")}, {"sce_sys/param.json": "not json"}):
            self.assertEqual(find_content_version(self.record, FakeGitHub(files), fetch=no_download), (None, None))

    def test_a_version_in_playstation_format_needs_no_param_json(self):
        tagged = Record(self.record.path, dict(DATA, version="01.000.070", artifact_url=DATA["artifact_url"].replace(
            "v0.6.0", "01.000.070")))
        self.assertEqual(find_content_version(tagged, FakeGitHub(), fetch=no_download), ("01.000.070", "version"))

    def test_ordering(self):
        self.assertLess(content_version_key("01.000.009"), content_version_key("01.000.010"))
        self.assertLess(content_version_key("01.999.999"), content_version_key("02.000.000"))
        self.assertIsNone(content_version_key("1.0"))
        self.assertIsNone(content_version_key(None))


class FactsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.cache = Path(self.tmp.name)
        self.record = Record(Path("apps/PPSA01234.json"), DATA)
        self.fetch = lambda url, limit: param().encode()

    def test_lookup(self):
        self.assertEqual(lookup(self.record, FakeGitHub(), self.fetch), Facts(
            size=4096, released="2026-09-01T10:00:00Z", prerelease=True, content_version="01.000.020",
            param_path="app/sce_sys/param.json", downloads_total=True, downloads_zips=True))

    def test_downloads_count_the_zips_of_the_listed_release(self):
        github = FakeGitHub()
        github.downloads = 42
        self.assertEqual(lookup(self.record, github, self.fetch).downloads, 141)      # 42 + 99 (other.zip)
        github.downloads = -1       # not a count
        self.assertIsNone(lookup(self.record, github, self.fetch).downloads)

    def test_downloads_add_up_every_zip_of_every_release(self):
        github = FakeGitHub()
        github.downloads = 5        # the new release has just started counting
        github.earlier = [100, 30]
        self.assertEqual(lookup(self.record, github, self.fetch).downloads, 234)     # 5 + 99 (other.zip) + 100 + 30

    def test_downloads_add_up_zips_whose_name_changes_with_each_release(self):
        github = FakeGitHub()
        github.downloads = 320
        releases = [{"tag_name": "v0.6.0", "assets": [{"name": "PPSA01234.zip", "download_count": 320}]},
                    {"tag_name": "v0.5.0", "assets": [{"name": "PPSA01234-0.5.0.zip", "download_count": 812},
                                                      {"name": "SHA256SUMS", "download_count": 50}]},
                    {"tag_name": "v0.4.0", "assets": [{"name": "PPSA01234-0.4.0.ZIP", "download_count": 1429}]}]
        github.all_releases = lambda owner, name, max_pages=10: releases
        self.assertEqual(lookup(self.record, github, self.fetch).downloads, 2561)    # SHA256SUMS is not a ZIP

    def test_downloads_fall_back_to_the_listed_release_when_the_list_is_unavailable(self):
        github = FakeGitHub()
        github.downloads = 5
        github.earlier = [100]
        github.releases_fail = True
        self.assertEqual(lookup(self.record, github, self.fetch).downloads, 5)

    def test_an_answer_cached_before_downloads_were_read_is_asked_again(self):
        github = FakeGitHub()
        github.downloads = 7
        entry = self.cache / "facts" / ("a" * 64 + ".json")
        entry.parent.mkdir(parents=True)
        entry.write_text(json.dumps({"size": 4096, "released": None, "prerelease": None, "content_version": None,
                                     "param_path": None, "notes": None, "uploader": None,
                                     "icon_url": DATA["icon_url"]}), encoding="utf-8")
        facts, _ = cached(self.record, None, self.cache)       # offline there is nobody to ask: nothing is claimed
        self.assertEqual(facts, Facts())
        facts, _ = cached(self.record, github, self.cache, self.fetch)
        self.assertEqual((facts.downloads, github.calls), (106, 1))   # 7 + 99 (other.zip)

    def test_an_answer_cached_with_one_release_of_downloads_is_asked_again(self):
        github = FakeGitHub()
        github.downloads = 5
        github.earlier = [100]
        entry = self.cache / "facts" / ("a" * 64 + ".json")
        entry.parent.mkdir(parents=True)
        entry.write_text(json.dumps({"size": 4096, "released": None, "prerelease": None, "content_version": None,
                                     "param_path": None, "notes": None, "uploader": None, "downloads": 5,
                                     "icon_url": DATA["icon_url"]}), encoding="utf-8")      # fresh, but one release
        facts, _ = cached(self.record, github, self.cache, self.fetch)
        self.assertEqual((facts.downloads, github.calls), (204, 1))   # 5 + 99 (other.zip) + 100

    def test_cached_by_sha256_and_pruned_when_delisted(self):
        github = FakeGitHub()
        first, problem = cached(self.record, github, self.cache, self.fetch)
        again, _ = cached(self.record, None, self.cache)             # offline: served from the cache
        self.assertEqual((first, problem, again, github.calls), (again, None, first, 1))
        self.assertTrue((self.cache / "facts" / ("a" * 64 + ".json")).is_file())
        prune(self.cache, [])
        self.assertEqual(list((self.cache / "facts").iterdir()), [])

    def test_moved_icon_asks_again(self):
        # The content version is read beside the icon: an answer given for another icon is stale.
        github = FakeGitHub()
        cached(self.record, github, self.cache, self.fetch)
        moved = Record(self.record.path, DATA | {"icon_url": DATA["icon_url"].replace("/v0.6.0/", "/0123abc/")})
        self.assertNotEqual(moved.data["icon_url"], DATA["icon_url"])
        cached(moved, github, self.cache, self.fetch)
        self.assertEqual(github.calls, 2)
        cached(moved, github, self.cache, self.fetch)                # and that answer is kept
        self.assertEqual(github.calls, 2)
        # An entry written before the icon was recorded is asked again too.
        entry = self.cache / "facts" / ("a" * 64 + ".json")
        saved = json.loads(entry.read_text())
        del saved["icon_url"]
        entry.write_text(json.dumps(saved))
        cached(moved, github, self.cache, self.fetch)
        self.assertEqual(github.calls, 3)

    def test_notes_are_asked_again_after_a_day(self):
        import os
        import time
        github = FakeGitHub()
        github.body = "First words."
        entry = self.cache / "facts" / ("a" * 64 + ".json")
        self.assertEqual(cached(self.record, github, self.cache, self.fetch)[0].notes, "First words.")
        github.body = "Edited words."
        self.assertEqual(cached(self.record, github, self.cache, self.fetch)[0].notes, "First words.")   # still fresh
        old = time.time() - 2 * 86400
        os.utime(entry, (old, old))
        self.assertEqual(cached(self.record, None, self.cache)[0].notes, "First words.")                # offline
        self.assertEqual(cached(self.record, github, self.cache, self.fetch)[0].notes, "Edited words.")
        self.assertEqual(github.calls, 2)
        # GitHub can't answer: the older answer keeps serving, without a warning.
        os.utime(entry, (old, old))
        self.assertEqual(cached(self.record, FakeGitHub(fail=True), self.cache, self.fetch),
                         (cached(self.record, None, self.cache)[0], None))
        # An entry written before notes were read is asked again.
        saved = json.loads(entry.read_text())
        del saved["notes"]
        entry.write_text(json.dumps(saved))
        cached(self.record, github, self.cache, self.fetch)
        self.assertEqual(github.calls, 3)

    def test_failed_lookup_is_reported_and_not_cached(self):
        facts, problem = cached(self.record, FakeGitHub(fail=True), self.cache, self.fetch)
        self.assertEqual(facts, Facts())
        self.assertIn("rate limit", problem)
        self.assertFalse((self.cache / "facts").exists())

    def test_offline_and_reservations_have_no_facts(self):
        self.assertEqual(cached(self.record, None, self.cache), (Facts(), None))
        self.assertEqual(cached(Record(Path("apps/PPSA05555.json"), reservation()), FakeGitHub(), self.cache),
                         (Facts(), None))

    def test_update_notes(self):
        note = lambda old, new: update_note(Facts(content_version=old), Facts(content_version=new))
        self.assertIn("`01.000.010` → `01.000.020`", note("01.000.010", "01.000.020"))
        self.assertIn("is still `01.000.000`", note("01.000.000", "01.000.000"))
        self.assertIn("goes down", note("01.000.020", "01.000.010"))
        self.assertIn("No `contentVersion`", note("01.000.020", None))
        self.assertIn("`unknown` → `01.000.020`", note(None, "01.000.020"))


if __name__ == "__main__":
    unittest.main()
