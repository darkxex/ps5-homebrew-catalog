# Release ZIP reader for the submit page (optional)

A small Cloudflare Worker that lets the [submit page](https://prosperostore.net/submit/) read `sce_sys/param.json`
and `sce_sys/icon0.png` out of a release ZIP **without downloading it**, for a repository that doesn't commit them.

A ZIP keeps its index at the end, so the page needs only a few small byte ranges. GitHub's download servers send no
CORS headers, so a browser can't ask for them; this Worker asks GitHub and passes the bytes on.

It also lets the page accept a **RecompStore link** (`recompstore.com/game/PPSA12345`), which a browser can't read
either: the Worker reads that one page, takes the GitHub repository it names, and gives back only `{"repo": "owner/name"}`;
the page then goes on from the repository as if it had been typed.

It is **not an open proxy**: it reads only `github.com/<owner>/<name>/releases/download/<tag>/<file>.zip`, answers one
byte range of at most 3 MiB (never a whole file), reads only `recompstore.com/game/<TITLE ID>`, answers only to the sites in
`ALLOWED_ORIGINS`, and keeps nothing.

It is optional. Without it (or when it fails) the submit page asks the developer to choose the release's ZIP from
their computer, and reads it there.

The page reads the ranges without seeing the whole file, so it can't compare the file's SHA-256 with GitHub's, as
it does for a ZIP the developer chooses; it says so in a warning. The catalog's own checks read the release file
again when the pull request is made.

## Set it up (free)

1. At <https://dash.cloudflare.com> → *Workers & Pages* → *Create* → *Hello World* → name it `prosperostore-zip` →
   *Deploy* → *Edit code*, replace the code with `src/index.js` and *Deploy*.
   (With the command line instead: `cd worker/zip-peek && npx wrangler deploy`.)
2. *Settings → Variables and Secrets*: `ALLOWED_ORIGINS` (text) = `https://prosperostore.net`. To test on your computer,
   add `,http://localhost:8000`.
3. Put the Worker's address (`https://prosperostore-zip.<account>.workers.dev`, no slash at the end) in `ZIP_PEEK_URL`
   in `catalog/site.py`, and publish the site.

To stop using it: empty `ZIP_PEEK_URL` and delete the Worker.
