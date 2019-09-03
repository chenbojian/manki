const { loadJsonFile } = require('./utils')
const PouchDB = require('pouchdb')

const bookUrlsFilename = 'data/book-urls.json'
const CHAPTER_DB_NAME = 'data/chapters'
const IMAGE_DB_NAME = 'data/images'

const imageDB = new PouchDB('data/images')

function loadBookUrls() {
    return loadJsonFile(bookUrlsFilename, [])
}

async function loadDocs(database) {
    const db = new PouchDB(database)
    const docs = (await db.allDocs({
        include_docs: true
    })).rows.map(r => r.doc)
    await db.close()
    return docs
}

async function saveDocs(database, docs) {
    const db = new PouchDB(database)
    await db.bulkDocs(docs)
    await db.close()
}

module.exports = {
    loadBookUrls,
    loadChapters: async () => await loadDocs(CHAPTER_DB_NAME),
    loadImages: async () => await loadDocs(IMAGE_DB_NAME),
    saveChapters: async (chapters) => await saveDocs(CHAPTER_DB_NAME, chapters),
    saveImages: async (images) => await saveDocs(IMAGE_DB_NAME, images),
}