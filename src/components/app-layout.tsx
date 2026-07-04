// src/components/app-layout.tsx
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import {
  Briefcase,
  Calculator,
  ChevronDown,
  FileText,
  LayoutDashboard,
  PenSquare,
  ShieldCheck,
  Truck,
  Users,
  CalendarCheck,
  CheckCircle,
  BookOpen,
  Calendar as CalendarIconLucide,
  Phone,
  Smartphone,
  RefreshCw,
  Lightbulb,
  FolderClock,
  Landmark,
  FileWarning,
  Upload,
  Newspaper,
  CalendarDays,
  Search,
  KeyRound,
  Loader2,
  DollarSign,
  Trash2,
  Map,
  Mail,
  UserPlus,
  FileEdit,
  Download,
  Box,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useRole } from '@/contexts/role-context';
import { useCustomer } from '@/contexts/customer-context';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useOffer } from '@/contexts/offer-context';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { projectFiles } from '@/lib/project-files';


const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, highlightable: false },
  { href: '/neuigkeiten', label: 'Neuigkeiten', icon: Newspaper, highlightable: false, notificationKey: 'approvals' },
  { href: '/calendar', label: 'Kalender', icon: CalendarIconLucide, highlightable: false, notificationKey: 'calendar' },
  { href: '/outlook-kalender', label: 'Outlook Kalender', icon: CalendarDays, highlightable: false },
  { href: '/auftragskalender', label: 'Auftragskalender', icon: CalendarDays, highlightable: false, notificationKey: 'pendingJobs' },
  { href: '/dokumente', label: 'Dokumente', icon: FolderClock, highlightable: false },
  { href: '/m3-schaetzung', label: 'm3 Schätzung', icon: Box, highlightable: false },
  { href: '/besichtigungen', label: 'Besichtigungen', icon: Search, highlightable: false },
  { href: '/telefonate', label: 'Telefonate', icon: Phone, highlightable: false },
  { href: '/konten-anlegen', label: 'Konten anlegen', icon: UserPlus, highlightable: false },
  { href: '/mitarbeiter', label: 'Mitarbeiter', icon: Users, highlightable: false },
  { href: '/finanzen', label: 'Finanzen', icon: Landmark, highlightable: false },
  { type: 'separator', key: 'sep1' },
  { href: '/customers', label: 'Kunden', icon: Users, highlightable: false, isWorkflow: true },
  { href: '/berechnung', label: 'Berechnung', icon: Calculator, highlightable: true, isWorkflow: true },
  { href: '/angebot', label: 'Anzahlung Rechnung', icon: PenSquare, highlightable: true, isWorkflow: true },
  { href: '/lieferschein', label: 'Lieferschein', icon: Truck, highlightable: true, isWorkflow: true },
  { href: '/invoices', label: 'Rechnungen', icon: FileText, highlightable: false, isWorkflow: true },
  { href: '/rechnung-erstellen', label: 'Rechnung', icon: FileText, highlightable: true, isWorkflow: true },
  { href: '/storno-rechnungen', label: 'Storno-Rechnungen', icon: RefreshCw, highlightable: false, isWorkflow: true },
  { href: '/ausgaben', label: 'Ausgaben', icon: DollarSign, highlightable: false },
];

const secondaryNavItems = [
    { type: 'separator', key: 'sep2' },
    { href: '/unbezahlte-rechnungen', label: 'Unbezahlte Rechnungen', icon: FileWarning, highlightable: false },
    { href: '/abgeschlossene-auftraege', label: 'Abgeschlossene Aufträge', icon: CheckCircle, highlightable: false },
    { href: '/rechnungen-hochladen', label: 'Rechnungen hochladen', icon: Upload, highlightable: false },
    { href: '/lieferschein-aendern', label: 'Lieferschein ändern', icon: FileEdit, highlightable: false },
    { type: 'separator', key: 'sep3' },
    { href: '/anleitung', label: 'Sheet-Sync Anleitung', icon: BookOpen, highlightable: false },
    { href: '/anleitung-android', label: 'Android Anleitung', icon: Smartphone, highlightable: false },
    { href: '/daten-mapping', label: 'Daten-Mapping', icon: Map, highlightable: false },
    { href: '/aenderungsvorschlaege', label: 'Änderungsvorschläge', icon: Lightbulb, highlightable: false },
];

const allNavItems = navItems.concat(secondaryNavItems);

