// file: customers.seed.ts
import * as admin from 'firebase-admin';
import { customers as staticCustomers } from './src/lib/data';
import { importedCustomers } from './src/lib/imported-data';

// IMPORTANT: Path to your service account key file.
// DO NOT COMMIT THIS FILE TO YOUR REPOSITORY.
// Download it from your Firebase project settings.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedDatabase() {
  console.log('Starting to seed database with all customers...');

  const allCustomers = [...staticCustomers, ...importedCustomers];
  const customersCollection = db.collection('customers');
  const batch = db.batch();
  let writeCount = 0;

  for (const customer of allCustomers) {
    const docRef = customersCollection.doc(customer.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      const { avatarUrl, ...customerData } = customer; // Exclude avatarUrl if you don't want to store it
      batch.set(docRef, { ...customerData, createdAt: new Date(customer.createdAt) });
      writeCount++;
      console.log(`Adding customer: ${customer.name} (${customer.id})`);
    } else {
      console.log(`Skipping existing customer: ${customer.name} (${customer.id})`);
    }
  }

  if (writeCount > 0) {
    await batch.commit();
    console.log(`Successfully wrote ${writeCount} new customers to Firestore.`);
  } else {
    console.log('No new customers to add. Database is up to date.');
  }

  console.log('Database seeding completed successfully!');
  process.exit(0);
}

seedDatabase().catch(error => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
