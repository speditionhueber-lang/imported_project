
'use client';
import { Suspense, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCustomer } from '@/contexts/customer-context';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomersTable from '@/components/customers/customers-table';
import InvoicesTable from '@/components/invoices/invoices-table';
import { useInvoices } from '@/contexts/invoice-context';

export default function InvoicesPage() {
  const { selectedCustomer } = useCustomer();
  const { invoices } = useInvoices();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

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

  useEffect(() => {
    if (selectedCustomer) {
      setIsDialogOpen(false);
      router.push('/rechnung-erstellen');
    }
  }, [selectedCustomer, router]);

  const handleCreate = () => {
    // This will now open the customer selection if no customer is selected,
    // or navigate directly if one is.
    if(selectedCustomer) {
      router.push('/rechnung-erstellen');
    } else {
      setIsDialogOpen(true);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechnungen</CardTitle>
        <CardDescription>Hier finden Sie eine Übersicht aller erstellten Rechnungen.</CardDescription>
      </CardHeader>
      <CardContent>
         <div className="mb-6">
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>Kunde für neue Rechnung auswählen</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-4/5 flex flex-col">
                <DialogHeader>
                    <DialogTitle>Kunden auswählen</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <CustomersTable onCustomerSelect={() => {}} />
                </div>
            </DialogContent>
           </Dialog>
         </div>
         <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <InvoicesTable invoices={invoices} logoBase64={logoBase64} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
