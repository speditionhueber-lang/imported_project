
'use client';

import { useState, useRef, MouseEvent as ReactMouseEvent, useMemo, useEffect, useCallback } from 'react';
import { useCustomer } from '@/contexts/customer-context';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle, Users, Truck } from 'lucide-react';
import { format, addDays, subDays, startOfDay, getDay, isSameDay, differenceInMinutes, differenceInDays, addMinutes, getDaysInMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import EventPopover from '@/components/calendar/event-popover';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import NewEventForm from '@/components/calendar/new-event-form';
import type { OfferItem } from '@/contexts/offer-context';


export type CalendarEvent = {
  id: string;
  start: Date;
  end: Date;
  title: string;
  description: string;
  allDay?: boolean;
  vehicles?: string[];
  workers?: string[];
  amount?: number; // Offer amount
};

type DraggingState = {
    eventId: string;
    customerId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    initialMouseY: number;
    initialStart: Date;
    initialEnd: Date;
};

type ViewType = 'day' | '3-day' | 'week' | 'month';

const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
const HOUR_HEIGHT_IN_REM = 4; // Corresponds to h-16 in Tailwind

export default function CalendarPage() {
  const { customerStates, setCustomerState, setNotificationState, calendarEvents } = useCustomer();
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [draggingState, setDraggingState] = useState<DraggingState | null>(null);
  const [viewType, setViewType] = useState<ViewType>('week');
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);


  const allEvents = useMemo(() => Object.entries(customerStates).flatMap(([customerId, state]) => {
    const offerNetTotal = state.offerData?.items.reduce((sum: number, item: OfferItem) => sum + item.total, 0) || 0;
    
    return (state.calendarEvents || []).map(event => ({
        ...event,
        customerId,
        amount: offerNetTotal,
    }));
  }), [customerStates]);

  const maxAmount = useMemo(() => {
    if (allEvents.length === 0) return 1000; // Return a default value if there are no events
    const calculatedMax = allEvents.reduce((max, event) => Math.max(max, event.amount || 0), 0);
    return Math.max(calculatedMax, 1); // Ensure max is at least 1 to avoid division by zero
  }, [allEvents]);


  const getEventColorStyle = (event: any) => {
    const amount = event.amount || 0;
    // Use a linear scale for intensity, from 0 to 1
    const intensity = Math.min(amount / maxAmount, 1);

    // Lightness: Start at 85% (light) for 0 amount, go down to 55% (darker) for max amount
    const lightness = 85 - (intensity * 30); 
    // Saturation: Start at 60%, go up to 100% for max amount to make it more vibrant
    const saturation = 60 + (intensity * 40);
    // Alpha: Start at 0.8, go up to 1 for max amount
    const alpha = 0.8 + (intensity * 0.2);

    return {
        backgroundColor: `hsla(224, ${saturation}%, ${lightness}%, ${alpha})`,
        borderColor: `hsla(224, ${saturation}%, ${lightness - 10}%, 1)`,
    };
  };
  
  useEffect(() => {
    if (scrollRef.current) {
        const startOfView = currentDate;
        const daysInView = viewType === 'day' ? 1 : viewType === '3-day' ? 3 : viewType === 'week' ? 7 : getDaysInMonth(currentDate);
        const endOfView = addDays(startOfView, daysInView - 1);
        endOfView.setHours(23, 59, 59, 999);

        const firstEventInView = allEvents
            .filter(e => {
                const eventStart = new Date(e.start);
                return eventStart >= startOfView && eventStart <= endOfView;
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
            
        let targetHour = 7; // Default scroll to 7 AM
        if(firstEventInView) {
            const eventHour = new Date(firstEventInView.start).getHours();
            targetHour = Math.max(0, eventHour - 1); // Scroll to 1h before the first event
        }
        
        const element = scrollRef.current.querySelector(`#hour-${targetHour}`);
        if(element) {
            element.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }
  }, [currentDate, allEvents, viewType]);

  const numDays = viewType === 'day' ? 1 : viewType === '3-day' ? 3 : viewType === 'week' ? 7 : getDaysInMonth(currentDate);
  const weekDays = Array.from({ length: numDays }, (_, i) => addDays(currentDate, i));

  const handlePrev = () => setCurrentDate(subDays(currentDate, numDays));
  const handleNext = () => setCurrentDate(addDays(currentDate, numDays));
  const handleToday = () => setCurrentDate(startOfDay(new Date()));
  
  const getDayEvents = useCallback((day: Date): (CalendarEvent & { customerId: string })[] => {
    if (!allEvents) return [];
    return allEvents.filter(e => {
        const eventStart = new Date(e.start);
        const eventEnd = new Date(e.end);
        return (isSameDay(eventStart, day) || isSameDay(eventEnd, day) || (eventStart < day && eventEnd > day));
    }).sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [allEvents]);

  const getEventPositionAndWidth = (event: CalendarEvent, dayEvents: CalendarEvent[]) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const durationHours = Math.max(differenceInMinutes(end, start), 15) / 60;

    const top = `${startHour * HOUR_HEIGHT_IN_REM}rem`;
    const height = `${durationHours * HOUR_HEIGHT_IN_REM}rem`;

    // --- Calculate overlapping events for width and left positioning ---
    const overlappingEvents = dayEvents.filter(e => {
      const eStart = new Date(e.start);
      const eEnd = new Date(e.end);
      // Check if event e overlaps with the current event
      return eStart < end && eEnd > start;
    });

    const eventIndex = overlappingEvents.findIndex(e => e.id === event.id);
    const totalOverlapping = overlappingEvents.length;
    
    const width = `${100 / totalOverlapping}%`;
    const left = `${(100 / totalOverlapping) * eventIndex}%`;

    return { top, height, width, left };
  }
  
  const handleMouseDown = (e: ReactMouseEvent, event: CalendarEvent & { customerId: string }, type: 'move' | 'resize-start' | 'resize-end') => {
    e.stopPropagation();
    setDraggingState({
      eventId: event.id,
      customerId: event.customerId,
      type,
      initialMouseY: e.clientY,
      initialStart: new Date(event.start),
      initialEnd: new Date(event.end),
    });
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!draggingState || !gridRef.current) return;

    const { eventId, customerId, type, initialMouseY, initialStart, initialEnd } = draggingState;
    const customerState = customerStates[customerId];
    if (!customerState || !customerState.calendarEvents) return;
    
    const originalEvent = customerState.calendarEvents.find(ev => ev.id === eventId);
    if (!originalEvent) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    const dayWidth = gridRect.width / numDays;

    const yOffset = e.clientY - initialMouseY;
    const minuteOffset = Math.round((yOffset / (HOUR_HEIGHT_IN_REM * 16)) * 60 / 15) * 15; // Snap to 15 mins

    let newStart = new Date(initialStart);
    let newEnd = new Date(initialEnd);

    // Handle day change via horizontal drag
    const xOffset = e.clientX - gridRef.current.offsetLeft;
    const dayIndex = Math.floor(xOffset / dayWidth);
    if (dayIndex >= 0 && dayIndex < numDays) {
        const targetDay = weekDays[dayIndex];
        if (targetDay && !isSameDay(targetDay, newStart)) {
            const dayDiff = differenceInDays(targetDay, startOfDay(newStart));
            newStart = addDays(newStart, dayDiff);
            newEnd = addDays(newEnd, dayDiff);
        }
    }
    
    if (type === 'move') {
      newStart = addMinutes(newStart, minuteOffset);
      const duration = differenceInMinutes(initialEnd, initialStart);
      newEnd = addMinutes(newStart, duration);
    } else if (type === 'resize-end') {
      newEnd = addMinutes(initialEnd, minuteOffset);
      if (newEnd <= newStart) newEnd = addMinutes(newStart, 15);
    } else if (type === 'resize-start') {
      newStart = addMinutes(initialStart, minuteOffset);
      if (newStart >= newEnd) newStart = addMinutes(newEnd, -15);
    }

    const updatedEvents = customerState.calendarEvents.map(ev => 
        ev.id === eventId ? { ...ev, start: newStart, end: newEnd } : ev
    );
    setCustomerState(customerId, { calendarEvents: updatedEvents });
  };
  
  const handleMouseUp = () => {
    setDraggingState(null);
  };
  
  const handleEventClick = (eventId: string) => {
    setNotificationState(eventId, 'seen');
  }

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchDiff = touchEndX - touchStartX.current;
      
      if (Math.abs(touchDiff) > 50) { // Minimum swipe distance
          if (touchDiff > 0) {
              handlePrev();
          } else {
              handleNext();
          }
      }
      touchStartX.current = 0;
  };

  const handleEventCreated = (customerId: string, newEvent: Omit<CalendarEvent, 'id'>) => {
      const completeEvent: CalendarEvent = {
          ...newEvent,
          id: `evt_manual_${Date.now()}`
      };

      const existingEvents = customerStates[customerId]?.calendarEvents || [];
      const newEventsForCustomer = [...existingEvents, completeEvent];
      
      setCustomerState(customerId, {
          calendarEvents: newEventsForCustomer,
          newCalendarEvents: [...(customerStates[customerId]?.newCalendarEvents || []), completeEvent.id]
      });

      setIsNewEventDialogOpen(false);
  };

  const dayGridClass = {
      'day': 'grid-cols-1',
      '3-day': 'grid-cols-3',
      'week': 'grid-cols-7',
      'month': `grid-cols-7`,
  }[viewType];

  return (
    <div 
        className="flex flex-col h-[calc(100vh-100px)] select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft /></Button>
          <div className='text-center'>
            <h2 className="text-xl font-semibold">{format(currentDate, 'MMMM yyyy', { locale: de })}</h2>
          </div>
          <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight /></Button>
          <Button variant="outline" onClick={handleToday}>Heute</Button>
        </div>
         <div className="flex items-center gap-2">
            <Button variant={viewType === 'day' ? 'default' : 'outline'} onClick={() => setViewType('day')}>Tag</Button>
            <Button variant={viewType === '3-day' ? 'default' : 'outline'} onClick={() => setViewType('3-day')}>3 Tage</Button>
            <Button variant={viewType === 'week' ? 'default' : 'outline'} onClick={() => setViewType('week')}>Woche</Button>
            <Button variant={viewType === 'month' ? 'default' : 'outline'} onClick={() => setViewType('month')}>Monat</Button>
        </div>
        <Dialog open={isNewEventDialogOpen} onOpenChange={setIsNewEventDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2"/> Termin hinzufügen</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Neuen Termin erstellen</DialogTitle>
              </DialogHeader>
              <NewEventForm onEventCreate={handleEventCreated} />
          </DialogContent>
        </Dialog>
      </div>
      
      <div ref={scrollRef} className="flex-grow overflow-auto border rounded-lg bg-card">
        <div className="grid grid-cols-[auto_1fr] h-full">
          {/* Time column */}
          <div className="w-16 border-r relative -top-[90px]">
            <div className="h-[90px] border-b"></div>
            {hours.map((hour, index) => (
              <div key={hour} id={`hour-${index}`} className="h-16 flex items-center justify-center text-xs text-muted-foreground border-b">{hour}</div>
            ))}
          </div>

          {/* Days grid */}
          <div ref={gridRef} className={cn("grid", dayGridClass)}>
            {weekDays.map(day => {
                const dayEvents = getDayEvents(day);
                const dayVehicles = dayEvents ? [...new Set(dayEvents.flatMap(e => e.vehicles || []))] : [];
                const dayWorkers = dayEvents ? [...new Set(dayEvents.flatMap(e => e.workers || []))] : [];

                return (
                  <div key={day.toString()} className="border-r relative">
                    <div className="text-center py-2 border-b sticky top-0 bg-card z-10 h-[90px] overflow-hidden">
                      <p className="text-sm font-medium">{format(day, 'E', { locale: de })}</p>
                      <p className={cn("text-lg", isSameDay(day, new Date()) && "text-primary font-bold")}>{format(day, 'd')}</p>
                      
                       <div className="flex justify-around items-center text-xs text-muted-foreground mt-1 px-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                                <Truck className="h-4 w-4" />
                                <span>{dayVehicles.length}</span>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 text-sm">
                                {dayVehicles.length > 0 ? dayVehicles.map(v => <div key={v}>{v}</div>) : <p>Keine Fahrzeuge</p>}
                            </PopoverContent>
                          </Popover>

                          <Popover>
                            <PopoverTrigger asChild>
                               <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                                <Users className="h-4 w-4" />
                                <span>{dayWorkers.length}</span>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 text-sm">
                                {dayWorkers.length > 0 ? dayWorkers.map(w => <div key={w}>{w}</div>) : <p>Keine Mitarbeiter</p>}
                            </PopoverContent>
                          </Popover>
                      </div>
                    </div>
                    
                    <div className="relative h-full">
                       {/* Hour lines */}
                      {hours.map(hour => (
                        <div key={`line-${hour}`} className="h-16 border-b"></div>
                      ))}

                      {dayEvents && dayEvents.map(event => {
                        const { top, height, width, left } = getEventPositionAndWidth(event, dayEvents);
                        const customerState = customerStates[event.customerId];
                        const isNew = customerState?.newCalendarEvents?.includes(event.id);

                        return (
                            <Popover key={event.id} onOpenChange={(open) => !open && handleEventClick(event.id)}>
                                <PopoverTrigger asChild>
                                    <div 
                                        style={{ top, height, width, left, ...getEventColorStyle(event) }} 
                                        onMouseDown={(e) => handleMouseDown(e, event, 'move')}
                                        className="absolute p-2 rounded-lg text-primary-foreground overflow-hidden cursor-pointer hover:brightness-110 transition-all flex flex-col group border"
                                    >
                                        {isNew && <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}

                                        <p className="font-semibold text-xs leading-tight">Umzug:</p>
                                        <p className="text-sm font-medium leading-tight truncate">{event.title.replace('Umzug:', '').trim()}</p>
                                        
                                        {(event.workers && event.workers.length > 0) && (
                                            <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
                                                <Users className="h-3 w-3" />
                                                <p className="truncate">{event.workers.join(', ')}</p>
                                            </div>
                                        )}

                                        <div 
                                            className='absolute top-0 left-0 w-full h-2 cursor-ns-resize hover:bg-black/20'
                                            onMouseDown={(e) => handleMouseDown(e, event, 'resize-start')}
                                        />
                                        <div 
                                            className='absolute bottom-0 left-0 w-full h-2 cursor-ns-resize hover:bg-black/20'
                                            onMouseDown={(e) => handleMouseDown(e, event, 'resize-end')}
                                        />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent>
                                    <EventPopover event={event as CalendarEvent} />
                                </PopoverContent>
                            </Popover>
                        )
                      })}
                    </div>
                  </div>
                )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
