module.exports = async (url, data) => {
  const https = require('https');

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length || 0
    },
  };

  const post = await new Promise(resolve => {
    let request = https.request(url, options, (res) => {
      res.setEncoding('utf8');
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(responseBody));
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.write(data);
    request.end();
  });

  return post;
};
