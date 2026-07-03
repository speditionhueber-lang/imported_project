
'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, Loader2, CalendarPlus, Calendar as CalendarIcon } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import NewCustomerWizard from './new-customer-wizard';
import { useRole } from '@/contexts/role-context';
import { useToast } from '@/hooks/use-toast';
import { format, formatISO, setHours, setMinutes, addHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { useCustomer } from '@/contexts/customer-context';
import { useFirebase } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { deriveCustomerMeta, normalizeCustomerData } from '@/lib/customer-adapter';
import { useAllCustomers } from '@/hooks/use-all-customers';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

const StatusDots = ({ customer }: { customer: Customer }) => {
    const { firestore } = useFirebase();
    const dots = customer.statusDots || [false, false, false, false, false];

    const toggleDot = async (index: number) => {
        if (!firestore) return;
        const newDots = [...dots];
        newDots[index] = !newDots[index];
        
        const customerRef = doc(firestore, 'customers', customer.id);
        try {
            await setDoc(customerRef, { statusDots: newDots }, { merge: true });
        } catch (error) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: customerRef.path,
                operation: 'update',
                requestResourceData: { statusDots: newDots },
            }));
        }
    };

    const colors = ['bg-blue-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-black'];
    const tooltips = ["email gesendet", "telefonisch Kontaktiert", "Angebot/Anzahlung", "fixer Termin", "Absage"];

    return (
        <TooltipProvider>
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                {colors.map((color, index) => (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => toggleDot(index)}
                                className={cn(
                                    'h-3 w-3 rounded-full border border-gray-300 transition-all',
                                    dots[index] ? color : 'bg-gray-200 hover:bg-gray-300'
                                )}
                                aria-label={tooltips[index]}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tooltips[index]}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    );
};

interface CustomersTableProps {
  onCustomerSelect?: (customer: Customer) => void;
  showDetailsFor?: (customer: Customer) => void;
}


