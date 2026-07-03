
'use client';
import { useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { useCollection, useMemoFirebase } from '@/firebase';
import { query, collection } from 'firebase/firestore';
import type { Employee } from '@/lib/mitarbeiter-data';

export function useEmployees() {
  const { firestore, user } = useFirebase();

  const employeesQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'workers')) : null),
    [firestore, user]
  );
  
  const { data: employees, isLoading, error } = useCollection<Employee>(employeesQuery);

  return { employees, isLoading, error };
}
