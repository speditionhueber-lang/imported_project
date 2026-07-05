
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
      const collectionRef = collection(firestore, 'customers');
      await addDoc(collectionRef, dataToSave);
      toast({
        title: 'Kunde gespeichert',
        description: 'Der neue Kunde wurde erfolgreich angelegt.',
      });
      setInputText('');
      setStructuredInputText(customerTemplate);
      setExtractedData(null);
      router.push('/customers');
    } catch (error) {
      console.error('Error adding customer:', error);
      const permissionError = new FirestorePermissionError({
        path: 'customers',
        operation: 'create',
        requestResourceData: dataToSave,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Speichern fehlgeschlagen',
        description: 'Der Kunde konnte nicht gespeichert werden. Möglicherweise fehlen Berechtigungen.',
      });
    }
  };

  const initialWizardData = extractedData
    ? {
        name: extractedData.customerName,
        email: extractedData.email,
        phone: extractedData.phone,
        billingAddressStreet: extractedData.billingAddressStreet,
        billingAddressCityZip: extractedData.billingAddressCityZip,
        billingAddressCountry: extractedData.billingAddressCountry,
        umzugsdetails: {
          gewuenschterUmzugstermin: extractedData.movingDate,
        },
        abholadresse: {
          strasse: extractedData.pickupAddress,
          stockwerk: extractedData.pickupFloor,
          aufzug: extractedData.pickupElevator,
          entfernungLKW: extractedData.pickupDistanceToTruck,
        },
        zieladresse: {
          strasse: extractedData.deliveryAddress,
          stockwerk: extractedData.deliveryFloor,
          aufzug: extractedData.deliveryElevator,
          entfernungLKW: extractedData.deliveryDistanceToTruck,
        },
        gegenstaende: extractedData.gegenstaende, // Pass the array of objects
        anmerkungen: extractedData.notes,
        unmatchedItems: '', // This logic is now handled inside the wizard or on save
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Neuen Kunden aus Text anlegen</CardTitle>
          <CardDescription>
            Fügen Sie einen beliebigen Text (z.B. aus einer E-Mail oder Notiz) in das Feld ein. Die KI
            extrahiert die relevanten Kundendaten automatisch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="z.B. E-Mail-Inhalt oder Notizen hier einfügen..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={() => handleExtract(inputText)} disabled={isExtracting || !inputText.trim()}>
            {isExtracting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Freitext analysieren &amp; Kunde erstellen
          </Button>
        </CardFooter>
      </Card>
      
      <div className="relative flex items-center">
        <Separator className="flex-grow" />
        <span className="mx-4 text-muted-foreground font-semibold">ODER</span>
        <Separator className="flex-grow" />
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Strukturierte Eingabe</CardTitle>
            <CardDescription>Füllen Sie die Vorlage mit den bekannten Kundendaten aus.</CardDescription>
        </CardHeader>
        <CardContent>
            <Textarea
                placeholder="Vorlage für Kundendaten..."
                value={structuredInputText}
                onChange={(e) => setStructuredInputText(e.target.value)}
                rows={15}
                className="font-mono text-sm"
            />
        </CardContent>
        <CardFooter>
            <Button onClick={() => handleExtract(structuredInputText)} disabled={isExtracting || structuredInputText === customerTemplate}>
                {isExtracting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <FileUp className="mr-2 h-4 w-4" />
                )}
                Vorlage analysieren &amp; Kunde erstellen
            </Button>
        </CardFooter>
      </Card>

      {initialWizardData && (
        <Card>
          <CardHeader>
            <CardTitle>Überprüfen und Speichern</CardTitle>
            <CardDescription>
              Bitte überprüfen Sie die von der KI extrahierten Daten und korrigieren oder ergänzen Sie sie
              bei Bedarf.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewCustomerWizard onCustomerAdded={handleCustomerAdded} initialData={initialWizardData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
