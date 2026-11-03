const http = require('http');
const fs = require('fs');
const path = require('path');

const WWW = path.join(__dirname, 'www');
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  
  let filePath = path.join(WWW, reqPath);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(WWW, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'text/plain';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end('Server Error: ' + err.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`GharBijli live preview running at http://localhost:${PORT}`);
});
