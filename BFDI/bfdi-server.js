#!/usr/bin/env node
'use strict';

// Servidor estático mínimo (sem dependências) para o BFDI × TESLA.
// Uso:  node bfdi-server.js       ->  http://localhost:8080
//       PORT=3000 node bfdi-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const START_PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function handler(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname);
  } catch (e) {
    res.writeHead(400); res.end('400'); return;
  }
  if (pathname === '/' || pathname === '') pathname = '/bfdi.html';

  const file = path.resolve(ROOT, '.' + pathname);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('403 — fora da pasta');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 — não encontrei ' + pathname);
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(data);
  });
}

function listen(port, tries) {
  const server = http.createServer(handler);
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && tries > 0) {
      console.log('porta ' + port + ' ocupada, a tentar ' + (port + 1) + '…');
      listen(port + 1, tries - 1);
    } else {
      console.error('erro: ' + e.message);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log('BFDI × TESLA -> http://localhost:' + port);
    console.log('Ctrl+C para parar.');
  });
}

listen(START_PORT, 10);
