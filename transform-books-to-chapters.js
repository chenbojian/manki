const { loadBookUrls, loadChapters, saveChapters } = require('./model')
const { withMangaPage } = require('./page')
const ProgressBar = require('progress')

const getMangaChapterUrls = async (page) => {
    const adultCheck = await page.$('a#checkAdult')
    if (adultCheck) {
        await adultCheck.click()
    }
    const urls = await page.$$eval('div.chapter-list li a', nodes => nodes.map(a => a.href))
    return urls
}

const getNotTransformedChapterUrls = async (bookUrl) => {
    const chapterUrls = await withMangaPage(bookUrl)(getMangaChapterUrls)
    const chapters = await loadChapters()
    const chapterUrlSet = new Set(chapters.map(c => c.url))
    return chapterUrls.filter(c => !chapterUrlSet.has(c))
}

const run = async () => {
    const bookUrls = loadBookUrls()
    const bar = new ProgressBar('transform books to chapters [:current/:total] :percent :etas', { total: bookUrls.length });

    for (let bookUrl of bookUrls) {
        const chapterUrls = await getNotTransformedChapterUrls(bookUrl)
        const chapters = chapterUrls.map(url => ({
            _id: url,
            url,
            bookUrl,
        }))
        await saveChapters(chapters)

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
