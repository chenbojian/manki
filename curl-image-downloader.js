const { spawn } = require('child_process')
const util = require('util')
const fs = require('fs')
const mkdir = util.promisify(fs.mkdir)

class CurlImageDownloader {
    async download(url, path, headers = {}) {
        await ensurePath(path)

        let headerOptions = []

        for (let k of Object.keys(headers)) {
            headerOptions.push('-H')
            headerOptions.push(`${k}: ${headers[k]}`)
        }

        const curl = spawn('curl', [url, ...headerOptions, '-o', path])

        await new Promise((resolve, reject) => {
            let error
            let out
            curl.stderr.on('data', (data) => {
                error = data
            });

            curl.stdout.on('data', (data) => {
                out = data
            })

            curl.on('close', (code) => {
                if (code === 0) {
                    resolve(code)
                } else {
                    reject(`out: ${out} \n error: ${error}`)
                }
            })
        })

    }
}

async function ensurePath(path) {
    const foldername = /(.+\/)[^\/]+$/.exec(path)[1]

    if (!fs.existsSync(foldername)) {
        await mkdir(foldername, {
            recursive: true
        })
    }
}

module.exports = CurlImageDownloader