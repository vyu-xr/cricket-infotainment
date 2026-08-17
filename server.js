const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8085;

// RapidAPI Credentials & Verified Endpoints
const RAPID_API_HOST = 'cricket-api-free-data.p.rapidapi.com';
const RAPID_API_KEY = '048c1bf91amshb8fb396b2e774f1p1f71b5jsn9fea418e14df';
const CRIC_API_KEY = '25284dc8-0d81-49c1-ad70-55a023e163f8';

// 1. Fetch Live Matches from RapidAPI (/cricket-matches-live)
function fetchRapidApiLiveMatches() {
  return new Promise((resolve) => {
    const options = {
      hostname: RAPID_API_HOST,
      path: '/cricket-matches-live',
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPID_API_HOST,
        'x-rapidapi-key': RAPID_API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.status === 'success') {
            resolve(parsed.response || []);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

// 2. Fetch Schedule Matches from RapidAPI (/cricket-schedule)
function fetchRapidApiScheduleMatches() {
  return new Promise((resolve) => {
    const options = {
      hostname: RAPID_API_HOST,
      path: '/cricket-schedule',
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPID_API_HOST,
        'x-rapidapi-key': RAPID_API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.status === 'success' && parsed.response && parsed.response.schedules) {
            resolve(parsed.response.schedules);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

// 3. Fetch from CricAPI
function fetchCricApiData() {
  return new Promise((resolve) => {
    https.get(`https://api.cricapi.com/v1/cricScore?apikey=${CRIC_API_KEY}`, (res) => {
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
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// 4. Fetch from ESPNcricinfo Live RSS Stream
function fetchCricinfoRssData() {
  return new Promise((resolve) => {
    https.get('https://static.cricinfo.com/rss/livescores.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
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
    }).on('error', () => resolve([]));
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/live') {
    const rapidLive = await fetchRapidApiLiveMatches();
    const rapidSchedule = await fetchRapidApiScheduleMatches();
    const cricApiData = await fetchCricApiData();
    const rssData = await fetchCricinfoRssData();

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });

    res.end(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      rapidApiHost: RAPID_API_HOST,
      rapidLiveEndpoint: '/cricket-matches-live',
      rapidScheduleEndpoint: '/cricket-schedule',
      rapidLiveMatches: rapidLive,
      rapidSchedules: rapidSchedule,
      cricApiMatches: cricApiData,
      rssMatches: rssData
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
      console.log(`📡 Cricket Infotainment Server running on http://localhost:${server.address().port}`);
    });
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`📡 Cricket Infotainment Server running on http://localhost:${PORT}`);
});

module.exports = server;
