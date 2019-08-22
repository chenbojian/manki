const archiver = require('archiver')
const fs = require('fs')
const path = require('path')

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

async function main() {
    const mangaBookPath = process.argv[2]

    const subpaths = fs.readdirSync(mangaBookPath)
    
    for (subpath of subpaths.filter(p => !/DS_Store/.test(p))) {
        const chapterPath = path.join(mangaBookPath, subpath)
        await zipDirectory(chapterPath, chapterPath + '.zip')
    }

    for (p of subpaths) {
        fs.rmdirSync(path.join(chapterPath, p))
    }
}

main()