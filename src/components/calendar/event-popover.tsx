
'use client';

import type { CalendarEvent } from '@/app/calendar/page';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, AlignLeft, Users, Truck } from 'lucide-react';
import { Separator } from '../ui/separator';

interface EventPopoverProps {
  event: CalendarEvent;
}

export default function EventPopover({ event }: EventPopoverProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">{event.title}</h3>
      <Separator />
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <span>{format(new Date(event.start), 'eeee, dd. MMMM yyyy', { locale: de })}</span>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <span>{format(new Date(event.start), 'HH:mm', { locale: de })} - {format(new Date(event.end), 'HH:mm', { locale: de })}</span>
        </div>
        {event.description && (
            <div className="flex items-start gap-2">
                <AlignLeft className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-muted-foreground">{event.description}</p>
            </div>
        )}
         {(event.vehicles && event.vehicles.length > 0) && (
            <div className="flex items-start gap-2">
                <Truck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-muted-foreground">{event.vehicles.join(', ')}</p>
            </div>
        )}
         {(event.workers && event.workers.length > 0) && (
            <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-muted-foreground">{event.workers.join(', ')}</p>
            </div>
        )}
      </div>
    </div>
  );
}

    