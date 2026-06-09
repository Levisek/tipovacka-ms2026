// Vygeneruje VAPID klíčový pár pro Web Push.
// - PUBLIC (applicationServerKey) → do klienta (base64url, 65B nekomprimovaný bod)
// - PRIVATE PEM → do secrets.php na serveru (PHP openssl_sign ES256)
// Spuštění: node scripts/gen-vapid.mjs
import crypto from 'crypto'

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
})

const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' })
const jwk = publicKey.export({ format: 'jwk' }) // { kty, crv, x, y }
const x = Buffer.from(jwk.x, 'base64url')
const y = Buffer.from(jwk.y, 'base64url')
const pub = Buffer.concat([Buffer.from([0x04]), x, y]).toString('base64url')

console.log('=== VAPID_PUBLIC (applicationServerKey, do klienta) ===')
console.log(pub)
console.log('\n=== VAPID_PRIVATE_PEM (do secrets.php) ===')
console.log(privPem.trim())
