
# dbnet-nuxt

This is the Nuxt 3 static site version of dbnet.

## How it works
- All required API data is fetched and cached locally before generating the static site.
- Static HTML is generated for each page using the cached data.
- No repeated API/database calls during generation.

## Usage

1. **Fetch and cache API data:**
	```sh
	node scripts/fetch-api-cache.js
	```
	This will save the latest API data to `.cache/pool.json`.

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
- You can update the API cache at any time by rerunning the fetch script.
- The original dbnet/ project is included for reference only and should not be modified from this project.

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
