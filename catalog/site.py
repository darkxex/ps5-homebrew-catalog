"""Build the static store website and JSON feed from apps/.

Output (for the default base path /):

    dist/_headers, dist/_redirects, dist/404.html, dist/robots.txt
    dist/index.html                     the catalog, as cards or a list (?view=list)
    dist/app/<TITLEID>/index.html       one page per app
    dist/catalog/v1.json                machine-readable feed
    dist/assets/…                       content-hashed CSS, JS and icons

Each theme under site/themes/<name>/ provides base.html, index.html (the
catalog in both views), toolbar.html (its filters), card.html and row.html (one
app in each view, with -soon variants), app.html, app-soon.html, 404.html and
style.css. Templates use
string.Template placeholders; every metadata value is HTML-escaped before it is
substituted.

Icons are fetched and re-served from the site, resized to WebP when Pillow is
installed. With an icon cache directory, an icon is fetched again only when its
cached copy is older than an hour (an icon URL may name a branch, where the file
can change); entries no longer used are pruned. A failed icon falls back to a placeholder instead of failing the
build.
"""

from __future__ import annotations

import hashlib
import html
import io
import json
import os
import re
import shutil
import subprocess
import time
from pathlib import Path
from string import Template
from urllib.parse import quote, unquote

from . import artifacts
from .records import CATEGORIES, KINDS, UNLICENSED, Record, load_catalog
from .report import Report

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
REPO_URL = "https://github.com/darkxex/ps5-homebrew-catalog"
# Likes and comments, written by the Comments workflow to a branch of their own (catalog/comments.py).
COMMENTS_URL = REPO_URL.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/comments-data/v1/"
# The website: the repository's GitHub Pages site, under its own domain.
DEFAULT_SITE_URL = "https://prosperostore.net"
DEFAULT_BASE = "/"
# Base paths the site used to be served under; their URLs redirect to the current base.
LEGACY_BASES = ("/ps5/",)
MARKER = ".catalog-site"
FEED_SCHEMA = 1
API_VERSION = "v1"         # path of the store API; a breaking change gets a new path
API_SCHEMA = 3             # not raised for additions: released stores accept exactly 3 (docs/api.md)
API_ICON_SIZES = (512, 256)
ICON_SIZE = 512
FONT_URL = "https://fonts.googleapis.com/css2?{families}&display=swap"
THEMES = {
    # name: (Google Fonts families, browser theme-color)
    "holo": ("family=Unbounded:wght@500;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700", "#0b0b10"),
    # ProsperoStore's look: its colours, faces and shapes (docs/website.md).
    "farlight": ("family=Inter:wght@400;600&family=Montserrat:wght@500", "#0e0f24"),
}
# Themes that show each app over a picture made from its icon's colours, as ProsperoStore does.
AMBIENT_THEMES = {"farlight"}
DEFAULT_THEME = "farlight"
FORMAT_LABELS = {"zip": "ZIP folder", "ffpkg": "FFPKG image", "ffpfsc": "FFPFSC image"}
KIND_LABELS = {"app": "App", "game": "Game", "tool": "Tool"}
KIND_PLURALS = {"app": "Apps", "game": "Games", "tool": "Tools"}
# Where the optional "Sign in with GitHub" of the submit page lives (worker/github-login/README.md).
# Empty: the submit page has no sign-in and the limit of GitHub's API without one (60 an hour) applies.
GITHUB_LOGIN_URL = "https://prosperostore-login.darkxex.workers.dev"
# The categories the submit page offers for each kind (what the listed apps do; the check doesn't enforce it).
KIND_CATEGORIES = {
    "app": ("emulators", "streaming", "video", "music", "ai", "utilities"),
    "game": ("console-ports", "pc-ports", "homebrew-games"),
    "tool": ("utilities", "tools", "showcases"),
}


def e(value) -> str:
    return html.escape(str(value), quote=True)


def artifact_format(record: Record) -> str:
    return record.asset_name.rsplit(".", 1)[1].lower()


def source_sequence() -> int:
    """The catalog's sequence number: commits in the history of this build. It only ever grows on main,
    which lets a client refuse a signed catalog older than one it has already accepted. 0 when unknown."""
    if (_git("rev-parse", "--is-shallow-repository") or "").strip() == "true":
        _git("fetch", "--quiet", "--unshallow")
    count = (_git("rev-list", "--count", "HEAD") or "").strip()
    return int(count) if count.isdigit() else 0


def source_commit() -> str:
    for key in ("CF_PAGES_COMMIT_SHA", "GITHUB_SHA"):
        if os.environ.get(key):
            return os.environ[key]
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, check=True,
                              capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def source_commit_time(commit: str) -> str | None:
    """When `commit` was made, as UTC ISO 8601: the time the catalog last changed. None when git can't say."""
    return _utc((_git("show", "-s", "--format=%cI", commit) or "").strip() or None)


def _git(*args: str) -> str | None:
    try:
        return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout
    except (OSError, subprocess.CalledProcessError):
        return None


WITHDRAWN_DAYS = 30  # how long a withdrawn app's page keeps redirecting


def withdrawn_ids(apps_dir: Path, listed: set[str]) -> list[str]:
    """Title IDs whose record was removed in the last WITHDRAWN_DAYS and isn't listed now, from git history.

    A withdrawn app's API file is replaced by a small withdrawn file at the same address, so a
    client that asks for it learns why it is gone.
    """
    log = _git("log", f"--since={WITHDRAWN_DAYS} days ago", "--diff-filter=D", "--name-only", "--format=",
               "--", str(apps_dir))
    removed = {Path(line).stem for line in (log or "").splitlines()
               if re.fullmatch(r".*/[A-Z]{4}[0-9]{5}(?:-[a-z0-9-]{1,39})?\.json", line)}
    return sorted(removed - listed)


def last_updated(apps_dir: Path) -> dict[str, str]:
    """Map record filename to the ISO commit date of the last commit that changed it.

    CI may clone shallowly, which would date every record to the
    newest commit, so the history is deepened first when possible. Records
    outside the repository, or without history, are left out.
    """
    try:
        relative = apps_dir.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return {}
    if (_git("rev-parse", "--is-shallow-repository") or "").strip() == "true":
        _git("fetch", "--quiet", "--unshallow")
    output = _git("log", "--format=%x00%cI", "--name-only", "--no-renames", "--", relative)
    dates: dict[str, str] = {}
    date = None
    for line in (output or "").splitlines():
        if line.startswith("\0"):
            date = line[1:]
        elif line and date:
            dates.setdefault(Path(line).name, date)
    return dates


def first_listed(apps_dir: Path) -> dict[str, str]:
    """Map record filename to the ISO commit date of the first commit that had it: when the catalog listed it."""
    try:
        relative = apps_dir.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return {}
    if (_git("rev-parse", "--is-shallow-repository") or "").strip() == "true":
        _git("fetch", "--quiet", "--unshallow")
    output = _git("log", "--format=%x00%cI", "--name-only", "--no-renames", "--", relative)
    dates: dict[str, str] = {}
    date = None
    for line in (output or "").splitlines():
        if line.startswith("\0"):
            date = line[1:]
        elif line and date:
            dates[Path(line).name] = date   # the log runs newest first: the last one seen is the oldest
    return dates


