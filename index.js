const { download } = require('./manhuagui')

download(process.argv[2])
    .catch(e => {
        console.error(e)
    })