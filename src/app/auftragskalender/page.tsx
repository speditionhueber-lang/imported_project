
'use client';

import { useState, useMemo } from 'react';
import { useCustomer } from '@/contexts/customer-context';
import type { Job } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, Phone, Mail, Box, Users, Clock, StickyNote, AlertCircle, Camera, MessageSquare, FileText, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const JobCard = ({ job, onAccept, onDecline, isAccepted }: { job: Job; onAccept: (jobId: string) => void; onDecline: (jobId: string) => void; isAccepted: boolean }) => {
    const { toast } = useToast();
    const router = useRouter();
    const { setCustomerState, setSelectedCustomer, customerStates } = useCustomer();
    
    const openGoogleMaps = (address: string) => {
        if (!address) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    };
    
    const startCall = (phoneNumber: string) => {
        if (!phoneNumber) return;
        window.location.href = `tel:${phoneNumber}`;
    }

    const handleReportIssue = (type: 'needsMorePersonnel' | 'incorrectJobDetails' | 'messageToOffice', message?: string) => {
        
        if (type === 'incorrectJobDetails') {
            const customer = Object.values(customerStates).find(state => state.jobs?.some(j => j.id === job.id));
            if(customer) {
                // This logic is simplified. In a real app, we might need a more robust way to find the customer.
                const customerData = (customer as any).jobCreationData?.customer;
                if(customerData) {
                    setSelectedCustomer(customerData);
                }
            }
             router.push('/rechnung-erstellen');
             return;
        }

        const updateState: any = { [type]: message || true };
        setCustomerState(job.customerId, updateState);

        toast({
            title: "Meldung an Büro gesendet",
            description: "Ihre Meldung wurde an das Büroteam zur Überprüfung weitergeleitet."
        });
    }

    const handleMessageToOffice = () => {
        const message = prompt("Ihre Nachricht an das Büro:");
        if (message) {
            handleReportIssue('messageToOffice', message);
        }
    }


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{job.customerName}</CardTitle>
                        <CardDescription>Geplant für: {job.scheduledAt ? format(new Date(job.scheduledAt), 'eeee, dd.MM.yyyy', { locale: de }) : 'Datum nicht gesetzt'}</CardDescription>
                    </div>
                    {!isAccepted && (
                         <div className="flex items-center gap-2">
                            <Button size="icon" variant="destructive" onClick={() => onDecline(job.id)}><X className="h-6 w-6"/></Button>
                            <Button size="lg" className="h-10 w-24" onClick={() => onAccept(job.id)}><Check className="h-6 w-6"/></Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible>
                    <AccordionItem value="details">
                        <AccordionTrigger>Details anzeigen</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p><span className="font-semibold">Abholung:</span> {job.abholadresse?.strasse}</p>
                                    <Button size="sm" variant="outline" onClick={() => openGoogleMaps(job.abholadresse?.strasse || '')}><MapPin className="mr-2 h-4 w-4"/> Maps</Button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p><span className="font-semibold">Ziel:</span> {job.zieladresse?.strasse}</p>
                                    <Button size="sm" variant="outline" onClick={() => openGoogleMaps(job.zieladresse?.strasse || '')}><MapPin className="mr-2 h-4 w-4"/> Maps</Button>
                                </div>
                             </div>
                             <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <a href={`tel:${job.phone}`} onClick={(e) => { e.preventDefault(); startCall(job.phone || ''); }} className="hover:underline cursor-pointer">{job.phone || '-'}</a>
                                </div>
                                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href={`mailto:${job.email}`} className="hover:underline">{job.email || '-'}</a></div>
                                <div className="flex items-center gap-2"><Box className="h-4 w-4" />{job.totalM3} m³</div>
                                <div className="flex items-center gap-2"><Users className="h-4 w-4" />{job.allocations?.[0]?.workers?.join(', ') || 'Keine Mitarbeiter'}</div>
                                <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{job.calculatedHours.toFixed(1)}h</div>
                                <div className="flex items-center gap-2"><StickyNote className="h-4 w-4" />{job.notes || 'Keine Notizen'}</div>
                             </div>
                              <div>
                                <h4 className="font-semibold mb-2">Gegenstände</h4>
                                <p className="text-sm text-muted-foreground">Liste der Gegenstände hier...</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
                <Link href="/rechnungen-hochladen"><Button variant="outline"><Camera className="mr-2 h-4 w-4"/> Bestehende Schäden</Button></Link>
                <Link href="/rechnungen-hochladen"><Button variant="outline"><Camera className="mr-2 h-4 w-4"/> Verursachte Schäden</Button></Link>
                <Link href="/rechnungen-hochladen"><Button variant="outline"><Camera className="mr-2 h-4 w-4"/> Sonstige Fotos</Button></Link>
                <Button variant="secondary" onClick={() => handleReportIssue('needsMorePersonnel')}><AlertCircle className="mr-2 h-4 w-4"/> Meldung: Mehr Personal</Button>
                <Button variant="secondary" onClick={handleMessageToOffice}><MessageSquare className="mr-2 h-4 w-4"/> Meldung an Büro</Button>
                <Button variant="destructive" onClick={() => handleReportIssue('incorrectJobDetails')}><FileText className="mr-2 h-4 w-4"/> Leistung nicht wie angegeben</Button>
            </CardFooter>
        </Card>
    )
}


export default function AuftragskalenderPage() {
    const { jobs, setCustomerState, customerStates } = useCustomer();
    const { toast } = useToast();
    
    // In a real app, these would come from the current user's assignments.
    // For now, we simulate this by taking the first few jobs from the global list.
    const assignedJobs = useMemo(() => jobs.slice(0, 3), [jobs]);

    // Combine all accepted jobs from all customer states to correctly filter pending jobs
    const allAcceptedJobs = useMemo(() => {
        return Object.values(customerStates).flatMap(state => state.acceptedJobs || []);
    }, [customerStates]);

    const pendingJobs = useMemo(() => {
        return assignedJobs.filter(job => !allAcceptedJobs.includes(job.id));
    }, [assignedJobs, allAcceptedJobs]);

    const confirmedJobs = useMemo(() => {
        return assignedJobs.filter(job => allAcceptedJobs.includes(job.id));
    }, [assignedJobs, allAcceptedJobs]);
    
    const handleAcceptJob = (jobId: string) => {
        const job = assignedJobs.find(j => j.id === jobId);
        if (!job) return;

        setCustomerState(job.customerId, { 
            acceptedJobs: [...(customerStates[job.customerId]?.acceptedJobs || []), jobId] 
        });

        toast({
            title: "Auftrag angenommen",
            description: "Der Auftrag wurde in Ihre Liste verschoben."
        });
    };
    
    const handleDeclineJob = (jobId: string) => {
        const job = assignedJobs.find(j => j.id === jobId);
        if (job) {
            setCustomerState(job.customerId, { 
                messageToOffice: `Auftrag ${job.id} (${job.customerName}) wurde abgelehnt.`,
                acceptedJobs: [...(customerStates[job.customerId]?.acceptedJobs || []), jobId]
            });
        }
        toast({
            variant: "destructive",
            title: "Auftrag abgelehnt",
            description: "Der Auftrag wurde abgelehnt und das Büro informiert."
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-2">Zu bestätigende Aufträge</h2>
                <div className="space-y-4">
                {pendingJobs.length > 0 ? (
                    pendingJobs.map(job => <JobCard key={job.id} job={job} onAccept={handleAcceptJob} onDecline={handleDeclineJob} isAccepted={false} />)
                ) : <Card><CardContent className="pt-6 text-center text-muted-foreground">Keine Aufträge zur Bestätigung.</CardContent></Card>}
                </div>
            </div>

             <div>
                <h2 className="text-xl font-bold mb-2">Angenommene Aufträge</h2>
                 <div className="space-y-4">
                {confirmedJobs.length > 0 ? (
                    confirmedJobs.map(job => <JobCard key={job.id} job={job} onAccept={handleAcceptJob} onDecline={handleDeclineJob} isAccepted={true} />)
                ) : <Card><CardContent className="pt-6 text-center text-muted-foreground">Noch keine Aufträge angenommen.</CardContent></Card>}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-2">Wochenkalender</h2>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">Kalenderansicht wird hier implementiert.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
