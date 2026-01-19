
# dbnet-nuxt

This is the Nuxt 3 static site version of dbnet. Unlike the original dbnet, this one should be SEO-friendly.

## How it works
- All required API data is fetched and cached locally before generating the static site.
- Static HTML is generated for each page using the cached data.
- No repeated API/database calls during generation.

## Usage

1. Fetch and cache API data (manual):

```sh
npm run dev
```

`npm run dev` cleans the cache and dist, and runs cache generation scripts automatically before starting the dev server.

2. Generate the static site:

```sh
npm run generate
```

This runs `nuxt generate` and then `postgenerate` hooks which create RSS and sitemap files.

3. Deploy the static output:

```sh
npm run deploy
```

This runs `npm run generate` and then `./scripts/deploy.sh` to rsync `dist/` and `public/api/` to the configured remote.

## npm Scripts (what they do)

- `build`: Runs `nuxt build` to build the production server/app.
- `clean`: Removes build and output artifacts (`.output`, `.nuxt`, `.vite`, `dist/*`).
- `dev`: Runs `node scripts/generate-pool-cache.js && node scripts/generate-page-cache.js && nuxt dev` — generates local `.cache` data then starts Nuxt in development mode with hot-reload.
- `generate`: Runs `nuxt generate` to prerender the site using `.cache` data.
- `postgenerate`: Runs `node scripts/generate-rss.js && node scripts/generate-sitemap.js` (invoked automatically after `npm run generate`) to emit RSS feeds and `sitemap.txt` into the `dist/` output.
- `preview`: Runs `nuxt preview` to locally preview a production build from `.output`.
- `deploy`: Runs `npm run generate` and then `./scripts/deploy.sh` to push `dist/` and `public/api/` to the remote host.
- `postinstall`: Nuxt prepare hook (runs `nuxt prepare` after install).

## Files in `scripts/` (purpose and usage)

- `scripts/generate-pool-cache.js`: Fetches `/api/pool.php` and writes the response to `./.cache/pool.json`. Used by dev and static generation to provide pool data offline.
- `scripts/generate-page-cache.js`: Fetches `/api/page.php` and writes the response to `./.cache/pages.json`. Used by dev and static generation to provide page metadata.
- `scripts/generate-rss.js`: Builds RSS feeds (`rss.xml`, `rss-blog.xml`, `rss-photos.xml`, `rss-geek.xml`) in `dist/` from the pool API data. Run automatically after `npm run generate` via `postgenerate`.
- `scripts/generate-sitemap.js`: Builds `dist/sitemap.txt` containing canonical routes and dynamic pool-entry URLs (e.g. `/archive/[slug].html`). Run automatically after `npm run generate` via `postgenerate`.
- `scripts/deploy.sh`: An rsync-based deploy script that dry-runs then optionally syncs `dist/` and `public/api/` to the remote server configured inside the script. Run with `./scripts/deploy.sh` or via `npm run deploy`.

## Notes
- Server logs are stored in `.cache/request-log.log` (dev-time logging of API requests).

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

## TODO

* There's a warning about mismatched ID types (string vs number) when editing a pool item.  The code functions as is, 
but this should probably be resolved.
* Immediately after adding a pool item, in-app navigation to the page works, but refreshing the page shows "Not found". Probably the cache is not being read correctly (the string-vs-number issue?)
* add applescript to highlightjs
* pool-list and other compiled content aren't statically rendered