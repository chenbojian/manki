const { loadImages } = require('./model')
const archiver = require('archiver')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

function zipDirectory(source, out) {
  const archive = archiver('zip', { zlib: { level: 9 }})
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

async function isChapterDownloaded(fullPath) {
  const [, book, chapter] = fullPath.split(path.sep)
  const images = await loadImages()
  const infos = images.map(i => {
    const [iBook, iChapter, iFile] = i.filename.split(path.sep)
    return {
      book: iBook,
      chapter: iChapter,
      file: iFile,
      downloaded: i.downloaded
    }
  })
  const chapterInfos = infos.filter(i => i.book === book & i.chapter === chapter)
  if (chapterInfos.length === 0) {
    return false
  }
  return chapterInfos.every(i => i.downloaded)
}

async function zipBook(bookPath) {
  const subpaths = fs.readdirSync(bookPath)

  for (let subpath of subpaths) {
    const fullPath = path.join(bookPath, subpath)
    if (/DS_Store/.test(fullPath)) {
      rimraf.sync(fullPath)
      continue
    }
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!await isChapterDownloaded(fullPath)) {
        console.log(`not zip ${fullPath} because not downloaded`)
        continue
      }
      await zipDirectory(fullPath, fullPath + '.zip')
      rimraf.sync(fullPath)
      console.log('zipped ' + fullPath)
    }
  }
}

async function main() {
  for (let subpath of fs.readdirSync('./out')) {
    const fullPath = path.join('./out', subpath)
    if (/DS_Store/.test(fullPath)) {
      rimraf.sync(fullPath)
    } else {
      await zipBook(fullPath)
    }
  }
}

main()