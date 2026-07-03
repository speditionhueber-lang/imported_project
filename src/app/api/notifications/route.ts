
// src/app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import webpush from 'web-push';

// Initialize Firebase Admin SDK
if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({ credential: cert(serviceAccount) });
    } else {
        // Fallback for environments where service account is auto-configured
        initializeApp();
    }
}

// Configure web-push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:contact@example.com', // This should be a valid contact email
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('VAPID keys not configured. Web push notifications will not work.');
}

const db = getFirestore();
const messaging = getMessaging();

/**
 * API endpoint to send a push notification to a specific user.
 * It fetches all push tokens (native and web) for the user and sends a message to each.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, description, ...data } = body;

    if (!userId || !title || !description) {
      return NextResponse.json({ error: 'Missing userId, title, or description' }, { status: 400 });
    }

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        return NextResponse.json({ error: `User with ID ${userId} not found.` }, { status: 404 });
    }

    const userData = userDoc.data();
    const pushTokens = userData?.pushTokens;

    if (!pushTokens || !Array.isArray(pushTokens) || pushTokens.length === 0) {
        return NextResponse.json({ success: true, message: 'User does not have any push tokens registered.' });
    }

    const notificationPayload = JSON.stringify({ title, body: description, data });
    const deliveryPromises = pushTokens.map(token => {
        if (typeof token === 'string') {
            // Assume it's a native FCM token
            const message = {
                token: token,
                notification: { title, body: description },
                data: data || {}
            };
            return messaging.send(message);
        } else if (typeof token === 'object' && token.endpoint) {
            // Assume it's a web push subscription object
            return webpush.sendNotification(token, notificationPayload);
        } else {
            console.warn('Found an invalid token format for user:', userId, token);
            return Promise.resolve(null); // Ignore invalid tokens
        }
    });

    await Promise.allSettled(deliveryPromises);

    console.log(`Attempted to send notifications to all devices for user: ${userId}`);

    return NextResponse.json({ success: true, message: 'Notifications sent to all registered devices.' });

  } catch (error) {
    console.error('Error sending universal push notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to send notifications', details: errorMessage }, { status: 500 });
  }
}
