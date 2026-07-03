'use client';
import { useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { useCollection, useMemoFirebase } from '@/firebase';
import { query, collection } from 'firebase/firestore';
import { normalizeCustomerData } from '@/lib/customer-adapter';
import { customers as staticCustomers } from '@/lib/data';
import { importedCustomers } from '@/lib/imported-data';
import type { Customer } from '@/lib/types';

const isObject = (obj: any): obj is object => obj !== null && typeof obj === 'object' && !Array.isArray(obj);

// Merges two customer objects, preferring values from the 'newer' object (b)
const mergeCustomers = (a: Customer, b: Customer): Customer => {
    const result: any = { ...a };

    for (const key in b) {
        const bValue = (b as any)[key];
        const aValue = (a as any)[key];

        // If b has a value, use it. If b's value is an empty object, prefer a's value if it's not empty.
        if (bValue !== undefined && bValue !== null && bValue !== '') {
             if (isObject(bValue) && Object.keys(bValue).length === 0 && isObject(aValue) && Object.keys(aValue).length > 0) {
                 result[key] = aValue;
             } else if (isObject(bValue) && isObject(aValue)) {
                 result[key] = { ...aValue, ...bValue };
             }
             else {
                result[key] = bValue;
            }
        }
    }
    
    // Ensure the most recent createdAt date is kept
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateB > dateA) {
        result.createdAt = b.createdAt;
    }

    return result as Customer;
}


export function useAllCustomers() {
  const { firestore, user, isUserLoading } = useFirebase();

  const customersQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'customers')) : null),
    [firestore, user]
  );
  const { data: firestoreCustomers } = useCollection<Customer>(customersQuery);

  const inquiriesQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'inquiries')) : null),
    [firestore, user]
  );
  const { data: firestoreInquiries } = useCollection<any>(inquiriesQuery);

  const allCustomers = useMemo(() => {
    const customerMapByEmail = new Map<string, Customer>();

    const processAndMerge = (customers: any[]) => {
        customers.forEach(rawCustomer => {
            const customer = normalizeCustomerData(rawCustomer);
            const email = customer.email?.toLowerCase().trim();

            if (email) {
                if (customerMapByEmail.has(email)) {
                    const existingCustomer = customerMapByEmail.get(email)!;
                    customerMapByEmail.set(email, mergeCustomers(existingCustomer, customer));
                } else {
                    customerMapByEmail.set(email, customer);
                }
            } else {
                 // For customers without email, use ID to prevent accidental merging.
                 customerMapByEmail.set(customer.id || `no-email-${Date.now()}-${Math.random()}`, customer);
            }
        });
    };

    // Process in order of increasing priority (later sources can overwrite older ones)
    processAndMerge(staticCustomers);
    processAndMerge(importedCustomers);
    if (firestoreInquiries) {
        processAndMerge(firestoreInquiries);
    }
    if (firestoreCustomers) {
        processAndMerge(firestoreCustomers);
    }
    
    const customerArray = Array.from(customerMapByEmail.values());
    
    customerArray.sort((a, b) => {
        const getDateValue = (dateValue: any): number => {
            if (!dateValue) return 0;
            if (dateValue && typeof dateValue.toDate === 'function') {
                return dateValue.toDate().getTime();
            }
            const date = new Date(dateValue);
            return isNaN(date.getTime()) ? 0 : date.getTime();
        };

        const dateA = getDateValue(a.createdAt);
        const dateB = getDateValue(b.createdAt);
        
        return dateB - dateA;
    });

    return customerArray;
  }, [firestoreCustomers, firestoreInquiries]);

  return allCustomers;
}
