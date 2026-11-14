import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { analisisActivo, analizarReporte } from '../servidor/analisis.js';

const projectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!projectId || !serviceAccount) throw new Error('Configura FIREBASE_PROJECT_ID y FIREBASE_SERVICE_ACCOUNT_JSON.');
const app = getApps()[0] || initializeApp({ projectId, credential: cert(JSON.parse(serviceAccount)) });
const reportes = getFirestore(app).collection('reportes');
const entradas = [
  ['https://commons.wikimedia.org/wiki/Special:FilePath/Street_Garbage.jpg', 'Se observa una zona de basura acumulada junto a la vía pública. Solicito recolección y limpieza del área.'],
  ['https://commons.wikimedia.org/wiki/Special:FilePath/Potholes.jpg', 'Hay un desperfecto visible en la calle que puede afectar el paso de peatones y vehículos.'],
  ['https://sitel.com.mk/sites/default/files/video/teaser-images/2025/january/martin-422860.jpg', 'Se reporta una condición de limpieza urbana que requiere revisión del personal municipal.']
];

async function prepararFoto(buffer) {
  for (const [lado, calidad] of [[1600, 78], [1200, 68], [800, 60]]) {
    const foto = await sharp(buffer).autoOrient().resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: calidad }).toBuffer();
    if (foto.length <= 300 * 1024) return foto;
  }
  throw new Error('No se pudo comprimir la imagen a 300 KiB.');
}

for (const [url, descripcion] of entradas) {
  const respuesta = await fetch(url, { headers: { 'User-Agent': 'reportes-municipales-demo/1.0' } });
  if (!respuesta.ok) throw new Error(`No se pudo descargar ${url}: ${respuesta.status}`);
  const foto = await prepararFoto(Buffer.from(await respuesta.arrayBuffer()));
  const reporte = await reportes.add({ descripcion, foto, fecha: FieldValue.serverTimestamp(), origen: 'ejemplo-internet', fuenteImagen: url });
  if (analisisActivo) {
    try { await reporte.update({ analisis: await analizarReporte(descripcion, foto) }); } catch (error) { console.warn('Análisis omitido:', error.code || error.name); }
  }
  console.log(`Creado ${reporte.id}: ${url}`);
}
