// Helper to generate all static routes for Nuxt prerendering
import routes from './helpers/routes.mjs';
import fs from 'fs';

async function getPrerenderRoutes() {
    // Load all pool items
    let pool = [];
    try {
        pool = JSON.parse(fs.readFileSync('./.cache/pool.json', 'utf-8'));
    } catch (e) {
        pool = [];
    }

    const staticRoutes = new Set();

    // Add all top-level routes, both with and without trailing slash
    for (const r of routes) {
        // Always add both /foo and /foo/ for each route
        let cleanPath = r.path.endsWith('/') ? r.path.slice(0, -1) : r.path;
        if (cleanPath) staticRoutes.add(cleanPath);
        staticRoutes.add(r.path);

        // Add /page/[id] for each page except Home/index
        if (r.id && r.id !== 'Home') {
            staticRoutes.add(`/page/${r.id}`);
        }

        // If route has a tag, add child pages for each pool item with that tag
        if (r.tag) {
            for (const item of pool) {
                if (item.tags && item.tags.includes(r.tag)) {
                    staticRoutes.add(`${r.path}${item.slug}.html`);
                }
            }
        }
        // If route is /archive/, add all pool items as /archive/[slug].html
        if (r.path === '/archive/') {
            for (const item of pool) {
                staticRoutes.add(`/archive/${item.slug}.html`);
            }
        }
    }

    // Return as array

    return Array.from(staticRoutes);
}


// If run directly, print the routes for debugging (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        const routes = await getPrerenderRoutes();
        for (const route of routes) {
            console.log(route);
        }
    })();
}

export default getPrerenderRoutes;
