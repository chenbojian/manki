const axios = require('axios')
const util = require('util')
const fs = require('fs')
const mkdir = util.promisify(fs.mkdir)
const writeFile = util.promisify(fs.writeFile)


class AxiosImageDownloader {
    async download(url, path, headers = {}) {
        const response = await axios.get(encodeURI(url), {
            headers: headers,
            responseType: 'arraybuffer'
        })
        const buffer = await response.data
        await writeImage(buffer, path)
    }
}

async function writeImage(buffer, filename) {
    const foldername = /(.+\/)[^\/]+$/.exec(filename)[1]

    if (!fs.existsSync(foldername)) {
        await mkdir(foldername, {
            recursive: true
        })
    }

    await writeFile(filename, buffer, 'binary')
}

module.exports = AxiosImageDownloader;