export default function CustomersTable({ onCustomerSelect, showDetailsFor }: CustomersTableProps) {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { role } = useRole();
  const { toast } = useToast();
  const { selectedCustomer, setSelectedCustomer, draftCustomer, setDraftCustomer, archiveCustomer, customerStates } = useCustomer();
  const router = useRouter();
  const isMobile = useIsMobile();

  const allCustomers = useAllCustomers();

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [customerForExport, setCustomerForExport] = useState<Customer | null>(null);
  const [exportDate, setExportDate] = useState<Date | undefined>(new Date());
  const [exportStartTime, setExportStartTime] = useState('08:00');
  const [exportEndTime, setExportEndTime] = useState('17:00');


  const filteredCustomers = useMemo(() => {
    let customers = [...allCustomers];
    if (draftCustomer) {
      const draftEntry: Customer = {
        id: 'draft_customer',
        name: draftCustomer.name || 'Neuer Entwurf',
        email: draftCustomer.email || '',
        phone: draftCustomer.phone || '',
        createdAt: new Date().toISOString(),
        nameLower: (draftCustomer.name || 'neuer entwurf').toLowerCase(),
        address: { street: '', city: '', zip: '', country: ''},
        avatarUrl: ''
      };
      customers = [draftEntry, ...customers];
    }
    
    // Filter out archived customers
    customers = customers.filter(c => !customerStates[c.id]?.isArchived);

    if (searchTerm) {
      return customers.filter(customer =>
        (deriveCustomerMeta(customer).name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return customers;
  }, [allCustomers, draftCustomer, searchTerm, customerStates]);


  const handleRowClick = (customer: Customer) => {
    if (customer.id === 'draft_customer') {
        setIsFormOpen(true);
        return;
    }
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    } else {
      setSelectedCustomer(customer);
      router.push('/berechnung');
    }
  };
  
  const handleRowHover = (customer: Customer) => {
    if (showDetailsFor) {
        showDetailsFor(customer);
    }
  }

  const handleShowDetailsClick = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    if(showDetailsFor) {
        showDetailsFor(customer);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      setSearchTerm(event.target.value);
    });
  };

 const handleCustomerAdded = async (newCustomerData: Omit<Customer, 'id' | 'createdAt' | 'nameLower' | 'avatarUrl'>) => {
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Fehler",
            description: "Datenbankverbindung nicht verfügbar.",
        });
        return;
    }
    
    // Normalize data for the 'customers' collection
    const customerToSave = {
        ...newCustomerData,
        nameLower: newCustomerData.name.toLowerCase(),
        createdAt: serverTimestamp(),
        avatarUrl: `https://picsum.photos/seed/${'Date.now()'}/40/40`,
    };
    
    try {
        // Save directly to the 'customers' collection
        await addDoc(collection(firestore, 'customers'), customerToSave);
        setIsFormOpen(false);
        setDraftCustomer(null); // Clear the draft customer
        toast({
          title: "Kunde hinzugefügt",
          description: `${newCustomerData.name} wurde erfolgreich zur Kundenliste hinzugefügt.`,
        });
    } catch (error) {
        console.error("Error adding customer:", error);
        toast({
            variant: "destructive",
            title: "Fehler beim Speichern",
            description: "Der Kunde konnte nicht in der Datenbank gespeichert werden. Überprüfen Sie die Konsolenausgabe für Details.",
        });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    archiveCustomer(customer.id);
    toast({
        title: "Kunde archiviert",
        description: `${customer.name} wird nicht mehr in der Liste angezeigt.`
    })
  }

  const handleOpenCalendarExport = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setCustomerForExport(customer);
    const existingDate = customer.umzugsdetails?.gewuenschterUmzugstermin;
    if (existingDate) {
        try {
            const d = new Date(existingDate);
            if (!isNaN(d.getTime())) {
                setExportDate(d);
                if (d.getHours() !== 0 || d.getMinutes() !== 0) {
                    setExportStartTime(format(d, 'HH:mm'));
                    const endDate = addHours(d, 9); // default duration 9 hours
                    setExportEndTime(format(endDate, 'HH:mm'));
                } else {
                    setExportStartTime('08:00');
                    setExportEndTime('17:00');
                }
            } else {
                setExportDate(new Date());
                setExportStartTime('08:00');
                setExportEndTime('17:00');
            }
        } catch (error) {
            setExportDate(new Date());
            setExportStartTime('08:00');
            setExportEndTime('17:00');
        }
    } else {
        setExportDate(new Date());
        setExportStartTime('08:00');
        setExportEndTime('17:00');
    }
    setIsExportDialogOpen(true);
  };

  const handleConfirmCalendarExport = async () => {
    if (!customerForExport || !exportDate || !firestore) return;
  
    const [startHours, startMinutes] = exportStartTime.split(':').map(Number);
    let startEventDate = setHours(exportDate, startHours);
    startEventDate = setMinutes(startEventDate, startMinutes);
  
    const [endHours, endMinutes] = exportEndTime.split(':').map(Number);
    let endEventDate = setHours(exportDate, endHours);
    endEventDate = setMinutes(endEventDate, endMinutes);
  
    // 1. Update customer data in Firestore
    const customerRef = doc(firestore, 'customers', customerForExport.id);
    try {
      await setDoc(customerRef, {
        umzugsdetails: {
          gewuenschterUmzugstermin: startEventDate.toISOString(),
        },
      }, { merge: true });
  
      toast({
        title: 'Umzugstermin aktualisiert',
        description: `Der Termin für ${customerForExport.name} wurde gespeichert.`,
      });
  
    } catch (error) {
      console.error('Error updating customer date:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler beim Speichern',
        description: 'Der neue Umzugstermin konnte nicht gespeichert werden.',
      });
      // Do not proceed with calendar export if DB update fails
      return;
    }
  
    // 2. Generate and download ICS file
    const startTime = formatISO(startEventDate).replace(/-|:|\.\d{3}/g, '');
    const endTime = formatISO(endEventDate).replace(/-|:|\.\d{3}/g, '');
  
    const description = [
      `Kunde: ${customerForExport.name}`,
      `Telefon: ${customerForExport.phone || 'N/A'}`,
      `Email: ${customerForExport.email || 'N/A'}`,
      `Abholung: ${customerForExport.abholadresse?.strasse || 'N/A'}`,
      `Ziel: ${customerForExport.zieladresse?.strasse || 'N/A'}`,
      `Notizen: ${customerForExport.anmerkungen || 'Keine'}`,
    ].join('\\n');
  
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hueber//Umzugs-App//EN',
      'BEGIN:VEVENT',
      `UID:${customerForExport.id}@hueber.app`,
      `DTSTAMP:${formatISO(new Date()).replace(/-|:|\.\d{3}/g, '')}`,
      `DTSTART:${startTime}`,
      `DTEND:${endTime}`,
      `SUMMARY:Umzug: ${customerForExport.name}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${customerForExport.abholadresse?.strasse || ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Umzug_${customerForExport.name.replace(/ /g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  
    toast({
      title: 'Kalenderexport gestartet',
      description: `Der Termin für ${customerForExport.name} wird heruntergeladen.`,
    });
  
    setIsExportDialogOpen(false);
    setCustomerForExport(null);
  };


  const formatDate = (dateValue: any) => {
    if (!dateValue) return '-';
    try {
        const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
        if (isNaN(date.getTime())) return '-';
        const zonedDate = toZonedTime(date, 'UTC');
        return format(zonedDate, 'dd.MM.yyyy', { locale: de });
    } catch (e) {
        return String(dateValue);
    }
  };

  return (
    <>
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 px-4 pt-4">
        <Input
          placeholder="Nach Name suchen..."
          onChange={handleSearch}
          className="max-w-sm"
        />
        <Button asChild>
          <Link href="/konten-anlegen">
            <PlusCircle className="mr-2 h-4 w-4" />
            Neuen Kunden anlegen
          </Link>
        </Button>
      </div>
      <div className="rounded-lg border bg-card flex-grow overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="hidden md:table-cell">E-Mail</TableHead>
              <TableHead className="hidden md:table-cell">Telefon</TableHead>
              <TableHead className="hidden lg:table-cell">Erstellt</TableHead>
              <TableHead>
                <span className="sr-only">Aktionen</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    <span>Lade Daten...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCustomers && filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => {
                const { name, email, phone, createdAt } = deriveCustomerMeta(customer);
                const isDraft = customer.id === 'draft_customer';
                return (
                  <TableRow 
                    key={customer.id} 
                    onClick={() => handleRowClick(customer)}
                    onMouseEnter={() => handleRowHover(customer)}
                    className={cn("cursor-pointer", isDraft && "bg-orange-500/10 hover:bg-orange-500/20", selectedCustomer?.id === customer.id && "bg-accent/50")}
                    data-state={selectedCustomer?.id === customer.id ? 'selected' : 'unselected'}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={customer.avatarUrl || `https://picsum.photos/seed/${customer.id}/40/40`} alt={String(name)} data-ai-hint="person face" />
                          <AvatarFallback>
                            {String(name)?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                        {!isDraft && <StatusDots customer={customer} />}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {email}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {phone}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {isDraft ? 'Jetzt' : formatDate(createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menü umschalten</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleShowDetailsClick(e, customer)}>Details anzeigen</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleOpenCalendarExport(e, customer)}>
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            Termin für Kalender
                          </DropdownMenuItem>
                          {role === 'admin' && !isDraft &&(
                            <DropdownMenuItem className="text-destructive" onClick={(e) => handleDeleteClick(e, customer)}>
                              Löschen
                            </DropdownMenuItem>
                          )}
                           {isDraft &&(
                            <DropdownMenuItem className="text-destructive" onClick={() => setDraftCustomer(null)}>
                              Entwurf verwerfen
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Keine Kunden gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end p-4">
        <p className="text-sm text-muted-foreground">
          Gesamtanzahl Kunden: {filteredCustomers?.length || 0}
        </p>
      </div>
    </div>
    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Termin für Kalender exportieren</DialogTitle>
          <DialogDescription>
            Bitte überprüfen und bestätigen Sie das Datum und die Uhrzeit für den Termin von {customerForExport?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !exportDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exportDate ? format(exportDate, 'PPP', { locale: de }) : <span>Datum wählen</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={exportDate} onSelect={setExportDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="export-start-time">Startzeit</Label>
                <Input
                id="export-start-time"
                name="exportStartTime"
                type="time"
                value={exportStartTime}
                onChange={(e) => setExportStartTime(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="export-end-time">Endzeit</Label>
                <Input
                id="export-end-time"
                name="exportEndTime"
                type="time"
                value={exportEndTime}
                onChange={(e) => setExportEndTime(e.target.value)}
                />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleConfirmCalendarExport}>Bestätigen & Exportieren</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
