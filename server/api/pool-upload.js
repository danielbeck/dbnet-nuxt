
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const uploadDir = path.join(process.cwd(), 'public/pool')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

export default defineEventHandler(async (event) => {
    if (event.req.method !== 'POST') return { success: false, error: 'Method not allowed' }

    // Nitro: use readMultipartFormData to parse file and fields
    const formData = await readMultipartFormData(event)
    if (!formData) return { success: false, error: 'No form data received' }

    let poolId = null
    let imageFile = null
    let crop = null
    for (const part of formData) {
        if (part.name === 'pool_id') poolId = part.data.toString()
        if (part.name === 'image') imageFile = part
        if (part.name === 'crop') {
            try { crop = JSON.parse(part.data.toString()) } catch (e) { crop = null }
        }
    }
    if (!poolId || !imageFile || !imageFile.data) {
        return { success: false, error: 'Missing pool_id or image' }
    }

    const imgPath = path.join(uploadDir, `${poolId}_image.jpg`)
    const thumbPath = path.join(uploadDir, `${poolId}_thumbnail.jpg`)
    const imgUrl = `/pool/${poolId}_image.jpg`
    const thumbUrl = `/pool/${poolId}_thumbnail.jpg`

    // Save image file
    try {
        fs.writeFileSync(imgPath, imageFile.data)
        let sharpImg = sharp(imgPath)
        const metadata = await sharpImg.metadata()
        let cropOptions = { left: 0, top: 0, width: Math.min(metadata.width, metadata.height), height: Math.min(metadata.width, metadata.height) }
        if (crop && crop.width && crop.height) {
            cropOptions = crop
        } else {
            if (metadata.width > metadata.height) {
                cropOptions.left = Math.floor((metadata.width - metadata.height) / 2)
                cropOptions.top = 0
                cropOptions.width = cropOptions.height = metadata.height
            } else {
                cropOptions.top = Math.floor((metadata.height - metadata.width) / 2)
                cropOptions.left = 0
                cropOptions.width = cropOptions.height = metadata.width
            }
        }
        await sharpImg.extract(cropOptions).resize(150, 150).jpeg({ quality: 90 }).toFile(thumbPath)
        return { success: true, imgUrl, thumbnailUrl: thumbUrl }
    } catch (err) {
        return { success: false, error: err.message }
    }
})
