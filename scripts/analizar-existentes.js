import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { analizarReporte, analisisActivo } from '../servidor/analisis.js';

const projectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!projectId || !serviceAccount) throw new Error('Configura FIREBASE_PROJECT_ID y FIREBASE_SERVICE_ACCOUNT_JSON.');
if (!analisisActivo) throw new Error('Configura COURSE_AI_JSON para ejecutar la Serie III.');
const app = getApps()[0] || initializeApp({ projectId, credential: cert(JSON.parse(serviceAccount)) });
const snapshot = await getFirestore(app).collection('reportes').get();
for (const doc of snapshot.docs) {
  if (doc.get('analisis')) continue;
  try {
    const analisis = await analizarReporte(doc.get('descripcion'), doc.get('foto'));
    await doc.ref.update({ analisis });
    console.log(`Analizado ${doc.id}: ${analisis.estado}`);
  } catch (error) {
    console.error(`Falló ${doc.id}:`, error.message);
  }
}
