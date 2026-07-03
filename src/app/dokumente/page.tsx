
'use client';
import { useState, Suspense } from 'react';
import type { Customer } from '@/lib/types';
import { useCustomer } from '@/contexts/customer-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomersTable from '@/components/customers/customers-table';
import FileManager from '@/components/documents/file-manager';
import { Skeleton } from '@/components/ui/skeleton';

export default function DokumentePage() {
    const { selectedCustomer, setSelectedCustomer } = useCustomer();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsDialogOpen(false);
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Dokumenten-Explorer</CardTitle>
                            <CardDescription>
                                Verwalten Sie Ihre Dokumente und Ordner in Google Drive.
                            </CardDescription>
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    {selectedCustomer ? `Kunde: ${selectedCustomer.name}` : 'Kunde auswählen'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-4/5 flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Kunden auswählen</DialogTitle>
                                </DialogHeader>
                                <div className="flex-grow min-h-0">
                                    <CustomersTable onCustomerSelect={handleCustomerSelect} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
            </Card>

            <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
                <FileManager selectedCustomer={selectedCustomer} />
            </Suspense>
        </div>
    );
}
