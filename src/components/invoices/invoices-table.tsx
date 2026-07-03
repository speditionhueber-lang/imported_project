
'use client';
import { useRouter } from 'next/navigation';
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
import { MoreHorizontal, RefreshCw, CheckCircle } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/contexts/role-context';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { useInvoices } from '@/contexts/invoice-context';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { getNextInvoiceNumber } from '@/lib/utils';
import { useClientState } from '@/hooks/use-client-state';

interface InvoicesTableProps {
  invoices: Invoice[];
  logoBase64: string | null;
}

export default function InvoicesTable({ invoices, logoBase64 }: InvoicesTableProps) {
  const { role } = useRole();
  const router = useRouter();
  const { createStornoInvoice, updateInvoiceStatus } = useInvoices();
  
  const [stornoDialogOpen, setStornoDialogOpen] = useState(false);
  const [selectedInvoiceForStorno, setSelectedInvoiceForStorno] = useState<Invoice | null>(null);
  const [lastStornoNum, setLastStornoNum] = useClientState<number>('lastStornoInvoiceNumber', 1, (val) => parseInt(val, 10));
  const [stornoInvoiceNumber, setStornoInvoiceNumber] = useState('');


  const openStornoDialog = (invoice: Invoice) => {
    setSelectedInvoiceForStorno(invoice);
    const nextNum = getNextInvoiceNumber('STORNO', '-', lastStornoNum + 1);
    setStornoInvoiceNumber(nextNum);
    setStornoDialogOpen(true);
  };
  
  const handleCreateStorno = () => {
    if (selectedInvoiceForStorno && stornoInvoiceNumber) {
      createStornoInvoice(selectedInvoiceForStorno.id, stornoInvoiceNumber, logoBase64);
      setLastStornoNum(prev => prev + 1);
      setStornoDialogOpen(false);
      setSelectedInvoiceForStorno(null);
    }
  };

  const getStatusVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'storno':
        return 'destructive';
    }
  };

  const translateStatus = (status: Invoice['status']) => {
    switch (status) {
        case 'paid':
            return 'bezahlt';
        case 'sent':
            return 'gesendet';
        case 'draft':
            return 'Entwurf';
        case 'storno':
            return 'Storniert';
    }
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
              <TableHead>Rechnungs-ID</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Ausgestellt</TableHead>
              <TableHead className="hidden md:table-cell">Bezahlt</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead>
                <span className="sr-only">Aktionen</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                  <TableCell className="font-medium">{invoice.customerName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(invoice.status)} className="capitalize">
                      {translateStatus(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(invoice.issuedAt)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(invoice.paidAt)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menü umschalten</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Details anzeigen</DropdownMenuItem>
                        {invoice.status === 'sent' && (
                           <DropdownMenuItem onClick={() => updateInvoiceStatus(invoice.id, 'paid')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Als bezahlt markieren
                          </DropdownMenuItem>
                        )}
                        {invoice.status !== 'storno' && (
                             <DropdownMenuItem onClick={() => openStornoDialog(invoice)}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Storno-Rechnung erzeugen
                            </DropdownMenuItem>
                        )}
                        {role === 'admin' && (
                          <DropdownMenuItem className="text-destructive">
                            Rechnung löschen
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Keine Rechnungen gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={stornoDialogOpen} onOpenChange={setStornoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Storno-Rechnung erstellen</AlertDialogTitle>
            <AlertDialogDescription>
              Geben Sie die neue Rechnungsnummer für die Stornierung der Rechnung "{selectedInvoiceForStorno?.id}" ein.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="storno-number" className="text-right">
                Storno-Nr.
              </Label>
              <Input
                id="storno-number"
                value={stornoInvoiceNumber}
                onChange={(e) => setStornoInvoiceNumber(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateStorno} disabled={!stornoInvoiceNumber}>Erstellen & Herunterladen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
