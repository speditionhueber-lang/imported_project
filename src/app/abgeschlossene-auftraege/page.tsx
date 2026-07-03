'use client';
import { useCustomer } from '@/contexts/customer-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { importedCustomers } from '@/lib/imported-data';
import { customers as staticCustomers } from '@/lib/data';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileDown } from 'lucide-react';

const allCustomers = [...staticCustomers, ...importedCustomers];

export default function AbgeschlosseneAuftraegePage() {
  const { customerStates, setCustomerState } = useCustomer();

  const processedCustomers = useMemo(() => {
    return allCustomers
      .filter(customer => customerStates[customer.id])
      .map(customer => ({
        ...customer,
        state: customerStates[customer.id]
      }));
  }, [customerStates]);

  const handleMarkAsPaid = (customerId: string) => {
    setCustomerState(customerId, { areInvoicesPaid: true });
  };
  
  const formatDate = (dateString: string | number | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return 'Ungültiges Datum';
    }
  };

  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,Kunde,Letzte Aktivität,Status\n";
    
    processedCustomers.forEach(customer => {
      const status = customer.state.areInvoicesPaid ? 'Bezahlt' : 'Offen';
      const row = [customer.name, formatDate(customer.state.lastUpdated), status].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "abgeschlossene_auftraege.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Abgeschlossene Aufträge</CardTitle>
                <CardDescription>
                Hier sehen Sie eine Übersicht aller Kunden mit laufenden oder abgeschlossenen Prozessen.
                </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExport}><FileDown className="mr-2 h-4 w-4" /> Exportieren</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Letzte Aktivität</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedCustomers.length > 0 ? (
                processedCustomers.map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{formatDate(customer.state.lastUpdated)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleMarkAsPaid(customer.id)}
                        disabled={customer.state.areInvoicesPaid}
                        size="sm"
                        variant={customer.state.areInvoicesPaid ? 'default' : 'secondary'}
                      >
                        {customer.state.areInvoicesPaid ? 'Bezahlt' : 'Alle Rechnungen bezahlt'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Noch keine Kundenprozesse gestartet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
