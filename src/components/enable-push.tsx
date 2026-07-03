'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function EnablePushButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            setIsSubscribed(true);
          }
          setIsLoading(false);
        });
      });
    }
  }, []);

  const subscribeUser = async () => {
    if (!VAPID_PUBLIC_KEY) {
        console.error('VAPID public key not found. Cannot subscribe to push notifications.');
        return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      
      // TODO: Replace with actual logged-in user ID
      const userId = 'web-user-test'; 

      await fetch('/api/register-push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, pushToken: JSON.stringify(subscription) }), // Send the whole subscription object
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error('Failed to subscribe the user: ', error);
    }
  };

  if (isLoading) {
    return null; // Don't render anything until we know the subscription status
  }

  if (isSubscribed) {
    return <p>Push-Benachrichtigungen sind aktiviert.</p>;
  }

  return (
    <Button onClick={subscribeUser}>
      Push-Benachrichtigungen aktivieren
    </Button>
  );
}
