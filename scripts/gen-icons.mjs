// Generátor PWA ikon z brandového motivu (zlatá „26" na černé).
// Maskable = full-bleed (OS si sám zaoblí/ořízne), obsah v bezpečné zóně.
// Spuštění: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// Full-bleed čtverec, „26" zlatě na černé. font-size velký, ale uvnitř ~80 % (safe zone pro maskable).
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0A0A0A"/>
  <text x="50" y="50" font-family="Arial Black, Arial, sans-serif" font-weight="900"
        font-size="46" fill="#D4AF37" text-anchor="middle" dominant-baseline="central"
        letter-spacing="-2">26</text>
  <text x="50" y="80" font-family="Arial, sans-serif" font-weight="700"
        font-size="9.5" fill="#E6E6E6" text-anchor="middle" dominant-baseline="central"
        letter-spacing="0.5">TIPOVAČKA</text>
</svg>`

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const t of targets) {
  await sharp(Buffer.from(svg(t.size))).png().toFile(join(pub, t.name))
  console.log('✓', t.name, t.size + 'px')
}
