// Perbaikan khusus Termux: npm membuat salinan shim di node_modules/.bin
// (bukan symlink) sehingga path relatif patah, dan shebang /usr/bin/env
// tidak ada di Termux tanpa termux-exec. Skrip ini me-patch shebang semua
// file bin package ke path node absolut dan mengganti .bin dengan symlink.
// Tidak diperlukan di Termux normal (termux-exec aktif) atau Linux biasa.
import fs from 'node:fs';
import path from 'node:path';

const nm = 'node_modules';
const binDir = path.join(nm, '.bin');
const NODE = '#!/data/data/com.termux/files/usr/bin/node';

if (!fs.existsSync(nm)) {
  console.error('node_modules tidak ada — jalankan npm install dulu.');
  process.exit(1);
}

function processPkg(name) {
  const pj = path.join(nm, name, 'package.json');
  if (!fs.existsSync(pj)) return;
  const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
  if (!j.bin) return;
  const bins =
    typeof j.bin === 'string'
      ? { [j.name.split('/').pop()]: j.bin }
      : j.bin;
  for (const [bname, rel] of Object.entries(bins)) {
    const f = path.join(nm, name, rel);
    if (!fs.existsSync(f)) continue;
    const c = fs.readFileSync(f, 'utf8');
    if (c.startsWith('#!')) {
      const rest = c.slice(c.indexOf('\n') + 1);
      fs.writeFileSync(f, NODE + '\n' + rest);
    }
    const link = path.join(binDir, bname);
    try {
      if (fs.existsSync(link) || fs.lstatSync(link).isSymbolicLink())
        fs.unlinkSync(link);
    } catch {}
    fs.symlinkSync(path.relative(binDir, f), link);
    try {
      fs.chmodSync(f, 0o755);
    } catch {}
  }
}

for (const name of fs.readdirSync(nm)) {
  if (name.startsWith('.')) continue;
  if (name.startsWith('@')) {
    for (const sub of fs.readdirSync(path.join(nm, name)))
      processPkg(path.join(name, sub));
    continue;
  }
  processPkg(name);
}
console.log('bin shim diperbaiki');