def display_date(iso: str) -> str:
    months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    year, month, day = iso[:10].split("-")
    return f"{months[int(month) - 1]} {int(day)}, {year}"


def version_label(version: str) -> str:
    """How a version is shown: "v1.2" for numeric versions, tags such as "vk-285-113" as they are."""
    return f"v{version}" if version[:1].isdigit() else version


def normalize_base(base: str) -> str:
    base = "/" + base.strip("/") + "/"
    return "/" if base == "//" else base


class Theme:
    def __init__(self, name: str):
        if name not in THEMES:
            raise ValueError(f"unknown theme {name!r}")
        self.name = name
        self.directory = SITE / "themes" / name
        self.fonts, self.color = THEMES[name]

    def template(self, name: str) -> Template | None:
        path = self.directory / name
        return Template(path.read_text(encoding="utf-8")) if path.is_file() else None

    def render(self, name: str, values: dict) -> str:
        template = self.template(name)
        return template.substitute(values) if template else ""


class Assets:
    """Writes content-hashed files under <base>/assets/ and remembers their URLs."""

    def __init__(self, directory: Path, url_prefix: str):
        self.directory = directory
        self.url_prefix = url_prefix
        directory.mkdir(parents=True, exist_ok=True)

    def add(self, stem: str, extension: str, content: bytes) -> str:
        name = f"{stem}.{hashlib.sha256(content).hexdigest()[:12]}.{extension}"
        (self.directory / name).write_bytes(content)
        return self.url_prefix + name


def process_icon(data: bytes) -> tuple[bytes, str]:
    image_format, _ = artifacts.inspect_icon(data)
    if image_format is None:
        raise ValueError("not a PNG, JPEG or WebP image")
    try:
        from PIL import Image
    except ImportError:
        return data, {"png": "png", "jpeg": "jpg", "webp": "webp"}[image_format]
    with Image.open(io.BytesIO(data)) as image:
        image = image.convert("RGBA")
        image.thumbnail((ICON_SIZE, ICON_SIZE))
        output = io.BytesIO()
        image.save(output, "WEBP", quality=82, method=6)
    return output.getvalue(), "webp"


BACKDROP_MAX_AGE = 60 * 60 * 24 * 7   # seconds a cached backdrop is used before it is fetched again
BACKDROP_SIZE = (1920, 1080)      # 1080p at most
# Part of what the cached backdrop is keyed by: change it with the way the picture is converted, so a
# cache that holds pictures made the old way is not used (and is pruned).
BACKDROP_CACHE_KEY = "#backdrop-webp94"


def process_backdrop(data: bytes) -> bytes:
    """An app's pic0.dds (the picture the console shows behind the app) as a WebP the stage can use.

    Needs Pillow, which reads the DDS. Raises ValueError when the file is not a picture it can decode."""
    try:
        from PIL import Image
    except ImportError as error:
        raise ValueError("Pillow is needed to read pic0.dds") from error
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.format != "DDS":
                raise ValueError("not a DDS image")
            image = image.convert("RGB")
            image.thumbnail(BACKDROP_SIZE, Image.Resampling.LANCZOS)
            output = io.BytesIO()
            image.save(output, "WEBP", quality=94, method=6)
    except (OSError, NotImplementedError, Image.DecompressionBombError) as error:
        raise ValueError(f"unreadable pic0.dds: {error}") from error
    return output.getvalue()


def _backdrop(record: Record, cache: Path | None) -> bytes | None:
    """The app's backdrop as WebP, or None when it has no pic0.dds or pic1.dds.

    The converted picture is kept in the cache (an empty file means "no picture"), for as long as
    BACKDROP_MAX_AGE, so a build does not fetch an 8 MB original for every app.
    """
    entry = cache / (hashlib.sha256((record.icon_source + BACKDROP_CACHE_KEY).encode()).hexdigest() + ".bg") if cache else None
    if entry and entry.is_file():
        kept = entry.read_bytes()
        # A picture is big, and its URL names a release tag: keep it for a week. A "no picture" is
        # one cheap request to check again, so it is asked again after a day.
        if time.time() - entry.stat().st_mtime < (BACKDROP_MAX_AGE if kept else ICON_MAX_AGE * 24):
            return kept or None
    original = artifacts.fetch_backdrop(record.data)
    result = process_backdrop(original) if original else None
    if entry:
        cache.mkdir(parents=True, exist_ok=True)
        entry.write_bytes(result or b"")
    return result


def size_label(size: int | None) -> str:
    """"31.8 MB", "548 GB": sizes as people say them, as ProsperoStore words them."""
    if not size:
        return ""
    megabytes = size / (1024 * 1024)
    if megabytes >= 10240:
        return f"{megabytes / 1024:.0f} GB"
    if megabytes >= 1024:
        return f"{megabytes / 1024:.1f} GB"
    return f"{megabytes:.0f} MB" if megabytes >= 10 else f"{megabytes:.1f} MB"


def make_ambient(icon: bytes | None) -> tuple[bytes, str] | None:
    """An app's ambient picture and main colour, from its icon: (PNG, "#rrggbb").

    The same picture ProsperoStore makes (its src/app/ambient.hpp): the icon's
    two main hues painted as soft light over the theme's dark in a 96 x 54
    field that stays dark enough for white words. A grey icon, or none, gets
    the theme's own violet. None without Pillow.
    """
    try:
        from PIL import Image
    except ImportError:
        return None
    deep, violet, blue = (0x0e / 255, 0x0f / 255, 0x24 / 255), (0x42 / 255, 0x35 / 255, 0x8f / 255), (0x24 / 255, 0x4a / 255, 0xb8 / 255)

    def mix(a, b, k):
        return tuple(a[i] + (b[i] - a[i]) * k for i in range(3))

    # The colourful pixels by hue, 12 buckets of 30 degrees, weighted by saturation and
    # brightness: greys, blacks and whites do not vote.
    sums, weights = [[0.0, 0.0, 0.0] for _ in range(12)], [0.0] * 12
    if icon:
        try:
            with Image.open(io.BytesIO(icon)) as image:
                image = image.convert("RGBA")
                width, height = image.size
                pixels = image.load()
                for y in range(0, height, 4):
                    for x in range(0, width, 4):
                        r, g, b, a = pixels[x, y]
                        if a < 128:
                            continue
                        c = (r / 255, g / 255, b / 255)
                        hi, lo = max(c), min(c)
                        chroma = hi - lo
                        if hi < 0.2 or chroma < 0.18:
                            continue
                        if hi == c[0]:
                            hue = ((c[1] - c[2]) / chroma + 6.0) % 6.0
                        elif hi == c[1]:
                            hue = (c[2] - c[0]) / chroma + 2.0
                        else:
                            hue = (c[0] - c[1]) / chroma + 4.0
                        bucket = int(hue * 2.0) % 12
                        weight = chroma * hi
                        for i in range(3):
                            sums[bucket][i] += c[i] * weight
                        weights[bucket] += weight
        except (OSError, ValueError):
            pass
    # The main colour is the strongest hue; the second, the strongest at least 60 degrees away
    # with a real share of the icon.
    first = max(range(12), key=lambda i: weights[i]) if any(weights) else -1
    second = -1
    if first >= 0:
        for i in range(12):
            apart = min((i - first) % 12, (first - i) % 12)
            if apart >= 2 and weights[i] >= 0.12 * weights[first] and (second < 0 or weights[i] > weights[second]):
                second = i

    def colour_of(i):
        c = tuple(v / weights[i] for v in sums[i])
        hi = max(c)
        return tuple(v / hi for v in c)

    if first >= 0:
        main = colour_of(first)
        other = colour_of(second) if second >= 0 else mix(main, violet, 0.55)
        accent = "#%02x%02x%02x" % tuple(int(v * 255 + 0.5) for v in main)
    else:
        main, other, accent = mix(violet, (1.0, 1.0, 1.0), 0.25), blue, "#42358f"

    # Paint: the dark, the main colour high on the right (where the stage puts the icon), the
    # second low on the left, both meeting low right.
    width, height = 96, 54
    aspect = width / height
    blobs = ((main, 0.80, 0.28, 0.78, 0.82), (other, 0.14, 0.96, 0.85, 0.62), (mix(main, other, 0.5), 1.04, 1.06, 0.62, 0.5))
    base = mix(deep, main, 0.14)
    data = bytearray()
    for y in range(height):
        for x in range(width):
            u, v = (x + 0.5) / width, (y + 0.5) / height
            c = base
            for colour, bx, by, radius, strength in blobs:
                dx, dy = (u - bx) * aspect, v - by
                d = (dx * dx + dy * dy) ** 0.5 / radius
                if d < 1.0:
                    c = mix(c, colour, strength * (1.0 - d * d) ** 2)
            # Never brighter than the words allow.
            light = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
            if light > 0.36:
                c = tuple(v * 0.36 / light for v in c)
            data.extend(int(min(max(v, 0.0), 1.0) * 255 + 0.5) for v in c)
    output = io.BytesIO()
    Image.frombytes("RGB", (width, height), bytes(data)).save(output, "PNG", optimize=True)
    return output.getvalue(), accent


