const puppeteer = require('puppeteer')

const withMangaPage = (url) => async (func) => {
    const browser = await puppeteer.launch({
        headless: process.env['DEBUG'] !== 'true'
    })
    try {
        const page = await browser.newPage()
        page.setViewport({
            width: 1280,
            height: 800,
            deviceScaleFactor: 1,
        })
        await page.goto('https://www.manhuagui.com/', {
            waitUntil: 'domcontentloaded'
        })
        await page.goto(url)
        return await func(page)
    } catch(e) {
        await page.screenshot({path: url + '.png'})
        throw e
    } finally {
        await browser.close()
    }
}

module.exports = {
    withMangaPage
}