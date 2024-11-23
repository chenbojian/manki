const { JSDOM } = require('jsdom')
const path = require('path')
const Downloader = require('../common/axios-image-downloader')
const archiver = require('archiver')
const fs = require('fs')
const rimraf = require('rimraf')
const _ = require('lodash')
const loadHtml = require('../common/axios-html')
const PromisePool = require('es6-promise-pool')
const downloader = new Downloader()

loadHtml(process.argv[2]).then(downloadBook)

async function downloadBook(html) {
    // console.log(html)
    const { window: bookWindow } = new JSDOM(html)
    const title = bookWindow.document.querySelector('div.info2 h1').innerHTML
    const chapters = [...bookWindow.document.querySelectorAll('div.rowzhangjie div.panel-body ul li a')]
    chapters.reverse()

    for (const c of chapters) {
        const chapterData = {
            book: title,
            chapter: c.textContent.trim(),
            chapterUrl: 'https://www.veryim.com' + c.href,
            images: []
        }
        if (isChapterDownloaded(chapterData)) {
            console.log(`skipped ${chapterData.book}/${chapterData.chapter}`)
            continue;
        }
        const chapterHtml = await loadHtml(chapterData.chapterUrl)
        const { window: chapterWindow } = new JSDOM(chapterHtml)
        eval(chapterWindow.document.querySelectorAll('script')[3].innerHTML)
        const imgUrls = Buffer.from(qTcms_S_m_murl_e, 'base64').toString().split('$qingtiandy$')

        for (let i = 0; i < imgUrls.length; i++) {
            let imgUrl = imgUrls[i]
            if (imgUrl.startsWith('https://cdn1.npdn.top')) {
                imgUrl = imgUrl.replace('https://cdn1.npdn.top', 'https://cdn2.npdn.top')
            }
            const fileExt = (/(\.[^\.]+)$/.exec(imgUrl))[1]
            chapterData.images.push({
                name: stringify(i + 1, 10) + fileExt,
                url: imgUrl
            })
        }
        // console.log(chapterData)
        await retry(downloadChapter)(chapterData)
        break
    }
}



function stringify(num, digits) {
    let str = num.toString()
    return Array(digits - str.length).fill('0').join('') + str
}

function isChapterDownloaded(chapterData) {
    const zipPath = path.join('out', chapterData.book, chapterData.chapter + '.zip')
    if (fs.existsSync(zipPath)) {
        return true
    }
    return false
}

async function downloadChapter(chapterData) {
    const headers = {
        'Referer': chapterData.chapterUrl,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
    }
    const folderPath = path.join('out', chapterData.book, chapterData.chapter)

    if (fs.existsSync(folderPath)) {
        rimraf.sync(folderPath)
    }

    function* generateDownloadPromises() {
        for (let image of chapterData.images) {
            yield downloader.download(
                image.url,
                path.join(folderPath, image.name),
                headers)
        }
    }

    const pool = new PromisePool(generateDownloadPromises(), 3)

    await pool.start()

    await zipDirectory(folderPath, folderPath + '.zip')
    rimraf.sync(folderPath)
    console.log(`downloaded ${chapterData.book}/${chapterData.chapter}`)

    function zipDirectory(source, out) {
        const archive = archiver('zip', { zlib: { level: 9 } })
        const stream = fs.createWriteStream(out)

        return new Promise((resolve, reject) => {
            archive
                .directory(source, false)
                .on('error', err => reject(err))
                .pipe(stream)


            stream.on('close', () => resolve())
            archive.finalize()
        })
    }
}


function retry(func) {
    let retryCount = 0;
    return async function () {
        while (true) {
            try {
                return await func.apply(undefined, arguments)
            } catch (e) {
                if (retryCount < 5) {
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                    retryCount++
                    continue
                } else {
                    throw e
                }
            }
        }

    }
}