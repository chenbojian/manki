const axios = require("axios");
const util = require('util')
const fs = require('fs')
const mkdir = util.promisify(fs.mkdir)

class ImageDownloader {
  async download(url, path, headers = {}) {
    await ensurePath(path)
    console.log(`Downloading ${url} to ${path}`)
    const res = await axios.get(url, {
      responseType: "stream",
      headers,
    })
    res.data.pipe(fs.createWriteStream(path))

  }
}

async function ensurePath(path) {
  const foldername = /(.+\/)[^\/]+$/.exec(path)[1]

  if (!fs.existsSync(foldername)) {
    await mkdir(foldername, {
      recursive: true,
    })
  }
}

module.exports = ImageDownloader