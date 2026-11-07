/* The submit page: from a GitHub repository to a listing file and a pull request, all in the browser.

   It does in JavaScript what `python3 -m catalog draft` does (catalog/draft.py), with the facts GitHub
   proves: the newest release, its file and digest, the title ID in sce_sys/param.json at the release tag,
   the icon and the license. What needs judgement (type, category, description, name) the developer fills.
   Nothing is sent to this site. The listing opens as a new file in GitHub's own editor, which forks the
   catalog for a visitor without write access, so the pull request comes from the developer's account, as
   the check requires. The catalog's CI validates the file again; this page only saves a round trip.
   No inline styles or handlers: the site's content security policy allows neither. */
(function () {
  "use strict";

  var API = "https://api.github.com";
  var RAW = "https://raw.githubusercontent.com";
  var ARTIFACTS = /\.(zip|ffpkg|ffpfsc)$/i;
  var TITLE_ID = /^[A-Z]{4}[0-9]{5}$/;
  var BLOCKED_PREFIXES = ["CUSA", "NPXS"];
  var RESERVED_IDS = ["PPSA99999"];
  var LICENSE = /^[A-Za-z0-9.+-]+(?: (?:AND|OR|WITH) [A-Za-z0-9.+-]+)*$/;
  var MAX_ICON = 2 * 1024 * 1024;
  var MAX_URL = 7500;     // GitHub refuses very long addresses
  var UNLICENSED = "Unlicensed";

  function $(selector, root) { return (root || document).querySelector(selector); }
  function t(key, vars) { return window.I18N ? window.I18N.t(key, vars || {}) : key; }

  /* A reason to stop (or to take a look), as the key of its words and the values in them. */
  function problem(key, vars) { return { key: key, vars: vars || {} }; }
  function Stop(list) { this.list = list; }

  /* GitHub's answers are kept in this tab for ten minutes: the limit for requests without sign-in is 60 an hour. */
  var KEEP = 10 * 60 * 1000;
  function kept(path) {
    try {
      var entry = JSON.parse(window.sessionStorage.getItem("catalog-submit:" + path));
      if (entry && Date.now() - entry.at < KEEP) return entry;
    } catch (error) { /* no storage, or not ours */ }
    return null;
  }
  function keep(path, data) {
    try { window.sessionStorage.setItem("catalog-submit:" + path, JSON.stringify({ at: Date.now(), data: data })); } catch (error) { /* full or blocked */ }
  }

  /* The GitHub sign-in token, when the developer used "Sign in with GitHub": kept for this tab only. */
  var TOKEN = "catalog-submit-token";
  function token(value) {
    try {
      if (value === undefined) return window.sessionStorage.getItem(TOKEN) || "";
      if (value) window.sessionStorage.setItem(TOKEN, value); else window.sessionStorage.removeItem(TOKEN);
    } catch (error) { /* no storage: signed out */ }
    return "";
  }

  function headers() {
    var found = { Accept: "application/vnd.github+json" };
    if (token()) found.Authorization = "Bearer " + token();
    return found;
  }

  function get(path) {
    var hit = kept(path);
    if (hit) return Promise.resolve(hit.data);
    return window.fetch(API + path, { credentials: "omit", headers: headers() }).then(function (answer) {
      if (answer.status === 401 && token()) { token(null); return get(path); }     // a token GitHub no longer accepts
      if (answer.status === 404) { keep(path, null); return null; }
      if (answer.status === 403 || answer.status === 429) {
        var reset = Number(answer.headers.get("x-ratelimit-reset"));
        var when = reset ? new Date(reset * 1000).toLocaleTimeString(window.I18N ? window.I18N.lang : undefined, { hour: "2-digit", minute: "2-digit" }) : "";
        throw new Stop([when ? problem("submit.err.rate.at", { time: when }) : problem("submit.err.rate")]);
      }
      if (!answer.ok) throw new Stop([problem("submit.err.net")]);
      return answer.json().then(function (data) { keep(path, data); return data; });
    }, function () { throw new Stop([problem("submit.err.net")]); });
  }

  function raw(url, binary) {
    return window.fetch(url, { credentials: "omit" }).then(function (answer) {
      if (!answer.ok) return null;
      return binary ? answer.arrayBuffer() : answer.text();
    }, function () { return null; });
  }

  function segments(path) { return path.split("/").map(encodeURIComponent).join("/"); }

  /* owner/repository, or a github.com address. */
  function parseRepo(value) {
    var text = String(value || "").trim();
    var match = text.match(/^(?:https?:\/\/(?:www\.)?github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[\/?#].*)?$/);
    return match ? [match[1], match[2]] : null;
  }

  function tagVersion(tag) { return /^[vV][0-9]/.test(tag) ? tag.slice(1) : tag; }

  /* Width and height of a PNG, or null when the bytes are not one. */
  function pngSize(buffer) {
    var view = new DataView(buffer);
    if (buffer.byteLength < 24 || view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) return null;
    return [view.getUint32(16), view.getUint32(20)];
  }

  /* The README's first paragraph of plain text (no headings, badges, images, HTML or tables), as a
     starting point for the description: at most 200 characters, cut at the end of a sentence if it can. */
  function firstParagraph(markdown) {
    var text = String(markdown || "").replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n?/g, "\n");
    var paragraphs = [];
    var current = [];
    var fenced = false;
    text.split("\n").forEach(function (line) {
      var plain = line.trim();
      if (/^(```|~~~)/.test(plain)) { fenced = !fenced; plain = ""; }
      var skip = fenced || /^(#|!\[|\[!\[|<|\||>|[-*+] |\d+[.)] |---|===)/.test(plain);
      if (!plain || skip) {
        if (current.length) paragraphs.push(current.join(" "));
        current = [];
      } else {
        current.push(plain);
      }
    });
    if (current.length) paragraphs.push(current.join(" "));
    for (var i = 0; i < paragraphs.length; i++) {
      var clean = paragraphs[i].replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/<[^>]*>/g, "").replace(/[`*_]/g, "").replace(/\s+/g, " ").trim();
      if (clean.length < 20) continue;
      if (clean.length <= 200) return clean;
      var cut = clean.slice(0, 200);
      var sentence = cut.search(/[.!?](?=\s[^.!?]*$)/);
      return sentence > 60 ? cut.slice(0, sentence + 1) : cut.replace(/\s+\S*$/, "") + "…";
    }
    return "";
  }

  /* The bytes as a data: address, so the page can show the icon without a new address in its content security policy. */
  function dataUrl(buffer, type) {
    var bytes = new Uint8Array(buffer);
    var text = "";
    for (var i = 0; i < bytes.length; i += 8192) text += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return "data:image/" + (type || "png") + ";base64," + window.btoa(text);
  }

  /* "png", "jpeg" or "webp" by the file's first bytes, or "" when it is none of them. */
  function imageType(buffer) {
    var b = new Uint8Array(buffer.slice(0, 12));
    if (pngSize(buffer)) return "png";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" && String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP") return "webp";
    return "";
  }

  /* Which of the release's files is most likely the app: not the source code or debug files, and with the title ID in its name. */
  function pickAsset(assets, titleid) {
    var avoid = /(^|[-_.])(src|source|sources|debug|dbg|symbols)([-_.]|$)/i;
    var best = 0;
    var bestScore = -9;
    assets.forEach(function (one, index) {
      var score = (avoid.test(one.name) ? -2 : 0) + (one.name.indexOf(titleid) !== -1 ? 1 : 0) + (one.digest ? 0 : -1);
      if (score > bestScore) { best = index; bestScore = score; }
    });
    return best;
  }

  function megabytes(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  /* The published releases that have a file to list, newest first. A draft is skipped, and so is a tag
     without a digit: it holds build files, not a version. */
  function candidates(releases) {
    return (releases || []).filter(function (release) {
      return !release.draft && /[0-9]/.test(release.tag_name || "") &&
        (release.assets || []).some(function (one) { return ARTIFACTS.test(one.name); });
    });
  }

  /* param.json files of native titles: those with an icon0.png beside them first (the app's own sce_sys, not a
     sample's or a stale copy), then the nearest the repository root. */
  function paramFiles(tree) {
    var blobs = (tree.tree || []).filter(function (item) { return item.type === "blob"; }).map(function (item) { return item.path; });
    var icons = {};
    blobs.forEach(function (path) { icons[path] = true; });
    return blobs.filter(function (path) { return /(^|\/)sce_sys\/param\.json$/.test(path); }).sort(function (a, b) {
      var withIcon = function (path) { return icons[path.replace(/param\.json$/, "icon0.png")] ? 0 : 1; };
      return (withIcon(a) - withIcon(b)) || (a.split("/").length - b.split("/").length) || (a < b ? -1 : a > b ? 1 : 0);
    });
  }

  /* ---- Reading a ZIP the developer chooses from their own disk (nothing is uploaded) ---- */

  var MAX_ZIP = 400 * 1024 * 1024;     // the whole file is read to compare it with GitHub's hash
  var MAX_PARAM = 65536;

  function hexOf(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (byte) { return (byte < 16 ? "0" : "") + byte.toString(16); }).join("");
  }

  /* The files of a ZIP (name, method, sizes, where each starts), or null when it isn't one this page can read. */
  function readZip(buffer) {
    var view = new DataView(buffer);
    var end = -1;
    for (var i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) return null;
    var count = view.getUint16(end + 10, true);
    var at = view.getUint32(end + 16, true);
    if (count === 0xffff || at === 0xffffffff) return null;             // ZIP64: not read here
    var decoder = new TextDecoder();
    var entries = [];
    for (var n = 0; n < count; n++) {
      if (at + 46 > buffer.byteLength || view.getUint32(at, true) !== 0x02014b50) return null;
      var nameLength = view.getUint16(at + 28, true);
      entries.push({
        name: decoder.decode(new Uint8Array(buffer, at + 46, nameLength)),
        encrypted: !!(view.getUint16(at + 8, true) & 1), method: view.getUint16(at + 10, true),
        packed: view.getUint32(at + 20, true), size: view.getUint32(at + 24, true), local: view.getUint32(at + 42, true)
      });
      at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    }
    return entries;
  }

  /* One file out of the ZIP, as an ArrayBuffer, or null when it can't be read (a method this browser can't undo). */
  function zipFile(buffer, entry, limit) {
    if (entry.encrypted || entry.size > limit) return Promise.resolve(null);
    var view = new DataView(buffer);
    if (entry.local + 30 > buffer.byteLength || view.getUint32(entry.local, true) !== 0x04034b50) return Promise.resolve(null);
    var start = entry.local + 30 + view.getUint16(entry.local + 26, true) + view.getUint16(entry.local + 28, true);
    var packed = buffer.slice(start, start + entry.packed);
    if (entry.method === 0) return Promise.resolve(packed);
    if (entry.method !== 8 || typeof DecompressionStream === "undefined") return Promise.resolve(null);
    var stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).arrayBuffer().catch(function () { return null; });
  }

  /* The entry whose path ends with `suffix`, the one nearest the top first. */
  function zipEntry(entries, suffix) {
    var found = entries.filter(function (entry) {
      return entry.name.slice(-1) !== "/" && (entry.name === suffix || entry.name.slice(-suffix.length - 1) === "/" + suffix);
    }).sort(function (a, b) { return (a.name.split("/").length - b.name.split("/").length) || (a.name < b.name ? -1 : 1); });
    return found[0] || null;
  }

  /* This release has no sce_sys/param.json in the repository: the developer may give the release's ZIP instead. */
  function NeedZip() {}

  /* What GitHub says about the repository, apart from any one release: resolves to a state, or rejects with a Stop. */
  function inspectRepo(owner, name, catalogUrl) {
    var state = { repoWarnings: [], warnings: [] };
    var seen = [];
    return get("/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name)).then(function (repo) {
      if (!repo || repo.private) throw new Stop([problem("submit.err.notfound", { repo: owner + "/" + name })]);
      state.fullName = repo.full_name;
      state.owner = repo.full_name.split("/")[0];
      state.name = repo.full_name.split("/")[1];
      state.sourceRepo = "https://github.com/" + repo.full_name;
      state.branch = repo.default_branch || "";
      // The repository's own description is a starting point; the developer edits it.
      state.description = typeof repo.description === "string" ? repo.description.replace(/\s+/g, " ").trim().slice(0, 200) : "";
      var spdx = repo.license && repo.license.spdx_id;
      state.license = spdx && spdx !== "NOASSERTION" ? spdx : "";
      if (repo.archived) state.repoWarnings.push(problem("submit.warn.archived"));
      if (!state.license) state.repoWarnings.push(problem("submit.warn.license"));
      return get("/repos/" + repo.full_name + "/releases?per_page=20");
    }).then(function (releases) {
      seen = (releases || []).filter(function (release) { return !release.draft; });
      state.releases = candidates(releases);
      if (!state.releases.length) throw new Stop([problem(seen.length ? "submit.err.asset" : "submit.err.release")]);
      return get("/users/" + encodeURIComponent(state.owner));
    }).then(function (user) {
      state.author = (user && user.name) || state.owner;
      return window.fetch(catalogUrl, { credentials: "same-origin" }).then(function (answer) {
        return answer.ok ? answer.json() : null;
      }, function () { return null; });
    }).then(function (feed) {
      state.feed = ((feed && feed.apps) || []).concat((feed && feed.coming_soon) || []);
      var listed = state.feed.filter(function (other) {
        return other.source_repo && other.source_repo.toLowerCase() === state.sourceRepo.toLowerCase();
      });
      if (listed.length) throw new Stop([problem("submit.err.listed", { repo: state.fullName, name: listed[0].name })]);
      return state;
    });
  }

  /* One release of the repository: its files and its param.json at the tag; rejects with a Stop when this release
     can't be listed, or with a NeedZip when the repository doesn't hold param.json (the ZIP may). */
  function inspectRelease(state, release) {
    state.warnings = state.repoWarnings.slice();
    state.tag = release.tag_name;
    state.assets = (release.assets || []).filter(function (a) { return ARTIFACTS.test(a.name); });
    state.zipAsset = null;
    state.ref = state.tag;
    // The default branch first (its latest commit, pinned by SHA), then the release's tag; the tree is always read, since the
    // app's own sce_sys/ (with its icon) may sit in a folder such as kit/ while the root holds a stale copy.
    var look = function (ref) {
      return get("/repos/" + state.fullName + "/git/trees/" + encodeURIComponent(ref) + "?recursive=1").then(function (tree) {
        var params = paramFiles(tree || {});
        if (!params.length) return null;
        return { ref: ref, params: params };
      });
    };
    var onBranch = state.branch
      ? get("/repos/" + state.fullName + "/commits/" + encodeURIComponent(state.branch)).then(function (commit) {
          return commit && commit.sha ? look(commit.sha) : null;
        })
      : Promise.resolve(null);
    return onBranch.then(function (found) {
      return found || look(state.tag);
    }).then(function (found) {
      if (!found) throw new NeedZip();
      if (found.params.length > 1) state.warnings.push(problem("submit.warn.params", { path: found.params[0] }));
      state.ref = found.ref;
      state.paramPath = found.params[0];
      return raw(RAW + "/" + state.fullName + "/" + encodeURIComponent(found.ref) + "/" + segments(found.params[0]));
    }).then(function (text) {
      return completeRelease(state, text, null);
    });
  }

  /* The rest of a release, once its param.json is in hand: the title, an icon link to start from, the README's first
     paragraph, and how the title ID sits in the catalog. `zip` ({ param }) says the param.json came from inside the
     release file, under that path. */
  function completeRelease(state, text, zip) {
    var param = null;
    try { param = JSON.parse(text || ""); } catch (error) { /* reported below */ }
    var id = param && typeof param.titleId === "string" ? param.titleId : "";
    if (!TITLE_ID.test(id) || BLOCKED_PREFIXES.indexOf(id.slice(0, 4)) !== -1 || RESERVED_IDS.indexOf(id) !== -1) {
      return Promise.reject(new Stop([problem("submit.err.title", { id: id || "?" })]));
    }
    var localized = param.localizedParameters || {};
    var language = localized.defaultLanguage || "en-US";
    state.titleid = id;
    state.title = ((localized[language] || {}).titleName || "").trim();
    state.iconUrl = "";
    state.iconData = "";
    // The icon is a link, and the listing needs one; the repository's icon0.png is only where to start looking.
    // When param.json came from the ZIP its folder in the repository is unknown: the usual sce_sys/ at the root is tried.
    var base = zip ? zip.param.slice(Math.max(0, zip.param.indexOf("sce_sys/"))) : state.paramPath;
    var iconPath = base.replace(/param\.json$/, "icon0.png");
    state.iconUrl = RAW + "/" + state.fullName + "/" + encodeURIComponent(state.ref || state.tag) + "/" + segments(iconPath);
    var icon = raw(state.iconUrl, true);
    return icon.then(function (icon) {
      var type = icon && icon.byteLength <= MAX_ICON ? imageType(icon) : "";
      var size = type === "png" ? pngSize(icon) : null;
      if (!type) {
        state.iconUrl = "";
        state.warnings.push(problem("submit.warn.noicon"));
      } else {
        state.iconData = dataUrl(icon, type);
        if (size && (size[0] !== size[1] || size[0] < 256)) state.warnings.push(problem("submit.warn.icon", { w: size[0], h: size[1] }));
      }
      if (state.description) return null;
      return raw(RAW + "/" + state.fullName + "/" + encodeURIComponent(state.ref || state.tag) + "/README.md").then(function (readme) {
        state.description = firstParagraph(readme);
      });
    }).then(function () {
      // The site's feed can be older than the catalog (or, in a test build, partial): ask the catalog itself too.
      return raw(state.catalogRaw + state.titleid + ".json");
    }).then(function (text) {
      var record = null;
      try { record = JSON.parse(text || ""); } catch (error) { /* not listed under this title ID */ }
      if (record && record.titleid === state.titleid && !state.feed.some(function (other) {
        return other.titleid === record.titleid && other.source_repo === record.source_repo;
      })) state.feed = state.feed.concat([record]);
      state.file = state.titleid;
      var stops = [];
      state.feed.forEach(function (other) {
        if (other.source_repo && other.source_repo.toLowerCase() === state.sourceRepo.toLowerCase()) {
          stops.push(problem("submit.err.listed", { repo: state.fullName, name: other.name }));
          return;
        }
        if (other.titleid !== state.titleid) {
          if (state.title && other.name && other.name.toLowerCase() === state.title.toLowerCase()) {
            state.warnings.push(problem("submit.warn.name", { name: other.name }));
          }
          return;
        }
        var theirs = other.source_repo ? other.source_repo.split("/")[3] : "";
        if (theirs && theirs.toLowerCase() === state.owner.toLowerCase()) {
          stops.push(problem("submit.err.shared", { id: state.titleid, name: other.name }));
        } else {
          state.file = state.titleid + "-" + state.owner.toLowerCase();
          state.warnings.push(problem("submit.warn.shared", { id: state.titleid, name: other.name, file: state.file }));
        }
      });
      if (stops.length) throw new Stop(stops);
      return state;
    });
  }

  function start(box) {
    var catalogUrl = box.getAttribute("data-catalog");
    var catalogRepo = box.getAttribute("data-repo");
    var input = $("[data-submit-repo]", box);
    var button = $("[data-submit-check]", box);
    var status = $("[data-submit-status]", box);
    var blockers = $("[data-submit-blockers]", box);
    var blockersList = $("[data-submit-blockers-list]", box);
    var step = $("[data-submit-step]", box);
    var releaseSelect = $("[data-submit-release]", box);
    var zipBox = $("[data-submit-zip]", box);
    var zipWhy = $("[data-submit-zip-why]", box);
    var zipInput = $("[data-submit-zip-file]", box);
    var zipStatus = $("[data-submit-zip-status]", box);
    var listedBox = $("[data-submit-listed]", box);
    var listedLink = $("[data-submit-listed-link]", box);
    var detail = $("[data-submit-detail]", box);
    var facts = $("[data-submit-facts]", box);
    var iconImage = $("[data-submit-icon]", box);
    var iconUrl = $("[data-submit-icon-url]", box);
    var iconNote = $("[data-submit-icon-note]", box);
    var iconTimer = null;
    var iconTicket = 0;
    var warnings = $("[data-submit-warnings]", box);
    var warningsList = $("[data-submit-warnings-list]", box);
    var assetNote = $("[data-submit-asset-note]", box);
    var asset = $("[data-submit-asset]", box);
    var kind = $("[data-submit-kind]", box);
    var category = $("[data-submit-category]", box);
    var description = $("[data-submit-description]", box);
    var chars = $("[data-submit-chars]", box);
    var author = $("[data-submit-author]", box);
    var license = $("[data-submit-license]", box);
    var path = $("[data-submit-path]", box);
    var json = $("[data-submit-json]", box);
    var trouble = $("[data-submit-problem]", box);
    var open = $("[data-submit-open]", box);
    var copy = $("[data-submit-copy]", box);
    // "Sign in with GitHub", when the site was built with the address of its Worker (worker/github-login).
    var loginUrl = box.getAttribute("data-login") || "";
    var loginBox = $("[data-submit-login]", box);
    var loginButton = $("[data-submit-login-button]", box);
    var loginWho = $("[data-submit-login-who]", box);
    var logoutButton = $("[data-submit-logout]", box);
    var loginHint = $("[data-submit-login-hint]", box);
    var loginOrigin = "";
    try { loginOrigin = loginUrl ? new URL(loginUrl).origin : ""; } catch (error) { loginUrl = ""; }

    function paintLogin(name) {
      var signedIn = !!token();
      loginButton.hidden = signedIn;
      loginHint.hidden = signedIn;
      logoutButton.hidden = !signedIn;
      loginWho.hidden = !signedIn;
      loginWho.textContent = signedIn && name ? t("submit.login.as", { name: name }) : "";
    }

    function whoAmI() {
      if (!token()) { paintLogin(""); return; }
      paintLogin("");
      window.fetch(API + "/user", { credentials: "omit", headers: headers() }).then(function (answer) {
        if (answer.status === 401) { token(null); return null; }
        return answer.ok ? answer.json() : null;
      }, function () { return null; }).then(function (user) { paintLogin(user && user.login); });
    }

    /* The sign-in is offered only where GitHub's limit has stopped the page; it is the way past it. */
    function offerLogin(list) {
      loginBox.hidden = !(loginUrl && list.some(function (one) { return one.key.indexOf("submit.err.rate") === 0; }));
    }

    if (loginUrl) {
      whoAmI();
      loginButton.addEventListener("click", function () {
        window.open(loginUrl + "/login?origin=" + encodeURIComponent(window.location.origin), "github-login", "width=620,height=760");
      });
      logoutButton.addEventListener("click", function () { token(null); paintLogin(""); });
      window.addEventListener("message", function (event) {
        var data = event.data;
        if (event.origin !== loginOrigin || !data || data.type !== "github-login") return;
        if (typeof data.token === "string" && data.token) {
          token(data.token);
          whoAmI();
          if (parseRepo(input.value)) run();      // the check that was stopped, again, now with the larger limit
        } else {
          status.textContent = t("submit.login.fail");
        }
      });
    }

    var state = null;      // the release on screen, once it is read
    var repoState = null;  // the repository, whose releases are chosen from
    var ticket = 0;
    // The categories of each kind (the build writes them); the select lists only the kind's own.
    var kindCategories = {};
    try { kindCategories = JSON.parse(box.getAttribute("data-kind-categories") || "{}"); } catch (error) { /* all shown */ }
    var categoryOptions = Array.prototype.slice.call(category.options);

    function offerCategories() {
      var allowed = kindCategories[kind.value] || [];
      var keep = allowed.indexOf(category.value) !== -1 ? category.value : "";
      category.textContent = "";
      categoryOptions.forEach(function (option) {
        if (!option.value || allowed.indexOf(option.value) !== -1) category.appendChild(option);
      });
      category.value = keep;
      category.disabled = !allowed.length;
    }

    function fill(list, items) {
      list.textContent = "";
      items.forEach(function (item) {
        var line = document.createElement("li");
        line.textContent = t(item.key, item.vars);
        list.appendChild(line);
      });
    }

    function fact(label, value) {
      var row = document.createElement("div");
      var term = document.createElement("dt");
      term.textContent = t(label);
      var detail = document.createElement("dd");
      detail.textContent = value;
      row.appendChild(term);
      row.appendChild(detail);
      facts.appendChild(row);
    }

    function chosen() {
      return state.assets[Number(asset.value) || 0];
    }

    /* The listing as the catalog stores it: the fields in their order, two spaces, a final newline. */
    function record() {
      var file = chosen();
      var digest = file && file.digest && file.digest.indexOf("sha256:") === 0 ? file.digest.slice(7) : "";
      var data = {
        titleid: state.titleid, name: state.title, kind: kind.value, category: category.value,
        description: description.value.trim(), license: license.value.trim(), author: author.value.trim(),
        version: tagVersion(state.tag), source_repo: state.sourceRepo,
        artifact_url: state.sourceRepo + "/releases/download/" + encodeURIComponent(state.tag) + "/" + (file ? file.name : ""),
        sha256: digest, icon_url: iconUrl.value.trim()
      };
      return data;
    }

    function refresh() {
      if (!state) return;
      var data = record();
      var text = JSON.stringify(data, null, 2) + "\n";
      var target = "apps/" + state.file + ".json";
      path.textContent = target;
      json.textContent = text;
      chars.textContent = t("submit.chars", { n: description.value.trim().length });
      var link = catalogRepo + "/new/main?filename=" + "apps/" + encodeURIComponent(state.file + ".json") + "&value=" + encodeURIComponent(text);
      var why = null;
      if (!data.sha256) why = problem("submit.err.digest", { file: chosen() ? chosen().name : "?" });
      else if (!data.name) why = problem("submit.err.name");
      else if (state.iconProblem) why = state.iconProblem;
      else if (!data.kind || !data.category || !data.description || !data.author || !data.license) why = problem("submit.err.fill");
      else if (!LICENSE.test(data.license)) why = problem("submit.err.license");
      else if (link.length > MAX_URL) why = problem("submit.err.long", { file: target });
      // A field that is empty (or, for the license, not an identifier) is marked in red.
      [[kind, !data.kind], [category, !data.category], [description, !data.description], [author, !data.author],
       [license, !data.license || !LICENSE.test(data.license)], [iconUrl, !!state.iconProblem]].forEach(function (pair) {
        pair[0].classList.toggle("is-missing", pair[1]);
        pair[0].setAttribute("aria-invalid", pair[1] ? "true" : "false");
      });
      // Missing fields are not an error yet: a quiet hint says why the button waits.
      trouble.hidden = !why;
      trouble.classList.toggle("portal__problem--hint", !!why && why.key === "submit.err.fill");
      if (why) trouble.textContent = t(why.key, why.vars);
      if (why) {
        open.setAttribute("aria-disabled", "true");
        open.removeAttribute("href");
      } else {
        open.removeAttribute("aria-disabled");
        open.setAttribute("href", link);
      }
    }

    function showIcon(source) {
      if (source) iconImage.src = source; else iconImage.removeAttribute("src");
      iconImage.parentNode.hidden = !source;
    }

    /* The icon link the developer typed: the catalog's rule for its shape, and a look at the picture when
       the page may read it (the content security policy lets it fetch from raw.githubusercontent.com only). */
    function checkIcon() {
      var value = iconUrl.value.trim();
      var mine = ++iconTicket;
      var parsed = null;
      try { parsed = new URL(value); } catch (error) { /* reported below */ }
      state.iconProblem = null;
      iconNote.textContent = "";
      iconNote.classList.remove("is-warn");
      if (!parsed || parsed.protocol !== "https:" || value.length > 500 || parsed.hash ||
          !/\.(png|jpe?g|webp)$/i.test(parsed.pathname)) {
        state.iconProblem = problem("submit.err.iconlink");
        showIcon("");
        refresh();
        return;
      }
      if (parsed.hostname !== "raw.githubusercontent.com") {
        showIcon("");
        iconNote.textContent = "⚠ " + t("submit.icon.other");
        iconNote.classList.add("is-warn");
        refresh();
        return;
      }
      raw(value, true).then(function (buffer) {
        if (mine !== iconTicket || !state) return;
        var type = buffer && buffer.byteLength <= MAX_ICON ? imageType(buffer) : "";
        var wanted = /\.png$/i.test(parsed.pathname) ? "png" : /\.webp$/i.test(parsed.pathname) ? "webp" : "jpeg";
        if (!type || type !== wanted) {
          state.iconProblem = problem("submit.err.iconread");
          showIcon("");
        } else {
          showIcon(dataUrl(buffer, type));
        }
        refresh();
      });
    }

    /* The release on screen. What the developer typed (type, category, description, name, license) is kept
       when only the release changes. */
    function show(found, keep) {
      state = found;
      blockers.hidden = true;
      found.iconProblem = null;
      zipBox.hidden = true;
      iconUrl.value = found.iconUrl;
      iconNote.textContent = "";
      iconNote.classList.remove("is-warn");
      showIcon(found.iconData);
      facts.textContent = "";
      fact("source.title", found.fullName);
      fact("d.version", found.tag);
      fact("d.titleid", found.titleid + (found.title ? " · " + found.title : ""));
      fact("d.license", found.license || UNLICENSED);
      asset.textContent = "";
      found.assets.forEach(function (one, index) {
        var option = document.createElement("option");
        option.value = String(index);
        option.textContent = one.name + (one.size ? " (" + megabytes(one.size) + ")" : "");
        asset.appendChild(option);
      });
      // A file the developer gave is the one whose param.json was read: it can't be swapped for another.
      asset.value = String(found.zipAsset !== null ? found.zipAsset : pickAsset(found.assets, found.titleid));
      asset.disabled = found.zipAsset !== null;
      assetNote.textContent = found.assets.length > 1 ? "⚠ " + t("submit.asset.hint") : "";
      assetNote.classList.toggle("is-warn", found.assets.length > 1);
      if (!keep) {
        license.value = found.license || UNLICENSED;
        author.value = found.author;
        kind.value = "";
        offerCategories();
        description.value = found.description;
      }
      fill(warningsList, found.warnings);
      warnings.hidden = !found.warnings.length;
      releaseSelect.parentNode.hidden = repoState.releases.length < 2;
      detail.hidden = false;
      if (!found.iconUrl) checkIcon();      // no icon to start from: the link field is marked until there is one
      else refresh();
    }

    /* The repository can't be listed at all: nothing is offered. */
    function stop(list) {
      zipBox.hidden = true;
      listedBox.hidden = true;
      state = null;
      repoState = null;
      step.hidden = true;
      detail.hidden = true;
      fill(blockersList, list);
      offerLogin(list);
      blockers.hidden = false;
    }

    /* This release can't be listed (and no other release was tried, or none worked): only the reasons show.
       A repository that is already listed has its developer page offered besides. */
    function stopRelease(list) {
      if (list.some(function (one) { return one.key === "submit.err.listed"; })) {
        var owner = repoState.owner;
        stop(list);
        listedLink.setAttribute("href", (document.body.getAttribute("data-base") || "/") + "dev/" + owner.toLowerCase() + "/");
        listedBox.hidden = false;
        return;
      }
      state = null;
      zipBox.hidden = true;
      step.hidden = true;
      detail.hidden = true;
      fill(blockersList, list);
      offerLogin(list);
      blockers.hidden = false;
    }

    /* The errors that belong to one release: another release of the same repository may not have them. */
    var PER_RELEASE = ["submit.err.title"];
    var FALLBACK = 5;
    var zipPending = -1;      // the release whose ZIP the developer is asked for

    /* The release has no param.json in the repository: ask for its ZIP, to be read here. */
    function offerZip(index) {
      var release = repoState.releases[index];
      repoState.tag = release.tag_name;
      repoState.ref = repoState.tag;
      repoState.assets = (release.assets || []).filter(function (a) { return ARTIFACTS.test(a.name); });
      repoState.warnings = repoState.repoWarnings.slice();
      if (!repoState.assets.some(function (a) { return /\.zip$/i.test(a.name); })) {      // only a ZIP can be read
        stopRelease([problem("submit.err.param", { tag: repoState.tag, repo: repoState.fullName })]);
        return;
      }
      state = null;
      zipPending = index;
      detail.hidden = true;
      blockers.hidden = true;
      zipWhy.textContent = t("submit.zip.why", { tag: repoState.tag, repo: repoState.fullName });
      zipStatus.textContent = "";
      zipInput.value = "";
      releaseSelect.value = String(index);
      releaseSelect.parentNode.hidden = repoState.releases.length < 2;
      zipBox.hidden = false;
      step.hidden = false;
    }

    /* Reads a release. When the newest fails for a reason of its own (`auto`), the next ones are tried, a few at most,
       and the first that can be listed is the one shown; if none can, the ZIP of the first without param.json is asked. */
    function loadRelease(index, keep, auto, ask) {
      var mine = ++ticket;
      state = null;
      zipBox.hidden = true;
      detail.hidden = true;
      blockers.hidden = true;
      status.textContent = t("submit.checking");
      releaseSelect.disabled = true;
      inspectRelease(repoState, repoState.releases[index]).then(function (found) {
        if (mine !== ticket) return;
        releaseSelect.value = String(index);
        show(found, keep);
      }, function (error) {
        if (mine !== ticket) return;
        var needs = error instanceof NeedZip;
        var list = needs ? [] : error instanceof Stop ? error.list : [problem("submit.err.net")];
        var ours = needs || list.every(function (one) { return PER_RELEASE.indexOf(one.key) !== -1; });
        var first = ask === undefined || ask === null ? (needs ? index : null) : ask;
        if (auto && ours && index + 1 < Math.min(repoState.releases.length, FALLBACK)) loadRelease(index + 1, keep, true, first);
        else if (first !== null && ours) offerZip(first);
        else if (needs) offerZip(index);
        else stopRelease(list);
      }).then(function () {
        if (mine !== ticket) return;
        releaseSelect.disabled = false;
        button.disabled = false;
        status.textContent = "";
      });
    }

    /* The ZIP the developer chose: it must be a file of the release (same SHA-256), and its param.json is read. */
    function readChosen(file) {
      var mine = ++ticket;
      if (file.size > MAX_ZIP) { zipStatus.textContent = t("submit.zip.big"); return; }
      zipStatus.textContent = t("submit.zip.reading");
      var buffer = null;
      var found = null;
      file.arrayBuffer().then(function (data) {
        buffer = data;
        return window.crypto.subtle.digest("SHA-256", data);
      }).then(function (hash) {
        var hex = "sha256:" + hexOf(hash);
        var index = -1;
        repoState.assets.forEach(function (one, at) { if (index < 0 && one.digest === hex) index = at; });
        if (index < 0) throw new Stop([problem("submit.zip.mismatch", { names: repoState.assets.map(function (a) { return a.name; }).join(", ") })]);
        found = index;
        var entries = readZip(buffer);
        if (!entries) throw new Stop([problem("submit.zip.fail")]);
        var paramEntry = zipEntry(entries, "sce_sys/param.json");
        if (!paramEntry) throw new Stop([problem("submit.zip.nofile")]);
        return zipFile(buffer, paramEntry, MAX_PARAM).then(function (data) { return { data: data, name: paramEntry.name }; });
      }).then(function (param) {
        if (!param.data) throw new Stop([problem("submit.zip.fail")]);
        repoState.warnings = repoState.repoWarnings.slice();
        repoState.warnings.push(problem("submit.warn.inzip", { file: repoState.assets[found].name }));
        repoState.paramPath = param.name;
        repoState.zipAsset = found;
        return completeRelease(repoState, new TextDecoder().decode(param.data), { param: param.name });
      }).then(function (done) {
        if (mine !== ticket) return;
        zipStatus.textContent = "";
        show(done, false);
      }, function (error) {
        if (mine !== ticket) return;
        var list = error instanceof Stop ? error.list : [problem("submit.zip.fail")];
        if (list.some(function (one) { return one.key.indexOf("submit.zip.") === 0; })) {
          zipStatus.textContent = t(list[0].key, list[0].vars);
        } else {
          zipBox.hidden = true;
          stopRelease(list);
        }
      });
    }

    function run() {
      var parsed = parseRepo(input.value);
      status.textContent = "";
      if (!parsed) { stop([problem("submit.err.repo")]); return; }
      var mine = ++ticket;
      button.disabled = true;
      status.textContent = t("submit.checking");
      blockers.hidden = true;
      listedBox.hidden = true;
      zipBox.hidden = true;
      step.hidden = true;
      detail.hidden = true;
      inspectRepo(parsed[0], parsed[1], catalogUrl).then(function (found) {
        if (mine !== ticket) return;
        repoState = found;
        found.catalogRaw = catalogRepo.replace("https://github.com/", RAW + "/") + "/main/apps/";
        releaseSelect.textContent = "";
        found.releases.forEach(function (release, index) {
          var option = document.createElement("option");
          option.value = String(index);
          option.textContent = release.tag_name + (release.published_at ? " · " + release.published_at.slice(0, 10) : "") +
            (release.prerelease ? " · pre-release" : "");
          releaseSelect.appendChild(option);
        });
        releaseSelect.parentNode.hidden = true;     // it shows with the form, and only when there is something to choose
        step.hidden = false;
        loadRelease(0, false, true);
      }, function (error) {
        if (mine !== ticket) return;
        stop(error instanceof Stop ? error.list : [problem("submit.err.net")]);
        button.disabled = false;
        status.textContent = "";
      });
    }

    $("[data-submit-form]", box).addEventListener("submit", function (event) {
      event.preventDefault();
      run();
    });
    releaseSelect.addEventListener("change", function () { loadRelease(Number(releaseSelect.value) || 0, true); });
    zipInput.addEventListener("change", function () { if (zipInput.files && zipInput.files[0] && zipPending >= 0) readChosen(zipInput.files[0]); });
    kind.addEventListener("change", offerCategories);
    iconUrl.addEventListener("input", function () {
      window.clearTimeout(iconTimer);
      iconTimer = window.setTimeout(checkIcon, 350);
    });
    [asset, kind, category, description, author, license].forEach(function (control) {
      control.addEventListener("input", refresh);
      control.addEventListener("change", refresh);
    });
    open.addEventListener("click", function (event) {
      if (open.getAttribute("aria-disabled") === "true") event.preventDefault();
    });
    copy.addEventListener("click", function () {
      if (!state || !navigator.clipboard) return;
      navigator.clipboard.writeText(json.textContent).then(function () {
        var label = copy.textContent;
        copy.textContent = t("copied");
        window.setTimeout(function () { copy.textContent = label; }, 1400);
      }, function () {});
    });

    // ?repo=owner/name (from a link) fills the box and checks it.
    try {
      var wanted = new URLSearchParams(window.location.search).get("repo");
      if (wanted && parseRepo(wanted)) { input.value = wanted; run(); }
    } catch (error) { /* no URL API: the box stays empty */ }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var box = $("[data-submit]");
    if (box && window.fetch) start(box);
  });
})();
