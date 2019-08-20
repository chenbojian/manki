const fs = require('fs')
const PromisePool = require('es6-promise-pool')
const ProgressBar = require('progress');
// const AxiosImageDownloader = require('./axios-image-downloader')
const CurlImageDownloader = require('./curl-image-downloader')
const puppeteer = require('puppeteer')
const retry = require('./retry')

const storage = (() => {
    class ResumeStorage {
        constructor() {
            this.db = this._loadDb()
        }
    
        _loadDb() {
            if (fs.existsSync('db.json')) {
                return JSON.parse(fs.readFileSync('db.json', 'utf8'))
            }
            return {};
        }
    
        _persistDb() {
            fs.writeFileSync('db.json', JSON.stringify(this.db), 'utf8')
        }
    
        markAsDownloaded(pageUrl) {
            if (!this.db.downloadedPages) {
                this.db.downloadedPages = {}
            }
            this.db.downloadedPages[pageUrl] = true
            this._persistDb()
        }
    
        isDownloaded(pageUrl) {
            if (!this.db.downloadedPages) {
                return false
            }
            return this.db.downloadedPages[pageUrl]
        }
    }
    return new ResumeStorage()
})()

const withPage = (urls) => async (func) => {
    const browser = await puppeteer.launch()
    try {
        const page = await browser.newPage()
        page.setViewport({
            width: 1280,
            height: 800,
            deviceScaleFactor: 1,
        })
        for (let url of urls) {
            await page.goto(url)
        }
        return await func(page)
    } finally {
        await browser.close()
    }

}

const withMangaPage = (url) => withPage(['https://www.manhuagui.com/', url])

const getMangaChapterUrls = async (url) => {
    return withMangaPage(url)(
        async (page) => {
            const urls = await page.$$eval('div.chapter-list li a', nodes => nodes.map(a => a.href))
            return urls
        })
}

const getMangaChapterInfo = async (url) => {
    return withMangaPage(url)(
        async (page) => {
            await page.goto(url)
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
                    filename: 'out/' + mangaData.bname + '/' + mangaData.cname + '/' + stringify(idx + 1, 10) + fileExt,
                    url: pVars.manga.filePath + file + '?cid=' + mangaData.cid + '&md5=' + mangaData.sl.md5
                });
            })

            const title = /关灯(.+)\(.+\)/.exec(await page.$eval('div.title', node => node.textContent))[1]

            return {
                title,
                infos: imgInfos
            }
        })
}

const download = async (url) => {
    const chapterUrls = await retry(getMangaChapterUrls, 2)(url)
    for (let chapterUrl of chapterUrls) {
        if (storage.isDownloaded(chapterUrl)) {
            continue
        }
        const chapterInfo = await retry(getMangaChapterInfo, 2)(chapterUrl)

        const bar = new ProgressBar(chapterInfo.title + '    [:current/:total] :percent :etas', { total: chapterInfo.infos.length });

        const pool = new PromisePool(createProducer(chapterInfo.infos, chapterUrl, bar), 10)

        await pool.start()

        storage.markAsDownloaded(chapterUrl)
    }
}

function stringify(num, digits) {
    let str = num.toString()
    return Array(digits - str.length).fill('0').join('') + str
}

function createProducer(infos, referer, bar) {
    const downloader = new CurlImageDownloader()
    const download = async (url, path, headers) => {
        await downloader.download(url, path, headers)
        bar.tick()
    }

    const headers = {
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
    }

    return function* () {
        for (let info of infos) {
            yield download(info.url, info.filename, headers)
        }
    }
}

module.exports = {
    download
}
