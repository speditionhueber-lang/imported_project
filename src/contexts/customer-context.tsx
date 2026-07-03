
'use client';

import type { Customer, Job, Allocation } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { OfferItem } from './offer-context';
import { customers as staticCustomers } from '@/lib/data';
import { importedCustomers } from '@/lib/imported-data';
import { type CalendarEvent } from '@/app/calendar/page';
import { usePathname, useRouter } from 'next/navigation';
import { useAllCustomers } from '@/hooks/use-all-customers';
import { useClientState } from '@/hooks/use-client-state';

const allStaticCustomers = [...staticCustomers, ...importedCustomers];

export type NavStatus = 'pending' | 'completed' | 'approval' | 'default';

export interface JobCreationData {
  customer: Customer;
  totalM3: number;
  calculatedHours: number;
  vehicle: string;
}

export interface OfferData {
    items: OfferItem[];
    totalM3: number;
    calculatedHours: number;
    createdAt: number; // Add creation timestamp
    vehicle?: string;
}

export interface ChangeSuggestionData {
    problem: string;
    idea: string;
    details: string;
}

export interface Expense {
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    type: 'monthly' | 'yearly' | 'due' | 'unexpected';
}

export type DraftCustomer = Partial<Omit<Customer, 'id' | 'createdAt' | 'nameLower' | 'avatarUrl'>>;

export type CalculationParams = {
    pickupDistance: number;
    destinationDistance: number;
    pickupFloor: number;
    destinationFloor: number;
    pickupElevator: string;
    destinationElevator: string;
    selfProvidedPersonnel: number;
    kitchenMeters: number;
    assemblyHours: number;
    hvzCount: number;
    carryWayFactor: number;
    carrierRate: number;
};

export interface CustomerWorkflowState {
  highlightedNav: Record<string, NavStatus>;
  jobCreationData: JobCreationData | null;
  jobForEinteilung: Job | null;
  jobs: Job[];
  calendarEvents: CalendarEvent[];
  newCalendarEvents: string[]; // Store IDs of new events
  allocationsForJob: Allocation[];
  jobForLieferschein: Job | null;
  pendingApproval: boolean;
  pendingInvoiceApproval: boolean;
  pendingChangeSuggestion: boolean;
  changeSuggestionData: ChangeSuggestionData | null;
  offerData: OfferData | null;
  areInvoicesPaid?: boolean;
  lastUpdated?: number;
  // New states for worker reports
  needsMorePersonnel?: boolean;
  incorrectJobDetails?: boolean;
  messageToOffice?: string | null;
  // State for job confirmations
  acceptedJobs?: string[];
  // New state for expenses
  expenses?: Expense[];
  // New state for calculation parameters
  calculationParams?: CalculationParams;
  isArchived?: boolean;
  statusDots?: boolean[];
}

