const { JSDOM } = require('jsdom')
const path = require('path')
const Downloader = require('./curl-image-downloader')
const archiver = require('archiver')
const fs = require('fs')
const rimraf = require('rimraf')
const _ = require('lodash')
const loadHtml = require('./curl-html')
const downloader = new Downloader()

const configScript = fs.readFileSync(path.join(__dirname, './config.js'))
const coreScript = fs.readFileSync(path.join(__dirname, './core.js'))

const { window } = new JSDOM(`
<body>
    <div class="sub-btn"></div>
    <script>${configScript}</script>
    <script>${coreScript}</script>
</body>`, { runScripts: 'dangerously' })



function getChapterUrls(bookUrl) {
    return loadHtml(bookUrl)
        .then(c => new JSDOM(c))
        .then(({ window: root }) => {
            return [...root.document.querySelectorAll('div.chapter-list li a')]
                .map(e => 'https://www.manhuagui.com' + e.href)
        })
}


function getChapterData(chapterUrl) {
    return loadHtml(chapterUrl)
        .then(c => new JSDOM(c))
        .then(({ window: root }) => {
            let script = [...root.document.querySelectorAll('script:not([src])')]
                .filter(s => /window.+fromCharCode/.test(s.innerHTML))[0].innerHTML.trim();
            window.eval('SMH.imgData = function (n) { window.mangaData = n; return { preInit: () => {} }; }')
            window.eval(script)
            return convert(window.mangaData)
        })

    function convert(mangaData) {
        return {
            book: mangaData.bname,
            chapter: mangaData.cname,
            chapterUrl: chapterUrl,
            images: mangaData.files.map((file, idx) => {
                file = file.replace(/(.*)\.webp$/gi, "$1")
                const fileExt = (/(\.[^\.]+)$/.exec(file))[1]
                return ({
                    name: stringify(idx + 1, 10) + fileExt,
                    url: 'https://i.hamreus.com' + mangaData.path + file + '?cid=' + mangaData.cid + '&md5=' + mangaData.sl.md5
                });
            })
        }
    }

    function stringify(num, digits) {
        let str = num.toString()
        return Array(digits - str.length).fill('0').join('') + str
    }
}

async function downloadChapter(chapterData) {
    const headers = {
        'Referer': chapterData.chapterUrl,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
    }
    const folderPath = path.join('out', chapterData.book, chapterData.chapter)

    for (let image of chapterData.images) {
        await downloader.download(
            image.url,
            path.join(folderPath, image.name),
            headers)
    }

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

const downloadedChaptersPath = path.join('out', 'downloaded-chapters.json')
let downloadedChapters = new Set(fs.existsSync(downloadedChaptersPath) ? JSON.parse(fs.readFileSync(downloadedChaptersPath)) : [])
const saveDownloadedChapters = () => fs.writeFileSync(downloadedChaptersPath, JSON.stringify([...downloadedChapters]))
process.on('SIGINT', saveDownloadedChapters)

getChapterUrls(process.argv[2])
    .then(async (chapterUrls) => {
        for (let chapterUrl of chapterUrls) {
            if (downloadedChapters.has(chapterUrl)) {
                continue
            }
            await getChapterData(chapterUrl).then(downloadChapter)
            downloadedChapters.add(chapterUrl)
            // await getChapterData(chapterUrl).then(console.log)
        }
    })
    .finally(saveDownloadedChapters)
