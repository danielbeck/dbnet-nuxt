// Fetches all required API data and caches it locally for SSG
import fs from 'fs';
import https from 'https';

const API_HOST = process.env.API_HOST || 'https://danielbeck.net';
const OUT_PATH = './.cache/pool.json';

function fetchPool() {
    return new Promise((resolve, reject) => {
        https.get(API_HOST + '/api/pool.php', (res) => {
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
        fs.mkdirSync('./.cache', { recursive: true });
        fs.writeFileSync(OUT_PATH, JSON.stringify(pool, null, 2));
        console.log('API data cached to', OUT_PATH);
    } catch (e) {
        console.error('Failed to fetch API data:', e);
        process.exit(1);
    }
}

main();
