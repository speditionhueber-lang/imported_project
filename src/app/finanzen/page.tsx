
'use client';

import { Suspense, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceChart } from '@/components/dashboard/invoice-chart';
import { useInvoices } from '@/contexts/invoice-context';
import { useCustomer } from '@/contexts/customer-context';
import StatCard from '@/components/dashboard/stat-card';
import { DollarSign, TrendingUp, Users, FileText } from 'lucide-react';
import { RecentJobs } from '@/components/dashboard/recent-jobs';
import InvoicesTable from '@/components/invoices/invoices-table';
import { OfferChart } from '@/components/dashboard/offer-chart';
import type { Job } from '@/lib/types';
import { OfferData } from '@/contexts/offer-context';


export default function FinanzenPage() {
  const { invoices } = useInvoices();
  const { customerStates } = useCustomer();

  const allJobs = useMemo(() => {
    return Object.values(customerStates).flatMap(state => state.jobs || []);
  }, [customerStates]);
  
  const allOffers = useMemo(() => {
    return Object.values(customerStates)
      .map(state => {
          if (!state.offerData) return null;
          // Ensure createdAt is a number (timestamp)
          const createdAtTimestamp = state.offerData.createdAt || state.lastUpdated;
          return {
              ...state.offerData,
              createdAt: typeof createdAtTimestamp === 'string' 
                ? new Date(createdAtTimestamp).getTime() 
                : createdAtTimestamp,
          };
      })
      .filter((offer): offer is OfferData => offer !== null);
  }, [customerStates]);
  
  const jobsWithRevenue = useMemo(() => {
    return allJobs.map(job => {
      const customerState = customerStates[job.customerId];
      let revenue = 0;
      if (customerState && customerState.offerData) {
        const netTotal = customerState.offerData.items.reduce((sum, item) => sum + item.total, 0);
        revenue = netTotal * 1.2; // Add 20% VAT to match invoice logic
      }
      return { ...job, revenue };
    });
  }, [allJobs, customerStates]);

  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => (inv.status === 'paid' ? sum + inv.total : sum), 0);
  }, [invoices]);

  const monthlyGrowth = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthRevenue = invoices
      .filter(inv => new Date(inv.issuedAt) >= lastMonth && new Date(inv.issuedAt) < thisMonth && inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const thisMonthRevenue = invoices
      .filter(inv => new Date(inv.issuedAt) >= thisMonth && inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    if (lastMonthRevenue === 0) {
      return thisMonthRevenue > 0 ? 100 : 0;
    }
    return ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  }, [invoices]);

  const newCustomersThisMonth = useMemo(() => {
      const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      return Object.values(customerStates).filter(state => 
          state.lastUpdated && new Date(state.lastUpdated) >= thisMonth
      ).length;
  }, [customerStates]);
  
  const openInvoices = useMemo(() => {
      return invoices.filter(inv => inv.status === 'sent').length;
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Gesamtumsatz (bezahlt)"
          value={new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalRevenue)}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="Seit Beginn der Aufzeichnungen"
        />
        <StatCard
          title="Monatliches Wachstum"
          value={`+${monthlyGrowth.toFixed(2)}%`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          description="Im Vergleich zum Vormonat"
        />
        <StatCard
          title="Neue Kunden (dieser Monat)"
          value={`+${newCustomersThisMonth}`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Anzahl neuer Kunden"
        />
        <StatCard
          title="Offene Rechnungen"
          value={`${openInvoices}`}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          description="Anzahl gesendeter, unbezahlter Rechnungen"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4">
          <Suspense fallback={<Card><CardHeader><CardTitle>Lade Diagramm...</CardTitle></CardHeader><CardContent className="h-[350px] w-full" /></Card>}>
            <InvoiceChart invoices={invoices} />
          </Suspense>
        </div>
        <div className="lg:col-span-3">
          <Suspense fallback={<Card><CardHeader><CardTitle>Lade Aufträge...</CardTitle></CardHeader><CardContent className="h-[350px] w-full" /></Card>}>
            <RecentJobs jobs={jobsWithRevenue} />
          </Suspense>
        </div>
      </div>
      
       <Card>
        <CardHeader>
            <CardTitle>Letzte Rechnungen</CardTitle>
            <CardDescription>Die 10 zuletzt erstellten Rechnungen.</CardDescription>
        </CardHeader>
        <CardContent>
            <Suspense fallback={<div className="h-[400px] w-full bg-muted rounded-lg" />}>
                <InvoicesTable invoices={invoices.slice(0, 10)} logoBase64={null} />
            </Suspense>
        </CardContent>
      </Card>
      
      <Suspense fallback={<Card><CardHeader><CardTitle>Lade Diagramm...</CardTitle></CardHeader><CardContent className="h-[350px] w-full" /></Card>}>
        <OfferChart offers={allOffers} />
      </Suspense>

    </div>
  );
}
