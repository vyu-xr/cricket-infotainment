const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8085;
const API_KEY = '25284dc8-0d81-49c1-ad70-55a023e163f8';
const API_URL = `https://api.cricapi.com/v1/cricScore?apikey=${API_KEY}`;

// Fetch real-world live scores from CricAPI (CricketData.org) using user's API Key
function fetchCricApiLiveScores() {
  return new Promise((resolve) => {
    https.get(API_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.status === 'success' && parsed.data) {
            resolve(parsed.data);
          } else {
            resolve([]);
          }
        } catch (e) {
          console.error('CricAPI JSON parse error:', e.message);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error('Error fetching CricAPI live scores:', err.message);
      resolve([]);
    });
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/live') {
    const liveMatches = await fetchCricApiLiveScores();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      success: true,
      apiKeyActive: true,
      timestamp: new Date().toISOString(),
      matches: liveMatches
    }));
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(content, 'utf-8');
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    server.listen(0, () => {
      console.log(`📡 CricAPI Real-World Server running on http://localhost:${server.address().port}`);
    });
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`📡 CricAPI Real-World Server running on http://localhost:${PORT}`);
});

module.exports = server;
