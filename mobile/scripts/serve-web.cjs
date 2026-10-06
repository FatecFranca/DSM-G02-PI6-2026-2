// Servidor estático mínimo com fallback SPA para validar o export web (dist/).
const http = require('http'), fs = require('fs'), path = require('path')
const root = path.join(__dirname, '..', 'dist')
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf', '.css': 'text/css' }
http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(req.url.split('?')[0]))
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html')
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}).listen(8081, () => console.log('serving dist on 8081'))
