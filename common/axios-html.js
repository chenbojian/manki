const axios = require("axios");

async function loadHtml(url) {
  const res = await axios.get(url)
  return res.data
}


module.exports = loadHtml