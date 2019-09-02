const { loadJsonFile } = require('./utils')
const { withMangaPage } = require('./page')
const ProgressBar = require('progress')
const PouchDB = require('pouchdb')
const retry = require('./retry')

const bookUrlsFilename = 'data/book-urls.json'
const chapterDB = new PouchDB('data/chapters')

const getMangaChapterUrls = async (url) => {
    return await (withMangaPage(url)(
        async (page) => {
            const adultCheck = await page.$('a#checkAdult')
            if (adultCheck) {
                await adultCheck.click()
            }
            const urls = await page.$$eval('div.chapter-list li a', nodes => nodes.map(a => a.href))
            return urls
        }))
}

const loadBookUrls = () => {
    return loadJsonFile(bookUrlsFilename, [])
}

const run = async () => {
    const bookUrls = loadBookUrls()
    const bar = new ProgressBar('transform books to chapters [:current/:total] :percent :etas', { total: bookUrls.length });

    const chapters = (await chapterDB.allDocs({
        include_docs: true
    })).rows.map(r => r.doc)
    const chapterUrlSet = new Set(chapters.map(c => c.url))

    for (let bookUrl of bookUrls) {
        const chapterUrls = await retry(getMangaChapterUrls, 30)(bookUrl)
        const newChapterUrls = chapterUrls.filter(c => !chapterUrlSet.has(c))

        await chapterDB.bulkDocs(newChapterUrls.map(c => ({
            _id: c,
            url: c,
            bookUrl,
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
    }

}
