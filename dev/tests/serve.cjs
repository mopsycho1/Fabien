// Picture server for the tests: serves public/ on port 8800 (or the port you pass).
// Use this instead of python3 -m http.server, which drops connections when the
// game asks for many pictures at once (random "Could not load img" failures on Mac).
// Run from anywhere: node dev/tests/serve.cjs   (stop it with Ctrl+C)
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../public');
const port = Number(process.argv[2]) || 8800;
const types = { '.png': 'image/png', '.json': 'application/json', '.js': 'text/javascript', '.html': 'text/html' };

http
  .createServer((req, res) => {
    // Stay inside public/ whatever the URL says
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(port, '0.0.0.0', 1024); // big backlog so picture bursts are not dropped
console.log('Serving ' + root + ' on http://localhost:' + port);
