import fs from 'fs'
import path from 'path'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
    try {
        const reqPath = event.node.req.url || ''
        if (!reqPath.startsWith('/api')) return

        const logDir = path.resolve(process.cwd(), '.cache')
        fs.mkdirSync(logDir, { recursive: true })
        const logFile = path.join(logDir, 'request-log.log')
        const entry = {
            ts: new Date().toISOString(),
            method: event.node.req.method,
            url: reqPath,
            headers: {
                host: event.node.req.headers['host'],
                origin: event.node.req.headers['origin'] || null,
                'user-agent': event.node.req.headers['user-agent'] || null,
            }
        }
        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8')
    } catch (e) {
        // ignore logging errors
    }
})