interface CustomerContextType {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  draftCustomer: DraftCustomer | null;
  setDraftCustomer: (draft: DraftCustomer | null) => void;
  customerStates: Record<string, CustomerWorkflowState>;
  setCustomerState: (customerId: string, newState: Partial<CustomerWorkflowState>) => void;
  resetCustomerState: (customerId: string) => void;
  createNewJobForCustomer: (customerId: string) => void;
  archiveCustomer: (customerId: string) => void;
  setNotificationState: (eventId: string, status: 'seen') => void;
  getNewEventCount: () => number;
  getApprovalCount: () => number;
  getPendingJobCount: () => number;
  // For convenience, we expose the current customer's state directly
  highlightedNav: Record<string, NavStatus>;
  jobCreationData: JobCreationData | null;
  jobForEinteilung: Job | null;
  jobs: Job[];
  calendarEvents: CalendarEvent[];
  allocationsForJob: Allocation[];
  jobForLieferschein: Job | null;
  pendingApproval: boolean;
  pendingInvoiceApproval: boolean;
  pendingChangeSuggestion: boolean;
  changeSuggestionData: ChangeSuggestionData | null;
  offerData: OfferData | null;
  areInvoicesPaid?: boolean;
  expenses: Expense[];
  calculationParams?: CalculationParams;
  totalM3: number; // Added totalM3 to CustomerContextType
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const initialWorkflowState: CustomerWorkflowState = {
  highlightedNav: {
    '/berechnung': 'pending',
    '/angebot': 'pending',
    '/jobs': 'pending',
    '/einteilung': 'pending',
    '/lieferschein': 'pending',
    '/rechnung-erstellen': 'default',
  },
  jobCreationData: null,
  jobForEinteilung: null,
  jobs: [],
  calendarEvents: [],
  newCalendarEvents: [],
  allocationsForJob: [],
  jobForLieferschein: null,
  pendingApproval: false,
  pendingInvoiceApproval: false,
  pendingChangeSuggestion: false,
  changeSuggestionData: null,
  offerData: { items: [], totalM3: 0, calculatedHours: 0, createdAt: 0 },
  areInvoicesPaid: false,
  lastUpdated: Date.now(),
  needsMorePersonnel: false,
  incorrectJobDetails: false,
  messageToOffice: null,
  acceptedJobs: [],
  expenses: [],
  isArchived: false,
  statusDots: [false, false, false, false, false],
};

const defaultWorkflowState: CustomerWorkflowState = {
    highlightedNav: {
      '/berechnung': 'default',
      '/angebot': 'default',
      '/jobs': 'default',
      '/einteilung': 'default',
      '/lieferschein': 'default',
      '/rechnung-erstellen': 'default',
    },
    jobCreationData: null,
    jobForEinteilung: null,
    jobs: [],
    calendarEvents: [],
    newCalendarEvents: [],
    allocationsForJob: [],
    jobForLieferschein: null,
    pendingApproval: false,
    pendingInvoiceApproval: false,
    pendingChangeSuggestion: false,
    changeSuggestionData: null,
    offerData: { items: [], totalM3: 0, calculatedHours: 0, createdAt: 0 },
    areInvoicesPaid: false,
    lastUpdated: Date.now(),
    needsMorePersonnel: false,
    incorrectJobDetails: false,
    messageToOffice: null,
    acceptedJobs: [],
    expenses: [],
    isArchived: false,
    statusDots: [false, false, false, false, false],
};

export const NEW_CUSTOMER_STATE_ID = 'new_customer_calculation';

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customerStates, setCustomerStates] = useClientState<Record<string, CustomerWorkflowState>>('customerStates_v3', {});
  
  // Use useClientState for the ID, and then derive the customer object
  const [selectedCustomerId, setSelectedCustomerId] = useClientState<string | null>('selectedCustomerId_v2', null);

  const [draftCustomer, setDraftCustomer] = useClientState<DraftCustomer | null>('draftCustomer_v2', null);

  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const allCustomers = useAllCustomers();
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);

  useEffect(() => {
    // This effect now primarily marks the component as "client-side ready"
    setIsLoaded(true);
  }, []);
  
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return allCustomers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, allCustomers]);


   // Redirect to /customers if a workflow page is accessed without a selected customer
  useEffect(() => {
    const isNewCalcMode = isNewCustomerMode && pathname === '/berechnung';
    if (isLoaded && !selectedCustomer && !isNewCalcMode) {
      const workflowPages = ['/angebot', '/jobs', '/einteilung', '/lieferschein', '/rechnung-erstellen'];
      if (pathname && workflowPages.includes(pathname)) {
        router.push('/customers');
      }
    }
  }, [isLoaded, selectedCustomer, pathname, router, isNewCustomerMode]);

  const setCustomerState = useCallback((customerId: string, newState: Partial<CustomerWorkflowState>) => {
    setCustomerStates(prev => {
        const currentState = prev[customerId] || initialWorkflowState;
        
        let newEvents: string[] = currentState.newCalendarEvents || [];
        if(newState.calendarEvents) {
            const currentEventIds = new Set((currentState.calendarEvents || []).map(e => e.id));
            const addedEvents = newState.calendarEvents.filter(e => !currentEventIds.has(e.id));
            newEvents = [...new Set([...newEvents, ...addedEvents.map(e => e.id)])];
        }

        return {
          ...prev,
          [customerId]: {
            ...currentState,
            ...newState,
            highlightedNav: {
              ...currentState.highlightedNav,
              ...newState.highlightedNav,
            },
            newCalendarEvents: newEvents,
            lastUpdated: Date.now(),
          }
        };
    });
  }, [setCustomerStates]);

  const createNewJobForCustomer = useCallback((customerId: string) => {
    // Use the comprehensive customer list from the hook
    const customer = allCustomers.find(c => c.id === customerId);
    const customerState = customerStates[customerId];
    
    if (!customer || !customerState || !customerState.offerData) {
        console.error("Cannot create job: Customer or offer data not found for customer ID:", customerId, { customer, customerState });
        return;
    }

    const { totalM3, calculatedHours, vehicle } = customerState.offerData;
    const notes = customer.anmerkungen || '';

    const newJob: Job = {
        id: `job_${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: 'draft',
        scheduledAt: customer.umzugsdetails?.gewuenschterUmzugstermin || new Date().toISOString(),
        notes: notes,
        createdAt: new Date().toISOString(),
        vehicles: vehicle ? [vehicle] : [],
        weitereAdressen: [],
        abholadresse: customer.abholadresse,
        zieladresse: customer.zieladresse,
        totalM3: totalM3,
        calculatedHours: calculatedHours,
        isFinalized: false,
    };
    
    setCustomerState(customer.id, {
        jobs: [...(customerState.jobs || []), newJob],
        highlightedNav: { '/angebot': 'completed', '/jobs': 'pending' },
    });
  }, [customerStates, setCustomerState, allCustomers]);

  const setNotificationState = useCallback((eventId: string, status: 'seen') => {
    if (status === 'seen') {
        setCustomerStates(prev => {
            const newStates = {...prev};
            for(const customerId in newStates) {
                const state = newStates[customerId];
                if(state.newCalendarEvents && state.newCalendarEvents.includes(eventId)) {
                    newStates[customerId] = {
                        ...state,
                        newCalendarEvents: state.newCalendarEvents.filter(id => id !== eventId)
                    };
                }
            }
            return newStates;
        });
    }
  }, [setCustomerStates]);
  
  const archiveCustomer = useCallback((customerId: string) => {
    setCustomerState(customerId, { isArchived: true });
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomerId(null);
    }
  }, [setCustomerState, selectedCustomer, setSelectedCustomerId]);


  const getNewEventCount = useCallback(() => {
    return Object.values(customerStates).reduce((count, state) => count + (state.newCalendarEvents?.length || 0), 0);
  }, [customerStates]);

  const getApprovalCount = useCallback(() => {
    return Object.values(customerStates).filter(state => 
        state.pendingApproval || 
        state.pendingInvoiceApproval || 
        state.pendingChangeSuggestion ||
        state.needsMorePersonnel ||
        state.incorrectJobDetails ||
        state.messageToOffice
    ).length;
  }, [customerStates]);

  const getPendingJobCount = useCallback(() => {
    // This is a simplified logic. In a real app, you'd filter jobs assigned to the current user.
    const allJobs = Object.values(customerStates).flatMap(state => state.jobs || []);
    // For now, let's just use the first 3 jobs as a demo for assigned jobs
    const assignedJobs = allJobs.slice(0, 3); 
    
    // Get all accepted jobs across all customers
    const allAcceptedJobs = Object.values(customerStates).flatMap(state => state.acceptedJobs || []);

    const pendingJobs = assignedJobs.filter(job => !allAcceptedJobs.includes(job.id));
    return pendingJobs.length;
  }, [customerStates]);


  const handleSetSelectedCustomer = useCallback((customer: Customer | null) => {
    setIsNewCustomerMode(false); // Always exit new customer mode when a customer is selected
    setSelectedCustomerId(customer ? customer.id : null);
    if (customer && !customerStates[customer.id]) {
      setCustomerState(customer.id, { ...initialWorkflowState, lastUpdated: Date.now() });
    }
  }, [customerStates, setCustomerState, setSelectedCustomerId]);

  const resetCustomerState = useCallback((customerId: string) => {
    setCustomerState(customerId, { ...defaultWorkflowState, lastUpdated: Date.now() });
  }, [setCustomerState]);
  
  const currentCustomerState = isNewCustomerMode ? customerStates[NEW_CUSTOMER_STATE_ID] : (selectedCustomer ? customerStates[selectedCustomer.id] : undefined);
  const allCalendarEvents = Object.values(customerStates).flatMap(state => state.calendarEvents || []);

  const contextValue: any = {
    selectedCustomer,
    setSelectedCustomer: handleSetSelectedCustomer,
    draftCustomer,
    setDraftCustomer,
    customerStates,
    setCustomerState,
    resetCustomerState,
    createNewJobForCustomer,
    archiveCustomer,
    setNotificationState,
    getNewEventCount,
    getApprovalCount,
    getPendingJobCount,
    isNewCustomerMode,
    setIsNewCustomerMode,
    NEW_CUSTOMER_STATE_ID,
    highlightedNav: currentCustomerState?.highlightedNav || defaultWorkflowState.highlightedNav,
    jobCreationData: currentCustomerState?.jobCreationData || null,
    jobForEinteilung: currentCustomerState?.jobForEinteilung || null,
    jobs: currentCustomerState?.jobs || [],
    calendarEvents: allCalendarEvents,
    allocationsForJob: currentCustomerState?.allocationsForJob || [],
    jobForLieferschein: currentCustomerState?.jobForLieferschein || null,
    pendingApproval: currentCustomerState?.pendingApproval || false,
    pendingInvoiceApproval: currentCustomerState?.pendingInvoiceApproval || false,
    pendingChangeSuggestion: currentCustomerState?.pendingChangeSuggestion || false,
    changeSuggestionData: currentCustomerState?.changeSuggestionData || null,
    offerData: currentCustomerState?.offerData || null,
    areInvoicesPaid: currentCustomerState?.areInvoicesPaid || false,
    expenses: customerStates['system_expenses']?.expenses || [],
    calculationParams: currentCustomerState?.calculationParams,
    totalM3: currentCustomerState?.offerData?.totalM3 || 0, // Exposed totalM3
  };


  if (!isLoaded) {
    return null; // or a loading spinner
  }

  return (
    <CustomerContext.Provider value={contextValue}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context as CustomerContextType & {
    isNewCustomerMode: boolean,
    setIsNewCustomerMode: (isNew: boolean) => void,
    NEW_CUSTOMER_STATE_ID: string,
  };
}
