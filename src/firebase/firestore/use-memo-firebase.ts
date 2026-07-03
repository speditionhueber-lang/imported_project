'use client';
import { useMemo } from 'react';
import type { Query, CollectionReference, DocumentReference } from 'firebase/firestore';

type Q = Query | CollectionReference | DocumentReference;
export function useMemoFirebase<T extends Q | null>(factory: () => T, deps: any[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const q = factory();
    if (q) {
      (q as T & { __memo?: boolean }).__memo = true;
    }
    return q;
  }, deps);
}
