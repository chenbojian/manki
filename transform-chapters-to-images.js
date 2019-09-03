const { loadChapters, loadImages, saveImages } = require('./model')
const { withMangaPage } = require('./page')
const ProgressBar = require('progress')

const getPageImageInfos = async (page) => {
    const mangaData = await page.evaluate(() => {
        SMH.imgData = function (n) { window.mangaData = n }
        let script = [...document.querySelectorAll('script:not([src])')].filter(s => /window.+fromCharCode/.test(s.innerHTML))[0]
        let newScript = document.createElement('script')
        newScript.type = "text\/javascript"
        newScript.innerHTML = script.innerHTML
        document.body.append(newScript)
        return window.mangaData
    })
    const pVars = await page.evaluate(() => pVars)
    const imgInfos = mangaData.files.map((file, idx) => {
        file = file.replace(/(.*)\.webp$/gi, "$1")
        const fileExt = (/(\.[^\.]+)$/.exec(file))[1]
        return ({
            filename: mangaData.bname + '/' + mangaData.cname + '/' + stringify(idx + 1, 10) + fileExt,
            url: pVars.manga.filePath + file + '?cid=' + mangaData.cid + '&md5=' + mangaData.sl.md5
        });
    })

    return imgInfos
}

const getImageInfos = async (chapterUrl) => await withMangaPage(chapterUrl)(getPageImageInfos)

function stringify(num, digits) {
    let str = num.toString()
    return Array(digits - str.length).fill('0').join('') + str
}

const getNotTransformedChapters = async () => {
    const chapters = await loadChapters()
    const images = await loadImages()
    const transformedChapterUrls = new Set(images.map(i => i.chapterUrl))
    return chapters.filter(c => !transformedChapterUrls.has(c.url))
}

const run = async () => {
    const chapters = await getNotTransformedChapters()
    const bar = new ProgressBar('transform chapters to images [:current/:total] :percent :etas', { total: chapters.length });

    for (let chapter of chapters) {
        const imageInfos = await getImageInfos(chapter.url)
        const images = imageInfos.map(i => ({
            _id: i.url,
            url: i.url,
            filename: i.filename,
            path: 'out/',
            chapterUrl: chapter.url,
        }))

        await saveImages(images)

        bar.tick()
    }
}

module.exports = async () => {
    try {
        await run()
    } catch(e) {
        console.error(e)
    }
}
