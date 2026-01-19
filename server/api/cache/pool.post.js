import fs from 'fs'
import path from 'path'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const cacheDir = path.resolve(process.cwd(), '.cache')
    const cacheFile = path.join(cacheDir, 'pool.json')

    let current = []
    if (fs.existsSync(cacheFile)) {
        try { current = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) } catch (e) { current = [] }
    }

    const incoming = body.items || (body.item ? [body.item] : [])
    if (!Array.isArray(incoming)) throw createError({ statusCode: 400, statusMessage: 'invalid payload' })

    // Log incoming request for debugging (append to .cache/cache-updates.log)
    try {
        const logDir = path.resolve(process.cwd(), '.cache')
        fs.mkdirSync(logDir, { recursive: true })
        const logFile = path.join(logDir, 'cache-updates.log')
        const entry = { ts: new Date().toISOString(), route: '/api/cache/pool', incoming }
        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8')
    } catch (e) {
        // ignore logging errors
    }

    // Merge incoming: replace by id if exists, otherwise append
    const byId = new Map(current.map(i => [String(i.id), i]))
    for (const it of incoming) {
        if (!it || it.id === undefined) continue
        // ensure id is stored as a string in the cache
        try { it.id = String(it.id) } catch (e) { }
        byId.set(String(it.id), it)
    }

    // Handle explicit removals if provided: { remove: [id,...] }
    if (Array.isArray(body.remove)) {
        for (const rid of body.remove) {
            try {
                byId.delete(String(rid))
            } catch (e) { }
        }
    }

    const merged = Array.from(byId.values())
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(cacheFile, JSON.stringify(merged, null, 2), 'utf8')

    return { success: true, count: merged.length }
})
