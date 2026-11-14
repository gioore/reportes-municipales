import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const password = process.env.ADMIN_PASSWORD;
const port = Number(process.env.PORT || 3000);
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

if (!projectId || !password || password.length < 12) {
  throw new Error('Configura FIREBASE_PROJECT_ID y una ADMIN_PASSWORD de al menos 12 caracteres.');
}

const firebase = initializeApp(emulator ? { projectId } : { projectId, credential: applicationDefault() });
const reportes = getFirestore(firebase).collection('reportes');
const app = express();
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const maxFoto = 300 * 1024;
const maxSubida = 8 * 1024 * 1024;
const duracionSesion = 2 * 60 * 60 * 1000;
const sessionCookie = 'sesion_municipal';
const sessions = new Map();
const digest = (value) => createHash('sha256').update(value).digest();
const passwordDigest = digest(password);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSubida, files: 1, fields: 1, fieldSize: 8192, parts: 3 }
});

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Content-Security-Policy', "default-src 'self'; img-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  next();
});

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api', (req, res, next) => {
  if (req.get('Sec-Fetch-Site') === 'cross-site') {
    return res.status(403).json({ error: 'Solicitud de otro sitio.' });
  }
  next();
});

function obtenerSesion(req) {
  const cookies = (req.get('cookie') || '').split(';').map((cookie) => cookie.trim());
  return cookies.find((cookie) => cookie.startsWith(sessionCookie + '='))?.split('=')[1];
}

function exigirSesion(req, res, next) {
  const token = obtenerSesion(req);
  const vence = sessions.get(token);
  if (!vence || vence <= Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Inicia sesión para consultar reportes.' });
  }
  next();
}

const cookieOptions = { httpOnly: true, sameSite: 'strict', path: '/api' };

app.post('/api/sesion', express.json({ limit: '2kb' }), (req, res) => {
  const clave = req.body?.clave;
  if (typeof clave !== 'string' || !timingSafeEqual(digest(clave), passwordDigest)) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  for (const [token, vence] of sessions) {
    if (vence <= Date.now()) sessions.delete(token);
  }
  sessions.delete(obtenerSesion(req));
  const token = randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + duracionSesion);
  res.cookie(sessionCookie, token, { ...cookieOptions, maxAge: duracionSesion });
  res.sendStatus(204);
});

app.delete('/api/sesion', (req, res) => {
  sessions.delete(obtenerSesion(req));
  res.clearCookie(sessionCookie, cookieOptions);
  res.sendStatus(204);
});

async function prepararFoto(archivo) {
  const image = sharp(archivo, { limitInputPixels: 28_000_000 });
  const { format, pages } = await image.metadata();
  if (!['jpeg', 'png', 'webp'].includes(format) || (pages && pages > 1)) {
    throw new Error('Formato de foto incompatible.');
  }
  for (const [lado, calidad] of [[1600, 78], [1200, 68], [800, 60]]) {
    const foto = await image.clone().autoOrient()
      .resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: calidad })
      .toBuffer();
    if (foto.length <= maxFoto) return foto;
  }
  throw new Error('No se pudo ajustar el tamaño de la foto.');
}

app.post('/api/reportes', upload.single('foto'), async (req, res) => {
  const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
  if (descripcion.length < 10 || descripcion.length > 1500) {
    return res.status(400).json({ error: 'Escribe una descripción de 10 a 1500 caracteres.' });
  }
  if (!req.file) return res.status(400).json({ error: 'Adjunta una fotografía.' });

  let foto;
  try {
    foto = await prepararFoto(req.file.buffer);
  } catch {
    return res.status(400).json({ error: 'Adjunta una imagen JPG, PNG o WebP válida y sin animación.' });
  }

  const reporte = await reportes.add({ descripcion, foto, fecha: FieldValue.serverTimestamp() });
  res.status(201).json({ folio: reporte.id });
});

function resumen(doc) {
  const fecha = doc.get('fecha');
  return { folio: doc.id, fecha: fecha.toDate().toISOString(), descripcion: doc.get('descripcion') };
}

app.get('/api/reportes', exigirSesion, async (_req, res) => {
  const snapshot = await reportes.orderBy('fecha', 'desc').select('fecha', 'descripcion').get();
  res.json({ reportes: snapshot.docs.map(resumen) });
});

async function buscarReporte(req, res, next) {
  if (!/^[A-Za-z0-9]{20}$/.test(req.params.id)) {
    return res.status(404).json({ error: 'Reporte no encontrado.' });
  }
  const doc = await reportes.doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Reporte no encontrado.' });
  res.locals.reporte = doc;
  next();
}

app.get('/api/reportes/:id', exigirSesion, buscarReporte, (_req, res) => {
  const doc = res.locals.reporte;
  res.json({ ...resumen(doc), fotoUrl: '/api/reportes/' + doc.id + '/foto' });
});

app.get('/api/reportes/:id/foto', exigirSesion, buscarReporte, (_req, res) => {
  res.type('jpeg').send(res.locals.reporte.get('foto'));
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use(express.static(publicDir));

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'La foto supera el máximo de 8 MB.' });
    }
    return res.status(400).json({ error: 'Envía una descripción y una sola fotografía.' });
  }
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: 'La solicitud no tiene el formato esperado.' });
  }
  console.error('Error al procesar solicitud:', error.code || error.name);
  res.status(500).json({ error: 'No se pudo completar la solicitud. Inténtalo nuevamente.' });
});

app.listen(port, '127.0.0.1', () => console.log('Reportes municipales · http://127.0.0.1:' + port));
