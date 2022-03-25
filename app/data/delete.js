module.exports = async (url) => {
  const https = require('https');

  const res = await new Promise(resolve => {
    const options = { method: 'DELETE' };
    https.request(url, options, resolve);
  });

  let data = await new Promise((resolve, reject) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('error', err => reject(err));
    res.on('end', () => resolve(data));
  });

  return JSON.parse(data);
};
