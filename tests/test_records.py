import tempfile
import unittest
from pathlib import Path

from catalog.records import load_catalog, load_record
from catalog.report import Report

from helpers import record, reservation, write_record


class RecordTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.apps = Path(self.tmp.name) / "apps"

    def tearDown(self):
        self.tmp.cleanup()

    def errors(self, data, filename=None):
        report = Report()
        load_record(write_record(self.apps, data, filename), report)
        return [message for level, _, message in report.items if level == "error"]

    def assertRejected(self, data, fragment, filename=None):
        errors = self.errors(data, filename)
        self.assertTrue(any(fragment in e for e in errors), f"{fragment!r} not in {errors}")

    def test_valid_record(self):
        self.assertEqual(self.errors(record()), [])

    def test_license_expression_and_prerelease_version(self):
        self.assertEqual(self.errors(record(
            license="MIT OR Apache-2.0", version="0.2.0-alpha.1",
            artifact_url="https://github.com/example/example-app/releases/download/v0.2.0-alpha.1/PPSA01234.zip")), [])

    def test_artifact_formats(self):
        for extension in (".zip", ".ffpfsc", ".ffpkg"):
            with self.subTest(extension=extension):
                self.assertEqual(self.errors(record(artifact_url=VALID_ARTIFACT.replace(".zip", extension))), [])

    def test_missing_and_extra_fields(self):
        data = record(extra="x")
        del data["sha256"]
        errors = self.errors(data)
        self.assertTrue(any("missing field(s): sha256" in e for e in errors))
        self.assertTrue(any("unexpected field(s): extra" in e for e in errors))

    def test_duplicate_key(self):
        path = self.apps / "PPSA01234.json"
        self.apps.mkdir(parents=True)
        path.write_text('{"titleid": "PPSA01234", "titleid": "PPSA01234"}', encoding="utf-8")
        report = Report()
        load_record(path, report)
        self.assertIn("duplicate JSON key", report.items[0][2])

    def test_filename_must_match(self):
        self.assertRejected(record(), "filename must be PPSA01234.json", filename="PPSA04321.json")

    def test_title_id_format_and_reserved(self):
        self.assertRejected(record(titleid="ppsa01234"), "four uppercase letters")
        self.assertRejected(record(titleid="F4K377031"), "four uppercase letters", filename="F4K377031.json")
        self.assertRejected(record(titleid="NPXS12345"), "must not start with NPXS", filename="NPXS12345.json")
        self.assertRejected(record(titleid="CUSA01234"), "must not start with CUSA", filename="CUSA01234.json")
        self.assertEqual(self.errors(record(titleid="FAKE77031"), "FAKE77031.json"), [])
        self.assertRejected(record(titleid="PPSA99999"), "reserved")

    def test_sha256_format(self):
        self.assertRejected(record(sha256="A" * 64), "sha256 must be")
        self.assertRejected(record(sha256="a" * 63), "sha256 must be")

    def test_long_description_is_cut_to_200(self):
        report = Report()
        loaded = load_record(write_record(self.apps, record(description="a" * 197 + " " + "b" * 50)), report)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.data["description"], "a" * 197 + "...")
        # a word that straddles the limit is dropped whole, not cut in the middle
        words = " ".join(["word"] * 60)
        cut = record(description=words)
        self.assertEqual(self.errors(cut), [])
        long = Report()
        loaded = load_record(write_record(self.apps, record(description="x" * 190 + " R1 tabs and more"), "PPSA01234.json"), long)
        self.assertEqual(loaded.data["description"], "x" * 190 + " R1...")
        self.assertEqual([lvl for lvl, _, _ in report.items], ["warning"])
        self.assertEqual(self.errors(record(description="x" * 5000)), [])

    def test_text_rules(self):
        self.assertRejected(record(name="Evil‮ppa"), "U+202E")
        self.assertRejected(record(description="line\nbreak"), "U+000A")
        self.assertRejected(record(name=" padded"), "whitespace")
        self.assertRejected(record(name="x" * 65), "longer than 64")
        self.assertRejected(record(kind="demo"), "kind must be")
        self.assertRejected(record(category="games"), "category must be")
        self.assertRejected(record(category="Emulators"), "category must be")
        self.assertRejected({k: v for k, v in record().items() if k != "category"}, "category")
        self.assertRejected(record(name=""), "must not be empty")
        self.assertRejected(record(version=5), "must be a string")

    def test_version_is_the_release_tag(self):
        url = "https://github.com/example/example-app/releases/download/{}/PPSA01234.zip"
        self.assertEqual(self.errors(record(version="0.6.0", artifact_url=url.format("v0.6.0"))), [])
        self.assertEqual(self.errors(record(version="v0.6.0", artifact_url=url.format("v0.6.0"))), [])
        self.assertEqual(self.errors(record(version="01.000.005", artifact_url=url.format("01.000.005"))), [])
        self.assertRejected(record(version="0.6.1", artifact_url=url.format("v0.6.0")), "version must match the release tag")
        self.assertRejected(record(version="1.0", artifact_url=url.format("release-1.0")), "'release-1.0'")
        # A leading v is dropped only before a digit: "vk-285" is its own version.
        self.assertEqual(self.errors(record(version="vk-285-112", artifact_url=url.format("vk-285-112"))), [])
        self.assertRejected(record(version="k-285-112", artifact_url=url.format("vk-285-112")), "use 'vk-285-112'")

    def test_url_rules(self):
        self.assertRejected(record(source_repo="http://github.com/example/example-app"), "source_repo")
        self.assertRejected(record(source_repo="https://github.com/example"), "source_repo")
        self.assertRejected(record(artifact_url="https://github.com/other/repo/releases/download/1/a.zip"),
                            "artifact_url")
        self.assertRejected(record(artifact_url="https://github.com/example/example-app/releases/latest/download/a.zip"),
                            "artifact_url")
        self.assertRejected(record(artifact_url="https://github.com/example/example-app/releases/download/latest/a.zip"),
                            "not 'latest'")
        self.assertRejected(record(artifact_url=VALID_ARTIFACT.replace(".zip", ".tar.gz")), "artifact_url")
        self.assertRejected(record(icon_url="https://example.com/icon.gif"), "icon_url")
        self.assertRejected(record(icon_url="https://user:pw@example.com/icon.png"), "icon_url")

    def test_reservation(self):
        report = Report()
        loaded = load_record(write_record(self.apps, reservation()), report)
        self.assertEqual(report.items, [])
        self.assertTrue(loaded.reserved)
        self.assertEqual(self.errors(reservation(version="0.1.0", license="MIT")), [])

    def test_reservation_urls_and_hash_must_all_be_null(self):
        for field, value in (("source_repo", "https://github.com/example/future-game"),
                             ("icon_url", "https://example.com/icon.png"),
                             ("sha256", "a" * 64)):
            with self.subTest(field=field):
                self.assertRejected(reservation(**{field: value}), f"{field} must be null in a reservation")

    def test_icon_inside_the_release_zip(self):
        inside = {"icon_url": None, "icon_member": "PPSA01234/sce_sys/icon0.png"}
        self.assertEqual(self.errors(record(**inside)), [])
        self.assertRejected(record(icon_member="PPSA01234/sce_sys/icon0.png"), "icon_url must be null")
        for bad in ("../icon0.png", "/icon0.png", "a//icon0.png", "a/icon0.gif", "a\\icon0.png", "./icon0.png"):
            with self.subTest(member=bad):
                self.assertRejected(record(**dict(inside, icon_member=bad)), "icon_member must be a relative path")
        self.assertRejected(record(**dict(inside, artifact_url=VALID_ARTIFACT.replace(".zip", ".ffpfsc"))),
                            "icon_member needs a .zip")
        self.assertRejected(reservation(icon_member="a/icon0.png"), "icon_member must be absent in a reservation")
        self.assertRejected(record(**dict(inside, icon_member=None)), "icon_member must not be null")

    def test_internal_only_is_optional_and_must_be_true(self):
        self.assertEqual(self.errors(record()), [])
        self.assertEqual(self.errors(record(internalOnly=True)), [])
        for bad in (False, "true", 1, None):
            with self.subTest(value=bad):
                self.assertRejected(record(internalOnly=bad), "internalOnly must be true, or left out")

    def test_only_reservations_may_be_null(self):
        self.assertRejected(record(icon_url=None), "icon_url must not be null")
        self.assertRejected(record(version=None), "version must not be null")
        self.assertRejected(reservation(name=None), "name must not be null")
        data = reservation()
        del data["sha256"]
        self.assertRejected(data, "missing field(s): sha256")

    def test_shared_title_id_uses_the_owner_in_the_filename(self):
        self.assertEqual(self.errors(record(), filename="PPSA01234-example.json"), [])
        self.assertRejected(record(), "or PPSA01234-example.json when another app", filename="PPSA01234-someone.json")
        self.assertRejected(reservation(), "a reservation has no owner", filename="PPSA05555-example.json")

    def test_two_apps_with_one_title_id_are_a_valid_catalog(self):
        write_record(self.apps, record())
        write_record(self.apps, record(
            name="Other App", sha256="b" * 64, source_repo="https://github.com/Other/other-app",
            artifact_url="https://github.com/Other/other-app/releases/download/01.000.000/PPSA01234.zip"),
            "PPSA01234-other.json")
        report = Report()
        records = load_catalog(self.apps, report)
        self.assertFalse(report.failed, report.items)
        self.assertEqual(sorted(r.id for r in records), ["PPSA01234", "PPSA01234-other"])

    def test_same_owner_cannot_share_a_title_id(self):
        write_record(self.apps, record())
        write_record(self.apps, record(
            name="Other App", sha256="b" * 64, source_repo="https://github.com/Example/other-app",
            artifact_url="https://github.com/Example/other-app/releases/download/01.000.000/PPSA01234.zip"),
            "PPSA01234-example.json")
        report = Report()
        load_catalog(self.apps, report)
        messages = [m for level, _, m in report.items if level == "error"]
        self.assertTrue(any("from the same owner; change the title ID" in m for m in messages), messages)

    def test_catalog_uniqueness_and_stray_files(self):
        write_record(self.apps, record())
        write_record(self.apps, record(titleid="PPSA04321", name="EXAMPLE APP",
                                       artifact_url=VALID_ARTIFACT.replace("PPSA01234", "PPSA04321")))
        (self.apps / "notes.txt").write_text("x", encoding="utf-8")
        report = Report()
        load_catalog(self.apps, report)
        messages = [m for _, _, m in report.items]
        self.assertTrue(any("name duplicates" in m for m in messages))
        self.assertTrue(any("sha256 duplicates" in m for m in messages))
        self.assertTrue(any("only <TITLEID>.json" in m for m in messages))


VALID_ARTIFACT = record()["artifact_url"]

if __name__ == "__main__":
    unittest.main()
