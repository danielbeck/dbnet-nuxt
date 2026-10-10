import assert from 'node:assert/strict'
import test from 'node:test'
import routes from './routes.mjs'
import { resolveCanonicalUrl } from './resolveRoute.js'

const pool = [
    { id: '1', slug: 'example', tags: ['blog', 'travel', 'australia'] },
    { id: '2', slug: 'blog', tags: ['blog'] }
]

test('homepage and sections use their configured canonical URL with or without a trailing slash', () => {
    for (const route of routes) {
        const expected = `https://danielbeck.net${route.path}`
        assert.equal(resolveCanonicalUrl(route.path, routes, pool), expected)
        assert.equal(resolveCanonicalUrl(route.path.replace(/\/$/, ''), routes, pool), expected)
    }
})

test('legacy page aliases canonicalize to their configured section', () => {
    for (const route of routes) {
        for (const suffix of ['', '/']) {
            assert.equal(resolveCanonicalUrl(`/page/${route.id}${suffix}`, routes, pool),
                `https://danielbeck.net${route.path}`)
        }
    }
})

test('article aliases and archive pages share the archive canonical', () => {
    for (const path of ['/blog/example.html', '/photos/travel/example.html',
        '/photos/travel/australia/example.html', '/archive/example.html', '/archive/example']) {
        assert.equal(resolveCanonicalUrl(path, routes, pool), 'https://danielbeck.net/archive/example.html')
    }
    assert.equal(resolveCanonicalUrl('/archive/blog.html', routes, pool), 'https://danielbeck.net/archive/blog.html')
})

test('unrecognized routes do not invent canonical targets', () => {
    for (const path of ['/missing/', '/page/missing', '/archive/missing.html', '/geek/example.html', '/404']) {
        assert.equal(resolveCanonicalUrl(path, routes, pool), null)
    }
})
