#!/usr/bin/env node

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fixHtmlString } from '../helpers/index.js';

const API_HOST = process.env.API_HOST || 'https://danielbeck.net';
const OUT_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'dist');

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

function formatPubDate(d) {
    if (!d) return new Date().toUTCString();
    const dt = new Date(Number(d));
    return dt.toUTCString();
}

function buildXml(items, filterName) {
    let keys = Object.keys(items)
        .filter(k => {
            if (!filterName) return true;
            const tags = items[k].tags || [];
            if (filterName === 'blog') return tags.includes('blog');
            if (filterName === 'photos') return tags.includes('photos');
            if (filterName === 'geek') return tags.includes('geek');
            return true;
        })
        .sort((a, b) => (items[b].date || 0) - (items[a].date || 0))
        .slice(0, 25);

    let ret = '<rss version="2.0"><channel>' +
        '<title>Danielbeck.net</title>' +
        '<link>//danielbeck.net</link>' +
        '<description>Your source for all things Daniel and Beck</description>';

    for (let k of keys) {
        const p = items[k];
        ret += '<item>';
        ret += '<pubDate>' + formatPubDate(p.date || p._created) + '</pubDate>';
        ret += '<title>' + (p.title || '') + '</title>';

        let url = '';
        if (p.slug) {
            url = '//danielbeck.net/archive/' + p.slug + '.html';
        }
        ret += '<link>' + url + '</link>';
        ret += '<guid>' + url + '</guid>';
        let desc = p.body || '';
        try {
            desc = fixHtmlString(desc);
        } catch (e) {
            desc = desc.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        ret += '<description><![CDATA[' + desc + ']]></description>';
        ret += '</item>';
    }
    ret += '</channel></rss>';
    return ret;
}

async function main() {
    try {
        const pool = await fetchPool();
        const rss = buildXml(pool);
        const rssBlog = buildXml(pool, 'blog');
        const rssPhotos = buildXml(pool, 'photos');
        const rssGeek = buildXml(pool, 'geek');
        fs.writeFileSync(path.join(OUT_DIR, 'rss.xml'), rss);
        fs.writeFileSync(path.join(OUT_DIR, 'rss-blog.xml'), rssBlog);
        fs.writeFileSync(path.join(OUT_DIR, 'rss-photos.xml'), rssPhotos);
        fs.writeFileSync(path.join(OUT_DIR, 'rss-geek.xml'), rssGeek);
        console.log('RSS feeds generated.');
    } catch (e) {
        console.error('Failed to generate RSS:', e);
        process.exit(1);
    }
}

main();
