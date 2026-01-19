
# dbnet-nuxt

This is the Nuxt 3 static site version of dbnet.

## How it works
- All required API data is fetched and cached locally before generating the static site.
- Static HTML is generated for each page using the cached data.
- No repeated API/database calls during generation.

## Usage

1. **Fetch and cache API data:**
	```sh
	node scripts/generate-pool-cache.js
    node scripts/generate-pages-cache.js
	```
	This will save the latest API data to `.cache/`.
    `npm run dev` does this automatically on start.

2. **Generate the static site:**
	```sh
	npm run generate
	```
	This will use the cached data to generate static HTML for all routes.

3. **Deploy the contents of `./.output/public/`** to your static host.

## Scripts
- `npm run clean` - deletes the output and dist folders. Use this if you're seeing cryptic EBADF errors on starting the dev server
- `npm run dev` — start the Nuxt development server (hot-reload).
- `npm run build` — build the production server/app (Nuxt build).
- `npm run generate` — generate the static site (prerender) using cached `.cache` data.
- `npm run preview` — locally preview a production build from `.output`.
- `npm run postinstall` — Nuxt prepare step run automatically after install.


## Notes
- Server logs are stored in .cache/request-log.log

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

* we need a deploy script that will push the static files to the server
* put this in github, already
* There's a warning about mismatched ID types (string vs number) when editing a pool item.  The code functions as is, 
but this should probably be resolved.
* Logs are emitted in strange places; consolidate them
* Immediately after adding a pool item, in-app navigation to the page works, but refreshing the page shows "Not found". Probably the cache is not being read correctly (the string-vs-number issue?)