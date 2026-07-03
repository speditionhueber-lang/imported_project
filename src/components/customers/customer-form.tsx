'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Customer } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Der Name muss mindestens 2 Zeichen lang sein.' }),
  email: z.string().email({ message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' }),
  phone: z.string().min(5, { message: 'Bitte geben Sie eine gültige Telefonnummer ein.' }),
  address: z.object({
    street: z.string().min(2, { message: 'Straße ist erforderlich.' }),
    city: z.string().min(2, { message: 'Stadt ist erforderlich.' }),
    zip: z.string().min(3, { message: 'Postleitzahl ist erforderlich.' }),
    country: z.string().min(2, { message: 'Land ist erforderlich.' }),
  }),
});

type CustomerFormValues = z.infer<typeof formSchema>;
type CustomerSubmitData = Omit<Customer, 'id' | 'createdAt' | 'nameLower' | 'avatarUrl'>;


interface CustomerFormProps {
    onCustomerAdded: (customer: CustomerSubmitData) => void;
}

export default function CustomerForm({ onCustomerAdded }: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        zip: '',
        country: '',
      },
    },
  });

  function onSubmit(values: CustomerFormValues) {
    onCustomerAdded(values);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vollständiger Name</FormLabel>
              <FormControl>
                <Input placeholder="Max Mustermann" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail</FormLabel>
              <FormControl>
                <Input placeholder="max.mustermann@beispiel.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon</FormLabel>
              <FormControl>
                <Input placeholder="+49 123 456789" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address.street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Straße und Hausnummer</FormLabel>
              <FormControl>
                <Input placeholder="Musterstraße 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-3 gap-4">
            <FormField
            control={form.control}
            name="address.city"
            render={({ field }) => (
                <FormItem className='col-span-2'>
                <FormLabel>Stadt</FormLabel>
                <FormControl>
                    <Input placeholder="Musterstadt" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="address.zip"
            render={({ field }) => (
                <FormItem>
                <FormLabel>PLZ</FormLabel>
                <FormControl>
                    <Input placeholder="12345" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="address.country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Land</FormLabel>
              <FormControl>
                <Input placeholder="Deutschland" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Kunde hinzufügen
        </Button>
      </form>
    </Form>
  );
}
