'use client';

import { Folder, Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type AudioFile = {
  id: string;
  name: string;
  modifiedTime: string;
};

type CustomerData = {
    files: AudioFile[];
    lastCall: Date;
    folderId: string;
};

type CustomerCallListProps = {
    customers: [string, CustomerData][];
    isLoading: boolean;
};

function formatDateTime(date: Date) {
    return {
        date: date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }),
        time: date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        })
    };
}

function isRecent(date: Date) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    return date > twentyFourHoursAgo;
}

export function CustomerCallList({ customers, isLoading }: CustomerCallListProps) {
  
  const customerItems = isLoading ? Array.from({ length: 5 }) : customers;

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4">
        <h3 className="font-semibold">Kunden-Anrufliste</h3>
      </div>
      <div className="border-t">
        <ul className="divide-y divide-border">
          {isLoading ? (
            customerItems.map((_, index) => (
                <li key={index}>
                    <div className="flex items-center gap-3 p-4">
                        <Skeleton className="h-5 w-5" />
                        <div className="flex-1 flex justify-between items-center">
                            <Skeleton className="h-4 w-3/5" />
                            <Skeleton className="h-4 w-1/5" />
                        </div>
                    </div>
                </li>
            ))
          ) : customers.length > 0 ? (
            customers.map(([customerName, data]) => {
                const { date, time } = formatDateTime(data.lastCall);
                return (
                    <li key={customerName}>
                    <Link href={`/telefonate/${data.folderId}?customer=${encodeURIComponent(customerName)}`}>
                        <div className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer">
                        <User className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            {customerName}
                            {isRecent(data.lastCall) && (
                                <span className="h-2 w-2 rounded-full bg-red-500" title="Kürzlich aktualisiert"></span>
                            )}
                          </p>
                           <p className="text-xs text-muted-foreground">{data.files.length} Anruf(e)</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5" title="Letzter Anruf">
                                <Clock className="h-4 w-4" />
                                <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Letzter Anruf">
                                <Calendar className="h-4 w-4" />
                                <span>{date}</span>
                            </div>
                        </div>
                        </div>
                    </Link>
                    </li>
                );
            })
          ) : (
            <li className="p-4 text-center text-muted-foreground">
              Keine Anrufe gefunden.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
