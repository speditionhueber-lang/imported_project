
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCustomer } from '@/contexts/customer-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format, addHours, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Printer, PlusCircle, Trash2, Clock } from 'lucide-react';
import { ITEM_CBM_DEFAULTS } from '@/lib/item-cbm-defaults';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateLieferscheinPDF } from '@/lib/pdf-generator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomersTable from '@/components/customers/customers-table';
import { Input } from '@/components/ui/input';
import type { Customer, Job } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import WorkerSelector from '@/components/shared/worker-selector';
import { companyData } from '@/lib/company-data';
import { useEmployees } from '@/hooks/use-employees';
import { Checkbox } from '@/components/ui/checkbox';

const camelToTitle = (camelCase: string) => {
  if (!camelCase) return '';
  let text = camelCase.replace(/([A-Z])/g, ' $1');
  text = text.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default function LieferscheinAendernPage() {
  const { selectedCustomer: globalCustomer, setSelectedCustomer, customerStates, calendarEvents, setCustomerState } = useCustomer();
  const router = useRouter();
  const { toast } = useToast();
  const { employees } = useEmployees();
  
  const [localCustomer, setLocalCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString());
  const [abholadresse, setAbholadresse] = useState('');
  const [zieladresse, setZieladresse] = useState('');
  const [note, setNote] = useState('');
  const [workers, setWorkers] = useState<string[]>([]);
  const [gegenstaende, setGegenstaende] = useState<{name: string, count: string, isNew?: boolean, montage: boolean}[]>([]);
  const [docNumber, setDocNumber] = useState('');

  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [totalM3, setTotalM3] = useState(0);

  useEffect(() => {
    fetch('/logo-color.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      });
  }, []);

  const pageCustomer = localCustomer || globalCustomer;

  // This effect mirrors the logic from LieferscheinPage to populate the form
  useEffect(() => {
    if (pageCustomer) {
      const customerState = customerStates[pageCustomer.id];
      const jobForDisplay = customerState?.jobForLieferschein || customerState?.jobs?.[0];

      setCustomerName(pageCustomer.name || '');
      if (pageCustomer.address) {
        setCustomerStreet(pageCustomer.address.street || '');
        setCustomerCity(`${pageCustomer.address.zip || ''} ${pageCustomer.address.city || ''}`);
      }
      setScheduledAt(jobForDisplay?.scheduledAt || pageCustomer.umzugsdetails?.gewuenschterUmzugstermin || new Date().toISOString());
      setAbholadresse(jobForDisplay?.abholadresse?.strasse || pageCustomer.abholadresse?.strasse || '');
      setZieladresse(jobForDisplay?.zieladresse?.strasse || pageCustomer.zieladresse?.strasse || '');
      setNote(jobForDisplay?.notes || pageCustomer.anmerkungen || '');
      setWorkers(jobForDisplay?.allocations?.[0]?.workers || []);
      setDocNumber(`LS-${Date.now().toString().slice(-6)}`);
      setTotalM3(jobForDisplay?.totalM3 || customerState?.offerData?.totalM3 || 0);

      const items = pageCustomer.gegenstaende
        ? Object.entries(pageCustomer.gegenstaende)
            .filter(([, value]) => {
              if (value === null || value === undefined) return false;
              const stringValue = String(value).trim();
              return stringValue !== '' && stringValue !== '0' && stringValue.toLowerCase() !== 'nein' && stringValue.toLowerCase() !== 'false';
            })
            .map(([key, value]) => {
                let defaultEntry;
                for(const category of Object.values(ITEM_CBM_DEFAULTS)) {
                    const found = category.find(item => item.key === key);
                    if(found) {
                        defaultEntry = found;
                        break;
                    }
                }
                return {
                    name: defaultEntry?.name || camelToTitle(key),
                    count: String(value),
                    isNew: false,
                    montage: false,
                }
            })
        : [];
      setGegenstaende(items);
    }
  }, [pageCustomer, customerStates]);

  const handleSave = () => {
    if (!pageCustomer) {
      toast({
        variant: "destructive",
        title: "Kein Kunde ausgewählt",
        description: "Bitte wählen Sie einen Kunden aus, um den Lieferschein zu erstellen."
      });
      return;
    }
    
    if (logoBase64) {
        
        const [startH, startM] = startTime.split(':').map(Number);
        const newScheduledDate = new Date(scheduledAt);
        newScheduledDate.setHours(startH, startM, 0, 0);

        const mockJob: Job = {
            id: `job_mock_${pageCustomer.id}_${Date.now()}`,
            customerId: pageCustomer.id,
            customerName: customerName,
            scheduledAt: newScheduledDate.toISOString(),
            abholadresse: { strasse: abholadresse },
            zieladresse: { strasse: zieladresse },
            notes: note,
            allocations: [{ id: 'temp', date: scheduledAt, driver: '', workers: workers }],
            createdAt: new Date().toISOString(),
            status: 'scheduled',
            totalM3: totalM3,
            calculatedHours: 9, // Default/mock value
            vehicles: [],
        };

        const mockCustomer: Customer = {
            ...pageCustomer,
            name: customerName,
            address: { 
                ...pageCustomer.address,
                street: customerStreet,
                city: customerCity.split(' ').slice(1).join(' ') || '',
                zip: customerCity.split(' ')[0] || '',
             }
        }
        
      generateLieferscheinPDF(mockCustomer, mockJob, gegenstaende, workers, note, logoBase64, 'save', docNumber, totalM3, startTime, endTime);

      const eventStart = newScheduledDate;
      const [endH, endM] = endTime.split(':').map(Number);
      const eventEnd = new Date(newScheduledDate);
      eventEnd.setHours(endH, endM, 0, 0);

      const newEvent = {
            id: `evt_${mockJob.id}_${mockJob.scheduledAt}`,
            start: eventStart,
            end: eventEnd,
            title: `Umzug: ${mockJob.customerName}`,
            description: `${mockJob.abholadresse?.strasse || ''} -> ${mockJob.zieladresse?.strasse || ''}`,
            vehicles: mockJob.vehicles || [],
            workers: workers,
        };

        const otherEvents = (calendarEvents || []).filter(e => !e.id.startsWith(`evt_${mockJob.id}`));
        
       setCustomerState(pageCustomer.id, {
           calendarEvents: [...otherEvents, newEvent],
       })

       toast({
        title: "Lieferschein erstellt",
        description: "Das PDF wurde gespeichert."
      });

       router.push('/calendar');
    } else {
        toast({
            variant: "destructive",
            title: "Fehler",
            description: "PDF konnte nicht erstellt werden. Logo oder Auftragsdaten fehlen."
        });
    }
  };

  const handleAddItem = () => {
    setGegenstaende([...gegenstaende, { name: 'Neuer Gegenstand', count: '1', isNew: true, montage: false }]);
  }

  const handleRemoveItem = (index: number) => {
    setGegenstaende(gegenstaende.filter((_, i) => i !== index));
  }

  const handleItemChange = (index: number, field: 'name' | 'count', value: string) => {
    const newItems = [...gegenstaende];
    newItems[index][field] = value;
    setGegenstaende(newItems);
  }
  
  const handleItemMontageChange = (index: number, checked: boolean) => {
    const newItems = [...gegenstaende];
    newItems[index].montage = checked;
    setGegenstaende(newItems);
  };
  
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setLocalCustomer(null); // Clear local customer when global one is selected
    setIsDialogOpen(false);
  }

  if (!pageCustomer) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Lieferschein erstellen/ändern</CardTitle>
                <CardDescription>
                    Wählen Sie einen Kunden aus, um einen neuen Lieferschein zu erstellen.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            Kunde auswählen
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-4/5 flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Kunden auswählen</DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow min-h-0">
                            <CustomersTable onCustomerSelect={handleCustomerSelect} />
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
  }


  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center print-hide">
            <div className="flex gap-4 items-center">
              <h1 className="text-2xl font-bold">Lieferschein für {pageCustomer.name}</h1>
            </div>
            <Button onClick={handleSave} disabled={!pageCustomer || !logoBase64}>
                <Printer className="mr-2 h-4 w-4" />
                Speichern
            </Button>
        </div>
        
      <Card id="lieferschein-content">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">Lieferschein</h2>
                  <p className="text-muted-foreground">Auftrag: <Input id="customer-name" name="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="inline-block w-auto" placeholder="Auftragsname..."/> </p>
                </div>
                <div className="text-right">
                    <p className="font-semibold">{companyData.name}</p>
                    <p className="text-sm text-muted-foreground">{companyData.street}</p>
                    <p className="text-sm text-muted-foreground">{companyData.zip} ${companyData.city}</p>
                </div>
            </div>
             <Separator className="my-4"/>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h3 className="font-semibold">Kunde</h3>
                    <Input id="customer-name-2" name="customerName2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Kundenname..."/>
                    <Input id="customer-street" name="customerStreet" value={customerStreet} onChange={(e) => setCustomerStreet(e.target.value)} className="mt-1" placeholder="Straße..."/>
                    <Input id="customer-city" name="customerCity" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} className="mt-1" placeholder="PLZ Ort..."/>
                </div>
                 <div className="text-right">
                    <Label htmlFor='doc-number'>Lieferschein-Nr.</Label>
                    <Input id="doc-number" name="docNumber" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className="text-right" />
                     {pageCustomer && <p className="text-xs text-muted-foreground mt-1">Kundennr: {pageCustomer.id}</p>}
                    <div className="flex items-center justify-end gap-2 mt-2">
                        <div className="flex items-center gap-1">
                            <Input type="time" id="start-time" name="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-28 h-9" />
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input type="time" id="end-time" name="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-28 h-9" />
                        </div>
                        <Input id="delivery-date" name="deliveryDate" type="date" value={scheduledAt ? new Date(scheduledAt).toISOString().split('T')[0] : ''} onChange={e => setScheduledAt(new Date(e.target.value).toISOString())} className="w-auto" />
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <h3 className="font-semibold">Abholadresse</h3>
                    <Input id="pickup-address" name="pickupAddress" value={abholadresse} onChange={(e) => setAbholadresse(e.target.value)} placeholder="Abholadresse..."/>
                </div>
                <div>
                    <h3 className="font-semibold">Zieladresse</h3>
                    <Input id="delivery-address" name="deliveryAddress" value={zieladresse} onChange={(e) => setZieladresse(e.target.value)} placeholder="Zieladresse..."/>
                </div>
            </div>
             <Separator />
             <div className="grid grid-cols-2 gap-8">
                <div>
                    <h3 className="font-semibold mb-2">Eingeteilte Mitarbeiter</h3>
                     <WorkerSelector allWorkers={employees || []} selectedWorkers={workers} onSelectionChange={setWorkers} />
                </div>
                <div className="space-y-2">
                    <div>
                        <Label htmlFor="totalM3">Kubikmeter</Label>
                        <Input id="totalM3" name="totalM3" type="number" value={totalM3.toFixed(2)} onChange={(e) => setTotalM3(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                        <Label htmlFor="delivery-note" className="font-semibold mb-2 block">Notiz</Label>
                        <Textarea 
                            id="delivery-note"
                            name="deliveryNote"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="text-red-600 border-red-200 focus-visible:ring-red-500"
                            placeholder="Wichtige Hinweise für das Team..."
                        />
                    </div>
                </div>
            </div>

            <Separator />

             <div>
                <h3 className="font-semibold">Gegenstandsliste</h3>
                 <div className="rounded-lg border mt-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Gegenstand</TableHead>
                                <TableHead className="w-[100px] text-right">Anzahl</TableHead>
                                <TableHead className="w-[100px] text-center">Montage</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {gegenstaende.length > 0 ? gegenstaende.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Input id={`item-name-${index}`} name={`itemName-${index}`} value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)}/>
                                            {item.isNew && (
                                                <span className="text-red-500 text-xs font-semibold whitespace-nowrap">(zusätzlich hinzugefügt)</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right"><Input id={`item-count-${index}`} name={`itemCount-${index}`} value={item.count} onChange={e => handleItemChange(index, 'count', e.target.value)} className="w-20 ml-auto text-right" /></TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox 
                                        id={`item-montage-${index}`}
                                        checked={item.montage} 
                                        onCheckedChange={(checked) => handleItemMontageChange(index, !!checked)} 
                                      />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">Keine Gegenstände erfasst.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Gegenstand hinzufügen</Button>
            </div>

            <Separator className="mt-8" />
            <div className="grid grid-cols-2 gap-8 pt-8">
                <div>
                    <div className="w-full h-px bg-gray-400"></div>
                    <p className="text-center text-sm pt-1">Unterschrift (Übergebend)</p>
                </div>
                 <div>
                    <div className="w-full h-px bg-gray-400"></div>
                    <p className="text-center text-sm pt-1">Unterschrift (Übernehmend)</p>
                </div>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
