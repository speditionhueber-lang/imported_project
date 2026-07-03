
'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomersTable from '../customers/customers-table';
import type { Customer } from '@/lib/types';
import WorkerSelector from '../shared/worker-selector';
import type { CalendarEvent } from '@/app/calendar/page';
import VehicleSelector from '../jobs/vehicle-selector';
import { useEmployees } from '@/hooks/use-employees'; // Import useEmployees

const formSchema = z.object({
  customerId: z.string().min(1, { message: 'Ein Kunde muss ausgewählt werden.' }),
  title: z.string().min(3, { message: 'Titel ist erforderlich.' }),
  description: z.string().optional(),
  start: z.date({ required_error: 'Startdatum ist erforderlich.' }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Ungültige Zeit, Format HH:MM verwenden." }),
  end: z.date({ required_error: 'Enddatum ist erforderlich.' }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Ungültige Zeit, Format HH:MM verwenden." }),
  vehicles: z.array(z.string()).optional(),
  workers: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewEventFormProps {
  onEventCreate: (customerId: string, event: Omit<CalendarEvent, 'id'>) => void;
}

export default function NewEventForm({ onEventCreate }: NewEventFormProps) {
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { employees } = useEmployees(); // Fetch employees

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: '08:00',
      endTime: '17:00',
      vehicles: [],
      workers: [],
    },
  });

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customerId', customer.id);
    form.setValue('title', `Umzug: ${customer.name}`);
    setIsCustomerDialogOpen(false);
  };

  const combineDateAndTime = (date: Date, time: string): Date => {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      return newDate;
  }

  const onSubmit = (values: FormValues) => {
    const startDateTime = combineDateAndTime(values.start, values.startTime);
    const endDateTime = combineDateAndTime(values.end, values.endTime);

    const newEvent: Omit<CalendarEvent, 'id'> = {
      title: values.title,
      description: values.description || '',
      start: startDateTime,
      end: endDateTime,
      vehicles: values.vehicles,
      workers: values.workers,
    };
    onEventCreate(values.customerId, newEvent);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kunde</FormLabel>
              <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {selectedCustomer ? selectedCustomer.name : 'Kunde auswählen'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-4/5 flex flex-col">
                  <DialogHeader><DialogTitle>Kunden auswählen</DialogTitle></DialogHeader>
                  <div className="flex-grow min-h-0"><CustomersTable onCustomerSelect={handleCustomerSelect} /></div>
                </DialogContent>
              </Dialog>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Titel</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Beschreibung</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="start" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Startdatum</FormLabel>
                    <Popover><PopoverTrigger asChild>
                        <FormControl><Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, 'PPP', { locale: de }) : <span>Datum wählen</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl>
                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent></Popover><FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="startTime" render={({ field }) => (
                <FormItem><FormLabel>Startzeit</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="end" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Enddatum</FormLabel>
                    <Popover><PopoverTrigger asChild>
                        <FormControl><Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, 'PPP', { locale: de }) : <span>Datum wählen</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl>
                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent></Popover><FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="endTime" render={({ field }) => (
                <FormItem><FormLabel>Endzeit</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

        <FormField control={form.control} name="vehicles" render={({ field }) => (
            <FormItem><FormLabel>Fahrzeuge</FormLabel><FormControl><VehicleSelector vehicles={field.value || []} setVehicles={field.onChange} disabled={false} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="workers" render={({ field }) => (
            <FormItem><FormLabel>Mitarbeiter</FormLabel><FormControl><WorkerSelector allWorkers={employees || []} selectedWorkers={field.value || []} onSelectionChange={field.onChange} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="flex justify-end pt-4">
          <Button type="submit">Termin speichern</Button>
        </div>
      </form>
    </FormProvider>
  );
}
