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

const loadBookUrls = async () => {
    const bookUrls = loadJsonFile(bookUrlsFilename, [])
    const chapters = (await chapterDB.allDocs({
        include_docs: true
    })).rows.map(r => r.doc)
    const transformedBookUrls = new Set(chapters.map(c => c.bookUrl))
    return bookUrls.filter(url => !transformedBookUrls.has(url))
}

const run = async () => {
    const bookUrls = await loadBookUrls()
    const bar = new ProgressBar('transform books to chapters [:current/:total] :percent :etas', { total: bookUrls.length });

    for (let bookUrl of bookUrls) {
        const chapterUrls = await retry(getMangaChapterUrls, 30)(bookUrl)

        await chapterDB.bulkDocs(chapterUrls.map(c => ({
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
