// Run this script to generate .cache/pages.json from your API
// Usage: node scripts/generate-pages-cache.js

import fs from 'fs';
import fetch from 'node-fetch';

const API_URL = 'https://danielbeck.net/api/page.php';

async function main() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Failed to fetch page data');
    const data = await res.json();
    fs.mkdirSync('.cache', { recursive: true });
    fs.writeFileSync('.cache/pages.json', JSON.stringify(data, null, 2));
    console.log(`Wrote .cache/pages.json with ${data.length} pages.`);
}

main().catch(e => { console.error(e); process.exit(1); });
