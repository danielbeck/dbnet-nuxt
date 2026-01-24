import path from 'path'
import fs from 'fs'

const uploadDir = path.join(process.cwd(), 'public/pool')

export default defineEventHandler(async (event) => {
    if (event.req.method !== 'POST') return { success: false, error: 'Method not allowed' }

    const body = await readBody(event)
    const poolId = body?.id || body?.pool_id
    if (!poolId) return { success: false, error: 'Missing pool_id' }

    // Delete image and thumbnail files
    const imgPath = path.join(uploadDir, `${poolId}_image.jpg`)
    const thumbPath = path.join(uploadDir, `${poolId}_thumbnail.jpg`)
    let imgDeleted = false
    let thumbDeleted = false
    try {
        if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath)
            imgDeleted = true
        }
        if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath)
            thumbDeleted = true
        }
    } catch (e) {
        return { success: false, error: e.message }
    }

    return { success: true, imgDeleted, thumbDeleted }
})
