
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomer } from '@/contexts/customer-context';
import type { Customer, Job } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format, isSameDay, addHours, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon, PlusCircle, Trash2, CalendarPlus, Lock, Unlock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomersTable from '@/components/customers/customers-table';
import { useAllCustomers } from '@/hooks/use-all-customers';
import VehicleSelector from '@/components/jobs/vehicle-selector';

const AddressEditor = ({ title, address, onAddressChange, disabled }: { title: string, address: any, onAddressChange: (newAddress: any) => void, disabled: boolean }) => {
  if (!address) return null;
  const handleChange = (field: string, value: string) => {
    onAddressChange({ ...address, [field]: value });
  };
  return (
    <div className="space-y-2">
      <h4 className="font-semibold">{title}</h4>
      <Input
        id={`address-street-${title.toLowerCase().replace(/\s/g, '-')}`}
        name={`address-street-${title.toLowerCase().replace(/\s/g, '-')}`}
        placeholder="Straße, PLZ Ort"
        value={address.strasse || ''}
        onChange={(e) => handleChange('strasse', e.target.value)}
        disabled={disabled}
      />
    </div>
  );
};

const JobCard = ({ job, onUpdate, onDelete, onGoToLieferschein, calendarEvents }: { job: Job, onUpdate: (jobId: string, updatedJob: Partial<Job>) => void, onDelete: (jobId: string) => void, onGoToLieferschein: (job: Job) => void, calendarEvents: any[] }) => {

  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  useEffect(() => {
    if (job.scheduledAt) {
        try {
            const jobStart = new Date(job.scheduledAt);
            if (!isNaN(jobStart.getTime())) {
                const startHour = jobStart.getHours();
                const startMinute = jobStart.getMinutes();
                setStartTime(`${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`);

                const end = addHours(jobStart, job.calculatedHours);
                const endHour = end.getHours();
                const endMinute = end.getMinutes();
                setEndTime(`${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`);
            }
        } catch (e) {
            // Invalid date string, keep default times
            console.error("Invalid date for job:", job.id, job.scheduledAt);
        }
    }
  }, [job.scheduledAt, job.calculatedHours, job.id]);

  const handleFieldChange = (field: keyof Job, value: any) => {
    onUpdate(job.id, { [field]: value });
  };
  
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    if(job.scheduledAt) {
        const [hours, minutes] = newStartTime.split(':').map(Number);
        const newDate = new Date(job.scheduledAt);
        newDate.setHours(hours, minutes);
        onUpdate(job.id, { scheduledAt: newDate.toISOString() });
    }
  };

  const handleAddressChange = (addressType: 'abholadresse' | 'zieladresse', newAddress: any) => {
    onUpdate(job.id, { [addressType]: newAddress });
  };

  const isFinalized = !!job.isFinalized;

  const isVehicleConflict = useCallback(() => {
    if (!job.vehicles || job.vehicles.length === 0 || !job.scheduledAt) {
      return false;
    }
    const jobDate = new Date(job.scheduledAt);
    return calendarEvents.some(event => {
      // Ignore events from the current job
      if (event.id.startsWith(`evt_${job.id}`)) {
        return false;
      }
      const eventDate = new Date(event.start);
      if (isSameDay(jobDate, eventDate)) {
        return event.vehicles?.some((v: string) => (job.vehicles || []).includes(v));
      }
      return false;
    });
  }, [job.vehicles, job.scheduledAt, job.id, calendarEvents]);

  return (
    <Card className={cn(isFinalized && "bg-muted/50 border-dashed")}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
                {job.customerName}
                {isFinalized ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
            </CardTitle>
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-1">
                 <Input type="time" id={`start-time-${job.id}`} name={`startTime-${job.id}`} value={startTime} onChange={e => handleStartTimeChange(e.target.value)} className="w-28 h-9" disabled={isFinalized} />
                 <Clock className="h-4 w-4 text-muted-foreground" />
                 <Input type="time" id={`end-time-${job.id}`} name={`endTime-${job.id}`} value={endTime} className="w-28 h-9" disabled={true} />
               </div>
              <Popover>
                  <PopoverTrigger asChild>
                  <Button
                      variant={'outline'}
                      disabled={isFinalized}
                      className={cn(
                      'w-[240px] justify-start text-left font-normal',
                      !job.scheduledAt && 'text-muted-foreground'
                      )}
                  >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {job.scheduledAt ? format(new Date(job.scheduledAt), 'PPP', { locale: de }) : <span>Datum wählen</span>}
                  </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                  <Calendar
                      mode="single"
                      selected={job.scheduledAt ? new Date(job.scheduledAt): undefined}
                      onSelect={(date) => handleFieldChange('scheduledAt', date?.toISOString())}
                      initialFocus
                      disabled={isFinalized}
                  />
                  </PopoverContent>
              </Popover>
              <Button size="icon" variant="destructive" onClick={() => onDelete(job.id)}>
                  <Trash2 className="h-4 w-4" />
              </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input id={`email-${job.id}`} name={`email-${job.id}`} placeholder="Email" value={job.email || ''} onChange={(e) => handleFieldChange('email', e.target.value)} disabled={isFinalized} />
          <Input id={`phone-${job.id}`} name={`phone-${job.id}`} placeholder="Telefon" value={job.phone || ''} onChange={(e) => handleFieldChange('phone', e.target.value)} disabled={isFinalized} />
        </div>
        
        <AddressEditor title="Abholadresse" address={job.abholadresse} onAddressChange={(newAddress) => handleAddressChange('abholadresse', newAddress)} disabled={isFinalized} />
        <AddressEditor title="Zieladresse" address={job.zieladresse} onAddressChange={(newAddress) => handleAddressChange('zieladresse', newAddress)} disabled={isFinalized} />

        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor={`totalM3-${job.id}`}>Kubikmeter</Label>
                <Input type="number" id={`totalM3-${job.id}`} name={`totalM3-${job.id}`} placeholder="m³" value={job.totalM3.toFixed(2)} onChange={(e) => handleFieldChange('totalM3', parseFloat(e.target.value) || 0)} disabled={isFinalized} />
            </div>
            <div className="flex flex-col justify-end">
                <Label>Status</Label>
                <Select value={job.status} onValueChange={(value) => handleFieldChange('status', value)} disabled={isFinalized}>
                    <SelectTrigger>
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="scheduled">Geplant</SelectItem>
                    <SelectItem value="done">Erledigt</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Fahrzeuge</h4>
          <VehicleSelector vehicles={job.vehicles || []} setVehicles={(vehicles) => handleFieldChange('vehicles', vehicles)} disabled={isFinalized} isConflict={isVehicleConflict()} />
        </div>

        <Textarea id={`notes-${job.id}`} name={`notes-${job.id}`} placeholder="Notizen" value={job.notes || ''} onChange={(e) => handleFieldChange('notes', e.target.value)} disabled={isFinalized} />

      </CardContent>
       <CardFooter>
        {!isFinalized && (
            <Button onClick={() => onGoToLieferschein(job)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Auftrag finalisieren & zum Lieferschein
            </Button>
        )}
      </CardFooter>
    </Card>
  );
};


export default function JobsPage() {
  const router = useRouter();
  const { selectedCustomer, customerStates, setCustomerState, setSelectedCustomer, calendarEvents, createNewJobForCustomer } = useCustomer();
  const allCustomers = useAllCustomers();
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  
  const jobsForSelectedCustomer = selectedCustomer ? customerStates[selectedCustomer.id]?.jobs || [] : [];

  useEffect(() => {
    if (selectedCustomer && (!customerStates[selectedCustomer.id]?.jobs || customerStates[selectedCustomer.id].jobs.length === 0)) {
        createNewJobForCustomer(selectedCustomer.id);
    }
  }, [selectedCustomer, customerStates, createNewJobForCustomer]);

  const handleUpdateJob = (jobId: string, updatedFields: Partial<Job>) => {
    if (!selectedCustomer) return;
    
    setCustomerState(selectedCustomer.id, {
        jobs: customerStates[selectedCustomer.id].jobs.map(j => 
            j.id === jobId ? { ...j, ...updatedFields } : j
        )
    });
  };

  const handleDeleteJob = (jobId: string) => {
    if (!selectedCustomer) return;

    if(customerStates[selectedCustomer.id].jobForEinteilung?.id === jobId) {
        setCustomerState(selectedCustomer.id, { jobForEinteilung: null });
    }
    setCustomerState(selectedCustomer.id, {
         jobs: customerStates[selectedCustomer.id].jobs.filter(j => j.id !== jobId)
    });
  };
  
  const handleGoToLieferschein = (job: Job) => {
    if (!selectedCustomer) return;

    const finalizedJob = { ...job, isFinalized: true };
    handleUpdateJob(job.id, { isFinalized: true });
    
    setCustomerState(job.customerId, { 
        jobForLieferschein: finalizedJob, 
        highlightedNav: { '/jobs': 'completed', '/lieferschein': 'pending' },
    });
    router.push('/lieferschein');
  };

  const handleAddNewJobForCustomer = (customer: Customer) => {
    createNewJobForCustomer(customer.id);
    setSelectedCustomer(customer);
    setIsCustomerSelectOpen(false);
  };
  

  return (
    <div className="space-y-4">
      <div className='flex justify-between items-center'>
        <h1 className="text-2xl font-bold">Aufträge {selectedCustomer ? `für ${selectedCustomer.name}`: ''}</h1>
         <Dialog open={isCustomerSelectOpen} onOpenChange={setIsCustomerSelectOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    {selectedCustomer ? 'Weiteren Auftrag erstellen' : 'Auftrag für Kunde erstellen'}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-4/5 flex flex-col">
                <DialogHeader>
                    <DialogTitle>Kunde für neuen Auftrag auswählen</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <CustomersTable onCustomerSelect={handleAddNewJobForCustomer} />
                </div>
            </DialogContent>
        </Dialog>
      </div>
      {jobsForSelectedCustomer.length > 0 ? (
        <div className="space-y-4">
          {jobsForSelectedCustomer.map(job => (
            <JobCard 
              key={job.id} 
              job={job} 
              onUpdate={handleUpdateJob}
              onDelete={handleDeleteJob}
              onGoToLieferschein={handleGoToLieferschein}
              calendarEvents={calendarEvents}
            />
          ))}
        </div>
      ) : (
         <Card>
            <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
                {selectedCustomer ? "Es werden Auftragsdetails geladen oder erstellt..." : "Bitte wählen Sie einen Kunden aus, um Aufträge anzuzeigen."}
            </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
