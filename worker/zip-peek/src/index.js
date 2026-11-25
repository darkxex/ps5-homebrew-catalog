/* A window onto release ZIPs for the submit page (https://prosperostore.net/submit/).

   A repository that doesn't commit sce_sys/param.json ships it only inside its release ZIP. The page needs that
   one small file (and the icon beside it), not the whole ZIP, and a ZIP keeps its index at the end, so a few
   ranged reads are enough. GitHub's download servers don't send CORS headers, so a browser can't make those
   reads itself; this Worker makes them and hands the bytes back:

     GET /zip?repo=<owner>/<name>&tag=<tag>&file=<name>.zip      with  Range: bytes=<from>-<to>

   It is not an open proxy: it only reads github.com/<owner>/<name>/releases/download/<tag>/<name>.zip, only
   answers a single byte range of at most MAX_RANGE bytes, never passes on a whole file, only answers the sites in
   ALLOWED_ORIGINS, and keeps nothing (no database, no logs). Settings, in wrangler.toml: ALLOWED_ORIGINS.
   See README.md. */

const MAX_RANGE = 3 * 1024 * 1024;
const REPO = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}\/[A-Za-z0-9_.-]{1,100}$/;
const TAG = /^[A-Za-z0-9_.+-][A-Za-z0-9_.+ -]{0,127}$/;
const FILE = /^[A-Za-z0-9_.+ -]{1,200}\.zip$/i;
const DOTS = /^\.+$/;                                      // "." and ".." would walk out of the release's address
const RANGE = /^bytes=(\d*)-(\d*)$/;

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
}

function reply(message, status, origin) {
  const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  if (origin) { headers["Access-Control-Allow-Origin"] = origin; headers.Vary = "Origin"; }
  return new Response(message, { status, headers });
}

/* The one range asked for, as the header says it, or null when it isn't a single range within the limit. */
function wanted(header) {
  const text = String(header || "").trim();
  const match = RANGE.exec(text);
  // Both ends are needed: open-ended could be the whole file, and GitHub's storage doesn't do "the last N bytes".
  if (!match || match[1] === "" || match[2] === "") return null;
  const from = Number(match[1]);
  const to = Number(match[2]);
  return Number.isSafeInteger(from) && Number.isSafeInteger(to) && to >= from && to - from < MAX_RANGE ? text : null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = allowedOrigins(env).includes(origin) ? origin : "";
    if (request.method === "OPTIONS") {
      if (!allowed) return reply("Not allowed", 403, "");
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowed, Vary: "Origin", "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Range", "Access-Control-Max-Age": "600",
        },
      });
    }
    if (request.method !== "GET") return reply("Method not allowed", 405, allowed);
    const url = new URL(request.url);
    if (url.pathname !== "/zip") return reply("Not found", 404, allowed);
    if (!allowed) return reply("This site may not use this Worker", 403, "");

    const repo = url.searchParams.get("repo") || "";
    const tag = url.searchParams.get("tag") || "";
    const file = url.searchParams.get("file") || "";
    if (!REPO.test(repo) || DOTS.test(repo.split("/")[1]) || !TAG.test(tag) || DOTS.test(tag) || !FILE.test(file) || DOTS.test(file.slice(0, -4))) {
      return reply("Bad request", 400, allowed);
    }
    const range = wanted(request.headers.get("Range"));
    if (!range) return reply("Ask for one byte range of at most " + MAX_RANGE + " bytes", 416, allowed);

    let upstream;
    try {
      upstream = await fetch(`https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(file)}`, {
        headers: { Range: range, "User-Agent": "prosperostore-zip-peek" }, redirect: "follow",
      });
    } catch (error) {
      return reply("GitHub could not be reached", 502, allowed);
    }
    // 200 means the range was ignored and the whole file is coming: never stream that.
    if (upstream.status !== 206) {
      if (upstream.body) await upstream.body.cancel();
      return upstream.status === 404 ? reply("No such release file", 404, allowed) : reply("GitHub did not give that range", 502, allowed);
    }
    const length = Number(upstream.headers.get("Content-Length") || "0");
    if (!length || length > MAX_RANGE) {
      if (upstream.body) await upstream.body.cancel();
      return reply("GitHub did not give that range", 502, allowed);
    }
    return new Response(upstream.body, {
      status: 206,
      headers: {
        "Content-Type": "application/octet-stream", "Content-Range": upstream.headers.get("Content-Range") || "",
        "Content-Length": String(length), "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": allowed, Vary: "Origin", "Access-Control-Expose-Headers": "Content-Range, Content-Length",
        "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
      },
    });
  },
};
