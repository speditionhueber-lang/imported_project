
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { Invoice } from '@/lib/types';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { incrementInvoiceNumber, getNextInvoiceNumber } from '@/lib/utils';
import { useClientState } from '@/hooks/use-client-state';
import { uploadFileToDriveAction } from '@/app/actions';

interface InvoiceContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id'> & { id?: string }) => Invoice;
  deleteInvoice: (invoiceId: string) => void;
  createStornoInvoice: (invoiceId: string, newInvoiceId: string, logoBase64: string | null) => void;
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status']) => void;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useClientState<Invoice[]>('invoices_v2', []);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastAnzahlungNum, setLastAnzahlungNum] = useClientState<number>('lastAnzahlungInvoiceNumber', 21, (val) => parseInt(val, 10));
  const [lastInvoiceNum, setLastInvoiceNum] = useClientState<number>('lastInvoiceNumber', 2524721, (val) => parseInt(val, 10));


  useEffect(() => {
    // This hook is now just for signaling client-side readiness
    setIsLoaded(true);
  }, []);

  const handleUpload = useCallback(async (filename: string, buffer: ArrayBuffer, folderId: string) => {
    const base64 = Buffer.from(buffer).toString('base64');
    await uploadFileToDriveAction(folderId, filename, base64, 'application/pdf');
  }, []);

  const addInvoice = useCallback((invoiceData: Omit<Invoice, 'id'> & { id?: string }): Invoice => {
    const isAnzahlung = invoiceData.id?.startsWith('AR');
    let newId = invoiceData.id || '';

    if (!invoiceData.id) {
       if (isAnzahlung) {
            newId = getNextInvoiceNumber('AR-25', '/', lastAnzahlungNum + 1);
            setLastAnzahlungNum(prev => prev + 1);
        } else {
            newId = getNextInvoiceNumber('RE', '-', lastInvoiceNum + 1);
            setLastInvoiceNum(prev => prev + 1);
        }
    }

    const newInvoice: Invoice = {
        ...invoiceData,
        id: newId,
    };

    setInvoices(prev => {
        // Prevent duplicates
        if (prev.some(inv => inv.id === newId)) {
            return prev.map(inv => inv.id === newId ? newInvoice : inv);
        }
        return [newInvoice, ...prev]
    });
    return newInvoice;
  }, [lastAnzahlungNum, lastInvoiceNum, setLastAnzahlungNum, setLastInvoiceNum, setInvoices]);
  
  const deleteInvoice = useCallback((invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  }, [setInvoices]);

  const updateInvoiceStatus = useCallback((invoiceId: string, status: Invoice['status']) => {
    setInvoices(prev => 
      prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status, paidAt: status === 'paid' ? new Date().toISOString() : inv.paidAt } : inv
      )
    );
  }, [setInvoices]);

 const createStornoInvoice = useCallback((invoiceId: string, newInvoiceId: string, logoBase64: string | null) => {
    const originalInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!originalInvoice) {
      console.error("Original invoice not found");
      return;
    }

    const stornoInvoice: Invoice = {
      ...originalInvoice,
      id: newInvoiceId,
      status: 'draft',
      netTotal: -originalInvoice.netTotal,
      total: -originalInvoice.total,
      stornoFor: originalInvoice.id, // Link to the original invoice
    };
    
    const stornoItems = originalInvoice.items?.map(item => ({...item, unitPrice: -item.unitPrice, total: -item.total})) || [];
    
    if (originalInvoice.customer) {
        generateInvoicePDF(originalInvoice.customer, stornoItems, logoBase64, 'download', newInvoiceId, 0, new Date().toISOString(), undefined, undefined, handleUpload);
    } else {
        console.error("Customer data missing from original invoice.");
    }
    
    addInvoice(stornoInvoice);

  }, [invoices, addInvoice, handleUpload]);


  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <InvoiceContext.Provider value={{ invoices, addInvoice, deleteInvoice, createStornoInvoice, updateInvoiceStatus }}>
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoices must be used within an InvoiceProvider');
  }
  return context;
}
