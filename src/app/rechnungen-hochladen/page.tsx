
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RechnungenHochladenPage() {
  return (
    <Card className="h-[calc(100vh-120px)] flex flex-col">
      <CardHeader>
        <CardTitle>Externe Anwendung</CardTitle>
        <CardDescription>
          Die folgende Anwendung ist hier zur Ansicht und Nutzung eingebettet.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <iframe
          src="https://studio--studio-9698698844-245e2.us-central1.hosted.app"
          title="Externe Rechnungsanwendung"
          className="w-full h-full border-0"
          allow="camera; microphone"
        />
      </CardContent>
    </Card>
  );
}
