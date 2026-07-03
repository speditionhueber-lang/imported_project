
'use client';
import { Suspense, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import InvoicesTable from '@/components/invoices/invoices-table';
import { useInvoices } from '@/contexts/invoice-context';

export default function StornoRechnungenPage() {
  const { invoices } = useInvoices();
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


  return (
    <Card>
      <CardHeader>
        <CardTitle>Storno-Rechnungen</CardTitle>
        <CardDescription>Hier können Sie für bestehende Rechnungen eine Storno-Rechnung erzeugen.</CardDescription>
      </CardHeader>
      <CardContent>
         <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <InvoicesTable invoices={invoices} logoBase64={logoBase64} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
