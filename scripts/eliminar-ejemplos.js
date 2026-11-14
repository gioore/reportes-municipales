import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!projectId || !serviceAccount) throw new Error('Configura FIREBASE_PROJECT_ID y FIREBASE_SERVICE_ACCOUNT_JSON.');
const app = getApps()[0] || initializeApp({ projectId, credential: cert(JSON.parse(serviceAccount)) });
const ids = ['hUr5nbG0WyBtE6Wftun6', 'IEEdZ0d1icDRDVzpofqN', 'tg4A6OQid1ySSZfoyuKr', 'poD19RuDKm3J4296cEu6', 'OIzBFledBXsI71zcN1T8', 'ISE6U0dTTsWdwymraDMz', 'qyIam3aVpT0rhjSU2d2Z'];
for (const id of ids) {
  await getFirestore(app).collection('reportes').doc(id).delete();
  console.log(`Eliminado ${id}`);
}
