'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; request?: any };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const isFirestorePermissionError = error.name === 'FirebaseError' && error.message.includes('Firestore Security Rules');

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="max-w-3xl w-full">
        <CardHeader>
          <CardTitle>Ein Fehler ist aufgetreten</CardTitle>
          <CardDescription>
            {isFirestorePermissionError 
              ? 'Eine Firestore-Anfrage wurde von den Sicherheitsregeln blockiert.'
              : 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isFirestorePermissionError ? (
              <div className="space-y-2">
                <p className="font-semibold">Blockierte Anfrage:</p>
                <p className="text-sm text-muted-foreground">
                  Die folgende Anfrage wurde von Ihren Firestore-Sicherheitsregeln verweigert. Überprüfen Sie Ihre <code>firestore.rules</code>-Datei, um die entsprechenden Berechtigungen zu erteilen.
                </p>
                <CodeBlock language="json" code={JSON.stringify(error.request, null, 2)} />
              </div>
            ) : (
                 <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive font-mono">{error.message}</p>
                 </div>
            )}
            <Button onClick={() => reset()}>
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
