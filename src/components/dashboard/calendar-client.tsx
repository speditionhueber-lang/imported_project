'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { CalendarEvent } from '@/lib/types';
import { format, isSameDay, startOfTomorrow, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

const formatEventTime = (start: Date, end: Date) => {
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
};

const getRelativeDay = (date: Date) => {
  const today = new Date();
  const tomorrow = startOfTomorrow();

  if (isSameDay(date, today)) {
    return 'Heute';
  }
  if (isSameDay(date, tomorrow)) {
    return 'Morgen';
  }
  return format(date, 'eeee, dd. MMMM', { locale: de });
};

export default function CalendarClient({ events }: { events?: CalendarEvent[] }) {
  const router = useRouter();

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const nextSevenDays = addDays(now, 7);

    if (!events) return [];

    return events
      .filter(event => {
          const eventStart = new Date(event.start);
          return eventStart >= now && eventStart <= nextSevenDays;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events]);

  const groupedEvents = useMemo(() => {
    return upcomingEvents.reduce((acc, event) => {
      const dayKey = getRelativeDay(new Date(event.start));
      (acc[dayKey] = acc[dayKey] || []).push(event);
      return acc;
    }, {} as Record<string, CalendarEvent[]>);
  }, [upcomingEvents]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Kalender</CardTitle>
        <CardDescription>
          Anstehende Termine der nächsten 7 Tage.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ScrollArea className="h-[400px]">
          {Object.keys(groupedEvents).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([day, dayEvents]) => (
                <div key={day}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{day}</h3>
                  <div className="space-y-4">
                    {dayEvents.map((event, index) => (
                      <div key={event.id}>
                        <div className="flex gap-4 cursor-pointer" onClick={() => router.push('/calendar')}>
                          <div className="w-24 text-sm font-medium text-right">{formatEventTime(new Date(event.start), new Date(event.end))}</div>
                          <div className="flex-1 space-y-1">
                            <p className="font-semibold leading-none">{event.title}</p>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          </div>
                        </div>
                        {index < dayEvents.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Keine anstehenden Termine.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
