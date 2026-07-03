
'use client';

import { useEffect } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Customer } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { ITEM_CBM_DEFAULTS } from '@/lib/item-cbm-defaults';


// Helper function to find a matching item in defaults
const findItemKey = (itemName: string): string | null => {
  const normalizedItemName = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalizedItemName) return null;

  for (const category of Object.values(ITEM_CBM_DEFAULTS)) {
    for (const defaultItem of category) {
      const normalizedDefaultName = defaultItem.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedDefaultName.includes(normalizedItemName) || normalizedItemName.includes(normalizedDefaultName)) {
        return defaultItem.key;
      }
    }
  }
  return null;
}


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
      stockwerk: z.string().optional().nullable(),
      aufzug: z.string().optional().nullable(),
      entfernungLKW: z.string().optional().nullable(),
  }).optional(),
  zieladresse: z.object({
      strasse: z.string().optional().nullable(),
      stockwerk: z.string().optional().nullable(),
      aufzug: z.string().optional().nullable(),
      entfernungLKW: z.string().optional().nullable(),
  }).optional(),
   umzugsdetails: z.object({
      gewuenschterUmzugstermin: z.string().optional().nullable()
  }).optional(),
  anmerkungen: z.string().optional().nullable(),
  unmatchedItems: z.string().optional(),
  gegenstaende: z.record(z.any()).optional(), // Keep as record for the form state
});

type CustomerSubmitData = Omit<Customer, 'id' | 'createdAt' | 'nameLower' | 'avatarUrl'>;

interface NewCustomerWizardProps {
  onCustomerAdded: (customer: CustomerSubmitData) => void;
  initialData?: Partial<any> | null;
}

export default function NewCustomerWizard({ onCustomerAdded, initialData }: NewCustomerWizardProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: { street: '', city: '', zip: '', country: '' },
      abholadresse: { strasse: '', stockwerk: '', aufzug: '', entfernungLKW: '' },
      zieladresse: { strasse: '', stockwerk: '', aufzug: '', entfernungLKW: '' },
      umzugsdetails: { gewuenschterUmzugstermin: '' },
      anmerkungen: '',
      unmatchedItems: '',
      gegenstaende: {}
    },
  });

  useEffect(() => {
    if (initialData) {
      // Process gegenstaende from array to record
      const processedItems: Record<string, number> = {};
      const unmappedItems: string[] = [];

      if (Array.isArray(initialData.gegenstaende)) {
        initialData.gegenstaende.forEach((item: any) => {
          const itemKey = findItemKey(item.name);
          const quantity = item.quantity ?? 1;

          if (itemKey) {
            processedItems[itemKey] = (processedItems[itemKey] || 0) + quantity;
          } else {
            let unmappedString = `${quantity}x ${item.name}`;
            if (item.note) {
              unmappedString += ` (${item.note})`;
            }
            unmappedItems.push(unmappedString);
          }
        });
      }
      
      const cityZip = initialData.billingAddressCityZip || '';
      const zipMatch = cityZip.match(/^\d+/);
      const zip = zipMatch ? zipMatch[0] : '';
      const city = zipMatch ? cityZip.substring(zipMatch[0].length).trim() : cityZip;

      form.reset({
        name: initialData.name || '',
        email: initialData.email || null,
        phone: initialData.phone || null,
        address: {
          street: initialData.billingAddressStreet || '',
          city: city,
          zip: zip,
          country: initialData.billingAddressCountry || '',
        },
         abholadresse: { 
            strasse: initialData.abholadresse?.strasse || null,
            stockwerk: initialData.abholadresse?.stockwerk || null,
            aufzug: initialData.abholadresse?.aufzug || null,
            entfernungLKW: initialData.abholadresse?.entfernungLKW || null,
         },
         zieladresse: { 
             strasse: initialData.zieladresse?.strasse || null,
             stockwerk: initialData.zieladresse?.stockwerk || null,
             aufzug: initialData.zieladresse?.aufzug || null,
             entfernungLKW: initialData.zieladresse?.entfernungLKW || null,
         },
         umzugsdetails: { 
             gewuenschterUmzugstermin: initialData.umzugsdetails?.gewuenschterUmzugstermin || null 
         },
         anmerkungen: initialData.anmerkungen || null,
         unmatchedItems: unmappedItems.join(', '), // Set unmatched items
         gegenstaende: processedItems, // Set processed items
      });
    }
  }, [initialData, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onCustomerAdded(values as CustomerSubmitData);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <StammdatenStep />
        <Button type="submit" className="w-full">Kunde anlegen</Button>
      </form>
    </FormProvider>
  );
}

const StammdatenStep = () => {
  const form = useFormContext();
  return (
    <div className="space-y-4">
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

        <div className="space-y-2 pt-4">
            <h3 className="font-semibold">Rechnungsadresse</h3>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
            <div className="space-y-2">
                <h3 className="font-semibold">Abholadresse</h3>
                 <FormField control={form.control} name="abholadresse.strasse" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Straße</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="abholadresse.stockwerk" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Stockwerk</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="abholadresse.aufzug" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Aufzug</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="abholadresse.entfernungLKW" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Trageweg</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="space-y-2">
                <h3 className="font-semibold">Zieladresse</h3>
                 <FormField control={form.control} name="zieladresse.strasse" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Straße</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="zieladresse.stockwerk" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Stockwerk</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="zieladresse.aufzug" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Aufzug</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                )} />
                 <FormField control={form.control} name="zieladresse.entfernungLKW" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Trageweg</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
             <FormField control={form.control} name="unmatchedItems" render={({ field }) => (
                <FormItem><FormLabel>Unbekannte Gegenstände</FormLabel><FormControl><Textarea {...field} rows={6} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="anmerkungen" render={({ field }) => (
                <FormItem><FormLabel>Notizen & Sonstiges</FormLabel><FormControl><Textarea {...field} rows={6} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

    </div>
  );
};
