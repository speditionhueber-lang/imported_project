
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOffer } from '@/contexts/offer-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, FileDown, Send, CheckCircle, Check, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { OfferItem } from '@/contexts/offer-context';
import { useRole } from '@/contexts/role-context';
import { useCustomer } from '@/contexts/customer-context';
import type { Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomersTable from '@/components/customers/customers-table';
import * as berechnungsParameter from '@/lib/berechnungs-parameter';
import { Label } from '@/components/ui/label';
import { useInvoices } from '@/contexts/invoice-context';
import { getNextInvoiceNumber, incrementInvoiceNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { de } from 'date-fns/locale';
import { useClientState } from '@/hooks/use-client-state';
import { Switch } from '@/components/ui/switch';
import { uploadFileToDriveAction } from '@/app/actions';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};


export default function RechnungErstellenPage() {
  const { offerData: contextOfferData } = useOffer();
  const { role } = useRole();
  const { selectedCustomer: globalCustomer, setCustomerState, offerData: customerOfferData, totalM3 } = useCustomer();
  const { addInvoice, updateInvoiceStatus, invoices } = useInvoices();
  const { toast } = useToast();
  const router = useRouter();
  
  const [items, setItems] = useState<OfferItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [localCustomer, setLocalCustomer] = useState<Customer | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const [actualTravelHours, setActualTravelHours] = useState(0);
  const [actualCarryHours, setActualCarryHours] = useState(0);
  const [actualAssemblyHours, setActualAssemblyHours] = useState(0);
  
  const [customerName, setCustomerName] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [leistungsdatum, setLeistungsdatum] = useState<Date | undefined>(new Date());
  
  const [lastInvoiceNum, setLastInvoiceNum] = useClientState<number>('lastInvoiceNumber', 2524721, (val) => parseInt(val, 10));

  const [anzahlung, setAnzahlung] = useState(0);
  const [includeAnzahlungInPdf, setIncludeAnzahlungInPdf] = useState(true);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const bruttoTotal = useMemo(() => total * 1.2, [total]);
  const restbetrag = useMemo(() => bruttoTotal - anzahlung, [bruttoTotal, anzahlung]);

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

  const currentCustomer = localCustomer || globalCustomer;
  const finalOfferData = customerOfferData || contextOfferData;
  
   useEffect(() => {
    // Set default Anzahlung when bruttoTotal is calculated
    setAnzahlung(bruttoTotal * 0.5);
  }, [bruttoTotal]);

  useEffect(() => {
    if (currentCustomer) {
        setCustomerName(currentCustomer.name);
        setCustomerStreet(currentCustomer.address?.street || '');
        setCustomerCity(`${currentCustomer.address?.zip || ''} ${currentCustomer.address?.city || ''}`);
        setInvoiceNumber(getNextInvoiceNumber('RE', '-', lastInvoiceNum + 1));
        if (currentCustomer.umzugsdetails?.gewuenschterUmzugstermin) {
          try {
            setLeistungsdatum(new Date(currentCustomer.umzugsdetails.gewuenschterUmzugstermin));
          } catch (e) {
            setLeistungsdatum(new Date());
          }
        } else {
          setLeistungsdatum(new Date());
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCustomer, lastInvoiceNum]);

  useEffect(() => {
    if (globalCustomer && finalOfferData?.items) {
      setItems(finalOfferData.items);
      setLocalCustomer(null);

      const travelItem = finalOfferData.items.find(item => item.id === 'fahrtkosten');
      const lkwRate = berechnungsParameter.VEHICLE_RATES.LKW_7_5_RATE;
      setActualTravelHours(travelItem && lkwRate > 0 ? travelItem.quantity : 0);
      
      const assemblyItem = finalOfferData.items.find(item => item.id === 'moebelmontage');
      setActualAssemblyHours(assemblyItem ? assemblyItem.quantity : 0);

      const carryItems = finalOfferData.items.filter(item => ['trageweg_abholung', 'trageweg_ziel', 'stockwerk_abholung', 'stockwerk_ziel'].includes(item.id));
      const totalCarryCost = carryItems.reduce((sum, item) => sum + item.total, 0);
      setActualCarryHours(totalCarryCost > 0 && berechnungsParameter.CARRIER_RATE > 0 ? totalCarryCost / berechnungsParameter.CARRIER_RATE : 0);

    } else if (globalCustomer) {
      setItems([]);
      setLocalCustomer(null);
    }
  }, [finalOfferData, globalCustomer]);

 useEffect(() => {
    if (!finalOfferData) return;

    setItems(prevItems => {
        const carryItemIds = ['trageweg_abholung', 'trageweg_ziel', 'stockwerk_abholung', 'stockwerk_ziel'];
        const originalCarryItems = finalOfferData.items.filter(i => carryItemIds.includes(i.id));
        const originalTotalCarryCost = originalCarryItems.reduce((sum, i) => sum + i.total, 0);
        const newTotalCarryCost = actualCarryHours * berechnungsParameter.CARRIER_RATE;

        let updatedItems = finalOfferData.items.map(item => {
            let newItem = {...item};
            if(item.id === 'fahrtkosten') {
                const lkwRate = berechnungsParameter.VEHICLE_RATES.LKW_7_5_RATE;
                newItem.quantity = actualTravelHours;
                newItem.unitPrice = lkwRate;
                newItem.total = actualTravelHours * lkwRate;
            } else if (carryItemIds.includes(item.id)) {
                 if (originalTotalCarryCost > 0) {
                     const ratio = finalOfferData.items.find(i => i.id === item.id)!.total / originalTotalCarryCost;
                     newItem.total = newTotalCarryCost * ratio;
                     newItem.unitPrice = newItem.total;
                 } else {
                     newItem.total = 0;
                     newItem.unitPrice = 0;
                 }
            } else if (item.id === 'moebelmontage') {
                newItem.quantity = actualAssemblyHours;
                newItem.unitPrice = berechnungsParameter.ASSEMBLY_WORKER_RATE;
                newItem.total = actualAssemblyHours * berechnungsParameter.ASSEMBLY_WORKER_RATE;
            }
            return newItem;
        });
        
        return updatedItems.filter(i => {
            if(carryItemIds.includes(i.id)) return actualCarryHours > 0;
            return true;
        });
    });
  }, [actualTravelHours, actualCarryHours, actualAssemblyHours, finalOfferData]);


  const handleCustomerSelect = (customer: Customer) => {
    setLocalCustomer(customer);
    if (customerOfferData?.items) {
      setItems(customerOfferData.items);
    } else {
      setItems([]);
    }
    setIsDialogOpen(false);
  };

  const handleItemChange = (id: string, field: keyof OfferItem, value: string | number) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = (updatedItem.quantity || 0) * (updatedItem.unitPrice || 0);
          }
          return updatedItem;
        }
        return item;
      })
    );
  };
  
  const handleAddNewItem = () => {
    const newItem: OfferItem = {
      id: `custom_${Date.now()}`,
      description: 'Neuer Posten',
      quantity: 1,
      unit: 'Stk',
      unitPrice: 0,
      total: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpload = useCallback(async (filename: string, buffer: ArrayBuffer, folderId: string) => {
    const base64 = Buffer.from(buffer).toString('base64');
    await uploadFileToDriveAction(folderId, filename, base64, 'application/pdf');
  }, []);

 const handleGeneratePdf = async (action: 'download' | 'send' = 'download') => {
    if (currentCustomer && items.length > 0 && logoBase64) {
        
        const modifiedCustomer: Customer = {
            ...currentCustomer,
            name: customerName,
            address: {
              ...currentCustomer.address,
              street: customerStreet,
              city: customerCity.split(' ').slice(1).join(' ') || '',
              zip: customerCity.split(' ')[0] || '',
            }
        };

        const invoiceToProcess = addInvoice({
            id: invoiceNumber,
            jobId: 'job_1',
            customerName: modifiedCustomer.name,
            netTotal: total,
            vatRate: 0.20,
            total: bruttoTotal,
            status: 'draft',
            issuedAt: new Date().toISOString(),
            paidAt: null,
            items: items,
            customer: modifiedCustomer,
        });

        if (action === 'download' || action === 'send') {
            setLastInvoiceNum(prev => prev + 1);
        }
        
        toast({
          title: "PDF wird erstellt & gespeichert...",
          description: `Die Rechnung wird heruntergeladen und in Google Drive hochgeladen.`,
        });

        const { pdfOutput, filename } = await generateInvoicePDF(
            modifiedCustomer, 
            items, 
            logoBase64, 
            action, 
            invoiceToProcess.id, 
            totalM3, 
            leistungsdatum ? format(leistungsdatum, 'dd.MM.yyyy') : undefined, 
            includeAnzahlungInPdf ? anzahlung : 0, 
            includeAnzahlungInPdf ? restbetrag : bruttoTotal,
            handleUpload
        );
        
        if (action === 'download' && pdfOutput) {
          const blob = new Blob([pdfOutput], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
          router.push('/invoices');
        }
        
        return { pdfOutput, filename, invoiceId: invoiceToProcess.id };

    } else {
        toast({
            variant: "destructive",
            title: "Fehler",
            description: "Keine Rechnungsdaten oder Logo zum Erstellen eines PDFs vorhanden."
        });
        return null;
    }
  }

  const handleRequestApproval = () => {
    if (globalCustomer) {
      setCustomerState(globalCustomer.id, {
        highlightedNav: { '/rechnung-erstellen': 'approval' },
        pendingInvoiceApproval: true,
      });
    }
    router.push('/');
  };

  if (!currentCustomer) {
    return (
      <Card>
        <CardHeader>
            <CardTitle>Kein Kunde ausgewählt</CardTitle>
            <CardDescription>Bitte wählen Sie einen Kunden aus, um eine Rechnung zu erstellen.</CardDescription>
        </CardHeader>
        <CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button>Kunde auswählen</Button>
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
  
  if (currentCustomer && items.length === 0) {
     return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Rechnung für {currentCustomer.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Für diesen Kunden wurde noch keine Berechnung durchgeführt. Bitte gehen Sie zur Berechnungs-Seite, um zu beginnen.
            </p>
             <Button onClick={() => router.push('/berechnung?source=rechnung')} className="w-full mt-4">Zur Berechnung</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Rechnung</h1>
              <p className="text-muted-foreground">Kunde: {currentCustomer.name}</p>
            </div>
            <div className="text-right">
                <p className="font-semibold">Hueber Büro</p>
                <p className="text-sm text-muted-foreground">Musterstraße 1, 6020 Innsbruck</p>
            </div>
          </div>
          <Separator className="my-4" />
           <div className="grid grid-cols-2 gap-4">
              <div>
                  <h3 className="font-semibold">Rechnungsadresse</h3>
                  <Input id="customerName" name="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Kundenname..."/>
                  <Input id="customerStreet" name="customerStreet" value={customerStreet} onChange={(e) => setCustomerStreet(e.target.value)} className="mt-1" placeholder="Straße..."/>
                  <Input id="customerCity" name="customerCity" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} className="mt-1" placeholder="PLZ Ort..."/>
              </div>
              <div className="text-right">
                  <Label htmlFor="rechnungsnummer">Rechnungsnummer</Label>
                  <Input id="rechnungsnummer" name="rechnungsnummer" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="text-right" />
                  <p className="text-xs text-muted-foreground mt-1">Kundennr: {currentCustomer.id}</p>
                   <div className="mt-2">
                    <Label>Leistungsdatum</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !leistungsdatum && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {leistungsdatum ? format(leistungsdatum, 'PPP', { locale: de }) : <span>Datum wählen</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={leistungsdatum} onSelect={setLeistungsdatum} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Card className="mb-6">
              <CardHeader><CardTitle>Zeitanpassung</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <Label htmlFor="actualTravelHours">Tatsächliche Fahrtzeit (h)</Label>
                      <Input id="actualTravelHours" name="actualTravelHours" type="number" value={actualTravelHours.toFixed(2)} onChange={(e) => setActualTravelHours(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                      <Label htmlFor="actualCarryHours">Tatsächliche Tragezeit (h)</Label>
                      <Input id="actualCarryHours" name="actualCarryHours" type="number" value={actualCarryHours.toFixed(2)} onChange={(e) => setActualCarryHours(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                      <Label htmlFor="actualAssemblyHours">Tatsächliche Montagezeit (h)</Label>
                      <Input id="actualAssemblyHours" name="actualAssemblyHours" type="number" value={actualAssemblyHours.toFixed(2)} onChange={(e) => setActualAssemblyHours(parseFloat(e.target.value) || 0)} />
                  </div>
              </CardContent>
          </Card>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Beschreibung</TableHead>
                  <TableHead className="text-center">Menge</TableHead>
                  <TableHead className="text-center">Einheit</TableHead>
                  <TableHead className="text-right">Preis/Einheit</TableHead>
                  <TableHead className="text-right">Gesamt</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input id={`item-desc-${index}`} name={`item-desc-${index}`} value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input id={`item-qty-${index}`} name={`item-qty-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="h-8 w-20 text-center" />
                    </TableCell>
                    <TableCell>
                      <Input id={`item-unit-${index}`} name={`item-unit-${index}`} value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="h-8 w-24 text-center" />
                    </TableCell>
                    <TableCell>
                       <Input id={`item-price-${index}`} name={`item-price-${index}`} type="number" value={item.unitPrice} onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-8 w-28 text-right" />
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
           <div className="flex justify-start mt-4">
              <Button variant="outline" onClick={handleAddNewItem}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Posten hinzufügen
              </Button>
            </div>
        </CardContent>
        <CardFooter>
            <div className="w-full">
                <Separator className="my-4" />
                <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between">
                            <span>Zwischensumme</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>MwSt. (20%)</span>
                            <span>{formatCurrency(total * 0.2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>Gesamtsumme (Brutto)</span>
                            <span>{formatCurrency(bruttoTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg">
                            <Label htmlFor="anzahlung" className="font-bold">abzüglich Anzahlung</Label>
                            <Input 
                                id="anzahlung"
                                name="anzahlung"
                                type="number"
                                value={anzahlung}
                                onChange={(e) => setAnzahlung(parseFloat(e.target.value) || 0)}
                                className="h-8 w-28 text-right font-bold"
                            />
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Restbetrag</span>
                            <span>{formatCurrency(restbetrag)}</span>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-2 mt-6">
                    <div className="flex items-center space-x-2 mr-4">
                        <Switch id="include-anzahlung" checked={includeAnzahlungInPdf} onCheckedChange={setIncludeAnzahlungInPdf} />
                        <Label htmlFor="include-anzahlung">Anzahlung/Restbetrag im PDF</Label>
                    </div>
                    <Button variant="outline" onClick={() => handleGeneratePdf('download')} disabled={!logoBase64}><FileDown className="mr-2 h-4 w-4" /> PDF erstellen & Speichern</Button>
                    {role === 'admin' ? (
                       <Button variant="secondary"><CheckCircle className="mr-2 h-4 w-4" /> Als bezahlt markieren</Button>
                    ) : (
                        <Button onClick={handleRequestApproval}><Check className="mr-2 h-4 w-4" /> Zur Genehmigung senden</Button>
                    )}
                </div>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    