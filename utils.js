const fs = require('fs')

function loadJsonFile(filename, data) {
    if (!fs.existsSync(filename)) {
        return data
    }
    return JSON.parse(fs.readFileSync(filename, 'utf8'))
}

function saveJsonFile(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data), 'utf8')
}

function retry(funcAsync, times) {
    let count = 1

    async function innerRetry(...args) {
        try {
            return await funcAsync(...args)
        } catch (e) {
            if (count < times) {
                count = count + 1
                return await innerRetry(...args)
            }
            throw e
        }
    }

    return innerRetry
}

module.exports = {
    loadJsonFile,
    saveJsonFile,
    retry
}
