(async () => {
    await require('./transform-books-to-chapters')()
    await require('./transform-chapters-to-images')()
    await require('./download-images')()
})()
