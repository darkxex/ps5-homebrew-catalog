import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from catalog import draft as draft_module
from catalog.draft import draft_record, license_section, parse_repo

from helpers import record, write_record

PARAM = {"titleId": "PPSA07777", "contentId": "UP9000-PPSA07777_00-EXAMPLE000000001",
         "contentVersion": "01.000.000",
         "localizedParameters": {"defaultLanguage": "en-US", "en-US": {"titleName": "Example Port"}}}
PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR" + (512).to_bytes(4, "big") * 2


class FakeGitHub:
    def __init__(self, license_id=None, assets=None, paths=None, param=PARAM, readme=""):
        self.license_id = license_id
        self.assets = assets if assets is not None else [
            {"name": "Example-v1.2.0.zip", "size": 1000, "digest": "sha256:" + "d" * 64}]
        self.paths = paths if paths is not None else ["README.md", "sce_sys/param.json", "sce_sys/icon0.png"]
        self.param = param
        self.readme = readme

    def repo(self, owner, name):
        return {"full_name": "Dev/Example", "private": False, "archived": False, "fork": False,
                "license": {"spdx_id": self.license_id} if self.license_id else None}

    def releases(self, owner, name):
        return [{"tag_name": "v1.2.0", "prerelease": True, "draft": False, "assets": self.assets,
                 "published_at": "2026-09-01T00:00:00Z"}]

    def release_by_tag(self, owner, name, tag):
        return self.releases(owner, name)[0]

    def tree(self, owner, name, ref):
        return self.paths

    def file_text(self, owner, name, path, ref):
        return json.dumps(self.param) if path.endswith("param.json") else self.readme

    def user(self, login):
        return {"name": "Dev Person"}


class BranchGitHub(FakeGitHub):
    """The default branch holds the app in kit/sce_sys (beside a sample and a stale root copy); the release tag holds nothing."""
    BRANCH = ["README.md", "kit/examples/demo/sce_sys/param.json", "kit/sce_sys/param.json", "kit/sce_sys/icon0.png",
              "sce_sys/param.json"]

    def repo(self, owner, name):
        return dict(super().repo(owner, name), default_branch="main")

    def branch_sha(self, owner, name, branch):
        return "a" * 40

    def tree(self, owner, name, ref):
        return self.BRANCH if ref == "a" * 40 else ["README.md"]


