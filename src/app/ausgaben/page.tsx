'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCustomer, type Expense } from '@/contexts/customer-context';
import { useInvoices } from '@/contexts/invoice-context';
import { employees } from '@/lib/mitarbeiter-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  startOfDay,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  isSameMonth,
  getDaysInMonth,
  startOfYear,
  endOfYear,
  differenceInHours,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';

type ViewType = 'day' | 'week' | 'month' | 'year';

type CostType = 'laufend' | 'auftrag' | 'personal' | 'sonstige';

type DisplayCost = {
  id: string;
  title: string;
  amount: number;
  type: CostType;
};

const costColors: Record<CostType, string> = {
    laufend: 'hsl(var(--chart-1))',
    auftrag: 'hsl(var(--chart-2))',
    personal: 'hsl(var(--chart-3))',
    sonstige: 'hsl(var(--chart-4))',
};

const ExpenseForm = ({ onAdd }: { onAdd: (expense: Omit<Expense, 'id'>) => void }) => {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState<'monthly' | 'yearly' | 'due' | 'unexpected'>('unexpected');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAdd = (expenseType: 'monthly' | 'yearly' | 'due' | 'unexpected') => {
        if (!title || !amount || !dueDate) return;
        onAdd({
            title,
            amount: parseFloat(amount),
            dueDate: dueDate.toISOString(),
            type: expenseType,
        });
        // Reset form
        setTitle('');
        setAmount('');
        setDueDate(new Date());
        setIsDialogOpen(false);
    };

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4"/> Kosten hinzufügen</Button>
          </DialogTrigger>
          <DialogContent>
               <DialogHeader>
                  <DialogTitle>Neue Kosten erfassen</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 items-end py-4">
                  <div className="space-y-2">
                      <Label htmlFor="title">Bezeichnung</Label>
                      <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="amount">Betrag (€)</Label>
                      <Input id="amount" name="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dueDate ? format(dueDate, 'PPP', { locale: de }) : <span>Datum wählen</span>}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
                      </Popover>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-4">
                      <Button onClick={() => handleAdd('monthly')}>Monatlich</Button>
                      <Button onClick={() => handleAdd('yearly')}>Jährlich</Button>
                      <Button onClick={() => handleAdd('due')}>Mit Zahlungsziel</Button>
                      <Button onClick={() => handleAdd('unexpected')}>Unerwartet</Button>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    )
}

