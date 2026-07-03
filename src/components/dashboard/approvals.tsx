// src/components/dashboard/approvals.tsx
'use client';
import { useCustomer } from '@/contexts/customer-context';
import type { Customer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CustomerDetails from '../customers/customer-details';
import { customers as staticCustomers } from '@/lib/data';
import { importedCustomers } from '@/lib/imported-data';
import { normalizeCustomerData } from '@/lib/customer-adapter';
import { useToast } from '@/hooks/use-toast';

const customerNormalizer = (doc: any): Customer => normalizeCustomerData(doc);
const allCustomers: Customer[] = [...staticCustomers, ...importedCustomers].map(customerNormalizer);

type ApprovalType = 'Angebot' | 'Rechnung' | 'Änderung' | 'Personalmangel' | 'Falsche Angaben' | 'Nachricht';

interface Approval {
  customerId: string;
  type: ApprovalType;
  details?: string;
}

export default function Approvals() {
  const { customerStates, setCustomerState } = useCustomer();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const approvals: Approval[] = Object.entries(customerStates)
    .flatMap(([customerId, state]) => {
      const customerApprovals: Approval[] = [];
      if (state.pendingApproval) customerApprovals.push({ customerId, type: 'Angebot' });
      if (state.pendingInvoiceApproval) customerApprovals.push({ customerId, type: 'Rechnung' });
      if (state.pendingChangeSuggestion) customerApprovals.push({ customerId, type: 'Änderung', details: state.changeSuggestionData?.problem });
      if (state.needsMorePersonnel) customerApprovals.push({ customerId, type: 'Personalmangel' });
      if (state.incorrectJobDetails) customerApprovals.push({ customerId, type: 'Falsche Angaben' });
      if (state.messageToOffice) customerApprovals.push({ customerId, type: 'Nachricht', details: state.messageToOffice });
      return customerApprovals;
    })
    .filter(Boolean);
    
  const getCustomerById = (id: string) => allCustomers.find(c => c.id === id);

  const handleApproval = (customerId: string, type: ApprovalType) => {
    let newState: Partial<(typeof customerStates)[string]> = {};
    switch (type) {
        case 'Angebot': newState = { pendingApproval: false, highlightedNav: { '/angebot': 'completed', '/jobs': 'pending' } }; break;
        case 'Rechnung': newState = { pendingInvoiceApproval: false, areInvoicesPaid: false, highlightedNav: { '/rechnung-erstellen': 'completed' } }; break;
        case 'Änderung': newState = { pendingChangeSuggestion: false, changeSuggestionData: null }; break;
        case 'Personalmangel': newState = { needsMorePersonnel: false }; break;
        case 'Falsche Angaben': newState = { incorrectJobDetails: false }; break;
        case 'Nachricht': newState = { messageToOffice: null }; break;
    }
    setCustomerState(customerId, newState);
    toast({ title: 'Aktion bestätigt', description: `${type} für Kunde wurde bearbeitet.` });
  };

  const handleDecline = (customerId: string, type: ApprovalType) => {
    let newState: Partial<(typeof customerStates)[string]> = {};
    switch (type) {
        case 'Angebot': newState = { pendingApproval: false, highlightedNav: { '/angebot': 'approval' } }; break;
        case 'Rechnung': newState = { pendingInvoiceApproval: false, highlightedNav: { '/rechnung-erstellen': 'approval' } }; break;
        case 'Änderung': newState = { pendingChangeSuggestion: false }; break;
        case 'Personalmangel': newState = { needsMorePersonnel: false }; break;
        case 'Falsche Angaben': newState = { incorrectJobDetails: false }; break;
        case 'Nachricht': newState = { messageToOffice: null }; break;
    }
    setCustomerState(customerId, newState);
    toast({ variant: 'destructive', title: 'Aktion abgelehnt', description: `${type} für Kunde wurde zurückgewiesen.` });
  };


  const openCustomerModal = (customerId: string) => {
    const customer = getCustomerById(customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setIsModalOpen(true);
    }
  };

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Freigaben</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Keine ausstehenden Freigaben.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Freigaben ({approvals.length})</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {approvals.map(({ customerId, type, details }, index) => {
          const customer = getCustomerById(customerId);
          if (!customer) return null;
          return (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted rounded-lg">
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{type}</Badge>
                    <button onClick={() => openCustomerModal(customerId)} className="font-semibold hover:underline">
                        {customer.name}
                    </button>
                </div>
                {details && <p className="text-sm text-muted-foreground mt-1">{details}</p>}
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Button size="sm" onClick={() => handleApproval(customerId, type)}>Bestätigen</Button>
                <Button size="sm" variant="outline" onClick={() => handleDecline(customerId, type)}>Ablehnen</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl h-4/5 flex flex-col">
          <DialogHeader><DialogTitle>{selectedCustomer?.name}</DialogTitle></DialogHeader>
          <div className="flex-grow min-h-0 overflow-y-auto">
            {selectedCustomer && <CustomerDetails customer={selectedCustomer} />}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
