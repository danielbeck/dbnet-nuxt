// scripts/generate-sitemap.js
// Generates dist/sitemap.txt with canonical section routes and archive pool entry URLs only
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
        const urls = new Set();
        // Add all canonical (Page.vue) routes
        for (const p of routes) {
            urls.add(`https://danielbeck.net${p.path}`);
        }

        const poolEntries = Array.isArray(pool) ? pool : Object.values(pool);

        for (const entry of poolEntries) {
            if (entry && entry.slug) {
                urls.add(`https://danielbeck.net/archive/${entry.slug}.html`);
            }
        }
        fs.writeFileSync(SITEMAP_FILE, [...urls].join('\n'));
    } catch (e) {
        console.error('Failed to generate sitemap:', e);
        process.exit(1);
    }
}

main();