export default function AusgabenPage() {
  const { setCustomerState, customerStates, calendarEvents } = useCustomer();
  const { invoices } = useInvoices();
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [viewType, setViewType] = useState<ViewType>('month');
  const [activeFilters, setActiveFilters] = useState<CostType[]>(['laufend', 'auftrag', 'personal', 'sonstige']);
  const [fixedCostFilters, setFixedCostFilters] = useState<CostType[]>(['laufend', 'personal']);

  // We are storing expenses in a generic 'system' state for now
  const systemStateId = 'system_expenses';
  const expenses = useMemo(() => customerStates[systemStateId]?.expenses || [], [customerStates]);

  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
        ...expense,
        id: `exp_${Date.now()}`
    };
    setCustomerState(systemStateId, { expenses: [...expenses, newExpense] });
  };
  
  const { interval, gridCells, headerFormat } = useMemo(() => {
    let interval, gridCells;
    let headerFormat = 'dd';
    switch (viewType) {
        case 'day':
            interval = { start: currentDate, end: currentDate };
            headerFormat = 'eeee, dd.MM';
            break;
        case 'week':
            interval = { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
            headerFormat = 'E dd.';
            break;
        case 'year':
            interval = { start: startOfYear(currentDate), end: endOfYear(currentDate) };
            headerFormat = 'MMMM';
            break;
        case 'month':
        default:
            interval = { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
            headerFormat = 'dd';
            break;
    }
    gridCells = viewType === 'year' ? eachMonthOfInterval(interval) : eachDayOfInterval(interval);
    return { interval, gridCells, headerFormat };
  }, [currentDate, viewType]);

 const getExpensesForCell = useCallback((cellDate: Date): DisplayCost[] => {
    const dailyCosts: DisplayCost[] = [];

    // 1. Manually added expenses ('sonstige', 'due')
    if (activeFilters.includes('sonstige')) {
        expenses.forEach(exp => {
            const expDate = new Date(exp.dueDate);
            if (isSameDay(expDate, cellDate) && (exp.type === 'due' || exp.type === 'unexpected')) {
                dailyCosts.push({
                    id: exp.id,
                    title: exp.title,
                    amount: exp.amount,
                    type: 'sonstige'
                });
            }
        });
    }
    
    // 2. Laufende Kosten (täglich umgelegt)
    if (activeFilters.includes('laufend') && fixedCostFilters.includes('laufend')) {
         expenses.forEach(exp => {
            if (exp.type === 'monthly' && isSameMonth(new Date(exp.dueDate), cellDate)) {
                 const daysInMonth = getDaysInMonth(cellDate);
                 dailyCosts.push({ id: `${exp.id}-monthly-${cellDate.getDate()}`, title: `${exp.title} (mtl.)`, amount: exp.amount / daysInMonth, type: 'laufend' });
            }
            if (exp.type === 'yearly' && new Date(exp.dueDate).getFullYear() === cellDate.getFullYear()) {
                 const daysInYear = 365; // simplified
                 dailyCosts.push({ id: `${exp.id}-yearly-${cellDate.getDate()}`, title: `${exp.title} (jährl.)`, amount: exp.amount / daysInYear, type: 'laufend' });
            }
         });
    }

    // 3. Auftragseinnahmen (negativ Kosten) aus bezahlten Rechnungen
    if (activeFilters.includes('auftrag')) {
        invoices.forEach(inv => {
            if (inv.status === 'paid' && inv.paidAt && isSameDay(new Date(inv.paidAt), cellDate)) {
                 dailyCosts.push({
                    id: `inv-${inv.id}`,
                    title: `Einnahme: ${inv.customerName}`,
                    amount: -inv.total, // Incoming, so negative cost
                    type: 'auftrag'
                });
            }
        });
    }
    
    // 4. Personalkosten (täglich umgelegt)
    if (activeFilters.includes('personal') && fixedCostFilters.includes('personal')) {
        calendarEvents.forEach(event => {
            if(isSameDay(new Date(event.start), cellDate)) {
                const durationHours = differenceInHours(new Date(event.end), new Date(event.start));
                event.workers?.forEach(workerName => {
                    const employee = employees.find(e => e.name === workerName);
                    if (employee) {
                        const cost = durationHours * employee.hourlyWage;
                        dailyCosts.push({
                            id: `event-${event.id}-worker-${employee.id}`,
                            title: `Personal: ${employee.name}`,
                            amount: cost,
                            type: 'personal'
                        });
                    }
                });
            }
        });
    }

    return dailyCosts;
  }, [activeFilters, fixedCostFilters, expenses, invoices, calendarEvents]);


  const handlePrev = () => {
    if (viewType === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(subDays(currentDate, 7));
    else if (viewType === 'month') setCurrentDate(subDays(currentDate, getDaysInMonth(subDays(currentDate, 15))));
    else if (viewType === 'year') setCurrentDate(subDays(currentDate, 365));
  };

  const handleNext = () => {
    if (viewType === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(addDays(currentDate, 7));
    else if (viewType === 'month') setCurrentDate(addDays(currentDate, getDaysInMonth(addDays(currentDate, 15))));
    else if (viewType === 'year') setCurrentDate(addDays(currentDate, 365));
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle>Ausgabenkalender</CardTitle>
              <CardDescription>
                Übersicht aller wiederkehrenden und einmaligen Kosten.
              </CardDescription>
            </div>
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft /></Button>
                <h2 className="text-xl font-semibold text-center w-48">
                    {format(currentDate, viewType === 'year' ? 'yyyy' : 'MMMM yyyy', { locale: de })}
                </h2>
                <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight /></Button>
            </div>
             <div className="flex items-center gap-2">
                <Button variant={viewType === 'day' ? 'default' : 'outline'} onClick={() => setViewType('day')}>Tag</Button>
                <Button variant={viewType === 'week' ? 'default' : 'outline'} onClick={() => setViewType('week')}>Woche</Button>
                <Button variant={viewType === 'month' ? 'default' : 'outline'} onClick={() => setViewType('month')}>Monat</Button>
                <Button variant={viewType === 'year' ? 'default' : 'outline'} onClick={() => setViewType('year')}>Jahr</Button>
            </div>
          </div>
          <Separator className="mt-4" />
           <div className="flex flex-col gap-2 pt-4">
                <div className="flex items-center gap-4">
                    <Label className="w-40 shrink-0">Angezeigte Kosten:</Label>
                    <ToggleGroup 
                        type="multiple"
                        variant="outline"
                        value={activeFilters}
                        onValueChange={(value: CostType[]) => setActiveFilters(value.length > 0 ? value : [])}
                    >
                        <ToggleGroupItem value="laufend" aria-label="Laufende Kosten">Laufende Kosten</ToggleGroupItem>
                        <ToggleGroupItem value="auftrag" aria-label="Auftragsausgaben">Auftragsausgaben</ToggleGroupItem>
                        <ToggleGroupItem value="personal" aria-label="Personalkosten">Personalkosten</ToggleGroupItem>
                        <ToggleGroupItem value="sonstige" aria-label="Sonstige Kosten">Sonstige Kosten</ToggleGroupItem>
                    </ToggleGroup>
                </div>
                 <div className="flex items-center gap-4">
                    <Label className="w-40 shrink-0">Tagesanteilige Fixkosten:</Label>
                    <ToggleGroup 
                        type="multiple"
                        variant="outline"
                        value={fixedCostFilters}
                        onValueChange={(value: CostType[]) => setFixedCostFilters(value.length > 0 ? value : [])}
                    >
                        <ToggleGroupItem value="laufend" className="bg-yellow-100/50 hover:bg-yellow-200/50 data-[state=on]:bg-yellow-400/80">Laufende Kosten</ToggleGroupItem>
                        <ToggleGroupItem value="personal" className="bg-yellow-100/50 hover:bg-yellow-200/50 data-[state=on]:bg-yellow-400/80">Personalkosten</ToggleGroupItem>
                    </ToggleGroup>
                </div>
           </div>
        </CardHeader>
        <CardContent>
            <div className={cn("grid border-t border-l", {
                'grid-cols-1': viewType === 'day',
                'grid-cols-7': viewType === 'week' || viewType === 'month',
                'grid-cols-4': viewType === 'year',
            })}>
                {gridCells.map((cell, index) => {
                    const cellExpenses = getExpensesForCell(cell);
                    const totalAmount = cellExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                    return (
                        <div key={index} className="border-r border-b min-h-[120px] p-2 flex flex-col">
                           <div className="flex justify-between items-start">
                             <div className="text-xs font-semibold text-muted-foreground">
                               {format(cell, headerFormat, { locale: de })}
                             </div>
                             {totalAmount !== 0 && (
                                <div className={cn("text-xs font-bold text-right", totalAmount > 0 ? 'text-red-500' : 'text-green-600')}>
                                    {totalAmount > 0 ? '+' : ''}{totalAmount.toFixed(0)}€
                                </div>
                             )}
                           </div>
                           <div className="flex-grow flex flex-row items-end justify-start space-x-px mt-2 overflow-hidden h-10">
                                {cellExpenses.map(exp => {
                                    const maxWidth = 8; // max width for a line in px
                                    const minWidth = 2; // min width
                                    const width = Math.max(minWidth, Math.min(maxWidth, contentWidth / Math.max(1, cellExpenses.length)) - 2);
                                    
                                    return (
                                        <div 
                                            key={exp.id} 
                                            className="h-full rounded-sm"
                                            style={{
                                                width: `${width}px`,
                                                backgroundColor: costColors[exp.type]
                                            }}
                                            title={`${exp.title}: ${exp.amount.toFixed(2)}€`}
                                        />
                                    )
                                })}
                           </div>
                        </div>
                    )
                })}
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <CardTitle>Kostenerfassung</CardTitle>
        </CardHeader>
        <CardContent>
            <ExpenseForm onAdd={handleAddExpense} />
        </CardContent>
      </Card>
    </div>
  );
}

// Dummy var to satisfy TS compiler
const contentWidth = 100;

    
