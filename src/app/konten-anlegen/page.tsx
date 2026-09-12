
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import NewCustomerWizard from '@/components/customers/new-customer-wizard';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useFirebase } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { extractCustomerData, type ExtractedCustomerData } from '@/app/actions';

// Zod schema for client-side validation
const ExtractCustomerDataInputSchema = z.object({
  transcript: z.string().min(1, { message: 'Bitte geben Sie einen Text ein.' }),
});

const customerTemplate = `Name: 
Email: 
Telefon: 
Umzugsdatum: 

Rechnungsadresse Straße: 
Rechnungsadresse PLZ Ort: 

Abholadresse: 
Abhol Stockwerk: 
Abhol Aufzug: 
Abhol Trageweg: 

Zieladresse: 
Ziel Stockwerk: 
Ziel Aufzug: 
Ziel Trageweg: 

Gegenstände: 
- 
- 

Notizen: 
`;


export default function KontenAnlegenPage() {
  const [inputText, setInputText] = useState('');
  const [structuredInputText, setStructuredInputText] = useState(customerTemplate);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<ExtractedCustomerData> | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { firestore } = useFirebase();

  const handleExtract = async (textToProcess: string) => {
    const validation = ExtractCustomerDataInputSchema.safeParse({ transcript: textToProcess });
    if (!validation.success) {
      toast({ variant: 'destructive', title: validation.error.errors[0].message });
      return;
    }

    setIsExtracting(true);
    setExtractedData(null);

    try {
      const data = await extractCustomerData({ transcript: textToProcess });

      setExtractedData(data);

      toast({
        title: 'Daten erfolgreich extrahiert',
        description: 'Bitte überprüfen Sie die untenstehenden Felder.',
      });
    } catch (error) {
      console.error('Extraction failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast({
        variant: 'destructive',
        title: 'Extraktion fehlgeschlagen',
        description: `Die Daten konnten nicht aus dem Text extrahiert werden. Fehler: ${errorMessage}`,
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCustomerAdded = async (newCustomerData: any) => {
     if (!firestore) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Datenbankverbindung nicht verfügbar.' });
      return;
    }

    const dataToSave = {
      name: newCustomerData.name,
      email: newCustomerData.email,
      phone: newCustomerData.phone,
      address: newCustomerData.address,
      abholadresse: newCustomerData.abholadresse,
      zieladresse: newCustomerData.zieladresse,
      umzugsdetails: newCustomerData.umzugsdetails,
      gegenstaende: newCustomerData.gegenstaende,
      anmerkungen: [newCustomerData.anmerkungen, newCustomerData.unmatchedItems ? `Unbekannte Gegenstände: ${newCustomerData.unmatchedItems}` : ''].filter(Boolean).join('\n\n'),
      nameLower: newCustomerData.name.toLowerCase(),
      createdAt: new Date().toISOString(),
      avatarUrl: `https://picsum.photos/seed/${Date.now()}/40/40`,
    };

    try {
      await addDoc(collection(firestore, 'customers'), dataToSave);
      toast({
        title: 'Kunde gespeichert',
        description: `${dataToSave.name} wurde erfolgreich angelegt.`,
      });
      router.push('/kunden');
    } catch (serverError: any) {
      const permissionError = new FirestorePermissionError({
        path: 'customers',
        operation: 'create',
        requestResourceData: dataToSave,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Konto anlegen</h1>
        <p className="text-muted-foreground">
          Kundendaten aus Text übernehmen und als neues Kundenkonto speichern.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Freitext auswerten</CardTitle>
          <CardDescription>
            Fügen Sie eine Anfrage oder Gesprächsnotiz ein. Die erkannten Felder können anschließend kontrolliert werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Kundenanfrage hier einfügen …"
            className="min-h-[180px]"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={() => handleExtract(inputText)} disabled={isExtracting || !inputText.trim()}>
            {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            Daten erkennen
          </Button>
        </CardFooter>
      </Card>

      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">oder strukturiert erfassen</span>
        <Separator className="flex-1" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strukturierte Eingabe</CardTitle>
          <CardDescription>
            Die Vorlage kann direkt ausgefüllt und anschließend übernommen werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="structured-customer-input">Kundendaten</Label>
          <Textarea
            id="structured-customer-input"
            value={structuredInputText}
            onChange={(event) => setStructuredInputText(event.target.value)}
            className="min-h-[360px] font-mono text-sm"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={() => handleExtract(structuredInputText)} disabled={isExtracting || !structuredInputText.trim()}>
            {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            Vorlage übernehmen
          </Button>
        </CardFooter>
      </Card>

      {extractedData && (
        <NewCustomerWizard
          initialData={extractedData}
          onCustomerAdded={handleCustomerAdded}
          trigger={<Button className="w-full">Erkannte Kundendaten prüfen und speichern</Button>}
        />
      )}
    </div>
  );
}