def png_icons(data: bytes) -> dict[int, bytes]:
    """PNG copies for native clients, by longest side; they may not decode WebP. Needs Pillow to resize."""
    try:
        from PIL import Image
    except ImportError:
        return {API_ICON_SIZES[0]: data} if artifacts.inspect_icon(data)[0] == "png" else {}
    icons = {}
    with Image.open(io.BytesIO(data)) as image:
        image = image.convert("RGBA")
        for size in API_ICON_SIZES:
            copy = image.copy()
            copy.thumbnail((size, size))
            output = io.BytesIO()
            copy.save(output, "PNG", optimize=True)
            icons[size] = output.getvalue()
    return icons


ICON_MAX_AGE = 60 * 60  # seconds a cached original is used before it is fetched again


def _icon(url: str, cache: Path | None, fetch=None) -> tuple[bytes, str, bytes]:
    """(site icon, its extension, original bytes) for url, using and filling the optional cache of originals.

    `url` names the icon (a record's icon_source) and keys the cache; `fetch()` returns its bytes,
    by default the file at `url`.

    A cached original older than ICON_MAX_AGE is fetched again: the file behind a URL that names a
    branch can change. When that fetch fails, the cached one is used.
    """
    entry = cache / (hashlib.sha256(url.encode()).hexdigest() + ".img") if cache else None
    kept = None
    if entry and entry.is_file():
        try:
            data = entry.read_bytes()
            kept = (*process_icon(data), data)
            if time.time() - entry.stat().st_mtime < ICON_MAX_AGE:
                return kept
        except (OSError, ValueError):
            entry.unlink(missing_ok=True)
    try:
        data = fetch() if fetch else artifacts.fetch_small(url, artifacts.MAX_ICON_BYTES)
        result = process_icon(data)
    except (artifacts.DownloadError, OSError, ValueError):
        if kept is None:
            raise
        return kept
    if entry:
        cache.mkdir(parents=True, exist_ok=True)
        entry.write_bytes(data)
    return (*result, data)


def _prepare_output(out: Path) -> None:
    if out.exists():
        if not (out / MARKER).exists() and any(out.iterdir()):
            raise SystemExit(f"refusing to replace {out}: it is not empty and was not created by this build")
        shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / MARKER).write_text("Generated by python3 -m catalog build; safe to delete.\n", encoding="utf-8")


def _install_steps(record: Record) -> str:
    """The install steps as markup. Each carries its words' key, so the page can show them in the
    reader's language (site/shared/i18n.js); the English here is what a browser without the script shows."""
    d = record.data
    name = f"<code>{e(unquote(record.asset_name))}</code>"
    loader = '<a href="https://github.com/drakmor/ShadowMountPlus">ShadowMountPlus</a>'
    if artifact_format(record) == "zip":
        steps = [
            ("step.zip.1", f"Download {name} and extract it on your computer."),
            ("step.zip.2", f"Copy the extracted <code>{e(d['titleid'])}/</code> folder to <code>/data/homebrew/</code> on your PS5, for example over FTP."),
            ("step.zip.3", f"A loader such as {loader} picks it up. Launch {e(d['name'])} from the home screen."),
        ]
    else:
        steps = [
            ("step.img.1", f"Download {name}."),
            ("step.img.2", "Copy the file as-is to <code>/data/homebrew/</code> on your PS5, for example over FTP."),
            ("step.img.3", f"{loader} mounts the image. Launch {e(d['name'])} from the home screen."),
        ]
    args = f' data-v-file="{e(unquote(record.asset_name))}" data-v-titleid="{e(d["titleid"])}" data-v-name="{e(d["name"])}"'
    return "\n".join(f'<li data-i18n-html="{key}"{args}>{step}</li>' for key, step in steps)


def _install_steps_text(record: Record) -> list[str]:
    """The install steps as plain text, for TV mode."""
    return [html.unescape(re.sub(r"<[^>]+>", "", step)) for step in re.findall(r"<li[^>]*>(.*?)</li>", _install_steps(record))]


def _commit_time_html(iso: str | None) -> str:
    """The footer's "last updated" part; empty when the commit's time isn't known."""
    if not iso:
        return ""
    from datetime import datetime
    when = datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ")
    return (f'<span data-i18n="foot.updated" data-v-time="{iso}"> · last updated '
            f'{when.day} {when:%b %Y, %H:%M} UTC</span>')


def _utc(iso: str | None) -> str | None:
    """An ISO 8601 time as UTC with a Z suffix, the one form the API uses."""
    if not iso:
        return None
    from datetime import datetime, timezone
    return datetime.fromisoformat(iso).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def load_scans(directory: Path | None, records: list[Record]) -> dict[str, dict]:
    """Scan summaries by title ID, from the files a scan job wrote (one per release, named by sha256)."""
    from .scan import read_summary
    found: dict[str, dict] = {}
    if not directory or not directory.is_dir():
        return found
    for record in records:
        if record.reserved:
            continue
        entry = directory / f"{record.data['sha256']}.json"
        try:
            # Checked field by field: the job that wrote it handles files nobody has reviewed.
            data = read_summary(json.loads(entry.read_text(encoding="utf-8")), record.data["sha256"])
        except (OSError, ValueError):
            data = None
        if data:
            found[record.id] = data
    return found


