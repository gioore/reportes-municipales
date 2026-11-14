import { randomBytes } from 'node:crypto';

const apiKey = process.env.FIREBASE_WEB_API_KEY;
if (!apiKey) throw new Error('Configura FIREBASE_WEB_API_KEY.');
const email = (process.argv[2] || 'municipal@reportes-municipales-gioore.firebaseapp.com').toLowerCase();
const password = process.argv[3] || randomBytes(12).toString('base64url') + 'Aa1!';
const respuesta = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(apiKey), {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true })
});
if (!respuesta.ok) throw new Error((await respuesta.text()).slice(0, 500));
const usuario = await respuesta.json();
console.log(JSON.stringify({ uid: usuario.localId, email, password }, null, 2));
