
'use client';

import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '../ui/textarea';
import type { Customer } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name ist erforderlich.' }),
  email: z.string().email({ message: 'Gültige E-Mail ist erforderlich.' }).or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  abholadresse: z.object({
      strasse: z.string().optional().nullable(),
  }).optional(),
  zieladresse: z.object({
      strasse: z.string().optional().nullable(),
  }).optional(),
   umzugsdetails: z.object({
      gewuenschterUmzugstermin: z.string().optional()
  }).optional(),
  anmerkungen: z.string().optional().nullable(),
  gegenstaende: z.record(z.any()).optional(),
});

type FormValues = z.infer<typeof formSchema>;
type CustomerSubmitData = Omit<Customer, 'id' | 'createdAt' | 'nameLower' | 'avatarUrl'>;

interface SaveCustomerWizardProps {
  initialData?: Partial<any> | null;
  onCustomerAdded: () => void;
}

export default function SaveCustomerWizard({ initialData, onCustomerAdded }: SaveCustomerWizardProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (initialData) {
      const isPhoneNumber = (str: string | null | undefined): boolean => {
        if (!str) return false;
        const digitCount = (str.match(/\d/g) || []).length;
        const letterCount = (str.match(/[a-zA-Z]/g) || []).length;
        return digitCount > letterCount && digitCount >= 7;
      };

      const potentialName = initialData["Name (Vor- und Nachname)"] || '';
      let name = '';
      let phone = initialData["Telefonkontakt"] || null;

      if (isPhoneNumber(potentialName)) {
        if (!phone) { // Only overwrite phone if it's not already set
            phone = potentialName;
        }
      } else {
        name = potentialName;
      }
      
      let street = initialData["Rechnungsadresse (Straße)"] || '';
      let cityZip = initialData["Rechnungsadresse (Ort, PLZ)"] || '';
      let country = initialData["Rechnungsadresse (Land)"] || '';

      const abholStrasse = initialData["Abholadresse (Straße, PLZ, Ort, Land)"];
      const zielStrasse = initialData["Zieladresse, (Straße, PLZ, Ort, Land):"];

      // Fallback logic
      if (!street && !cityZip && !country) {
          if (abholStrasse) {
              street = abholStrasse;
          } else if (zielStrasse) {
              street = zielStrasse;
          }
      }

      const zipMatch = cityZip.match(/^\d+/);
      const zip = zipMatch ? zipMatch[0] : '';
      const city = zipMatch ? cityZip.substring(zipMatch[0].length).trim() : cityZip;

      form.reset({
        name: name,
        email: initialData["E-Mail-Adresse"] || null,
        phone: phone,
        address: {
            street: street,
            city: city,
            zip: zip,
            country: country,
        },
        abholadresse: {
            strasse: abholStrasse || null,
        },
        zieladresse: {
            strasse: zielStrasse || null,
        },
        umzugsdetails: {
            gewuenschterUmzugstermin: initialData["Gewünschter Umzugstermin"] || ''
        },
        anmerkungen: initialData["Anmerkungen"] || null,
        gegenstaende: {}, // This will be handled on submit
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Datenbankverbindung nicht verfügbar.' });
      return;
    }

    const dataToSave: CustomerSubmitData = {
        ...values,
        name: values.name,
        email: values.email || '',
        phone: values.phone || '',
        anmerkungen: [values.anmerkungen, initialData?.Gegenstände].filter(Boolean).join('\n\n'),
        // Ensure nested objects are initialized
        address: {
            street: values.address?.street || '',
            city: values.address?.city || '',
            zip: values.address?.zip || '',
            country: values.address?.country || '',
        },
        abholadresse: {
            strasse: values.abholadresse?.strasse || '',
            stockwerk: '',
            aufzug: '',
            aufzugsgroesse: '',
            gebaeudetyp: '',
            parkplatz: '',
            alternativeParkmoeglichkeit: '',
            adresseKoordinatenAlternativ: '',
            entfernungLKW: '',
            zeitlicheBeschraenkung: '',
            besonderheiten: ''
        },
        zieladresse: {
            strasse: values.zieladresse?.strasse || '',
            stockwerk: '',
            aufzug: '',
            aufzugsgroesse: '',
            gebaeudetyp: '',
            parkplatz: '',
            alternativeParkmoeglichkeit: '',
            adresseKoordinatenAlternativ: '',
            entfernungLKW: '',
            zufahrtsbeschraenkung: '',
            besonderheiten: ''
        },
        umzugsdetails: {
            gewuenschterUmzugstermin: values.umzugsdetails?.gewuenschterUmzugstermin || '',
            voraussichtlicheStartzeit: ''
        },
        gegenstaende: {},
    };


    try {
        const collectionRef = collection(firestore, 'customers');
        await addDoc(collectionRef, {
            ...dataToSave,
            nameLower: dataToSave.name.toLowerCase(),
            createdAt: serverTimestamp(),
        });
        toast({
            title: 'Kunde gespeichert',
            description: `${values.name} wurde erfolgreich angelegt.`,
        });
        onCustomerAdded();
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

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>E-Mail</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="umzugsdetails.gewuenschterUmzugstermin" render={({ field }) => (
                <FormItem><FormLabel>Umzugstermin</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="YYYY-MM-DD"/></FormControl><FormMessage /></FormItem>
            )} />
        </div>

        <div className="space-y-2">
            <h3 className="font-semibold text-sm">Rechnungsadresse</h3>
             <FormField control={form.control} name="address.street" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Straße</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-3 gap-4">
                 <FormField control={form.control} name="address.city" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel className="text-xs">Ort</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="address.zip" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">PLZ</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <FormField control={form.control} name="address.country" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Land</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <h3 className="font-semibold text-sm">Abholadresse</h3>
                 <FormField control={form.control} name="abholadresse.strasse" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Straße</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="space-y-2">
                <h3 className="font-semibold text-sm">Zieladresse</h3>
                 <FormField control={form.control} name="zieladresse.strasse" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Straße</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
        </div>
        
        <FormField control={form.control} name="anmerkungen" render={({ field }) => (
            <FormItem><FormLabel>Anmerkungen</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <Button type="submit" className="w-full">Kunde anlegen & Speichern</Button>
      </form>
    </FormProvider>
  );
}
