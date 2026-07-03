
'use client';

import { useState, useMemo, useCallback, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useOffer } from '@/contexts/offer-context';
import { useCustomer, type JobCreationData } from '@/contexts/customer-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, FileDown, Send, Briefcase, Check, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { OfferItem } from '@/contexts/offer-context';
import { generateOfferPDF, generateOrientierungsangebotPDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/role-context';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomersTable from '@/components/customers/customers-table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useInvoices } from '@/contexts/invoice-context';
import { getNextInvoiceNumber, incrementInvoiceNumber } from '@/lib/utils';
import type { Customer } from '@/lib/types';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { de } from 'date-fns/locale';
import { useClientState } from '@/hooks/use-client-state';
import { uploadFileToDriveAction } from '@/app/actions';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const parseFlexibleDate = (dateString?: string): Date => {
  if (!dateString) return new Date();

  // Try parsing as DD.MM.YYYY
  const germanMatch = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    // new Date(year, monthIndex, day)
    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  // Fallback to default new Date() parser (for ISO strings etc.)
  const parsedDate = new Date(dateString);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  // If all fails, return today
  return new Date();
};


export default function AngebotPage() {
  const { offerCustomer, offerItems, updateOfferItem, addOfferItem, removeOfferItem, totalM3, calculatedHours, setOfferData } = useOffer();
  const { selectedCustomer, setCustomerState, offerData: savedOfferData, createNewJobForCustomer, setSelectedCustomer } = useCustomer();
  const { role } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  const [isSending, startSending] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const { addInvoice } = useInvoices();

  const [paymentOption, setPaymentOption] = useState('default');
  const [customPercentage, setCustomPercentage] = useState(30);
  const [customDays, setCustomDays] = useState(7);
  const [customText, setCustomText] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  
  // Use a client-side hook to safely access localStorage for the invoice number
  const [lastAnzahlungNum, setLastAnzahlungNum] = useClientState<number>('lastAnzahlungInvoiceNumber', 20, (val) => parseInt(val, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [priceMultiplier, setPriceMultiplier] = useState(1);
  const [leistungsdatum, setLeistungsdatum] = useState<Date | undefined>(new Date());
  
  const [anzahlung, setAnzahlung] = useState(0);

  const adjustedItems = useMemo(() => {
    return offerItems.map(item => ({
        ...item,
        unitPrice: item.unitPrice * priceMultiplier,
        total: item.total * priceMultiplier,
    }));
  }, [offerItems, priceMultiplier]);

  const finalTotal = useMemo(() => {
    return adjustedItems.reduce((sum, item) => sum + item.total, 0);
  }, [adjustedItems]);

  const bruttoTotal = useMemo(() => finalTotal * 1.2, [finalTotal]);
  
  useEffect(() => {
      // Set default Anzahlung when bruttoTotal is calculated
      setAnzahlung(bruttoTotal * 0.5);
  }, [bruttoTotal]);
  
  const restbetrag = useMemo(() => bruttoTotal - anzahlung, [bruttoTotal, anzahlung]);


  const paymentTermsText = useMemo(() => {
    switch (paymentOption) {
        case 'default':
            return 'Wir bitten um eine Anzahlung von 50% innerhalb 14 Tagen.';
        case 'custom':
            return `Wir bitten um eine Anzahlung von ${customPercentage}% innerhalb ${customDays} Tagen.`;
        case 'free':
            return customText;
        default:
            return 'Zahlbar nach Erhalt der Rechnung.';
    }
  }, [paymentOption, customPercentage, customDays, customText]);


  useEffect(() => {
    // Fetch the logo and convert it to a base64 string
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

  useEffect(() => {
    if (selectedCustomer && savedOfferData) {
      setOfferData(selectedCustomer, savedOfferData.items, savedOfferData.totalM3, savedOfferData.calculatedHours, savedOfferData.vehicle);
    }
  }, [selectedCustomer, savedOfferData, setOfferData]);
  
  useEffect(() => {
    if (offerCustomer) {
        setCustomerName(offerCustomer.name);
        const address = offerCustomer.address;
        if (address) {
          setCustomerStreet(address.street || '');
          setCustomerCity(`${address.zip || ''} ${address.city || ''}`.trim());
        }
        
        // Generate the invoice number once the client-side state is ready
        setInvoiceNumber(getNextInvoiceNumber('AR-25', '/', lastAnzahlungNum + 1));
        
        setLeistungsdatum(parseFlexibleDate(offerCustomer.umzugsdetails?.gewuenschterUmzugstermin));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerCustomer, lastAnzahlungNum]);


  useEffect(() => {
    if (selectedCustomer) {
        setIsDialogOpen(false);
    }
  }, [selectedCustomer]);

  const handleItemChange = (id: string, field: keyof OfferItem, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const item = offerItems.find(i => i.id === id);
    if (!item) return;

    let updatedValue: Partial<OfferItem> = {};
    if (field === 'quantity' || field === 'unitPrice') {
      updatedValue = { [field]: numericValue };
    } else if (field === 'description' || field === 'unit') {
      updatedValue = { [field]: value };
    }
    
    updateOfferItem(id, updatedValue);
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
    addOfferItem(newItem);
  };

  const handleUpload = useCallback(async (filename: string, buffer: ArrayBuffer, folderId: string) => {
    const base64 = Buffer.from(buffer).toString('base64');
    await uploadFileToDriveAction(folderId, filename, base64, 'application/pdf');
  }, []);

  const handleGenerateOrientierungsangebot = async () => {
      if (offerCustomer && offerItems.length > 0 && logoBase64) {
          const modifiedCustomer: Customer = {
              ...offerCustomer,
              name: customerName,
              address: { ...offerCustomer.address, street: customerStreet, city: customerCity.split(' ').slice(1).join(' ') || '', zip: customerCity.split(' ')[0] || '' }
          };

          toast({ title: "PDF wird erstellt...", description: `Das Orientierungsangebot wird heruntergeladen.` });

          await generateOrientierungsangebotPDF(
              modifiedCustomer,
              adjustedItems,
              logoBase64,
              'download',
              `OA-${customerName.replace(/ /g, '_')}`,
              totalM3,
              leistungsdatum ? format(leistungsdatum, 'dd.MM.yyyy') : undefined,
              handleUpload
          );
          
           if (selectedCustomer) {
                setCustomerState(selectedCustomer.id, {
                    highlightedNav: { '/angebot': 'completed', '/lieferschein': 'pending' }
                });
                setSelectedCustomer(selectedCustomer); 
                router.push('/lieferschein');
            }

      } else {
          toast({ variant: "destructive", title: "Fehler", description: "Keine Angebotsdaten oder Logo zum Erstellen eines PDFs vorhanden." });
      }
  }

 const handleGeneratePdf = async (action: 'download' | 'send' = 'download') => {
      if (offerCustomer && offerItems.length > 0 && logoBase64) {
          
          const modifiedCustomer: Customer = {
              ...offerCustomer,
              name: customerName,
              address: {
                ...offerCustomer.address,
                street: customerStreet,
                city: customerCity.split(' ').slice(1).join(' ') || '',
                zip: customerCity.split(' ')[0] || '',
              }
          };
          
          const anzahlungInvoice = addInvoice({
              id: invoiceNumber,
              jobId: '', // No job ID yet
              customerName: modifiedCustomer.name,
              netTotal: finalTotal,
              vatRate: 0.20,
              total: bruttoTotal,
              status: 'draft',
              issuedAt: new Date().toISOString(),
              paidAt: null,
              items: adjustedItems,
              customer: modifiedCustomer,
          });
          
          if(action === 'download' || action === 'send') {
              // Increment number in localStorage via our client-safe hook
              setLastAnzahlungNum(prev => prev + 1);
          }


          const { pdfOutput, filename } = await generateOfferPDF(modifiedCustomer, adjustedItems, logoBase64, action, paymentTermsText, anzahlungInvoice.id, totalM3, leistungsdatum ? format(leistungsdatum, 'dd.MM.yyyy') : undefined, anzahlung, 0, handleUpload);
          
          toast({
              title: "PDF wird erstellt...",
              description: `Das Dokument ${filename} wird heruntergeladen und in Google Drive gespeichert.`,
          });
          
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
          }
          
          if (selectedCustomer) {
                setCustomerState(selectedCustomer.id, {
                    highlightedNav: {
                        '/angebot': 'completed',
                        '/lieferschein': 'pending'
                    }
                });
                // Ensure the same customer is selected for the next step
                setSelectedCustomer(selectedCustomer); 
                router.push('/lieferschein');
            }
          
          return { pdfOutput, filename, invoiceId: anzahlungInvoice.id };

      } else {
          toast({
              variant: "destructive",
              title: "Fehler",
              description: "Keine Angebotsdaten oder Logo zum Erstellen eines PDFs vorhanden."
          });
          return null;
      }
  }


  const handleRequestApproval = () => {
    if (selectedCustomer) {
      setCustomerState(selectedCustomer.id, {
        highlightedNav: { '/angebot': 'approval' },
        pendingApproval: true,
      });
    }
    router.push('/');
  };

  const getBackgroundColor = () => {
    if (priceMultiplier < 1) {
      const greenness = Math.round(200 + 55 * (1 - priceMultiplier) / 0.5);
      const opacity = (1 - priceMultiplier) / 0.5 * 0.4;
      return `rgba(144, ${greenness}, 144, ${opacity})`;
    }
    if (priceMultiplier > 1) {
      const redness = Math.round(200 + 55 * (priceMultiplier - 1) / 0.5);
      const opacity = (priceMultiplier - 1) / 0.5 * 0.4;
      return `rgba(${redness}, 144, 144, ${opacity})`;
    }
    return 'transparent';
  };


  if (!offerCustomer && !selectedCustomer) {
    return (
      <Card>
        <CardHeader>
            <CardTitle>Kein Kunde ausgewählt</CardTitle>
            <CardDescription>Bitte wählen Sie einen Kunden aus, um eine Anzahlungsrechnung zu erstellen oder zu bearbeiten.</CardDescription>
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
                        <CustomersTable />
                    </div>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>
    );
  }
  
  if (!offerCustomer && selectedCustomer) {
     return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Rechnung für {selectedCustomer.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Für diesen Kunden wurde noch keine Berechnung durchgeführt. Bitte gehen Sie zur Berechnungs-Seite, um zu beginnen.
            </p>
             <Button onClick={() => router.push('/berechnung')} className="w-full mt-4">Zur Berechnung</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!offerCustomer) return null; // Should not happen if logic is correct

  return (
    <div className="space-y-6">
      <Card style={{ backgroundColor: getBackgroundColor(), transition: 'background-color 0.3s ease' }}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Anzahlung Rechnung</h1>
              <p className="text-muted-foreground">Kunde: {offerCustomer.name}</p>
            </div>
            <div className="text-right">
                <p className="font-semibold">Umzugs-Hub</p>
                <p className="text-sm text-muted-foreground">Musterstraße 1, 6020 Innsbruck</p>
                <p className="text-sm text-muted-foreground">kontakt@umzugshub.at</p>
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
                  <p className="text-xs text-muted-foreground mt-1">Kundennr: {offerCustomer.id}</p>
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
                {adjustedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input id={`item-desc-${index}`} name={`item-desc-${index}`} value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input id={`item-qty-${index}`} name={`item-qty-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} className="h-8 w-20 text-center" />
                    </TableCell>
                    <TableCell>
                      <Input id={`item-unit-${index}`} name={`item-unit-${index}`} value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="h-8 w-24 text-center" />
                    </TableCell>
                    <TableCell className="text-right">
                       {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeOfferItem(item.id)}>
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
                            <span>{formatCurrency(finalTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>MwSt. (20%)</span>
                            <span>{formatCurrency(finalTotal * 0.2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>Gesamtsumme (Brutto)</span>
                            <span>{formatCurrency(bruttoTotal)}</span>
                        </div>
                         <div className="flex justify-between items-center text-lg pt-2 border-t">
                            <Label htmlFor="anzahlung" className="font-bold">zu zahlender Betrag</Label>
                             <Input 
                                id="anzahlung"
                                name="anzahlung"
                                type="number"
                                value={anzahlung}
                                onChange={(e) => setAnzahlung(parseFloat(e.target.value) || 0)}
                                className="h-8 w-28 text-right font-bold"
                            />
                        </div>
                    </div>
                </div>

                 <div className="mt-6 p-4 border rounded-lg">
                    <Label className="font-semibold">Zahlungsbedingungen</Label>
                    <RadioGroup value={paymentOption} onValueChange={setPaymentOption} className="mt-2 space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="default" id="option-default" />
                            <Label htmlFor="option-default">Wir bitten um eine Anzahlung von 50% innerhalb 14 Tagen.</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="option-custom" />
                            <div className="flex items-center gap-2 text-sm">
                                <Label htmlFor="custom-percentage">Wir bitten um eine Anzahlung von</Label>
                                <Input id="custom-percentage" name="customPercentage" type="number" value={customPercentage} onChange={e => setCustomPercentage(parseInt(e.target.value))} className="h-7 w-16" />
                                <Label htmlFor="custom-days">% innerhalb</Label>
                                <Input id="custom-days" name="customDays" type="number" value={customDays} onChange={e => setCustomDays(parseInt(e.target.value))} className="h-7 w-16" />
                                <Label>Tagen.</Label>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="free" id="option-free" />
                            <Label htmlFor="option-free" className="flex-1">
                                <Textarea id="custom-text" name="customText" value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Eigenen Satz formulieren..." className="mt-1" />
                            </Label>
                        </div>
                    </RadioGroup>
                </div>


                 <div className="mt-6 p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                         <Label htmlFor="price-slider">Preisanpassung</Label>
                         <span className="font-bold text-lg">{Math.round(priceMultiplier * 100)}%</span>
                    </div>
                    <Slider
                        id="price-slider"
                        min={0.5}
                        max={1.5}
                        step={0.01}
                        value={[priceMultiplier]}
                        onValueChange={(value) => setPriceMultiplier(value[0])}
                    />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={handleGenerateOrientierungsangebot} disabled={!logoBase64}><FileDown className="mr-2 h-4 w-4" /> Orientierungsangebot und weiter</Button>
                    <Button variant="outline" onClick={() => handleGeneratePdf('download')} disabled={!logoBase64}><FileDown className="mr-2 h-4 w-4" /> PDF erstellen & weiter zu Lieferschein</Button>
                </div>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    