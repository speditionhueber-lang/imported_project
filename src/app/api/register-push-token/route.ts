// src/app/api/register-push-token/route.ts
import { NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
            credential: cert(serviceAccount)
        });
    } else {
        initializeApp();
    }
}

const db = getFirestore();

/**
 * API endpoint to register a push notification token (native or web) for a user.
 * Expects a POST request with a JSON body containing `userId` and `pushToken`.
 * Stores tokens in an array to support multiple devices per user.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, pushToken } = body;

    if (!userId || !pushToken) {
      return NextResponse.json({ error: 'Missing userId or pushToken' }, { status: 400 });
    }

    const userDocRef = db.collection('users').doc(userId);

    // Atomically add the new push token to the 'pushTokens' array.
    // Using FieldValue.arrayUnion prevents duplicate tokens for the same device.
    // { merge: true } creates the user document if it doesn't exist.
    await userDocRef.set({
      pushTokens: FieldValue.arrayUnion(pushToken)
    }, { merge: true });

    console.log(`Successfully registered or updated push token for user: ${userId}`);

    return NextResponse.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Error registering push token:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to register push token', details: errorMessage }, { status: 500 });
  }
}
