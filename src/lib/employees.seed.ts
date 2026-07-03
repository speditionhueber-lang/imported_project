
// file: src/lib/employees.seed.ts
import * as admin from 'firebase-admin';
import { employees as staticEmployees } from './mitarbeiter-data';

// IMPORTANT: Path to your service account key file.
// DO NOT COMMIT THIS FILE TO YOUR REPOSITORY.
// Download it from your Firebase project settings.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedDatabase() {
  console.log('Starting to seed database with employees...');

  const employeesCollection = db.collection('workers');
  const batch = db.batch();
  let writeCount = 0;

  for (const employee of staticEmployees) {
    const docRef = employeesCollection.doc(employee.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      batch.set(docRef, employee);
      writeCount++;
      console.log(`Adding employee: ${employee.name} (${employee.id})`);
    } else {
      console.log(`Skipping existing employee: ${employee.name} (${employee.id})`);
    }
  }

  if (writeCount > 0) {
    await batch.commit();
    console.log(`Successfully wrote ${writeCount} new employees to Firestore.`);
  } else {
    console.log('No new employees to add. Database is up to date.');
  }

  console.log('Employee database seeding completed successfully!');
  process.exit(0);
}

seedDatabase().catch(error => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
