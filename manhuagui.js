const fs = require('fs')

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
        this.page.on('requestfinished', (request) => {
            if (isImage(request)) {
                const response = request.response()
                const url = request.url()
                this.imageBufferPromises[url] = response.buffer()
            }
        })
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
        while (true) {
            try {
                await this.page.waitFor(() => document.querySelector('div#imgLoading').style.display === 'none')
                const imageSrc = await this.page.$eval('img#mangaFile', node => node.src)
                const title = await this.page.$eval('div.title', node => node.textContent)
                const buffer = await this.imageBufferPromises[imageSrc]
                writeFile(buffer, title)
                if (isLastPage(title)) {
                    break;
                }
                await this.page.click('a#next')
            } catch (error) {
                console.error(error)
                console.error('failed at ', this.page.url())
                await this.page.screenshot({
                    path: 'failed-page.png'
                })
                await this.page.reload()
            }
        }
        this._setPageDownloaded(url)
    }
}

function writeFile(buffer, title) {
    const [, folder, subfolder, page] = /关灯([^\/]+)\/([^\/]+)\/\((\d+)\/\d+\)/.exec(title)
    const folderName = 'out/' + folder + '/' + subfolder
    const fileName = folderName + '/' + page + '.webp'
    fs.mkdirSync(folderName, {
        recursive: true
    })
    fs.writeFileSync(fileName, buffer, 'binary')
}

function isLastPage(title) {
    const [, page, totalPage] = /\((\d+)\/(\d+)\)/.exec(title)
    return page === totalPage
}

function isImage(request) {
    const url = request.url()
    return /webp/.test(url) && /cid/.test(url)
}

module.exports = ManHuaGui
