const { withMangaPage } = require('./page')
const ProgressBar = require('progress')
const PouchDB = require('pouchdb')

const chapterDB = new PouchDB('data/chapters')
const imageDB = new PouchDB('data/images')

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

const loadChapters = async () => {
    const chapters = (await chapterDB.allDocs({
        include_docs: true
    })).rows.map(r => r.doc)

    const images = (await imageDB.allDocs({
        include_docs: true
    })).rows.map(r => r.doc)

    const transformedChapterUrls = new Set(images.map(i => i.chapterUrl))
    return chapters.filter(c => !transformedChapterUrls.has(c.url))
}

const run = async () => {
    const chapters = await loadChapters()
    const bar = new ProgressBar('transform chapters to images [:current/:total] :percent :etas', { total: chapters.length });

    for (let chapter of chapters) {
        const imageInfos = await getMangaImageInfos(chapter.url)

        await imageDB.bulkDocs(imageInfos.map(i => ({
            _id: i.url,
            url: i.url,
            filename: i.filename,
            path: 'out/',
            chapterUrl: chapter.url,
        })))

        bar.tick()
    }
}

module.exports = async () => {
    try {
        await run()
    } catch(e) {
        console.error(e)
    } finally {
        await chapterDB.close()
        await imageDB.close()
    }
}
