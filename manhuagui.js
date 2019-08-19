const fs = require('fs')
const PromisePool = require('es6-promise-pool')
const ProgressBar = require('progress');
const AxiosImageDownloader = require('./axios-image-downloader')

class ManHuaGui {
    constructor(page) {
        this.page = page
        this.imageBufferPromises = {}
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

    _isPageDownloaded(url) {
        if (!this.db.downloadedPages) {
            return false
        }
        return this.db.downloadedPages[url]
    }

    _setPageDownloaded(url) {
        if (!this.db.downloadedPages) {
            this.db.downloadedPages = {}
        }
        this.db.downloadedPages[url] = true
        this._persistDb()
    }

    async init() {
        await this.page.goto('https://www.manhuagui.com/')
    }

    async downloadAll(url) {
        await this.page.goto(url)
        const list = await this.page.$$eval('div.chapter-list li a', nodes => nodes.map(a => a.href))
        for (const i of list) {
            await this.download(i)
        }
    }

    async download(url) {
        if (this._isPageDownloaded(url)) {
            return
        }
        await this.page.goto(url)
        const mangaData = await this.page.evaluate(() => {
            SMH.imgData = function(n) { window.mangaData = n }
            let script = [...document.querySelectorAll('script:not([src])')].filter(s => /window.+fromCharCode/.test(s.innerHTML))[0]
            let newScript = document.createElement('script')
            newScript.type = "text\/javascript"
            newScript.innerHTML = script.innerHTML
            document.body.append(newScript)          
            return window.mangaData
        })
        const pVars = await this.page.evaluate(() => pVars)
        const imgInfos = mangaData.files.map((file, idx) => {
            file = file.replace(/(.*)\.webp$/gi, "$1")
            const fileExt = (/(\.[^\.]+)$/.exec(file))[1]
            return ({
                filename: 'out/' + mangaData.bname + '/' + mangaData.cname + '/' + (idx + 1) + fileExt,
                url: pVars.manga.filePath + file + '?cid=' + mangaData.cid + '&md5=' + mangaData.sl.md5
            });
        })

        const title = /关灯(.+)\(.+\)/.exec(await this.page.$eval('div.title', node => node.textContent))[1]
        const bar = new ProgressBar(title + '    [:current/:total] :percent :etas', { total: imgInfos.length });

        const pool = new PromisePool(createProducer(imgInfos, url, bar), 10)

        await pool.start()

        this._setPageDownloaded(url)
    }
}

function createProducer(infos, referer, bar) {
    const downloader = new AxiosImageDownloader()
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

module.exports = ManHuaGui
