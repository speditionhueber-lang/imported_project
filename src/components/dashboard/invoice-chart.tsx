'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';

export function InvoiceChart({ invoices }: { invoices: Invoice[] }) {
  const chartData = useMemo(() => {
    const monthlyTotals: { [key: string]: number } = {};
    const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        // Format: MMM 'YY
        const month = d.toLocaleString('de-DE', { month: 'short' });
        const year = d.getFullYear().toString().slice(-2);
        return `${month} '${year}`;
    }).reverse();
    
    months.forEach(month => {
        monthlyTotals[month] = 0;
    });

    invoices.forEach((invoice) => {
      const date = new Date(invoice.issuedAt);
      const month = date.toLocaleString('de-DE', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      const monthYear = `${month} '${year}`;
      if (monthlyTotals.hasOwnProperty(monthYear)) {
        monthlyTotals[monthYear] += invoice.total;
      }
    });

    return Object.keys(monthlyTotals).map((month) => ({
      month,
      total: monthlyTotals[month],
    }));
  }, [invoices]);

  const chartConfig = {
    total: {
      label: 'Gesamt',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechnungsübersicht</CardTitle>
        <CardDescription>Gesamtrechnungsbeträge der letzten 12 Monate</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) => `€${Number(value) / 1000}k`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={40}
                fontSize={12}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent 
                    formatter={(value) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value))}
                    indicator="dot"
                />}
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
