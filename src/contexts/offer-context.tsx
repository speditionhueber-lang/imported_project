
'use client';

import type { Customer } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface OfferItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface OfferData {
    items: OfferItem[];
    totalM3: number;
    calculatedHours: number;
    createdAt: number; // Add creation timestamp
    vehicle?: string;
}

interface OfferContextType {
  offerCustomer: Customer | null;
  offerItems: OfferItem[];
  totalM3: number;
  calculatedHours: number;
  offerData: OfferData | null;
  setOfferData: (customer: Customer | null, items: OfferItem[], totalM3: number, calculatedHours: number, vehicle?: string) => void;
  updateOfferItem: (id: string, updatedItem: Partial<OfferItem>) => void;
  addOfferItem: (item: OfferItem) => void;
  removeOfferItem: (id: string) => void;
}

const OfferContext = createContext<OfferContextType | undefined>(undefined);

export function OfferProvider({ children }: { children: ReactNode }) {
  const [offerCustomer, setOfferCustomer] = useState<Customer | null>(null);
  const [offerItems, setOfferItems] = useState<OfferItem[]>([]);
  const [totalM3, setTotalM3] = useState(0);
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [offerData, setStoredOfferData] = useState<OfferData | null>(null);


  const setOfferData = useCallback((customer: Customer | null, items: OfferItem[], m3: number, hours: number, vehicle?: string) => {
    setOfferCustomer(customer);
    setOfferItems(items);
    setTotalM3(m3);
    setCalculatedHours(hours);
    setStoredOfferData({ items, totalM3: m3, calculatedHours: hours, createdAt: Date.now(), vehicle });
  }, []);
  
  const updateOfferItem = (id: string, updatedItem: Partial<OfferItem>) => {
    setOfferItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, ...updatedItem, total: (updatedItem.quantity ?? item.quantity) * (updatedItem.unitPrice ?? item.unitPrice) } : item
      )
    );
  };
  
  const addOfferItem = (item: OfferItem) => {
    setOfferItems(prevItems => [...prevItems, item]);
  };

  const removeOfferItem = (id: string) => {
    setOfferItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  return (
    <OfferContext.Provider value={{ offerCustomer, offerItems, totalM3, calculatedHours, offerData, setOfferData, updateOfferItem, addOfferItem, removeOfferItem }}>
      {children}
    </OfferContext.Provider>
  );
}

export function useOffer() {
  const context = useContext(OfferContext);
  if (context === undefined) {
    throw new Error('useOffer must be used within an OfferProvider');
  }
  return context;
}