type NotificationKeys = 'emails' | 'calendar' | 'approvals' | 'pendingJobs';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, setRole, requestAdminRole } = useRole();
  const {
      selectedCustomer,
      setSelectedCustomer,
      customerStates,
      resetCustomerState,
      setCustomerState,
      getNewEventCount,
      getApprovalCount,
      getPendingJobCount,
  } = useCustomer();
  const { setOfferData } = useOffer();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const { toast } = useToast();


  const [notifications, setNotifications] = useState({
    emails: 0,
    calendar: 0,
    approvals: 0,
    pendingJobs: 0,
  });

  const customerState = selectedCustomer ? customerStates[selectedCustomer.id] : null;

  useEffect(() => {
    // This is a workaround for the deprecated router.events
    // A proper solution would be to use the Navigation-Events from Next.js 13+
    // For now, we will use a simplified approach
    // We can't use router.events anymore. We'll use a simplified isLoading state.
    // The handleNavClick will set it to true, and we'll use a timer to set it back to false.
  }, [router]);

  useEffect(() => {
      setNotifications(prev => ({
          ...prev,
          calendar: getNewEventCount(),
          approvals: getApprovalCount(),
          pendingJobs: getPendingJobCount(),
       }));
  }, [customerStates, getNewEventCount, getApprovalCount, getPendingJobCount]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, key?: string) => {
    e.preventDefault();
    setIsNavigating(true);

    if (key && notifications[key as NotificationKeys] > 0) {
      if (key === 'calendar') {
          // This is a bit of a hack, but for now we reset all calendar notifications when the page is visited
           Object.keys(customerStates).forEach(customerId => {
               if(customerStates[customerId].newCalendarEvents?.length > 0) {
                   setCustomerState(customerId, { newCalendarEvents: [] });
               }
           });
      }
      setNotifications(prev => ({...prev, [key]: 0}));
    }

    if (href === '/lieferschein' && selectedCustomer && customerStates[selectedCustomer.id]?.jobForEinteilung) {
       const job = customerStates[selectedCustomer.id].jobForEinteilung;
       if (job) {
         setCustomerState(selectedCustomer.id, {
            jobForLieferschein: { ...job, allocations: customerStates[selectedCustomer.id].allocationsForJob },
            highlightedNav: { '/jobs': 'completed' }
         });
       }
    }

    router.push(href);
    // Simulate navigation end
    setTimeout(() => setIsNavigating(false), 500);
  };


  const getLabelForPath = (path: string) => {
    const item = allNavItems.find((item) => 'href' in item && item.href === path);
    return item && 'label' in item ? item.label : 'Dashboard';
  }

  const getShortName = (name: string | undefined) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return name;
  }

  const handleRemoveCustomer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(selectedCustomer) {
        resetCustomerState(selectedCustomer.id);
        setSelectedCustomer(null);
    }
  }

  const handleDownloadProject = async () => {
    setIsZipping(true);
    toast({
        title: 'Projekt wird vorbereitet...',
        description: 'Das ZIP-Archiv wird erstellt. Dies kann einen Moment dauern.',
    });

    try {
        const zip = new JSZip();

        projectFiles.forEach(file => {
            zip.file(file.path, file.content);
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "Hueber-Buero-Project.zip");

    } catch (error) {
        console.error("Error creating zip file:", error);
        toast({
            variant: "destructive",
            title: "Fehler",
            description: "Das ZIP-Archiv konnte nicht erstellt werden.",
        });
    } finally {
        setIsZipping(false);
    }
  };


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-primary">
              Hueber Büro
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
              if (item.type === 'separator') {
                  return <SidebarSeparator key={item.key} />;
              }

              if (!item.href) return null;

              const status = customerState?.highlightedNav[item.href];

              // Hide '/rechnung-erstellen' if no customer is selected or workflow hasn't reached it
              if (item.href === '/rechnung-erstellen' && (!selectedCustomer || status === 'default')) {
                return null;
              }

              // Hide old '/invoices' page if the new workflow has started
              if (item.href === '/invoices' && customerState?.highlightedNav['/rechnung-erstellen'] && customerState.highlightedNav['/rechnung-erstellen'] !== 'default') {
                return null;
              }

              const isHighlightable = item.highlightable && !!selectedCustomer;

              const workflowClass = item.isWorkflow ? 'bg-blue-500/5' : '';

              const highlightClass =
                status === 'completed' ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20 hover:text-green-600' :
                '';

              const notificationCount = item.notificationKey ? notifications[item.notificationKey as NotificationKeys] : 0;
              const isCustomerItem = item.href === '/customers';


              return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className={cn(isHighlightable && highlightClass, workflowClass)}
                >
                  <Link href={item.href} onClick={(e) => handleNavClick(e, item.href, item.notificationKey)}>
                    <item.icon />
                    <span>{item.label}</span>
                     {isCustomerItem && selectedCustomer && (
                         <div className="flex items-center gap-1 ml-auto">
                            <Badge variant="secondary" className="font-normal">{getShortName(selectedCustomer.name)}</Badge>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleRemoveCustomer}>
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive"/>
                            </Button>
                         </div>
                     )}
                     {notificationCount > 0 && !isCustomerItem && (
                        <SidebarMenuBadge className="bg-red-500 text-white">{notificationCount}</SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )})}
          </SidebarMenu>
          <SidebarMenu>
             {secondaryNavItems.map((item) => {
                if (item.type === 'separator') {
                  return <SidebarSeparator key={item.key} />;
                }
                if (!item.href) return null;

                const status = customerState?.highlightedNav[item.href as string];
                const isHighlightable = item.highlightable && !!selectedCustomer;
                const highlightClass =
                    status === 'completed' ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20 hover:text-green-600' : '';

                return (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        className={cn(isHighlightable && highlightClass)}
                    >
                        <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 rounded-lg bg-background p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src="https://picsum.photos/seed/user/40/40"
                alt="Benutzer"
              />
              <AvatarFallback>B</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Demo-Benutzer</span>
              <Badge variant="secondary" className="w-fit capitalize">
                {role}
              </Badge>
            </div>
             {isNavigating && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-semibold md:text-xl">
             {getLabelForPath(pathname ?? "")}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleDownloadProject} disabled={isZipping} title="Projekt herunterladen">
                {isZipping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Rolle: <span className="capitalize font-semibold">{role}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Rolle wechseln</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={requestAdminRole}>
                  Admin
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRole('staff')}>
                  Mitarbeiter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
