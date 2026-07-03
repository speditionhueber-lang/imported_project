
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
import type { OfferData } from '@/contexts/offer-context';
import { useMemo, useState } from 'react';
import { startOfWeek, startOfMonth, startOfYear, format, addDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval, sub, getWeek, getYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

type ViewType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function OfferChart({ offers }: { offers: (OfferData | null)[] }) {
  const [viewType, setViewType] = useState<ViewType>('monthly');

  const chartData = useMemo(() => {
    const now = new Date();
    let interval;
    let dataPoints: { date: Date, label: string }[] = [];
    const monthlyTotals: { [key: string]: number } = {};

    switch (viewType) {
        case 'daily':
            interval = { start: sub(now, { days: 30 }), end: now };
            dataPoints = eachDayOfInterval(interval).map(date => ({
                date,
                label: format(date, 'dd.MM')
            }));
            break;
        case 'weekly':
            interval = { start: sub(now, { weeks: 12 }), end: now };
            dataPoints = eachWeekOfInterval(interval, { weekStartsOn: 1 }).map(date => ({
                date,
                label: `KW ${getWeek(date, { weekStartsOn: 1 })}`
            }));
            break;
        case 'yearly':
            interval = { start: sub(now, { years: 5 }), end: now };
             dataPoints = eachYearOfInterval(interval).map(date => ({
                date,
                label: format(date, 'yyyy')
            }));
            break;
        case 'monthly':
        default:
            interval = { start: sub(now, { months: 11 }), end: now };
            dataPoints = eachMonthOfInterval(interval).map(date => ({
                date,
                label: format(date, 'MMM yy', { locale: de })
            }));
            break;
    }
    
    dataPoints.forEach(p => {
        monthlyTotals[p.label] = 0;
    });

    offers.forEach((offer) => {
      if (!offer || !offer.items.length) return;
      
      const date = offer.createdAt ? new Date(offer.createdAt) : new Date(); // Fallback to now()
      
      let key = '';
      switch (viewType) {
          case 'daily':
              key = format(date, 'dd.MM');
              break;
          case 'weekly':
              key = `KW ${getWeek(date, { weekStartsOn: 1 })}`;
              break;
          case 'yearly':
              key = format(date, 'yyyy');
              break;
          case 'monthly':
          default:
              key = format(date, 'MMM yy', { locale: de });
              break;
      }
      
      if (monthlyTotals.hasOwnProperty(key)) {
        const netTotal = offer.items.reduce((sum, item) => sum + item.total, 0);
        const grossTotal = netTotal * 1.20;
        monthlyTotals[key] += grossTotal;
      }
    });

    return dataPoints.map(p => ({
        month: p.label,
        total: monthlyTotals[p.label] || 0
    }));
  }, [offers, viewType]);

  const chartConfig = {
    total: {
      label: 'Gesamt',
      color: 'hsl(var(--chart-2))',
    },
  };

  return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Angebots-Kalender</CardTitle>
                <CardDescription>Monatliche Summe der erstellten Angebote (Brutto).</CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <Button variant={viewType === 'daily' ? 'default' : 'outline'} size="sm" onClick={() => setViewType('daily')}>Tag</Button>
                <Button variant={viewType === 'weekly' ? 'default' : 'outline'} size="sm" onClick={() => setViewType('weekly')}>Woche</Button>
                <Button variant={viewType === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setViewType('monthly')}>Monat</Button>
                <Button variant={viewType === 'yearly' ? 'default' : 'outline'} size="sm" onClick={() => setViewType('yearly')}>Jahr</Button>
            </div>
          </div>
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
