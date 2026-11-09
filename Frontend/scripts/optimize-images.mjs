// Recomprime las fotos de public/img: máximo 1600 px de ancho y WebP de buena calidad.
// Uso: npm run images  (solo toca las que pesan más de 180 KB y solo si el resultado es más liviano)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false); // en Windows evita que el archivo original quede bloqueado
const DIR = path.resolve('public/img');
const MAX_W = 1600;
const LIMIT = 180 * 1024;

let saved = 0;
for (const file of fs.readdirSync(DIR).filter((f) => /\.(webp|jpe?g|png)$/i.test(f))) {
  const full = path.join(DIR, file);
  const before = fs.statSync(full).size;
  if (before <= LIMIT) continue;
  const out = await sharp(fs.readFileSync(full)).rotate().resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: 74, effort: 6, smartSubsample: true }).toBuffer();
  if (out.length < before) {
    const target = full.replace(/\.(jpe?g|png)$/i, '.webp');
    fs.writeFileSync(target, out);
    saved += before - out.length;
    console.log(`${file.padEnd(24)} ${(before / 1024).toFixed(0).padStart(5)} KB → ${(out.length / 1024).toFixed(0).padStart(4)} KB`);
  }
}
console.log(`Ahorro total: ${(saved / 1024).toFixed(0)} KB`);