class DraftTests(unittest.TestCase):
    def test_default_branch_comes_first_and_the_param_json_with_an_icon_wins(self):
        result = draft_record("Dev/Example", BranchGitHub(), self.apps)
        self.assertEqual(result.blockers, [])
        self.assertEqual(result.param_path, "kit/sce_sys/param.json")
        self.assertEqual(result.record["icon_url"],
                         "https://raw.githubusercontent.com/Dev/Example/" + "a" * 40 + "/kit/sce_sys/icon0.png")

    def test_tag_is_used_when_the_default_branch_has_no_param_json(self):
        class OnlyTag(BranchGitHub):
            def tree(self, owner, name, ref):
                return ["README.md"] if ref == "a" * 40 else ["sce_sys/param.json", "sce_sys/icon0.png"]
        result = draft_record("Dev/Example", OnlyTag(), self.apps)
        self.assertEqual(result.param_path, "sce_sys/param.json")
        self.assertIn("/v1.2.0/sce_sys/icon0.png", result.record["icon_url"])

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.apps = Path(self.tmp.name) / "apps"
        write_record(self.apps, record())
        patcher = mock.patch.object(draft_module.artifacts, "fetch_small", lambda url, limit: PNG)
        patcher.start()
        self.addCleanup(patcher.stop)
        zipped = mock.patch.object(draft_module.artifacts, "read_zip_member", return_value=None)
        self.zip_member = zipped.start()
        self.addCleanup(zipped.stop)

    def tearDown(self):
        self.tmp.cleanup()

    def test_parse_repo(self):
        self.assertEqual(parse_repo("https://github.com/Dev/Example.git"), ("Dev", "Example"))
        self.assertEqual(parse_repo("Dev/Example"), ("Dev", "Example"))
        with self.assertRaises(ValueError):
            parse_repo("Example")

    def test_facts_are_drafted_and_judgment_left_open(self):
        result = draft_record("Dev/Example", FakeGitHub(license_id="MIT"), self.apps)
        self.assertEqual(result.blockers, [])
        r = result.record
        self.assertEqual((r["titleid"], r["name"], r["version"], r["license"]), ("PPSA07777", "Example Port", "1.2.0", "MIT"))
        self.assertEqual(r["artifact_url"], "https://github.com/Dev/Example/releases/download/v1.2.0/Example-v1.2.0.zip")
        self.assertEqual(r["sha256"], "d" * 64)
        self.assertEqual(r["icon_url"], "https://raw.githubusercontent.com/Dev/Example/v1.2.0/sce_sys/icon0.png")
        self.assertEqual(r["author"], "Dev Person")
        self.assertEqual((r["kind"], r["description"]), ("", ""))

    def test_missing_license_is_a_todo(self):
        result = draft_record("Dev/Example", FakeGitHub(), self.apps)
        self.assertEqual(result.record["license"], "Unlicensed")
        self.assertTrue(any("no license" in item for item in result.todo))

    def test_blockers(self):
        cases = {
            "no sce_sys/param.json": FakeGitHub(paths=["README.md"]),
            "not a PS5 (PPSA) title ID": FakeGitHub(param=dict(PARAM, titleId="CUSA01234")),
            "no .zip, .ffpkg or .ffpfsc": FakeGitHub(assets=[{"name": "x.elf", "digest": "sha256:" + "d" * 64}]),
            "no digest": FakeGitHub(assets=[{"name": "x.zip"}]),
        }
        for expected, github in cases.items():
            with self.subTest(expected=expected):
                self.assertTrue(any(expected in b for b in draft_record("Dev/Example", github, self.apps).blockers))

    def test_param_json_is_read_from_the_release_zip_when_the_repository_has_none(self):
        self.zip_member.return_value = ("Example/sce_sys/param.json", json.dumps(PARAM).encode())
        result = draft_record("Dev/Example", FakeGitHub(paths=["README.md"]), self.apps)
        self.assertEqual(result.blockers, [])
        self.assertEqual((result.record["titleid"], result.record["name"]), ("PPSA07777", "Example Port"))
        self.assertEqual(result.param_path, "Example-v1.2.0.zip:Example/sce_sys/param.json")
        self.assertTrue(any("read from inside" in item for item in result.todo))

    def test_icon_is_read_from_the_zip_folder_that_holds_the_param_json(self):
        icon = PNG + b"\x00" * 20

        def zip_member(url, suffix, limit):
            members = {"sce_sys/param.json": ("Example/sce_sys/param.json", json.dumps(PARAM).encode()),
                       "Example/sce_sys/icon0.png": ("Example/sce_sys/icon0.png", icon)}
            return members.get(suffix)
        self.zip_member.side_effect = zip_member
        result = draft_record("Dev/Example", FakeGitHub(paths=["README.md"]), self.apps)
        self.assertEqual(result.blockers, [])
        self.assertIsNone(result.record["icon_url"])
        self.assertEqual(result.record["icon_member"], "Example/sce_sys/icon0.png")
        self.assertTrue(any("inside Example-v1.2.0.zip" in fact for fact in result.facts))

    def test_no_icon_in_the_zip_folder_is_a_todo(self):
        self.zip_member.side_effect = lambda url, suffix, limit: (
            ("Example/sce_sys/param.json", json.dumps(PARAM).encode()) if suffix == "sce_sys/param.json" else None)
        result = draft_record("Dev/Example", FakeGitHub(paths=["README.md"]), self.apps)
        self.assertEqual(result.record["icon_url"], "")
        self.assertNotIn("icon_member", result.record)
        self.assertTrue(any("no usable icon at Example/sce_sys/icon0.png" in item for item in result.todo))

    def test_title_id_of_another_app_is_saved_under_the_owner_suffix(self):
        github = FakeGitHub(param=dict(PARAM, titleId="PPSA01234"))
        result = draft_record("Dev/Example", github, self.apps)
        self.assertEqual(result.blockers, [])
        self.assertTrue(any("apps/PPSA01234-dev.json" in item for item in result.todo))

    def test_already_listed_repository_blocks(self):
        write_record(self.apps, record(titleid="PPSA04321", name="Other", sha256="b" * 64,
                                       source_repo="https://github.com/Dev/Example",
                                       artifact_url="https://github.com/Dev/Example/releases/download/01.000.000/x.zip"))
        github = FakeGitHub(param=dict(PARAM, titleId="PPSA09999"))
        self.assertTrue(any("already listed" in b for b in draft_record("Dev/Example", github, self.apps).blockers))

    def test_license_section(self):
        readme = "# App\nintro\n## License and terms\nCode is **MIT**.\n\nMore.\n## Next\nno"
        self.assertEqual(license_section(readme), "Code is **MIT**. More.")
        self.assertEqual(license_section("# App\nno license heading"), "")


if __name__ == "__main__":
    unittest.main()
