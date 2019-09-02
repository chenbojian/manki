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

async function zipBook(bookPath) {
  const subpaths = fs.readdirSync(bookPath)

  for (subpath of subpaths) {
    const fullPath = path.join(bookPath, subpath)
    if (/DS_Store/.test(fullPath)) {
      rimraf.sync(fullPath)
    } else if (fs.statSync(fullPath).isDirectory()) {
      await zipDirectory(fullPath, fullPath + '.zip')
      rimraf.sync(fullPath)
      console.log('zipped ' + fullPath)
    }
  }
}

async function main() {
    const mangaBookPath = process.argv[2]
    await zipBook(mangaBookPath)
}

main()