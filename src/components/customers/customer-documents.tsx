
// src/components/customers/customer-documents.tsx
'use client';
import { useState, useEffect } from 'react';
import type { Customer, Job } from '@/lib/types';
import { useCustomer } from '@/contexts/customer-context';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calculator,
  PenSquare,
  Briefcase,
  CalendarCheck,
  Truck,
  FileText,
  Download,
  Package,
} from 'lucide-react';
import { generateOfferPDF, generateLieferscheinPDF, generateInvoicePDF } from '@/lib/pdf-generator';
import { useInvoices } from '@/contexts/invoice-context';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { format, addHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import * as berechnungsParameter from '@/lib/berechnungs-parameter';

const processIcons = {
  '/customers': Users,
  '/gegenstaende': Package,
  '/berechnung': Calculator,
  '/angebot': PenSquare,
  '/jobs': Briefcase,
  '/einteilung': CalendarCheck,
  '/lieferschein': Truck,
  '/rechnung-erstellen': FileText,
};

const processLabels: Record<string, string> = {
  '/customers': 'Kunde',
  '/gegenstaende': 'Gegenstände',
  '/berechnung': 'Berechnung',
  '/angebot': 'Angebot',
  '/jobs': 'Auftrag',
  '/einteilung': 'Einteilung',
  '/lieferschein': 'Lieferschein',
  '/rechnung-erstellen': 'Rechnung',
};

const allProcessSteps = [
    '/customers',
    '/gegenstaende',
    '/berechnung',
    '/angebot',
    '/jobs',
    '/einteilung',
    '/lieferschein',
    '/rechnung-erstellen',
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const camelToTitle = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

const DetailItem = ({ label, value }: { label: string; value?: any }) => {
    if (value === null || value === undefined || value === '' || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) return null;
    
    let displayValue: React.ReactNode;
    if (typeof value === 'boolean') {
        displayValue = value ? 'Ja' : 'Nein';
    } else if (Array.isArray(value)) {
        displayValue = value.join(', ');
    }
    else if (typeof value === 'object') {
        displayValue = (
            <div className="pl-4 mt-1 border-l-2">
                {Object.entries(value).map(([k, v]) => <DetailItem key={k} label={camelToTitle(k)} value={v} />)}
            </div>
        );
    } else {
        displayValue = String(value);
    }
    
    return (
        <div className="flex flex-col sm:flex-row justify-between text-sm py-1">
            <p className="font-medium text-muted-foreground">{label}</p>
            {typeof value !== 'object' && <p className="text-right max-w-[60%] break-words">{displayValue}</p>}
            {typeof value === 'object' && !Array.isArray(value) && <div className="w-full">{displayValue}</div>}
            {typeof value === 'object' && Array.isArray(value) && <div className="text-right max-w-[60%] break-words">{displayValue}</div>}
        </div>
    );
};

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="py-2">
        <h4 className="font-semibold text-base mb-1">{title}</h4>
        <div className="space-y-1">{children}</div>
        <Separator className="mt-3"/>
    </div>
);


export default function CustomerDocuments({ customer }: { customer: Customer }) {
  const { customerStates } = useCustomer();
  const { invoices } = useInvoices();
  const { toast } = useToast();
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const customerState = customerStates[customer.id];
  const customerJobs = customerState?.jobs || [];
  const customerInvoices = invoices.filter(inv => inv.customer?.id === customer.id);

  useEffect(() => {
    fetch('/logo-color.png')
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      });
  }, []);
  
  useEffect(() => {
    if (customerJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(customerJobs[0].id);
    }
     if (customerInvoices.length > 0 && !selectedInvoiceId) {
        setSelectedInvoiceId(customerInvoices[0].id);
    }
  }, [customer.id, customerJobs, customerInvoices, selectedJobId, selectedInvoiceId]);


  if (!customerState) return null;

  const getJobForPath = (path: string): Job | undefined => {
    if (!selectedJobId) return undefined;
    const job = customerJobs.find(j => j.id === selectedJobId);
    if (!job) return undefined;
    
    switch(path) {
        case '/jobs': return job;
        case '/einteilung': return job.isFinalized ? job : undefined;
        case '/lieferschein': return job.isFinalized ? job : undefined;
        default: return undefined;
    }
  }

  const availableSteps = allProcessSteps.filter(path => {
    if (path === '/customers' || path === '/gegenstaende') return true;
    if (path === '/berechnung') return customerState.offerData;
    if (path === '/angebot') return customerState.offerData;
    if (path === '/jobs') return customerJobs.length > 0;
    if (path === '/einteilung') return customerJobs.some(j => j.isFinalized);
    if (path === '/lieferschein') return customerJobs.some(j => j.isFinalized);
    if (path === '/rechnung-erstellen') return customerInvoices.length > 0;
    return false;
  });

  const handleDownload = async (processPath: string) => {
    if (!logoBase64) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Logo für PDF-Erstellung nicht geladen.' });
      return;
    }

    try {
      if (processPath === '/angebot' && customerState.offerData) {
        const docId = `ANGEBOT-${Date.now()}`;
        const leistungsdatum = format(new Date(), 'dd.MM.yyyy', { locale: de });
        await generateOfferPDF(
            customer, 
            customerState.offerData.items, 
            logoBase64, 
            'download',
            null,
            docId,
            customerState.offerData.totalM3,
            leistungsdatum
            );
      } else if (processPath === '/lieferschein') {
         const job = getJobForPath(processPath);
         if (job) {
            const gegenstaende = customer.gegenstaende ? Object.entries(customer.gegenstaende).map(([key, value]) => ({ name: key, count: String(value) })) : [];
            const docNumber = `LIEF-${job.id}`;
            const jobStart = new Date(job.scheduledAt);
            const startTime = format(jobStart, 'HH:mm');
            const endTime = format(addHours(jobStart, job.calculatedHours || 8), 'HH:mm');
            await generateLieferscheinPDF(customer, job, gegenstaende, job.allocations?.[0]?.workers || [], job.notes || '', logoBase64, 'save', docNumber, job.totalM3, startTime, endTime);
         } else {
             toast({ variant: 'destructive', title: 'Lieferschein nicht gefunden' });
         }
      } else if (processPath === '/rechnung-erstellen') {
        const relevantInvoice = customerInvoices.find(inv => inv.id === selectedInvoiceId);
        if (relevantInvoice) {
            const relatedJob = customerJobs.find(job => job.id === relevantInvoice.jobId);
            const totalM3 = relatedJob ? relatedJob.totalM3 : 0;
          await generateInvoicePDF(
              customer, 
              relevantInvoice.items, 
              logoBase64, 
              'download',
              relevantInvoice.id,
              totalM3,
              relevantInvoice.issuedAt
              );
        } else {
            toast({ variant: 'destructive', title: 'Rechnung nicht gefunden' });
        }
      }
    } catch (error) {
        console.error("PDF generation failed:", error);
        toast({ variant: 'destructive', title: 'PDF-Fehler', description: 'Das Dokument konnte nicht erstellt werden.' });
    }
  };

  const renderContent = (path: string) => {
    switch (path) {
        case '/customers':
             return (
                 <div className="text-sm space-y-2">
                    <Section title="Stammdaten">
                        <DetailItem label="Name" value={customer.name} />
                        <DetailItem label="Email" value={customer.email} />
                        <DetailItem label="Telefon" value={customer.phone} />
                    </Section>
                    <DetailItem label="Rechnungsadresse" value={customer.address} />
                    <DetailItem label="Umzugsdetails" value={customer.umzugsdetails} />
                    <DetailItem label="Abholadresse" value={customer.abholadresse} />
                    <DetailItem label="Zieladresse" value={customer.zieladresse} />
                    <DetailItem label="Anmerkungen" value={customer.anmerkungen} />
                 </div>
             );
        case '/gegenstaende':
            const items = customer.gegenstaende ? Object.entries(customer.gegenstaende).filter(([, value]) => value && value !== '0' && value !== 'Nein') : [];
            if(items.length === 0) return <p>Keine Gegenstände erfasst.</p>;
            return (
                <div className="text-sm space-y-2">
                    <Section title="Umzugsgut">
                         {items.map(([key, value]) => (
                            <DetailItem key={key} label={camelToTitle(key)} value={value} />
                         ))}
                    </Section>
                </div>
            );
        case '/berechnung':
             if (!customerState.offerData) return null;
             const { totalM3, calculatedHours, items: offerItems } = customerState.offerData;
             return (
                <div className="text-sm space-y-2">
                    <Section title="Übersicht">
                        <DetailItem label="Gesamtvolumen" value={`${totalM3.toFixed(2)} m³`} />
                        <DetailItem label="Geschätzte Personalstunden" value={`${calculatedHours.toFixed(2)} h`} />
                    </Section>
                    <Section title="Kostenaufstellung">
                        {offerItems.map(item => (
                            <DetailItem key={item.id} label={item.description} value={`${formatCurrency(item.total)} (${item.quantity} ${item.unit})`} />
                        ))}
                    </Section>
                </div>
            );
        case '/angebot':
            if (!customerState.offerData) return null;
            const totalAngebot = customerState.offerData.items.reduce((sum, item) => sum + item.total, 0) || 0;
            return (
                <div className="text-sm space-y-2">
                    <Section title="Zusammenfassung">
                        <DetailItem label="Angebotssumme (Netto)" value={formatCurrency(totalAngebot)} />
                        <DetailItem label="Anzahl Positionen" value={customerState.offerData.items.length} />
                    </Section>
                     <Section title="Positionen">
                        {customerState.offerData.items.map(item => (
                            <DetailItem key={item.id} label={item.description} value={`${formatCurrency(item.total)} (${item.quantity} ${item.unit})`} />
                        ))}
                    </Section>
                </div>
            );
        case '/jobs':
        case '/einteilung':
        case '/lieferschein':
            const job = getJobForPath(path);
            if (!job) return <p className="text-sm text-muted-foreground">Bitte einen finalisierten Auftrag auswählen.</p>;
            return (
                <div className="text-sm space-y-2">
                    <Section title="Auftragsdetails">
                        <DetailItem label="Status" value={job.status} />
                        <DetailItem label="Datum" value={format(new Date(job.scheduledAt), 'PPP', { locale: de })} />
                        <DetailItem label="Fahrzeuge" value={job.vehicles || []} />
                        <DetailItem label="Notizen" value={job.notes} />
                    </Section>
                    {path === '/einteilung' && (
                        <Section title="Eingeteilte Tage">
                            {job.allocations?.map((alloc, i) => (
                                <DetailItem key={alloc.id} label={`Tag ${i + 1} (${format(new Date(alloc.date), 'dd.MM.yyyy')})`} value={alloc.workers.join(', ') || 'Keine Mitarbeiter'} />
                            ))}
                            {(!job.allocations || job.allocations.length === 0) && <p>Noch keine Tage eingeteilt.</p>}
                        </Section>
                    )}
                </div>
            );
        case '/rechnung-erstellen':
            const invoice = customerInvoices.find(inv => inv.id === selectedInvoiceId);
            if (!invoice) return null;
             return (
                 <div className="text-sm space-y-2">
                     <Section title="Rechnungsdetails">
                         <DetailItem label="Rechnungsnummer" value={invoice.id} />
                         <DetailItem label="Status" value={invoice.status} />
                         <DetailItem label="Ausgestellt am" value={format(new Date(invoice.issuedAt), 'PPP', { locale: de })} />
                         <DetailItem label="Gesamtsumme (Brutto)" value={formatCurrency(invoice.total)} />
                     </Section>
                     <Section title="Positionen">
                        {invoice.items.map(item => (
                            <DetailItem key={item.id} label={item.description} value={`${formatCurrency(item.total)}`} />
                        ))}
                    </Section>
                 </div>
             );
        default:
            return <p className="text-sm text-muted-foreground">Keine Detailansicht verfügbar.</p>;
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-base">Dokumente & Prozess</h3>
      {availableSteps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Schritte für diesen Kunden abgeschlossen.</p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
            {availableSteps.map((path) => {
                const Icon = processIcons[path as keyof typeof processIcons];
                const label = processLabels[path];
                const isDownloadable = ['/angebot', '/lieferschein', '/rechnung-erstellen'].includes(path);
                
                const showJobDropdown = path === '/jobs' || path === '/einteilung' || path === '/lieferschein';
                const showInvoiceDropdown = path === '/rechnung-erstellen';

                return (
                    <AccordionItem value={path} key={path}>
                         <div className="flex items-center w-full">
                            <AccordionTrigger className="flex-grow">
                                <div className="flex items-center gap-3">
                                    {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                                    <span className="font-medium">{label}</span>
                                </div>
                            </AccordionTrigger>

                            {showJobDropdown && customerJobs.length > 1 && (
                                <div className="pr-2">
                                <Select onValueChange={setSelectedJobId} value={selectedJobId || ''}>
                                    <SelectTrigger className="w-[180px] h-8">
                                        <SelectValue placeholder="Auftrag wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customerJobs.map(j => (
                                            <SelectItem key={j.id} value={j.id}>{format(new Date(j.createdAt), 'dd.MM.yy HH:mm')}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                </div>
                            )}
                            {showInvoiceDropdown && customerInvoices.length > 1 && (
                                <div className="pr-2">
                                <Select onValueChange={setSelectedInvoiceId} value={selectedInvoiceId || ''}>
                                    <SelectTrigger className="w-[180px] h-8">
                                        <SelectValue placeholder="Rechnung wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customerInvoices.map(i => (
                                            <SelectItem key={i.id} value={i.id}>{i.id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                </div>
                            )}
                        </div>
                        <AccordionContent>
                            <div className="pl-10 pr-4 pb-2 space-y-3">
                                {renderContent(path)}
                                {isDownloadable && (
                                    <Button variant="outline" size="sm" onClick={() => handleDownload(path)}>
                                        <Download className="mr-2 h-4 w-4" />
                                        PDF herunterladen
                                    </Button>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
      )}
    </div>
  );
}
