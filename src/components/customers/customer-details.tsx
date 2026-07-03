// src/components/customers/customer-details.tsx
'use client';

import type { Customer } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

//---------------------------------------------------------
// Hilfskomponenten
//---------------------------------------------------------
const DetailItem: React.FC<{ label: string; value?: any }> = ({ label, value }) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const camelToTitle = (s: string) =>
    s.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

  const formattedLabel = camelToTitle(label);
  
  let displayValue: React.ReactNode;

  if (typeof value === 'boolean') {
    displayValue = value ? 'Ja' : 'Nein';
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    // For nested objects, recursively render their properties.
    const nestedEntries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (nestedEntries.length === 0) return null;
    displayValue = (
      <div className="pl-4 mt-1 border-l-2 ml-auto w-full">
        {nestedEntries.map(([k, v]) => <DetailItem key={k} label={k} value={v} />)}
      </div>
    );
     return (
      <div className="w-full text-sm py-1">
        <p className="font-semibold text-muted-foreground">{formattedLabel}</p>
        {displayValue}
      </div>
    );
  } else {
    displayValue = String(value);
  }

  return (
    <div className="flex justify-between text-sm py-1 items-start">
      <p className="font-medium text-muted-foreground">{formattedLabel}</p>
      <p className="text-right max-w-[60%] break-words">{displayValue}</p>
    </div>
  );
};


const DetailSection: React.FC<{ title: string; data?: object | string | null }> = ({ title, data }) => {
  if (!data) return null;
  
  // Special handling for 'Gegenstände' as it is an object of items
  if (title === 'Gegenstände' && typeof data === 'object' && !Array.isArray(data)) {
    const items = Object.entries(data).filter(([, value]) => value && value !== '0' && String(value).toLowerCase() !== 'nein');
    if (items.length === 0) return null;
    
    const camelToTitle = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

    return (
      <div className="space-y-2 py-2">
          <h3 className="font-semibold text-base">{title}</h3>
          <div className="space-y-1">
              {items.map(([key, value]) => (
                 <div key={key} className="flex justify-between text-sm py-1">
                     <p className="text-muted-foreground">{camelToTitle(key)}</p>
                     <p className="font-medium">{String(value)}</p>
                 </div>
              ))}
          </div>
          <Separator />
      </div>
    );
  }
  
  if (typeof data === 'string' && data.trim()) {
      return (
         <div className="space-y-2 py-2">
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {data}
            </p>
            <Separator />
        </div>
      )
  }
  
  if (typeof data === 'object' && !Array.isArray(data)) {
    const entries = Object.entries(data).filter(
      ([, v]) => v !== null && v !== undefined && v !== ''
    );
    if (entries.length === 0) return null;
    return (
      <div className="space-y-2 py-2">
        <h3 className="font-semibold text-base">{title}</h3>
        <div className="space-y-1">
          {entries.map(([k, v]) => (
            <DetailItem key={k} label={k} value={v} />
          ))}
        </div>
        <Separator />
      </div>
    );
  }
  
  return null;
};

//---------------------------------------------------------
// Hauptkomponente
//---------------------------------------------------------
export default function CustomerDetails({ customer }: { customer: Customer }) {
  
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2 py-2">
        <h3 className="font-semibold text-base">Kontaktdaten</h3>
        <DetailItem label="Email" value={customer?.email} />
        <DetailItem label="Telefon" value={customer?.phone} />
        <Separator />
      </div>

      <DetailSection title="Rechnungsadresse" data={customer?.address} />
      <DetailSection title="Umzugsdetails" data={customer?.umzugsdetails} />
      <DetailSection title="Abholadresse" data={customer?.abholadresse} />
      <DetailSection title="Zieladresse" data={customer?.zieladresse} />
      <DetailSection title="Nebenleistungen" data={customer?.nebenleistungen} />
      
      {/* Handle object-based 'gegenstaende' separately */}
      <DetailSection title="Gegenstände" data={customer?.gegenstaende} />
      
      {/* Handle string-based fields separately */}
      <DetailSection title="Anmerkungen" data={customer?.anmerkungen} />
      <DetailSection title="Transkript des Gesprächs" data={customer?.transcript} />
    </div>
  );
}
