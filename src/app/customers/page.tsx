'use client';

import { Suspense, useState } from 'react';
import CustomerDetails from '@/components/customers/customer-details';
import CustomersTable from '@/components/customers/customers-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import Link from 'next/link';
import type { Customer } from '@/lib/types';
import { useCustomer } from '@/contexts/customer-context';

export default function CustomersPage() {
  const { selectedCustomer, setSelectedCustomer } = useCustomer();

  const handleShowDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
  };
  
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<div>Lade Kunden...</div>}>
            <CustomersTable showDetailsFor={handleShowDetails} />
          </Suspense>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{selectedCustomer ? selectedCustomer.name : 'Kein Kunde ausgewählt'}</CardTitle>
            </CardHeader>
            <CardContent>
                {selectedCustomer ? (
                  <CustomerDetails customer={selectedCustomer} />
                ) : (
                  <p className="text-center text-muted-foreground py-10">
                    Wählen Sie einen Kunden aus der Liste aus, um die Details anzuzeigen.
                  </p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
