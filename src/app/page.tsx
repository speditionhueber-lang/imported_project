
'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, X, Calendar, Users, LayoutDashboard, Calculator, PenSquare, Briefcase, CalendarCheck, Truck, FileText, RefreshCw, Lightbulb, Loader2, MinusCircle, Grid, Expand, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import AuthPanel from '@/components/auth/auth-panel';
import NewCustomerWizard from '@/components/customers/new-customer-wizard';

// Import components that will be used as widgets
import CalendarClient from '@/components/dashboard/calendar-client';
import Approvals from '@/components/dashboard/approvals';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCustomer } from '@/contexts/customer-context';
import type { CalendarEvent } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import TodoList from '@/components/dashboard/todo-list';

type WidgetType = 
    | 'calendar'
    | 'kunden' | 'berechnung' | 'angebot' | 'auftraege' | 'einteilung' | 'lieferschein' 
    | 'rechnungen' | 'storno-rechnungen'
    | 'aenderungsvorschlaege' | 'neuigkeiten' | 'todo-list';

type WidgetSize = '1x1' | '2x1' | '1x2' | '2x2';

interface WidgetConfig {
    id: WidgetType;
    size: WidgetSize;
}


const widgetConfig = {
    'neuigkeiten': { label: 'Neuigkeiten & Genehmigungen', icon: Calendar, type: 'widget' },
    'calendar': { label: 'Kalender', icon: Calendar, type: 'widget' },
    'kunden': { label: 'Kunden', icon: Users, type: 'link', href: '/customers' },
    'berechnung': { label: 'Berechnung', icon: Calculator, type: 'link', href: '/berechnung' },
    'angebot': { label: 'Anzahlung Rechnung', icon: PenSquare, type: 'link', href: '/angebot' },
    'auftraege': { label: 'Aufträge', icon: Briefcase, type: 'link', href: '/jobs' },
    'einteilung': { label: 'Einteilung', icon: CalendarCheck, type: 'link', href: '/einteilung' },
    'lieferschein': { label: 'Lieferschein', icon: Truck, type: 'link', href: '/lieferschein' }, 
    'rechnungen': { label: 'Rechnungen', icon: FileText, type: 'link', href: '/invoices' },
    'storno-rechnungen': { label: 'Storno-Rechnungen', icon: RefreshCw, type: 'link', href: '/storno-rechnungen' },
    'aenderungsvorschlaege': { label: 'Änderungsvorschläge', icon: Lightbulb, type: 'link', href: '/aenderungsvorschlaege' },
    'todo-list': { label: 'To-Do Listen', icon: ListTodo, type: 'widget' },
};

const WidgetPlaceholder = ({ id, events, isMobile }: { id: WidgetType; events?: CalendarEvent[]; isMobile: boolean; }) => {
    const config = widgetConfig[id as keyof typeof widgetConfig];
    if (!config) return null;
    const Icon = config.icon;
    
    const href = ('href' in config) ? config.href : '/';

    if (config.type === 'link') {
        return (
            <Link href={href} passHref>
                <div className="bg-card border rounded-lg p-6 flex flex-col items-center justify-center text-center h-full hover:bg-muted/50 transition-colors">
                    <Icon className="h-12 w-12 text-primary mb-4" />
                    <h3 className="font-semibold">{config.label}</h3>
                </div>
            </Link>
        );
    }
    
    // Specific widget rendering
    if (id === 'neuigkeiten') return <Approvals />;
    if (id === 'calendar' && events) return <CalendarClient events={events} />;
    if (id === 'todo-list') return <TodoList />;
    
    // Fallback for other widgets
    return (
        <div className="bg-card border rounded-lg p-6 flex flex-col items-center justify-center text-center h-full">
            <Icon className="h-12 w-12 text-primary mb-4" />
            <h3 className="font-semibold">{config.label}</h3>
            <p className="text-sm text-muted-foreground mt-2">Widget für {config.label}</p>
        </div>
    );
};


