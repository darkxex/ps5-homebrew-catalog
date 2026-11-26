"""Offline validation of catalog records under apps/.

Every record has exactly FIELDS. A record whose URL fields (source_repo,
artifact_url, icon_url) are null is a title ID reservation shown as coming soon;
its sha256 is null too, and version and license may be null.
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlsplit

from .report import Report

FIELDS = (
    "titleid", "name", "kind", "category", "description", "license", "author",
    "version", "source_repo", "artifact_url", "sha256", "icon_url",
)
RESERVATION_NULL = ("source_repo", "artifact_url", "icon_url", "sha256")
UNLICENSED = "Unlicensed"  # shown when GitHub detects no license for the repository
RESERVATION_NULLABLE = ("version", "license")
MAX_RESERVATIONS_PER_ACCOUNT = 5
RESERVATION_STALE_DAYS = 180
KINDS = ("app", "game", "tool")
# The shelves of the website and the store, in the order they are shown. A record names the key;
# the label is what people read (docs/metadata.md, Categories).
CATEGORIES = {
    "console-ports": "Console game ports",
    "pc-ports": "PC game ports",
    "homebrew-games": "Homebrew games",
    "emulators": "Emulators",
    "streaming": "Game streaming",
    "video": "Video & TV",
    "music": "Music & audio",
    "ai": "AI",
    "utilities": "Utilities",
    "tools": "Tools & tests",
    "showcases": "Showcases",
}
# Fields a record may carry besides FIELDS; checked when present.
# icon_member: where the icon is inside the release's ZIP, for a repository that does not commit it.
# icon_url is then null (docs/metadata.md, Icon inside the release file).
# internalOnly: true makes the store always install the app to the console's internal storage,
# whatever install location the user chose. A boolean; leave it out for the default behaviour.
OPTIONAL_FIELDS = ("icon_member", "internalOnly")
MAX_FILE_BYTES = 8192
MAX_LENGTH = {
    "titleid": 9, "name": 64, "kind": 4, "category": 16, "description": 200, "license": 64,
    "author": 64, "version": 32, "source_repo": 200, "artifact_url": 500,
    "sha256": 64, "icon_url": 500, "icon_member": 200,
}
# Title IDs that templates ship with; publishing under them guarantees collisions.
RESERVED_TITLE_IDS = {"PPSA99999": "the ps5-native-app-boilerplate default"}

# Four letters and five digits, the shape ShadowMountPlus registers; it skips NPXS (system titles).
TITLE_ID = re.compile(r"[A-Z]{4}[0-9]{5}")
# Prefixes no listing may use: PS4 titles and system titles.
BLOCKED_TITLE_PREFIXES = {"CUSA": "PS4 titles aren't listed", "NPXS": "ShadowMountPlus ignores system titles"}
# A record's id is its filename: the title ID, plus -<owner> when another app already uses that title ID.
RECORD_ID = re.compile(r"[A-Z]{4}[0-9]{5}(?:-[a-z0-9-]{1,39})?")
RECORD_PATH = re.compile(r"apps/[A-Z]{4}[0-9]{5}(?:-[a-z0-9-]{1,39})?\.json")
SHA256 = re.compile(r"[0-9a-f]{64}")
VERSION = re.compile(r"[0-9A-Za-z][0-9A-Za-z.+_-]*")
LICENSE = re.compile(r"[A-Za-z0-9.+-]+(?: (?:AND|OR|WITH) [A-Za-z0-9.+-]+)*")
REPO_PART = re.compile(r"[A-Za-z0-9_.-]+")
ASSET_NAME = re.compile(r"[^/?#%\s]+\.(?:zip|ffpfsc|ffpkg)")
TAG = re.compile(r"[^/?#\s]+")
ICON_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
# Unicode categories rejected in text: controls, invisible formatting (including
# bidirectional overrides), surrogates, private use, unassigned, line separators.
BAD_CATEGORIES = {"Cc", "Cf", "Cs", "Co", "Cn", "Zl", "Zp"}


@dataclass(frozen=True)
class Record:
    path: Path
    data: dict

    @property
    def titleid(self) -> str:
        return self.data["titleid"]

    @property
    def id(self) -> str:
        """The record's identity in the catalog and the API: its filename without .json.

        It is the title ID, or TITLEID-owner for an app that shares its title ID with an earlier one."""
        return self.path.stem

    @property
    def icon_source(self) -> str | None:
        return icon_source(self.data)

    @property
    def reserved(self) -> bool:
        """True for a title ID reservation (no release yet), shown as coming soon."""
        return self.data["artifact_url"] is None

    @property
    def owner(self) -> str:
        return repo_parts(self.data["source_repo"])[0]

    @property
    def repo(self) -> str:
        return repo_parts(self.data["source_repo"])[1]

    @property
    def tag(self) -> str:
        return release_parts(self.data)[0]

    @property
    def asset_name(self) -> str:
        return release_parts(self.data)[1]


def icon_source(data: dict) -> str | None:
    """Where a record's icon comes from, as one string: its icon_url, or the file in the release ZIP.

    Used to tell whether the icon changed and to key caches. None when the record has no icon yet."""
    if data.get("icon_url"):
        return data["icon_url"]
    if data.get("icon_member") and data.get("artifact_url"):
        return f"{data['artifact_url']}#{data['icon_member']}"
    return None


def repo_parts(source_repo: str) -> tuple[str, str]:
    owner, repo = urlsplit(source_repo).path.strip("/").split("/")
    return owner, repo


def release_parts(data: dict) -> tuple[str, str]:
    """Return the (tag, asset name) encoded in a validated artifact_url."""
    suffix = data["artifact_url"][len(data["source_repo"] + "/releases/download/"):]
    tag, asset = suffix.split("/")
    return unquote(tag), asset


def tag_version(tag: str) -> str:
    """The version a release tag names: the tag without a leading v before a digit (v1.2 -> 1.2)."""
    return tag[1:] if re.fullmatch(r"[vV][0-9].*", tag) else tag


def version_from_tag(tag: str) -> tuple[str, ...]:
    """Accepted `version` values for a release tag: the tag, or the tag without a leading v."""
    return (tag,) if tag_version(tag) == tag else (tag_version(tag), tag)


def _unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def text_problem(value: str) -> str | None:
    for char in value:
        if unicodedata.category(char) in BAD_CATEGORIES:
            return f"contains a disallowed character U+{ord(char):04X}"
    if unicodedata.normalize("NFC", value) != value:
        return "is not NFC-normalized Unicode"
    if value.strip() != value:
        return "has leading or trailing whitespace"
    return None


def clamp_description(data: dict) -> bool:
    """Cut an over-long description to MAX_LENGTH['description'] characters, in place, the last
    three of them being "...".

    Pull requests keep arriving with a longer one; only its first characters count. Returns True
    when it was cut. Anything that is not a string is left for the field checks to reject."""
    value = data.get("description")
    limit = MAX_LENGTH["description"]
    if not isinstance(value, str) or len(value) <= limit:
        return False
    data["description"] = value[:limit - 3].rstrip() + "..."
    return True


def _check_fields(data: dict) -> list[str]:
    """Validate values; the field set was checked by the caller."""
    problems = []
    reservation = data["artifact_url"] is None
    if reservation:
        for field in RESERVATION_NULL:
            if data[field] is not None:
                problems.append(f"{field} must be null in a reservation (artifact_url is null)")
    if reservation and "icon_member" in data:
        problems.append("icon_member must be absent in a reservation (artifact_url is null)")
    if "internalOnly" in data and data["internalOnly"] is not True:
        problems.append("internalOnly must be true, or left out")
    for field, value in data.items():
        if field == "internalOnly":
            continue
        if value is None:
            if field == "icon_url" and isinstance(data.get("icon_member"), str):
                continue          # the icon is inside the release's ZIP
            if not (reservation and field in RESERVATION_NULL + RESERVATION_NULLABLE):
                problems.append(f"{field} must not be null" + (
                    "" if reservation else "; only reservations (artifact_url null) may leave fields null"))
            continue
        if not isinstance(value, str):
            problems.append(f"{field} must be a string")
            continue
        if not value:
            problems.append(f"{field} must not be empty")
            continue
        if len(value) > MAX_LENGTH[field]:
            problems.append(f"{field} is longer than {MAX_LENGTH[field]} characters")
        issue = text_problem(value)
        if issue:
            problems.append(f"{field} {issue}")
    if problems:
        return problems

    if not TITLE_ID.fullmatch(data["titleid"]):
        problems.append("titleid must be four uppercase letters and five digits, e.g. PPSA01234")
    elif data["titleid"][:4] in BLOCKED_TITLE_PREFIXES:
        problems.append(f"titleid must not start with {data['titleid'][:4]}: {BLOCKED_TITLE_PREFIXES[data['titleid'][:4]]}")
    elif data["titleid"] in RESERVED_TITLE_IDS:
        problems.append(f"titleid {data['titleid']} is reserved ({RESERVED_TITLE_IDS[data['titleid']]}); "
                        "choose a unique title ID")
    if data["kind"] not in KINDS:
        problems.append(f"kind must be one of: {', '.join(KINDS)}")
    if "category" in data and data["category"] not in CATEGORIES:
        problems.append(f"category must be one of: {', '.join(CATEGORIES)}")
    if data["version"] is not None and not VERSION.fullmatch(data["version"]):
        problems.append("version may contain only letters, digits and . + _ -")
    if data["license"] is not None and not LICENSE.fullmatch(data["license"]):
        problems.append("license must be an SPDX identifier or expression, e.g. GPL-3.0 or MIT OR Apache-2.0")
    if data["sha256"] is not None and not SHA256.fullmatch(data["sha256"]):
        problems.append("sha256 must be 64 lowercase hexadecimal characters")

    if reservation:
        return problems

    source = urlsplit(data["source_repo"])
    parts = source.path.strip("/").split("/")
    source_ok = (
        source.scheme == "https" and source.netloc == "github.com"
        and source.path == "/" + "/".join(parts) and len(parts) == 2
        and all(REPO_PART.fullmatch(p) and p not in {".", ".."} for p in parts)
        and not source.query and not source.fragment
    )
    if not source_ok:
        problems.append("source_repo must be https://github.com/<owner>/<repository>")
    else:
        prefix = data["source_repo"] + "/releases/download/"
        artifact = urlsplit(data["artifact_url"])
        suffix = data["artifact_url"][len(prefix):] if data["artifact_url"].startswith(prefix) else ""
        tag, _, asset = suffix.partition("/")
        if not (suffix and artifact.scheme == "https" and not artifact.query and not artifact.fragment
                and TAG.fullmatch(tag) and ASSET_NAME.fullmatch(asset)):
            problems.append("artifact_url must be <source_repo>/releases/download/<tag>/<asset> "
                            "ending in .zip, .ffpfsc or .ffpkg")
        elif unquote(tag) == "latest":
            problems.append("artifact_url must name a specific release tag, not 'latest'")
        elif data["version"] not in version_from_tag(unquote(tag)):
            choices = " or ".join(repr(v) for v in version_from_tag(unquote(tag)))
            problems.append(f"version must match the release tag {unquote(tag)!r} in artifact_url: use {choices}")

    if "icon_member" in data:
        problems.extend(_icon_member_problems(data))
    if data["icon_url"] is not None:
        icon = urlsplit(data["icon_url"])
        if not (icon.scheme == "https" and icon.hostname and not icon.username and not icon.password
                and not icon.fragment and icon.path.lower().endswith(ICON_EXTENSIONS)):
            problems.append("icon_url must be a direct HTTPS link ending in .png, .jpg, .jpeg or .webp")
    return problems


def _icon_member_problems(data: dict) -> list[str]:
    member = data["icon_member"]
    problems = []
    if data["icon_url"] is not None:
        problems.append("icon_url must be null when icon_member names the icon inside the release file")
    if not data["artifact_url"].lower().endswith(".zip"):
        problems.append("icon_member needs a .zip release file")
    parts = member.split("/")
    if ("\\" in member or member.startswith("/") or any(p in ("", ".", "..") for p in parts)
            or not member.lower().endswith(ICON_EXTENSIONS)):
        problems.append("icon_member must be a relative path inside the ZIP ending in .png, .jpg, .jpeg or .webp")
    return problems


def _field_set_problems(data: dict) -> list[str]:
    problems = []
    missing = [f for f in FIELDS if f not in data]
    extra = sorted(set(data) - set(FIELDS) - set(OPTIONAL_FIELDS))
    if missing:
        problems.append(f"missing field(s): {', '.join(missing)}")
    if extra:
        problems.append(f"unexpected field(s): {', '.join(extra)}")
    return problems


def record_problems(data: dict) -> list[str]:
    """Every field-level problem with a record's data (catalog-wide rules aside).

    A description over the limit is not a problem: only its first characters count."""
    data = dict(data)
    clamp_description(data)
    return _field_set_problems(data) or _check_fields(data)


def load_record(path: Path, report: Report, display: str | None = None) -> Record | None:
    """Parse and validate one record file; report problems and return None on failure."""
    name = display or f"apps/{path.name}"
    if path.is_symlink() or not path.is_file():
        report.error(name, "must be a regular file")
        return None
    if path.stat().st_size > MAX_FILE_BYTES:
        report.error(name, f"is larger than {MAX_FILE_BYTES} bytes")
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique_keys)
    except (UnicodeDecodeError, ValueError) as error:
        report.error(name, f"is not valid UTF-8 JSON: {error}")
        return None
    if not isinstance(data, dict):
        report.error(name, "must contain a single JSON object")
        return None
    if clamp_description(data):
        report.warning(name, f"description is longer than {MAX_LENGTH['description']} characters; "
                             "it is cut to 200, ending in '...'")
    problems = _field_set_problems(data) or _check_fields(data)
    if not problems:
        problems.extend(filename_problems(path.stem, data))
    for problem in problems:
        report.error(name, problem)
    return None if problems else Record(path, data)


def record_id(data: dict, taken: set[str]) -> str:
    """The id (filename) for a new record: its title ID, or TITLEID-owner when `taken` already has it."""
    if data["titleid"] not in taken:
        return data["titleid"]
    return f"{data['titleid']}-{repo_parts(data['source_repo'])[0].lower()}"


def filename_problems(stem: str, data: dict) -> list[str]:
    """The filename is the title ID, or TITLEID-owner when the title ID is shared (owner from source_repo)."""
    titleid = data["titleid"]
    if stem == titleid:
        return []
    if data["artifact_url"] is None:
        return [f"filename must be {titleid}.json: a reservation has no owner to tell it apart from other apps"]
    expected = f"{titleid}-{repo_parts(data['source_repo'])[0].lower()}"
    if stem != expected:
        return [f"filename must be {titleid}.json, or {expected}.json when another app already uses {titleid}"]
    return []


def load_catalog(apps_dir: Path, report: Report) -> list[Record]:
    """Validate every record plus catalog-wide uniqueness rules."""
    if not apps_dir.is_dir():
        report.error("apps", "directory is missing")
        return []
    records = []
    for path in sorted(apps_dir.iterdir()):
        if path.suffix != ".json" or not RECORD_ID.fullmatch(path.stem):
            report.error(f"apps/{path.name}", "only <TITLEID>.json or <TITLEID>-<owner>.json record files belong in apps/")
            continue
        record = load_record(path, report)
        if record:
            records.append(record)
    if not records and not report.failed:
        report.error("apps", "contains no records")

    for field, normalize in (("name", str.casefold), ("artifact_url", str), ("sha256", str)):
        seen: dict[str, str] = {}
        for record in records:
            if record.data[field] is None:
                continue
            key = normalize(record.data[field])
            if key in seen:
                report.error(f"apps/{record.path.name}", f"{field} duplicates {seen[key]}")
            else:
                seen[key] = f"apps/{record.path.name}"

    # One developer can't list two apps under one title ID: they can just change it.
    owners: dict[tuple[str, str], str] = {}
    for record in records:
        if record.data["source_repo"] is None:
            continue
        key = (record.titleid, repo_parts(record.data["source_repo"])[0].casefold())
        if key in owners:
            report.error(f"apps/{record.path.name}",
                         f"{record.titleid} is already used by {owners[key]}, from the same owner; "
                         "change the title ID of one of the two apps")
        else:
            owners[key] = f"apps/{record.path.name}"
    return records
