
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Invoice } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { useInvoices } from '@/contexts/invoice-context';
import { CheckCircle, Trash2 } from 'lucide-react';
import { useCustomer } from '@/contexts/customer-context';
import { useToast } from '@/hooks/use-toast';


interface UnpaidInvoicesTableProps {
  invoices: Invoice[];
}

const getDunningInfo = (issuedAt: string): { level: number; text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    const daysOverdue = differenceInDays(new Date(), new Date(issuedAt));

    if (daysOverdue >= 35) return { level: 4, text: 'Anwalt', variant: 'destructive' };
    if (daysOverdue >= 21) return { level: 3, text: '3. Mahnung', variant: 'destructive' };
    if (daysOverdue >= 14) return { level: 2, text: '2. Mahnung', variant: 'destructive' };
    if (daysOverdue >= 7) return { level: 1, text: '1. Mahnung', variant: 'secondary' };
    return { level: 0, text: 'Zahlungserinnerung', variant: 'outline' };
};

export default function UnpaidInvoicesTable({ invoices }: UnpaidInvoicesTableProps) {
  const { updateInvoiceStatus, deleteInvoice } = useInvoices();
  const { setCustomerState } = useCustomer();
  const { toast } = useToast();

  const handleMarkAsPaid = (invoice: Invoice) => {
    updateInvoiceStatus(invoice.id, 'paid');
    if (invoice.customer) {
        setCustomerState(invoice.customer.id, { areInvoicesPaid: true });
    }
    toast({
        title: 'Rechnung bezahlt',
        description: `Rechnung ${invoice.id} wurde als bezahlt markiert.`
    })
  }

  const handleDelete = (invoiceId: string) => {
      deleteInvoice(invoiceId);
      toast({
          variant: "destructive",
          title: "Rechnung gelöscht",
          description: `Rechnung ${invoiceId} wurde entfernt.`
      });
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const zonedDate = toZonedTime(date, 'UTC');
    return format(zonedDate, 'PP', { locale: de });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead>Rechnungs-ID</TableHead>
              <TableHead>Ausgestellt am</TableHead>
              <TableHead>Mahnstatus</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead className="text-center">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length > 0 ? (
              invoices.map((invoice) => {
                const dunningInfo = getDunningInfo(invoice.issuedAt);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.customerName}</TableCell>
                    <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                    <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                    <TableCell>
                        <Badge variant={dunningInfo.variant}>{dunningInfo.text}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" onClick={() => handleMarkAsPaid(invoice)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Bezahlt
                        </Button>
                         <Button size="sm" variant="destructive" onClick={() => handleDelete(invoice.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Keine unbezahlten Rechnungen.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
