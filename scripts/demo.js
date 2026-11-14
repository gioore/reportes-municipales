// Firebase CLI ejecuta este script con el emulador ya disponible.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Ejecuta npm run demo para iniciar el emulador.');
}

process.env.FIREBASE_PROJECT_ID = 'demo-reportes-municipales';
process.env.ADMIN_PASSWORD = 'Municipalidad2026';
await import('../servidor/index.js');