def safety_facts(summary: dict | None, uploader: str | None, approved: dict) -> dict | None:
    """What the API says about a release's safety scan; None when the release wasn't scanned."""
    if not summary or summary["sandbox"] == "unreadable":
        return None
    payloads = summary["payloads"]
    return {
        "sandbox": summary["sandbox"],                 # "stays", "leaves" or "unclear"
        "routes": summary["routes"],                   # how it leaves: "loader", "service", "payload"
        "helpers": len(payloads),
        "helpers_unapproved": sum(1 for p in payloads if p["sha256"] not in approved),
        "network": summary["network"],
        # "attested": GitHub holds a verified statement that a workflow built this exact file.
        # "workflow": a workflow attached the file to the release (it may have built it elsewhere).
        "build": "attested" if summary["attested"] else "workflow" if uploader == "actions" else
                 "developer" if uploader == "developer" else None,
        "build_workflow": summary["workflow"],
    }


def write_api(root: Path, url: str, records: list[Record], report: Report, *, updated: dict[str, str], page,
              icons: dict[str, dict[int, bytes]], icon_hashes: dict[str, str], commit: str, github=None,
              cache: Path | None = None, known: dict | None = None, safety: dict | None = None,
              added: dict[str, str] | None = None, news: list[dict] | None = None) -> None:
    """The store API (docs/api.md): one file per app, a browse index and a version map, plus PNG icons.

    Per-app files and the version map hold nothing that changes between builds
    of the same catalog, so an unchanged app keeps its ETag and costs clients a
    304. Only the index carries the build's commit and time, and the download counts.
    """
    from . import facts as release_facts
    from . import notes as release_notes
    from datetime import datetime, timezone
    large, small = API_ICON_SIZES
    index, versions, shared_index, shared_versions = [], {}, [], {}
    sharing: dict[str, list[str]] = {}
    for record in records:
        sharing.setdefault(record.titleid, []).append(record.id)
    for record in sorted(records, key=lambda r: r.id):
        d, rid, name = record.data, record.id, f"apps/{record.path.name}"
        facts, problem = (known or {}).get(rid) or release_facts.cached(record, github, cache)
        if problem:
            report.warning(name, f"release facts not included in the API this time: {problem}")
        elif github is not None and not record.reserved and facts.content_version is None:
            report.notice(name, "no contentVersion found for this release; clients can't check it for updates")
        notes_text, notes_cut = release_notes.as_text(facts.notes)
        icon = {}
        # The address carries the icon's fingerprint, so it changes when the picture does: a cache
        # that still holds the previous picture can't answer for the new address.
        fingerprint = icon_hashes.get(rid)
        version = f"?v={fingerprint}" if fingerprint else ""
        for size, suffix in ((large, ""), (small, f"-{small}")):
            content = icons.get(rid, {}).get(size)
            if content:
                (root / "icons").mkdir(parents=True, exist_ok=True)
                (root / "icons" / f"{rid}{suffix}.png").write_bytes(content)
                icon[size] = f"{url}icons/{rid}{suffix}.png{version}"
        app = {
            "schema": API_SCHEMA,
            "id": record.id,
            **d,
            "status": "coming_soon" if record.reserved else "available",
            # Other listed apps with the same title ID: a console can hold only one of them.
            "conflicts_with": sorted(set(sharing[record.titleid]) - {record.id}),
            "content_version": facts.content_version,
            "format": None if record.reserved else artifact_format(record),
            "artifact_name": None if record.reserved else unquote(record.asset_name),
            "size": facts.size,
            "tag": None if record.reserved else record.tag,
            "released": facts.released,
            "prerelease": facts.prerelease,
            "release_url": None if record.reserved else f"{d['source_repo']}/releases/tag/{quote(record.tag, safe='')}",
            # The developer's own words, as plain text; the full notes are at release_url.
            "release_notes": notes_text,
            "release_notes_truncated": notes_cut if notes_text else None,
            # What the release scan found (docs/api.md, Safety); null when the release wasn't scanned.
            "safety": (safety or {}).get(rid),
            "updated": _utc(updated.get(record.path.name)),
            # When the catalog first listed the record; null when the history can't say.
            "added": _utc((added or {}).get(record.path.name)),
            "page": page(record),
            "icon": icon.get(large),
            "icon_small": icon.get(small) or icon.get(large),
            # Lets a client keep its copy of the icon until the developer's image changes.
            "icon_hash": icon_hashes.get(rid) if icon else None,
        }
        _write_json(root / "apps" / f"{rid}.json", app)
        entry = ({key: app[key] for key in (
            "id", "titleid", "status", "conflicts_with", "name", "kind", "category", "author", "version", "content_version", "format", "size",
            "released", "updated", "added", "icon_small", "icon_hash")}
            | {"sandbox": ((safety or {}).get(rid) or {}).get("sandbox"),
               # Who the apps are grouped under (the website's developer pages): the owner of the repository, as
               # GitHub spells it; null for a reservation, which has no repository yet.
               "owner": None if record.reserved else record.owner,
               # How many times GitHub served the listed file. It moves every day, so it is in the index, which
               # changes with every build anyway, and not in the app's own file, which keeps its ETag.
               "downloads": facts.downloads})
        # A store released before shared title IDs refuses an index with a title ID twice and a
        # versions file with a key that isn't a title ID, and one released before custom prefixes
        # refuses a title ID that doesn't start with PPSA (it then loads no catalog at all). The apps
        # that share a title ID, or use another prefix, go in "shared", which those stores skip.
        in_apps = record.id == record.titleid and record.titleid.startswith("PPSA")
        (index if in_apps else shared_index).append(entry)
        if not record.reserved:
            (versions if in_apps else shared_versions)[rid] = {
                "content_version": facts.content_version, "version": d["version"]}
    _write_json(root / "index.json", {
        "schema": API_SCHEMA, "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "commit": commit, "count": len(index) + len(shared_index), "apps": index,
        **({"shared": shared_index} if shared_index else {})})
    _write_json(root / "versions.json", {"schema": API_SCHEMA, "apps": versions,
                                         **({"shared": shared_versions} if shared_versions else {})})
    # The news is signed by itself and stays out of the manifest (catalog/news.py).
    from . import news as catalog_news
    _write_json(root / catalog_news.FILE, {"schema": API_SCHEMA, "news": (news or [])[:catalog_news.PUBLISHED]})
    # Hashes of everything above, for the deploy to sign (catalog/signing.py).
    from . import signing
    signing.write_manifest(root, API_SCHEMA, source_sequence(), commit)
    if github is not None:
        release_facts.prune(cache, records)


