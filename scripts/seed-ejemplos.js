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
const base = process.env.EXAMPLE_IMAGE_DIR || 'C:/Users/gerso/Downloads/WhatsApp Unknown 2026-11-14 at 8.58.42 AM';
const entradas = [
  ['WhatsApp Image 2026-11-14 at 8.57.45 AM (1).jpeg', 'Se observa una zona de basura acumulada junto a la vía pública. Solicito recolección y limpieza del área.'],
  ['WhatsApp Image 2026-11-14 at 8.57.45 AM (2).jpeg', 'Hay un desperfecto visible en la calle que puede afectar el paso de peatones y vehículos.'],
  ['WhatsApp Image 2026-11-14 at 8.57.45 AM.jpeg', 'Se reporta una condición que requiere revisión del personal municipal en el área.']
];

async function prepararFoto(buffer) {
  for (const [lado, calidad] of [[1600, 78], [1200, 68], [800, 60]]) {
    const foto = await sharp(buffer).autoOrient().resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: calidad }).toBuffer();
    if (foto.length <= 300 * 1024) return foto;
  }
  throw new Error('No se pudo comprimir la imagen a 300 KiB.');
}

for (const [archivo, descripcion] of entradas) {
  const foto = await prepararFoto(await readFile(`${base}/${archivo}`));
  const reporte = await reportes.add({ descripcion, foto, fecha: FieldValue.serverTimestamp(), origen: 'ejemplo' });
  if (analisisActivo) {
    try { await reporte.update({ analisis: await analizarReporte(descripcion, foto) }); } catch (error) { console.warn('Análisis omitido:', error.code || error.name); }
  }
  console.log(`Creado ${reporte.id}: ${archivo}`);
}