export default function DashboardPage() {
    const { user, isUserLoading } = useUser();
    const { calendarEvents } = useCustomer();
    const [isProfileComplete, setIsProfileComplete] = useState(true); // Set to true to bypass for now
    
    const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editMode, setEditMode] = useState<'none' | 'delete' | 'move' | 'resize'>('none');
    const { toast } = useToast();
    const isMobile = useIsMobile();

    // Drag and Drop state
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    
    useEffect(() => {
        try {
            const savedWidgets = localStorage.getItem('dashboardWidgets_v3');
            if (savedWidgets) {
                setWidgets(JSON.parse(savedWidgets));
            } else {
                // Default widgets
                setWidgets([
                    { id: 'todo-list', size: '2x2' },
                    { id: 'calendar', size: '2x1' },
                    { id: 'neuigkeiten', size: '1x1' },
                ]);
            }
        } catch (error) {
            console.error("Fehler beim Laden der Widgets aus dem Local Storage", error);
            // Fallback to default if parsing fails
             setWidgets([
                { id: 'todo-list', size: '2x2' },
                { id: 'calendar', size: '2x1' },
                { id: 'neuigkeiten', size: '1x1' },
            ]);
        }
    }, []);

    const saveWidgets = (newWidgets: WidgetConfig[]) => {
        setWidgets(newWidgets);
        localStorage.setItem('dashboardWidgets_v3', JSON.stringify(newWidgets));
    }

    const addWidget = (widgetId: WidgetType) => {
        const isAlreadyAdded = widgets.some(w => w.id === widgetId);
        if (!isAlreadyAdded) {
            const newWidgets: WidgetConfig[] = [...widgets, { id: widgetId, size: '1x1' }];
            saveWidgets(newWidgets);
        }
        setIsDialogOpen(false);
    };

    const removeWidget = (widgetId: WidgetType) => {
        const newWidgets = widgets.filter(w => w.id !== widgetId);
        saveWidgets(newWidgets);
    };

    const toggleWidgetSize = (widgetId: WidgetType) => {
        const sizes: WidgetSize[] = ['1x1', '2x1', '1x2', '2x2'];
        const newWidgets: WidgetConfig[] = widgets.map(w => {
            if (w.id === widgetId) {
                const currentIndex = sizes.indexOf(w.size);
                const nextIndex = (currentIndex + 1) % sizes.length;
                return { ...w, size: sizes[nextIndex] };
            }
            return w;
        });
        saveWidgets(newWidgets);
    }

    const toggleEditMode = (mode: 'delete' | 'move' | 'resize') => {
        setEditMode(prev => (prev === mode ? 'none' : mode));
    };

    // Drag and Drop handlers
    const handleDragStart = (e: DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
    };
    
    const handleDragEnter = (e: DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        
        const newWidgets = [...widgets];
        const draggedItemContent = newWidgets[dragItem.current];
        newWidgets.splice(dragItem.current, 1);
        newWidgets.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;
        
        saveWidgets(newWidgets);
    };


    if (isUserLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <AuthPanel />;
    }
    
    if (user && !isProfileComplete) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Dialog open={true} onOpenChange={() => {}}>
                    <DialogContent className="sm:max-w-4xl h-4/5 flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Profil vervollständigen</DialogTitle>
                             <DialogDescription>
                                Bitte vervollständigen Sie Ihr Profil, um die Anwendung nutzen zu können.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow overflow-y-auto">
                            <NewCustomerWizard onCustomerAdded={(data) => {
                                console.log("Profile data:", data);
                                // Here you would save the data to Firestore
                                setIsProfileComplete(true);
                                toast({ title: "Profil erfolgreich gespeichert!" });
                            }} />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    const sizeToClassMap: Record<WidgetSize, string> = {
        '1x1': 'lg:col-span-1',
        '2x1': 'lg:col-span-2',
        '1x2': 'lg:col-span-1 lg:row-span-2',
        '2x2': 'lg:col-span-2 lg:row-span-2',
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <Button variant={editMode === 'delete' ? 'destructive' : 'outline'} size="icon" onClick={() => toggleEditMode('delete')} title="Löschmodus">
                        <MinusCircle className="h-5 w-5" />
                    </Button>
                     <Button variant={editMode === 'move' ? 'secondary' : 'outline'} size="icon" onClick={() => toggleEditMode('move')} title="Verschiebemodus">
                        <Grid className="h-5 w-5" />
                    </Button>
                    <Button variant={editMode === 'resize' ? 'secondary' : 'outline'} size="icon" onClick={() => toggleEditMode('resize')} title="Größenmodus">
                        <Expand className="h-5 w-5" />
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" title="Widget hinzufügen">
                                <PlusCircle className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Widget zum Dashboard hinzufügen</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4 max-h-[60vh] overflow-y-auto">
                                {Object.entries(widgetConfig).map(([id, { label, icon: Icon }]) => {
                                    const isAdded = widgets.some(w => w.id === id);
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => addWidget(id as WidgetType)}
                                            disabled={isAdded}
                                            className="border rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Icon className="h-8 w-8 mb-2" />
                                            <span className="text-sm font-medium">{label}</span>
                                            {isAdded && <span className="text-xs text-green-500 mt-1">Hinzugefügt</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {widgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
                    <LayoutDashboard className="h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-6 text-xl font-semibold">Ihr Dashboard ist leer</h2>
                    <p className="mt-2 text-muted-foreground">Klicken Sie auf den <PlusCircle className="inline h-4 w-4 mx-1" /> Button oben rechts, um Widgets hinzuzufügen.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-[250px] gap-6">
                    {widgets.map((widget, index) => {
                        return (
                            <div
                                key={widget.id}
                                className={cn(
                                    "relative group h-full",
                                    sizeToClassMap[widget.size],
                                    editMode === 'move' && 'cursor-move'
                                )}
                                draggable={editMode === 'move'}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                {editMode === 'delete' && (
                                     <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 z-10"
                                        onClick={() => removeWidget(widget.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                                {editMode === 'resize' && (
                                     <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 z-10"
                                        onClick={() => toggleWidgetSize(widget.id)}
                                    >
                                        <Expand className="h-4 w-4" />
                                    </Button>
                                )}
                                <WidgetPlaceholder id={widget.id} events={calendarEvents} isMobile={isMobile} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
