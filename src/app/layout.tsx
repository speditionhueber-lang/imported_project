'use client';

import './globals.css';
import { AppLayout } from '@/components/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { RoleProvider } from '@/contexts/role-context';
import { CustomerProvider } from '@/contexts/customer-context';
import { InvoiceProvider } from '@/contexts/invoice-context';
import { OfferProvider } from '@/contexts/offer-context';
import { FirebaseClientProvider } from '@/firebase/client-provider';

// Metadata can still be exported from a Client Component layout
// export const metadata: Metadata = {
//   title: 'Hueber Büro',
//   description: 'Ein Starter-Kit zum Erstellen von Anwendungen mit Firestore.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
       <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased">
          <FirebaseClientProvider>
              <RoleProvider>
                <CustomerProvider>
                  <InvoiceProvider>
                    <OfferProvider>
                        <AppLayout>
                          {children}
                          <Toaster />
                        </AppLayout>
                    </OfferProvider>
                  </InvoiceProvider>
                </CustomerProvider>
              </RoleProvider>
          </FirebaseClientProvider>
      </body>
    </html>
  );
}