def build_site(out: Path, apps_dir: Path, report: Report, base: str = DEFAULT_BASE,
               site_url: str = DEFAULT_SITE_URL, fetch_icons: bool = True,
               theme: str = DEFAULT_THEME, icon_cache: Path | None = None, github=None,
               scans: Path | None = None, pages_url: str | None = None) -> int:
    """Build the site. With `github`, release facts for the API are looked up (and kept in the cache)."""
    theme_obj = Theme(theme)
    records = load_catalog(apps_dir, report)
    if report.failed:
        return 0
    records.sort(key=lambda r: (r.data["name"].casefold(), r.id))
    base = normalize_base(base)
    site_url = site_url.rstrip("/")
    commit = source_commit()

    _prepare_output(out)
    root = out / base.strip("/") if base != "/" else out
    root.mkdir(parents=True, exist_ok=True)
    assets = Assets(root / "assets", base + "assets/")
    shared_dir = SITE / "shared"
    # A theme may bring its own script and favicon; otherwise the shared ones are used.
    own = {name: theme_obj.directory / name for name in ("app.js", "favicon.svg")}
    js = assets.add("app", "js", (own["app.js"] if own["app.js"].is_file() else shared_dir / "app.js").read_bytes())
    i18n = assets.add("i18n", "js", (shared_dir / "i18n.js").read_bytes())
    analytics = assets.add("analytics", "js", (shared_dir / "analytics.js").read_bytes())
    placeholder = assets.add("placeholder", "svg", (shared_dir / "placeholder.svg").read_bytes())
    shutil.copyfile(own["favicon.svg"] if own["favicon.svg"].is_file() else shared_dir / "favicon.svg",
                    root / "favicon.svg")
    # The "Get it on ProsperoStore" badges (the developer page's badge window): developers link to them from
    # their READMEs, so they live at fixed addresses, not content-hashed ones.
    shutil.copytree(shared_dir / "press", root / "press")

    icons: dict[str, str] = {}
    api_icons: dict[str, dict[int, bytes]] = {}
    icon_hashes: dict[str, str] = {}
    # A reservation has no icon of its own yet: it gets the shared "coming soon" picture.
    coming_soon_source = (shared_dir / "coming-soon.png").read_bytes()
    coming_soon = assets.add("coming-soon", *reversed(process_icon(coming_soon_source)))
    originals: dict[str, bytes] = {}
    for record in records:
        icons[record.id] = coming_soon if record.reserved else placeholder
        if record.reserved:
            originals[record.id] = coming_soon_source
        if not fetch_icons or record.icon_source is None:
            continue
        try:
            content, extension, original = _icon(record.icon_source, icon_cache,
                                                 lambda data=record.data: artifacts.fetch_icon(data))
            api_icons[record.id] = png_icons(original)
            icon_hashes[record.id] = hashlib.sha256(original).hexdigest()[:16]
        except (artifacts.DownloadError, OSError, ValueError) as error:
            report.warning(f"apps/{record.path.name}", f"icon not included, using a placeholder: {error}")
            continue
        icons[record.id] = assets.add(f"icon-{record.id}", extension, content)
        originals[record.id] = original

    # An app's own pic0.dds (or pic1.dds), when it ships one, is the stage's picture instead of the ambient one.
    backdrops: dict[str, str] = {}
    if fetch_icons:
        for record in records:
            if record.reserved or record.icon_source is None:
                continue
            try:
                content = _backdrop(record, icon_cache)
            except (artifacts.DownloadError, OSError, ValueError) as error:
                report.warning(f"apps/{record.path.name}", f"pic0.dds/pic1.dds not used: {error}")
                continue
            if content:
                backdrops[record.id] = assets.add(f"backdrop-{record.id}", "webp", content)

    # Each app's ambient picture and main colour, for the themes that show them. The colours
    # go into the stylesheet as one rule per app: the pages carry no inline styles.
    ambients: dict[str, str] = {}
    accents: dict[str, str] = {}
    style = (theme_obj.directory / "style.css").read_bytes()
    if theme in AMBIENT_THEMES:
        plain = make_ambient(None)
        for record in records:
            made = make_ambient(originals.get(record.id)) if record.id in originals else plain
            if made is None:      # no Pillow: the theme's own picture and colour
                ambients[record.id] = assets.add("ambient", "png", (theme_obj.directory / "field.png").read_bytes())
                accents[record.id] = "#42358f"
                continue
            ambients[record.id] = assets.add(f"ambient-{record.id}", "png", made[0])
            accents[record.id] = made[1]
        style += b"\n/* Each app's main colour, from its icon. */\n" + "".join(
            f".tone-{rid}{{--tone:{colour}}}\n" for rid, colour in sorted(accents.items())).encode()
    css = assets.add(f"{theme}", "css", style)
    if icon_cache and icon_cache.is_dir() and fetch_icons:
        wanted = {hashlib.sha256(r.icon_source.encode()).hexdigest() + ".img"
                  for r in records if r.icon_source}
        wanted |= {hashlib.sha256((r.icon_source + BACKDROP_CACHE_KEY).encode()).hexdigest() + ".bg"
                   for r in records if r.icon_source}
        for entry in (*icon_cache.glob("*.img"), *icon_cache.glob("*.bg")):
            if entry.name not in wanted:
                entry.unlink()

    kinds = {kind: [r for r in records if r.data["kind"] == kind] for kind in KINDS}
    total = len(records)
    updated = last_updated(apps_dir)
    added = first_listed(apps_dir)
    from . import news as catalog_news
    news_items = catalog_news.load(ROOT / catalog_news.FILE, report)
    # Release facts (size, dates), asked once: the pages show the size, the API publishes all.
    from . import facts as release_facts
    from . import notes as release_notes
    known = {r.id: release_facts.cached(r, github, icon_cache) for r in records}
    from .scan import load_approved
    approved = load_approved()
    summaries = load_scans(scans, records)
    safety = {r.id: safety_facts(summaries.get(r.id), known[r.id][0].uploader, approved)
              for r in records if not r.reserved}

    def safety_section(record: Record) -> str:
        """The "Safety" part of an app's page; nothing when the release wasn't scanned."""
        facts = safety.get(record.id)
        if not facts:
            return ""
        # Each sentence carries its words' key (site/shared/i18n.js); the English is what the build writes.
        sandbox = {"stays": ("good", "sb.stays", "Stays in the sandbox", "The scan found no way for this app to reach "
                             "beyond its own files: no payload, no connection to the payload loader, no request to "
                             "a jailbreak service."),
                   "leaves": ("care", "sb.leaves", "Leaves the sandbox", "This app can get full access to the console, "
                              "usually to read and write files outside its own folder. Install it only if you trust "
                              "its developer."),
                   "unclear": ("care", "sb.unclear", "Sandbox: unclear", "The scan found weak signs that this app may "
                               "reach the payload loader, and could not settle it.")}[facts["sandbox"]]
        chips = [f'<li class="safety__chip safety__chip--{sandbox[0]}" data-i18n="{sandbox[1]}">{sandbox[2]}</li>']
        lines = [(sandbox[1] + ".text", "", sandbox[3])]
        if facts["helpers"]:
            counts = f' data-v-n="{facts["helpers"]}" data-v-u="{facts["helpers_unapproved"]}"'
            if facts["helpers_unapproved"]:
                chips.append(f'<li class="safety__chip safety__chip--care" data-i18n="helpers.unrev" '
                             f'data-v-n="{facts["helpers_unapproved"]}">{facts["helpers_unapproved"]} helper(s) not reviewed</li>')
                lines.append(("helpers.unrev.text", counts,
                              f"It ships {facts['helpers']} helper program(s) that run outside the sandbox; "
                              f"{facts['helpers_unapproved']} of them the catalog's maintainers have not read."))
            else:
                chips.append('<li class="safety__chip safety__chip--good" data-i18n="helpers.ok">Helpers reviewed</li>')
                lines.append(("helpers.ok.text", counts,
                              f"It ships {facts['helpers']} helper program(s) that run outside the sandbox, all "
                              "on the catalog's list of reviewed helpers."))
        build = {"attested": ("good", "Built by GitHub Actions", "GitHub holds a signed statement that a workflow of "
                              "the app's repository built exactly this file."),
                 "workflow": ("plain", "Released by a workflow", "A workflow of the app's repository attached this "
                              "file to the release. Nothing proves where it was built."),
                 "developer": ("plain", "Built by the developer", "The developer built and uploaded this file by "
                               "hand. Nothing ties it to the published source.")}.get(facts["build"])
        if build:
            chips.append(f'<li class="safety__chip safety__chip--{build[0]}" data-i18n="build.{facts["build"]}">{build[1]}</li>')
            lines.append((f"build.{facts['build']}.text", "", build[2]))
        text = "".join(f'<p data-i18n="{key}"{args}>{e(line)}</p>' for key, args, line in lines)
        return ('<h2 id="safety-title" data-i18n="safety.title">Safety</h2>\n'
                f'<ul class="safety" aria-label="Scan results" data-i18n-attr="aria-label:safety.aria">{"".join(chips)}</ul>\n'
                f'<div class="safety__text">{text}<p class="notes__source" data-i18n-html="safety.source">From an automatic '
                'scan of the release file, which is read and never run. It can miss things: it is not a guarantee. '
                '<a href="https://github.com/darkxex/ps5-homebrew-catalog/blob/main/docs/automation.md#release-scan">'
                'How the scan works</a></p></div>')

    def notes_section(record: Record, release_url: str) -> str:
        """The "Release notes" part of an app's page; nothing when the release has no notes."""
        body, cut = release_notes.as_html(known[record.id][0].notes)
        if not body:
            return ""
        more_key, more = ("notes.full", "Read the full notes on GitHub") if cut else ("notes.see", "See this release on GitHub")
        author, version = e(record.data["author"]), e(version_label(record.data["version"]))
        # The release notes themselves are the developer's words and stay as written.
        return ('<h2 id="notes-title" data-i18n="notes.title">Release notes</h2>\n'
                f'<div class="notes" data-translate data-translate-by="notes-title">\n{body}\n</div>\n'
                f'<p class="notes__source"><span data-i18n="notes.source" data-v-author="{author}" data-v-version="{version}">'
                f'Written by {author} for {version}. </span>'
                f'<a href="{e(release_url)}" rel="nofollow" data-i18n="{more_key}">{more}</a></p>')

    def page_url(record: Record) -> str:
        return f"{base}app/{record.id}/"

    sharing: dict[str, list[Record]] = {}
    for record in records:
        sharing.setdefault(record.titleid, []).append(record)

    def shared_id(record: Record) -> tuple[str, str]:
        """The chip and the note an app's page shows when another listed app has its title ID."""
        others = [r for r in sharing[record.titleid] if r.id != record.id]
        if not others:
            return "", ""
        links = ", ".join(f'<a href="{e(page_url(r))}">{e(r.data["name"])}</a>' for r in others)
        chip = '<li data-i18n="app.shared">The ID is not unique</li>'
        note = (f'<p class="idnote" data-i18n-html="app.sharednote" data-v-titleid="{e(record.titleid)}" '
                f'data-v-links="{e(links)}">Another app is listed with the title ID <code>{e(record.titleid)}</code>: {links}. '
                'A console holds one app per title ID, so installing this one replaces the other and they share '
                'save data.</p>')
        return chip, note

    def dev_url(record: Record) -> str:
        return f"{base}dev/{record.owner.casefold()}/"

    def app_values(record: Record, number: int) -> dict:
        d = record.data
        shared_chip, shared_note = shared_id(record)
        values = {k: "" if v is None else e(v) for k, v in d.items()}
        values.update(
            shared_chip=shared_chip,
            shared_note=shared_note,
            id=e(record.id),
            url=e(page_url(record)),
            icon=e(icons[record.id]),
            kind_label=e(KIND_LABELS[d["kind"]]),
            category_label=e(CATEGORIES[d["category"]]),
            category_rank=str(list(CATEGORIES).index(d["category"])),
            status="soon" if record.reserved else "available",
            format="",
            ambient=e(ambients.get(record.id, "")),
            backdrop=e(backdrops.get(record.id, "")),
            page_art=e(backdrops.get(record.id) or ambients.get(record.id, "")),
            page_art_class=" is-picture" if record.id in backdrops else "",
            accent=e(accents.get(record.id, "")),
            size_label=e(size_label(known[record.id][0].size)),
            author_html=e(d["author"]),
            downloads_chip="",
            downloads_row="",
        )
        if not record.reserved:
            values["author_html"] = f'<a href="{e(dev_url(record))}">{e(d["author"])}</a>'
            count = known[record.id][0].downloads
            if count is not None:
                values["downloads_chip"] = (f'<li data-i18n="n.downloads" data-v-n="{count}">'
                                            f'{count} download{"" if count == 1 else "s"}</li>')
                values["downloads_row"] = (f'<div><dt data-i18n="d.downloads">Downloads</dt><dd>{count}</dd></div>')
            fmt = artifact_format(record)
            values.update(
                source_short=e(f"{record.owner}/{record.repo}"),
                format=e(fmt),
                format_label=e(FORMAT_LABELS[fmt]),
                artifact_name=e(unquote(record.asset_name)),
                version_label=e(version_label(d["version"])),
                release_url=e(f"{d['source_repo']}/releases/tag/{d['artifact_url'].split('/releases/download/')[1].split('/')[0]}"),
                tag=e(record.tag),
                # Finds the app's discussion by its title ID; the page's script swaps in the exact address.
                comments_search=e(f"{REPO_URL}/discussions?discussions_q={record.id}"),
                safety=safety_section(record),
                notes=notes_section(
                    record, f"{d['source_repo']}/releases/tag/{d['artifact_url'].split('/releases/download/')[1].split('/')[0]}"),
            )
        values.update(
            number=f"{number:03d}",
            updated=e(display_date(updated[record.path.name])) if record.path.name in updated else "—",
            updated_iso=e(updated.get(record.path.name, "")),
            total=f"{total:03d}",
            search_text=e(" ".join((d["name"], d["author"], d["titleid"], d["description"], d["kind"],
                                    CATEGORIES[d["category"]]))),
        )
        return values

    numbered = {r.id: app_values(r, i) for i, r in enumerate(sorted(records, key=lambda r: r.id), 1)}

    def items(template: str, selection: list[Record]) -> str:
        """Render records with the data attributes the filter and sort script reads."""
        rendered = []
        for record in selection:
            values = dict(numbered[record.id])
            values["grid_attrs"] = (
                f' data-app data-app-kind="{values["kind"]}" data-status="{values["status"]}"'
                f' data-format="{values["format"]}"'
                f' data-category="{values["category"]}" data-category-rank="{values["category_rank"]}"'
                f' data-name="{e(record.data["name"].casefold())}" data-titleid="{values["titleid"]}" data-id="{values["id"]}"'
                f' data-author="{e(record.data["author"].casefold())}"'
                f' data-updated="{values["updated_iso"]}" data-search-text="{values["search_text"]}"'
                # When the catalog listed it, and when the release it lists was published: Discover
                # tells new apps from updated ones with them, not with the record's last change.
                f' data-added="{e(_utc(added.get(record.path.name)) or "")}"'
                f' data-released="{e(known[record.id][0].released or "")}"'
                # How many times GitHub has served the release file; the attribute is absent when it is unknown.
                + ('' if known[record.id][0].downloads is None else f' data-downloads="{known[record.id][0].downloads}"')
            )
            name = template.replace(".html", "-soon.html") if record.reserved else template
            rendered.append(theme_obj.render(name, values))
        return "\n".join(rendered)

    shared = {
        "base": base,
        "repo": REPO_URL,
        "comments_url": COMMENTS_URL,
        # The submit page when the theme has one; otherwise the guide.
        "submit_url": f"{base}submit/" if theme_obj.template("submit.html") else f"{REPO_URL}/blob/main/docs/submitting.md",
        "guide_url": f"{REPO_URL}/blob/main/docs/submitting.md",
        "css": css,
        "js": js,
        "i18n": i18n,
        "analytics": analytics,
        "fonts": e(FONT_URL.format(families=theme_obj.fonts)),
        "theme_color": theme_obj.color,
        "commit": e(commit),
        "commit_short": e(commit[:7]),
        "commit_time": _commit_time_html(source_commit_time(commit)),
        "app_count": total,
        "developer_count": len({r.data["author"].casefold() for r in records}),
        "game_count": len(kinds["game"]),
        "apps_only_count": len(kinds["app"]),
        "tool_count": len(kinds["tool"]),
        "soon_count": sum(1 for r in records if r.reserved),
        "feed_url": f"{base}catalog/v1.json",
    }
    base_tpl = theme_obj.template("base.html")

    def write_page(path: Path, *, title: str, description: str, canonical: str, body: str,
                   og_image: str | None = None, page_class: str = "") -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(base_tpl.substitute(
            shared, title=e(title), description=e(description), canonical=e(canonical),
            og_image=e(og_image or site_url + base + "favicon.svg"), body=body, page_class=page_class,
        ), encoding="utf-8")

    # Store front: the same catalog as cards (index) and as a list, sharing one toolbar.
    releases = [r for r in records if not r.reserved]
    chips = [f'<button type="button" class="chip" data-kind="all" aria-pressed="true">All <span>{total}</span></button>']
    chips += [f'<button type="button" class="chip" data-kind="{kind}" aria-pressed="false">{KIND_PLURALS[kind]} <span>{len(group)}</span></button>'
              for kind, group in kinds.items() if group]
    format_options = "".join(f'<option value="{fmt}">{e(FORMAT_LABELS[fmt])}</option>'
                             for fmt in sorted({artifact_format(r) for r in releases}))


    index_body = theme_obj.template("index.html").substitute(
        shared, cards=items("card.html", records), rows=items("row.html", records),
        toolbar=theme_obj.render("toolbar.html", dict(shared, chips="".join(chips), format_options=format_options)),
    )
    write_page(root / "index.html", title="PS5 Homebrew Store — community apps, games and tools",
               description=f"Browse {total} native PS5 homebrew apps, games and tools. Every download comes "
                           "from the developer's GitHub release and is pinned by SHA-256.",
               canonical=site_url + base, body=index_body, page_class="page-home")

    # App pages.
    for record in records:
        values = dict(shared, **numbered[record.id])
        if not record.reserved:
            values["steps"] = _install_steps(record)
        write_page(root / "app" / record.id / "index.html",
                   title=f"{record.data['name']} — PS5 Homebrew Store", description=record.data["description"],
                   canonical=site_url + page_url(record),
                   body=theme_obj.render("app-soon.html" if record.reserved else "app.html", values),
                   og_image=site_url + icons[record.id], page_class="page-app")

    # Submit page: a form that reads the developer's repository in the browser (site/shared/submit.js).
    submit_template = theme_obj.template("submit.html")
    if submit_template:
        category_options = "".join(f'<option value="{key}" data-i18n="cat.{key}">{e(label)}</option>'
                                   for key, label in CATEGORIES.items())
        kind_options = "".join(f'<option value="{kind}" data-i18n="kind.{kind}">{e(KIND_LABELS[kind])}</option>'
                               for kind in KINDS)
        submit_js = assets.add("submit", "js", (shared_dir / "submit.js").read_bytes())
        write_page(root / "submit" / "index.html", title="Submit an app — PS5 Homebrew Store",
                   description="Prepare the listing of your native PS5 app from its GitHub repository and open the pull request.",
                   canonical=site_url + base + "submit/", page_class="page-submit",
                   body=submit_template.substitute(shared, submit_js=submit_js, category_options=category_options,
                                                   kind_options=kind_options, catalog_url=f"{base}catalog/v1.json",
                                                   kind_categories=e(json.dumps(KIND_CATEGORIES, separators=(",", ":"))),
                                                   login_url=e(GITHUB_LOGIN_URL)))

    # One public page per developer: their listed apps, how they are doing, and the way to edit a listing.
    dev_template, dev_app_template = theme_obj.template("dev.html"), theme_obj.template("dev-app.html")
    if dev_template and dev_app_template:
        owners: dict[str, list[Record]] = {}
        for record in releases:
            owners.setdefault(record.owner.casefold(), []).append(record)
        for key, group in owners.items():
            owner = group[0].owner
            rows = []
            for record in group:
                values = numbered[record.id]
                count = known[record.id][0].downloads
                rows.append(dev_app_template.substitute(
                    values, edit_url=e(f"{REPO_URL}/edit/main/apps/{record.id}.json"),
                    downloads_html="—" if count is None else str(count)))
            known_counts = [known[r.id][0].downloads for r in group if known[r.id][0].downloads is not None]
            total_downloads = sum(known_counts)
            names = sorted({r.data["author"] for r in group}, key=str.casefold)
            credit = "" if [n.casefold() for n in names] == [owner.casefold()] else \
                f'<p class="page__line" translate="no">{e(", ".join(names))}</p>'
            write_page(root / "dev" / key / "index.html", title=f"{owner} — PS5 Homebrew Store",
                       description=f"{len(group)} native PS5 app(s) by {owner} in the PS5 Homebrew Store.",
                       canonical=f"{site_url}{base}dev/{key}/", page_class="page-dev",
                       body=dev_template.substitute(
                           shared, owner=e(owner), owner_url=e(f"https://github.com/{owner}"), credit_line=credit,
                           apps="\n".join(rows), app_total=str(len(group)),
                           badge_path=e(f"{base}press/"), badge_site=e(f"{site_url}{base}press/"),
                           badge_options="".join(
                               f'<option value="{e(r.id)}" data-page="{e(site_url + page_url(r))}">{e(r.data["name"])}</option>'
                               for r in group),
                           apps_label=f"{len(group)} app{'' if len(group) == 1 else 's'}",
                           downloads_chip=(f'<li data-i18n="n.downloads" data-v-n="{total_downloads}">{total_downloads} '
                                           f'download{"" if total_downloads == 1 else "s"}</li>' if known_counts else "")))

    # TV mode: a 10-foot interface for the PS5 browser, drawn by tv.js from data embedded in the page.
    tv_template = theme_obj.template("tv.html")
    if tv_template:
        host = site_url.split("://", 1)[-1]
        tv_apps = []
        for record in records:
            d = record.data
            item = {
                "id": record.id, "titleid": d["titleid"], "name": d["name"], "kind": d["kind"], "kind_label": KIND_LABELS[d["kind"]],
                "category": d["category"], "category_label": CATEGORIES[d["category"]],
                "description": d["description"], "author": d["author"], "version": d["version"] or "",
                "version_label": version_label(d["version"]) if d["version"] else "",
                "license": d["license"] or ("" if record.reserved else UNLICENSED), "soon": record.reserved, "icon": icons[record.id],
                "updated": display_date(updated[record.path.name]) if record.path.name in updated else "",
                "updated_iso": updated.get(record.path.name, ""), "short_url": host + page_url(record),
                "released_iso": known[record.id][0].released or "",
            }
            if not record.reserved:
                item.update(format=artifact_format(record), format_label=FORMAT_LABELS[artifact_format(record)], sha256=d["sha256"],
                            artifact_name=unquote(record.asset_name), source=f"{record.owner}/{record.repo}",
                            steps=_install_steps_text(record))
            tv_apps.append(item)
        available = [r for r in records if not r.reserved]
        rail = [("all", "All", total)] + [(kind, KIND_PLURALS[kind], sum(1 for r in available if r.data["kind"] == kind))
                                          for kind in KINDS]
        rail.append(("soon", "Coming soon", total - len(available)))
        # Each label carries its words' key (site/shared/i18n.js); a section's name is the tab's.
        tab_keys = {"all": "tab.all", "app": "tab.apps", "game": "tab.games", "tool": "tab.tools", "soon": "tab.soon"}
        rail_html = "\n".join(f'  <button type="button" class="tv-rail__item" data-kind="{kind}" tabindex="-1" '
                              f'data-i18n="{tab_keys[kind]}">{label}<span>{count}</span></button>'
                              for kind, label, count in rail if count)
        # Then the categories, each a section of its own (tv.js reads "cat:<key>").
        shelf = {key: sum(1 for r in available if r.data["category"] == key) for key in CATEGORIES}
        if any(shelf.values()):
            rail_html += '\n  <p class="tv-rail__label" data-i18n="tv.cats">Categories</p>\n' + "\n".join(
                f'  <button type="button" class="tv-rail__item tv-rail__item--cat" data-kind="cat:{key}" tabindex="-1" '
                f'data-i18n="cat.{key}">{e(label)}<span>{shelf[key]}</span></button>' for key, label in CATEGORIES.items() if shelf[key])
        data = json.dumps({"apps": tv_apps, "categories": [{"key": key, "label": label} for key, label in CATEGORIES.items()]},
                          ensure_ascii=False, separators=(",", ":"))
        (root / "tv").mkdir()
        (root / "tv" / "index.html").write_text(tv_template.substitute(
            shared, canonical=e(site_url + base + "tv/"), rail=rail_html,
            tv_css=assets.add(f"{theme}-tv", "css", (theme_obj.directory / "tv.css").read_bytes()),
            tv_js=assets.add("tv", "js", (shared_dir / "tv.js").read_bytes()),
            # qrcode-generator (MIT), unchanged: tv.js draws the QR codes of the detail view with it.
            tv_qr=assets.add("qrcode", "js", (shared_dir / "qrcode.js").read_bytes()),
            # Inside <script type="application/json">, "<" is escaped so no value can close the element.
            data=data.replace("<", "\\u003c"),
        ), encoding="utf-8")

    # 404 page, served by GitHub Pages for unknown paths.
    for target in {out / "404.html", root / "404.html"}:
        write_page(target, title="Not found — PS5 Homebrew Store", description="Page not found.",
                   canonical=site_url + base, body=theme_obj.render("404.html", shared), page_class="page-404")

    # Feed for the console store and other clients.
    feed = {
        "schema": FEED_SCHEMA,
        "name": "PS5 Homebrew Catalog",
        "homepage": site_url + base,
        "source": {"repository": REPO_URL, "commit": commit},
        "apps": [
            {**r.data, "format": artifact_format(r), "updated": updated.get(r.path.name),
             "page": site_url + page_url(r), "icon": site_url + icons[r.id]}
            for r in sorted(releases, key=lambda r: r.id)
        ],
        "coming_soon": [
            {**r.data, "updated": updated.get(r.path.name),
             "page": site_url + page_url(r), "icon": site_url + icons[r.id]}
            for r in sorted((r for r in records if r.reserved), key=lambda r: r.id)
        ],
    }
    (root / "catalog").mkdir()
    (root / "catalog" / "v1.json").write_text(
        json.dumps(feed, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    write_api(root / "api" / API_VERSION, f"{site_url}{base}api/{API_VERSION}/", records, report,
              updated=updated, icons=api_icons, icon_hashes=icon_hashes,
              # A mirror of the API has no pages of its own: its `page` links go to the website.
              page=lambda r: (pages_url.rstrip("/") + f"/app/{r.id}/") if pages_url else site_url + page_url(r),
              commit=commit,
              github=github, cache=icon_cache, known=known, safety=safety,
              added=added, news=news_items)

    # Header and redirect rules, for a host that reads _headers and _redirects; GitHub Pages ignores them.
    csp = ("default-src 'self'; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; "
           "style-src 'self' https://fonts.googleapis.com; "
           "font-src https://fonts.gstatic.com; script-src 'self' https://www.googletagmanager.com; "
           "connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://translate.googleapis.com "
           "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; "
           "base-uri 'self'; form-action 'none'; frame-ancestors 'none'")
    (out / "_headers").write_text(f"""/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: {csp}

{base}assets/*
  Cache-Control: public, max-age=31536000, immutable

{base}press/*
  Cache-Control: public, max-age=86400
  Access-Control-Allow-Origin: *

{base}catalog/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300, must-revalidate

{base}api/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300, must-revalidate

{base}api/*/manifest.sig
  Content-Type: application/octet-stream

{base}api/*/news.sig
  Content-Type: application/octet-stream
""", encoding="utf-8")
    redirects = [f"/ {base} 302", f"{base.rstrip('/')} {base} 301"] if base != "/" else []
    redirects += [f"{base}list {base}?view=list 301", f"{base}list/ {base}?view=list 301",
                  f"/favicon.ico {base}favicon.svg 301"]
    for old in LEGACY_BASES:
        if old != base:
            redirects += [f"{old}list {base}?view=list 301", f"{old}list/ {base}?view=list 301",
                          f"{old.rstrip('/')} {base} 301", f"{old}* {base}:splat 301"]
    for gone in withdrawn_ids(apps_dir, {r.id for r in records}):
        redirects += [f"{base}app/{gone}/ {base} 302", f"{base}app/{gone} {base} 302"]
        # Its API file is replaced as well. Written after the manifest and so not named in it:
        # an app that is absent from the manifest is not in the catalog.
        _write_json(root / "api" / API_VERSION / "apps" / f"{gone}.json",
                    {"schema": API_SCHEMA, "id": gone, "titleid": gone[:9], "status": "withdrawn"})
    (out / "_redirects").write_text("\n".join(redirects) + "\n", encoding="utf-8")
    (out / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
    return total
