'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query
} from 'firebase/firestore'
import { initializeFirebase } from '@/firebase';
import { deriveCustomerMeta, type RawDoc } from '@/lib/customer-adapter';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function CustomersDebugPage() {
  const [customers, setCustomers] = useState<RawDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { firestore } = initializeFirebase();
    const db = firestore;
    const q = query(collection(db, 'customers'));

    getDocs(q)
      .then(snapshot => {
        const list: RawDoc[] = []
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }))
        setCustomers(list)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-4">⏳ Lade Kunden …</div>
  if (error) return <div className="p-4 text-red-500">Fehler: {error}</div>

  const safe = (v: any) => (v === null || v === undefined ? '' : String(v))

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🔥 Customers Debug (Vollansicht)</h1>
      <p className="text-sm opacity-70">
        Diese Seite rendert den kompletten JSON-Inhalt je Dokument und nutzt den Adapter, um die wichtigsten Felder robust abzuleiten.
      </p>

      {customers.map(c => {
        const { name, email, phone, createdAt } = deriveCustomerMeta(c);

        return (
          <div key={c.id} className="p-4 border rounded-lg bg-gray-50 overflow-auto">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-semibold">
                {safe(name) || '(kein Name)'} — <span className="opacity-70">{c.id}</span>
              </h2>
              <div className="text-sm opacity-80 space-x-2">
                <span>{safe(email)}</span>
                <span>{safe(phone)}</span>
                <span className="font-mono text-xs">{createdAt ? format(createdAt, 'dd.MM.yyyy', {locale: de}) : 'kein Datum'}</span>
              </div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer select-none text-xs text-muted-foreground">Gesamter Roh-Datensatz (JSON)</summary>
              <pre className="text-xs whitespace-pre-wrap mt-2">
                {JSON.stringify(c, null, 2)}
              </pre>
            </details>
          </div>
        )
      })}
    </div>
  )
}
