
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoices } from '@/contexts/invoice-context';
import UnpaidInvoicesTable from '@/components/invoices/unpaid-invoices-table';

export default function UnbezahlteRechnungenPage() {
  const { invoices } = useInvoices();

  const unpaidInvoices = useMemo(() => {
    return invoices.filter(invoice => invoice.status === 'sent');
  }, [invoices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unbezahlte Rechnungen</CardTitle>
        <CardDescription>
          Hier sehen Sie eine Übersicht aller gesendeten, aber noch nicht bezahlten Rechnungen und deren Mahnstatus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UnpaidInvoicesTable invoices={unpaidInvoices} />
      </CardContent>
    </Card>
  );
}
