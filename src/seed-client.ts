// file: src/seed-client.ts
// This script is intended to be run in the browser console on a page 
// where Firebase is initialized.
// You can copy-paste its content into your browser's developer tools to seed data.

import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, startAt, endAt } from "firebase/firestore";
// This assumes 'db' is available from your Firebase initialization file.
import { initializeFirebase } from './firebase';

const { firestore: db } = initializeFirebase();

async function seedCustomers() {
  console.log("Seeding customer...");
  const customerData = {
    name: "Musterfirma GmbH",
    email: "kontakt@musterfirma.de",
    phone: "+49 30 12345678",
    address: { street: "Musterstraße 1", city: "Berlin", zip: "10115", country: "Germany" },
    nameLower: "musterfirma gmbh",
    createdAt: serverTimestamp()
  };
  try {
    const docRef = await addDoc(collection(db, "customers"), customerData);
    console.log("Customer document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding customer document: ", e);
    return null;
  }
}

async function seedJobs(customerId: string) {
    console.log(`Seeding job for customer ${customerId}...`);
    const jobData = {
        customerId: customerId,
        status: 'scheduled',
        scheduledAt: new Date('2024-08-15T09:00:00'),
        address: { street: "Musterstraße 1", city: "Berlin", zip: "10115", country: "Germany" },
        notes: "Initial setup and configuration of server hardware.",
        createdAt: serverTimestamp()
    };
    try {
        const docRef = await addDoc(collection(db, "jobs"), jobData);
        console.log("Job document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding job document: ", e);
    }
}

async function runClientSeed() {
    console.log("--- Running Client-Side Seed ---");
    const customerId = await seedCustomers();
    if (customerId) {
        await seedJobs(customerId); 
    }
    console.log("--- Client-Side Seed Finished ---");
}

// Example Queries (can be run in console)

async function findScheduledJobs() {
    const q = query(collection(db, "jobs"), where("status", "==", "scheduled"));
    const querySnapshot = await getDocs(q);
    console.log("Found scheduled jobs:");
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
    });
}

async function searchCustomerByName(prefix: string) {
    if(!prefix) {
        console.error("Please provide a search prefix.");
        return;
    }
    const lowerPrefix = prefix.toLowerCase();
    const endPrefix = lowerPrefix + '\uf8ff'; // \uf8ff is a very high code point in Unicode
    
    const q = query(collection(db, "customers"),
        orderBy("nameLower"),
        startAt(lowerPrefix),
        endAt(endPrefix)
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Customers found starting with "${prefix}":`);
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
    });
}

// To run the seeder, open your browser console and type:
// runClientSeed()

// To test queries, for example:
// findScheduledJobs()
// searchCustomerByName("Muster")
