// file: admin.seed.ts
import * as admin from 'firebase-admin';

// IMPORTANT: Path to your service account key file.
// DO NOT COMMIT THIS FILE TO YOUR REPOSITORY.
// Download it from your Firebase project settings.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedDatabase() {
  console.log('Starting to seed database...');

  // Seed Customers
  const customerRef = db.collection('customers').doc('customer1');
  await customerRef.set({
    name: "Global Tech Inc.",
    email: "contact@globaltech.com",
    phone: "1-800-555-0101",
    address: {
      street: "123 Innovation Drive",
      city: "Palo Alto",
      zip: "94304",
      country: "USA"
    },
    nameLower: "global tech inc.",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('Added customer: Global Tech Inc.');

  // Seed Jobs
  const jobRef = db.collection('jobs').doc('job1');
  await jobRef.set({
    customerId: 'customer1',
    status: 'scheduled',
    scheduledAt: admin.firestore.Timestamp.fromDate(new Date('2024-09-01T10:00:00Z')),
    address: {
      street: "123 Innovation Drive",
      city: "Palo Alto",
      zip: "94304",
      country: "USA"
    },
    notes: "Quarterly server maintenance and software updates.",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('Added job for Global Tech Inc.');

  // Seed Invoices
  const invoiceRef = db.collection('invoices').doc('invoice1');
  await invoiceRef.set({
    jobId: 'job1',
    netTotal: 23969.56,
    vatRate: 0.20,
    paid: false,
    issuedAt: admin.firestore.Timestamp.fromDate(new Date('2024-09-02')),
  });
  console.log('Added invoice for job1.');

  console.log('Database seeding completed successfully!');
  process.exit(0);
}

seedDatabase().catch(error => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
