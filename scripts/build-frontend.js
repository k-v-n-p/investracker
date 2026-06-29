import fs from 'fs';
import path from 'path';

function withHttps(url) {
  const v = (url || '').trim();
  if (!v) return '';
  return /^https?:\/\//.test(v) ? v : `https://${v}`;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, ent.name);
    const dest = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

const apiUrl = withHttps(process.env.API_URL);
const dist = path.resolve('dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync('index.html', path.join(dist, 'index.html'));
copyDir('css', path.join(dist, 'css'));
copyDir('js', path.join(dist, 'js'));

const configPath = path.join(dist, 'js', '00-config.js');
const config = fs.readFileSync(configPath, 'utf8').replace('__API_URL__', apiUrl);
fs.writeFileSync(configPath, config);

console.log('Frontend built; API_URL:', apiUrl || '(empty — local mode)');
