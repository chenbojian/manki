const { loadJsonFile, saveJsonFile } = require('./utils')
const { withMangaPage } = require('./page')
const ProgressBar = require('progress')

const chaptersFilename = 'data/chapters.json'
const imagesFilename = 'data/images.json'

const getMangaImageInfos = async (url) => {
    return await withMangaPage(url)(
        async (page) => {
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
        })
}

function stringify(num, digits) {
    let str = num.toString()
    return Array(digits - str.length).fill('0').join('') + str
}


const saveImages = (images) => {
    const oldImages = loadJsonFile(imagesFilename, [])
    saveJsonFile(imagesFilename, [...oldImages, ...images])
}

const loadChapters = () => {
    const chapters = loadJsonFile(chaptersFilename, [])
    const images = loadJsonFile(imagesFilename, [])
    const transformedChapterUrls = new Set(images.map(i => i.chapterUrl))
    return chapters.filter(c => !transformedChapterUrls.has(c.url))
}

const main = async () => {
    const chapters = loadChapters()
    const bar = new ProgressBar('transform chapters to images [:current/:total] :percent :etas', { total: chapters.length });

    for (let chapter of chapters) {
        const imageInfos = await getMangaImageInfos(chapter.url)
        saveImages(imageInfos.map(i => ({
            url: i.url,
            filename: i.filename,
            path: 'out/',
            chapterUrl: chapter.url,
        })))

        bar.tick()
    }
}

main()