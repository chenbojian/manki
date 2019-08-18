const puppeteer = require('puppeteer')
const ManHuaGui = require('./manhuagui')

puppeteer.launch({
    headless: true
}).then(async (browser) => {
    const page = await browser.newPage()
    page.setViewport({
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
    })

    const manHuaGui = new ManHuaGui(page)

    await manHuaGui.init()

    await manHuaGui.downloadAll(process.argv[2])

    await browser.close()
})
