const fs = require('fs')
const { loadJsonFile, saveJsonFile } = require('./utils')
const { withMangaPage } = require('./page')
const ProgressBar = require('progress')

const bookUrlsFilename = 'data/book-urls.json'
const chaptersFilename = 'data/chapters.json'

const getMangaChapterUrls = async (url) => {
    return await (withMangaPage(url)(
        async (page) => {
            const urls = await page.$$eval('div.chapter-list li a', nodes => nodes.map(a => a.href))
            return urls
        }))
}

const saveChapters = (chapters) => {
    const oldChapters = loadJsonFile(chaptersFilename, [])
    saveJsonFile(chaptersFilename, [...oldChapters, ...chapters])
}

const loadBookUrls = () => {
    const bookUrls = loadJsonFile(bookUrlsFilename, [])
    const chapters = loadJsonFile(chaptersFilename, [])
    const transformedBookUrls = new Set(chapters.map(c => c.bookUrl))
    return bookUrls.filter(url => !transformedBookUrls.has(url))
}

const main = async () => {
    const bookUrls = loadBookUrls()
    const bar = new ProgressBar('transform books to chapters [:current/:total] :percent :etas', { total: bookUrls.length });

    for (let bookUrl of bookUrls) {
        const chapterUrls = await getMangaChapterUrls(bookUrl)

        saveChapters(chapterUrls.map(c => ({
            url: c,
            bookUrl,
        })))

        bar.tick()
    }
}

main()