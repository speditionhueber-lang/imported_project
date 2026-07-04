// src/components/app-layout.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
} from '@/components/ui/sidebar';
import {
  Calculator,
  CalendarDays,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Map,
  PenSquare,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
  UserPlus,
  Users,
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


const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, highlightable: false },
  { href: '/outlook-kalender', label: 'Outlook Kalender', icon: CalendarDays, highlightable: false },
  { href: '/konten-anlegen', label: 'Konten anlegen', icon: UserPlus, highlightable: false },
  { type: 'separator', key: 'sep1' },
  { href: '/customers', label: 'Kunden', icon: Users, highlightable: false, isWorkflow: true },
  { href: '/berechnung', label: 'Berechnung', icon: Calculator, highlightable: true, isWorkflow: true },
  { href: '/angebot', label: 'Anzahlung Rechnung', icon: PenSquare, highlightable: true, isWorkflow: true },
  { href: '/lieferschein', label: 'Lieferschein', icon: Truck, highlightable: true, isWorkflow: true },
  { href: '/invoices', label: 'Rechnungen', icon: FileText, highlightable: false, isWorkflow: true },
  { href: '/rechnung-erstellen', label: 'Rechnung', icon: FileText, highlightable: true, isWorkflow: true },
  { href: '/storno-rechnungen', label: 'Storno-Rechnungen', icon: RefreshCw, highlightable: false, isWorkflow: true },
];

const secondaryNavItems = [
    { type: 'separator', key: 'sep2' },
    { href: '/daten-mapping', label: 'Daten-Mapping', icon: Map, highlightable: false },
    { href: '/aenderungsvorschlaege', label: 'Änderungsvorschläge', icon: Lightbulb, highlightable: false },
];

const allNavItems = navItems.concat(secondaryNavItems);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, requestAdminRole } = useRole();
  const {
      selectedCustomer,
      setSelectedCustomer,
      customerStates,
      resetCustomerState,
      setCustomerState,
  } = useCustomer();
  const [isNavigating, setIsNavigating] = useState(false);

  const customerState = selectedCustomer ? customerStates[selectedCustomer.id] : null;

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsNavigating(true);

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

              const isCustomerItem = item.href === '/customers';

              return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className={cn(isHighlightable && highlightClass, workflowClass)}
                >
                  <Link href={item.href} onClick={(e) => handleNavClick(e, item.href)}>
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

                return (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.label}
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
