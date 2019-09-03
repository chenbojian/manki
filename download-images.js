const { loadImages, saveImages } = require('./model')
const path = require('path')
const PromisePool = require('es6-promise-pool')
const ProgressBar = require('progress')
const CurlImageDownloader = require('./curl-image-downloader')

const getNotDownloadedImages = async () => {
    const images = await loadImages()
    return images.filter(i => !i.downloaded)
}

const run = async () => {
    const images = await getNotDownloadedImages()
    const bar = new ProgressBar('download [:current/:total] :percent :etas', { total: images.length });
    const imageDownloader = new CurlImageDownloader()
    const download = async (image) => {
        try {
            const headers = {
                'Referer': image.chapterUrl,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
            }
            await imageDownloader.download(image.url, path.join(image.path, image.filename), headers)
            await saveImages([{
                ...image,
                downloaded: true,
            }])
            bar.tick()
        } catch (e) {
            console.error(`\n Error on downloading ${e}\n`)
        }

    }
    
    const producer = function* () {
        for (let image of images) {
            yield download(image)
        }
    }
    const pool = new PromisePool(producer, 10)

    await pool.start()
}

module.exports = async () => {
    try {
        await run()
    } catch(e) {
        console.error(e)
    }
}