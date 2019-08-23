const path = require('path')
const { loadJsonFile, saveJsonFile } = require('./utils')
const PromisePool = require('es6-promise-pool')
const ProgressBar = require('progress')
const CurlImageDownloader = require('./curl-image-downloader')
const retry = require('./retry')

const imagesFilename = 'data/images.json'
const downloadedImagesFilename = 'data/downloaded-images.json'

const saveDownloaedImages = (downloadedImages) => {
    const oldDownloadedImages = loadJsonFile(downloadedImagesFilename, [])
    saveJsonFile(downloadedImagesFilename, [...oldDownloadedImages, ...downloadedImages])
}

const loadImages = () => {
    const images = loadJsonFile(imagesFilename, [])
    const downloadedImages = loadJsonFile(downloadedImagesFilename, [])
    const downloadedImageUrls = new Set(downloadedImages.map(i => i.url))
    return images.filter(i => !downloadedImageUrls.has(i.url))
}

const main = async () => {
    const images = loadImages()
    const bar = new ProgressBar('download [:current/:total] :percent :etas', { total: images.length });
    const imageDownloader = new CurlImageDownloader()
    const download = async (url, path, headers) => {
        try {
            await imageDownloader.download(url, path, headers)
            bar.tick()
            saveDownloaedImages([{
                url,
                path,
                headers
            }])
        } catch (e) {
            console.error(`\n Error on downloading ${e}\n`)
        }

    }
    
    const producer = function* () {
        for (let image of images) {
            const headers = {
                'Referer': image.chapterUrl,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
            }
            yield retry(download, 3)(image.url, path.join(image.path, image.filename) , headers)
        }
    }
    const pool = new PromisePool(producer, 10)

    await pool.start()
}

main()
