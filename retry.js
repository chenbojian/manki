function retry(funcAsync, times) {
    let count = 1

    async function innerRetry(...args) {
        try {
            return await funcAsync(...args)
        } catch (e) {
        }
        if (count < times) {
            count = count + 1
            return await innerRetry(...args)
        }
    }

    return innerRetry
}

module.exports = retry
