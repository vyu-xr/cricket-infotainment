const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8085;

// Fetch real live scores from ESPNcricinfo / Cricbuzz RSS Feed
function fetchCricinfoLiveScores() {
  return new Promise((resolve) => {
    https.get('https://static.cricinfo.com/rss/livescores.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const items = data.match(/<item>[\s\S]*?<\/item>/g) || [];
        const matches = items.map(item => {
          const titleMatch = item.match(/<title>(.*?)<\/title>/);
          const descMatch = item.match(/<description>(.*?)<\/description>/);
          return {
            title: titleMatch ? titleMatch[1].trim() : '',
            description: descMatch ? descMatch[1].trim() : ''
          };
        });
        resolve(matches);
      });
    }).on('error', (err) => {
      console.error('Error fetching Cricinfo live scores:', err.message);
      resolve([]);
    });
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/live') {
    const liveMatches = await fetchCricinfoLiveScores();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      success: true,
      provider: 'ESPNcricinfo Live Feed',
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
      console.log(`📡 Cricinfo Real-World Live Server running on http://localhost:${server.address().port}`);
    });
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`📡 Cricinfo Real-World Live Server running on http://localhost:${PORT}`);
});

module.exports = server;
