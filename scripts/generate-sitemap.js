// scripts/generate-sitemap.js
// Generates dist/sitemap.txt with all canonical (Page.vue) and archive pool entry pages
// Usage: node scripts/generate-sitemap.js

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import routes from '../helpers/routes.mjs';

const API_HOST = process.env.API_HOST || 'https://danielbeck.net';
const OUT_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'dist');
const SITEMAP_FILE = path.join(OUT_DIR, 'sitemap.txt');

function fetchPool() {
    return new Promise((resolve, reject) => {
        const getter = API_HOST.startsWith('https') ? https : http;
        getter.get(API_HOST + '/api/pool.php', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        const pool = await fetchPool();
        const urls = [];
        // Add all canonical (Page.vue) routes
        for (const p of routes) {
            urls.push(`https://danielbeck.net${p.path}`);
        }

        const poolEntries = Array.isArray(pool) ? pool : Object.values(pool);

        const dynamicCounts = {};
        for (const p of routes) {
            if (!p.tag) continue;
            const tag = p.tag.toLowerCase();
            let count = 0;
            for (const entry of poolEntries) {
                if (!entry || !entry.slug || !Array.isArray(entry.tags)) continue;
                const entryTags = entry.tags.map(t => t.toLowerCase());
                if (entryTags.includes(tag)) {
                    urls.push(`https://danielbeck.net${p.path}${entry.slug}.html`);
                    count++;
                }
            }
            dynamicCounts[p.path] = count;
        }

        for (const entry of poolEntries) {
            if (entry && entry.slug) {
                urls.push(`https://danielbeck.net/archive/${entry.slug}.html`);
            }
        }
        fs.writeFileSync(SITEMAP_FILE, urls.join('\n'));
        // ...existing code...
        let totalDynamic = 0;
        for (const p of routes) {
            if (p.tag) {
                totalDynamic += dynamicCounts[p.path] || 0;
            }
        }
        // ...existing code...
    } catch (e) {
        console.error('Failed to generate sitemap:', e);
        process.exit(1);
    }
}

main();
