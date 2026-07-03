
'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCustomer } from '@/contexts/customer-context';
import WegBerechnung from '@/components/berechnung/weg-berechnung';
import KubikmeterBerechnung, { type ItemCBM } from '@/components/berechnung/kubikmeter-berechnung';
import KostenZusammenfassung from '@/components/berechnung/kosten-zusammenfassung';
import ParameterBerechnung from '@/components/berechnung/parameter-berechnung';
import TragewegBerechnung from '@/components/berechnung/trageweg-berechnung';
import StockwerkBerechnung from '@/components/berechnung/stockwerk-berechnung';
import Zusatzleistungen, { type ExtraService } from '@/components/berechnung/zusatzleistungen';
import type { Customer } from '@/lib/types';
import * as berechnungsParameter from '@/lib/berechnungs-parameter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CustomersTable from '@/components/customers/customers-table';
import { PlusCircle } from 'lucide-react';
import NewCustomerForm from '@/components/customers/new-customer-form';
import CustomerDetails from '@/components/customers/customer-details';

const getNumberFromText = (text: string | undefined | null): number | undefined => {
    if (typeof text === 'number') return text;
    if (!text) return undefined;
    const cleanedText = String(text).replace('–', '-');
    const numbers = cleanedText.match(/\d+([.,]\d+)?/g);
    if (numbers && numbers.length > 0) {
        const parsedNumbers = numbers.map(n => parseFloat(n.replace(',', '.')));
        return Math.max(...parsedNumbers);
    }
    return undefined;
};

const emptyCustomer: Customer = {
    id: `new_${Date.now()}`,
    name: '',
    email: '',
    phone: '',
    address: { street: '', city: '', zip: '', country: '' },
    nameLower: '',
    createdAt: new Date().toISOString(),
    avatarUrl: '',
};


export default function BerechnungPage() {
  const { 
    selectedCustomer, 
    setSelectedCustomer, 
    setCustomerState, 
    customerStates,
    isNewCustomerMode,
    setIsNewCustomerMode,
    NEW_CUSTOMER_STATE_ID,
  } = useCustomer();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [totalM3, setTotalM3] = useState(0);
  const [totalKm, setTotalKm] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [activeExtras, setActiveExtras] = useState<ExtraService[]>([]);
  const [vehicle, setVehicle] = useState('LKW 7,5t');
  const [includeTravelHoursInPersonnel, setIncludeTravelHoursInPersonnel] = useState(true);

  const [localCustomer, setLocalCustomer] = useState<Customer | null>(null);
  const localCustomerRef = useRef(localCustomer);

  useEffect(() => {
    localCustomerRef.current = localCustomer;
  }, [localCustomer]);

  const [calcParams, setCalcParams] = useState({
      pickupDistance: 0,
      destinationDistance: 0,
      pickupFloor: 0,
      destinationFloor: 0,
      pickupElevator: 'none',
      destinationElevator: 'none',
      selfProvidedPersonnel: 0,
      kitchenMeters: 0,
      assemblyHours: 0,
      hvzCount: 0,
      carryWayFactor: berechnungsParameter.CARRY_MAN_HOUR_FACTOR,
      carrierRate: berechnungsParameter.CARRIER_RATE,
  });

  const customerForDisplay = isNewCustomerMode ? localCustomer : selectedCustomer;
  
  useEffect(() => {
    let sourceState;
    if (isNewCustomerMode) {
        setLocalCustomer(emptyCustomer);
        sourceState = customerStates[NEW_CUSTOMER_STATE_ID];
    } else if (selectedCustomer) {
        setLocalCustomer(selectedCustomer);
        sourceState = customerStates[selectedCustomer.id];
    } else {
        setLocalCustomer(null);
    }

    if (sourceState?.calculationParams) {
        setCalcParams(sourceState.calculationParams);
    } else if (isNewCustomerMode || selectedCustomer) {
        const customerToUse = isNewCustomerMode ? emptyCustomer : selectedCustomer;
        const getNum = (text: string | undefined | null, fallback = 0) => getNumberFromText(text) ?? fallback;
        setCalcParams({
            pickupDistance: getNum(customerToUse?.abholadresse?.entfernungLKW, 0),
            destinationDistance: getNum(customerToUse?.zieladresse?.entfernungLKW, 0),
            pickupFloor: getNum(customerToUse?.abholadresse?.stockwerk, 0),
            destinationFloor: getNum(customerToUse?.zieladresse?.stockwerk, 0),
            pickupElevator: customerToUse?.abholadresse?.aufzugsgroesse?.toLowerCase() || 'none',
            destinationElevator: customerToUse?.zieladresse?.aufzugsgroesse?.toLowerCase() || 'none',
            selfProvidedPersonnel: getNum(customerToUse?.zusatzoptionen?.helfer, 0),
            hvzCount: customerToUse?.nebenleistungen?.einrichtenHVZ ? 1 : 0,
            kitchenMeters: 0,
            assemblyHours: 0,
            carryWayFactor: berechnungsParameter.CARRY_MAN_HOUR_FACTOR,
            carrierRate: berechnungsParameter.CARRIER_RATE,
        });
    }

    if (selectedCustomer) {
      setCustomerState(selectedCustomer.id, { highlightedNav: { '/berechnung': 'pending' } });
      setIsDialogOpen(false);
    }

    if (isNewCustomerMode) {
      setTotalM3(0);
    } else if (selectedCustomer && customerStates[selectedCustomer.id]?.offerData?.totalM3) {
      setTotalM3(customerStates[selectedCustomer.id].offerData!.totalM3);
    } else if (selectedCustomer?.gegenstaende) {
      // Recalculate if no offerData exists
    }


  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer, isNewCustomerMode]);

  const handleWegBerechnet = (km: number, duration: number, vehicle: string) => {
    setTotalKm(km);
    setTotalDuration(duration);
    setVehicle(vehicle);
  };
  
  const handleStartNewCalculation = () => {
    setSelectedCustomer(null);
    setIsNewCustomerMode(true);
  }
  
  const handleAddressChange = (type: 'kundenStart' | 'kundenZiel', value: string) => {
    setLocalCustomer(prev => {
        if (!prev) return null;
        if (type === 'kundenStart') {
            return { ...prev, abholadresse: { ...prev.abholadresse, strasse: value } };
        } else {
            return { ...prev, zieladresse: { ...prev.zieladresse, strasse: value } };
        }
    });
  };

  const handleItemsChange = (items: ItemCBM[]) => {
      setLocalCustomer(prev => {
          if (!prev) return null;
          const newGegenstaende = items.reduce((acc, item) => {
              acc[item.key] = item.count;
              return acc;
          }, {} as Record<string, number>);
          return { ...prev, gegenstaende: newGegenstaende };
      });
  };

  if (!localCustomer) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Kein Kunde ausgewählt</CardTitle>
                <CardDescription>Bitte wählen Sie einen Kunden aus oder starten Sie eine neue Berechnung.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>Bestehenden Kunden auswählen</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-4/5 flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Kunden auswählen</DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow min-h-0">
                            <CustomersTable />
                        </div>
                    </DialogContent>
                </Dialog>
                <Button variant="secondary" onClick={handleStartNewCalculation}><PlusCircle className="mr-2 h-4 w-4"/> Neue Berechnung</Button>
            </CardContent>
        </Card>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                    Berechnung für: {isNewCustomerMode ? 'Neuer Kunde' : localCustomer.name}
                </h1>
                <Button variant="outline" size="icon" onClick={handleStartNewCalculation} title="Neue leere Berechnung starten">
                    <PlusCircle className="h-5 w-5" />
                </Button>
            </div>

            {isNewCustomerMode && (
                <Card>
                <CardHeader>
                    <CardTitle>Neue Kundendaten</CardTitle>
                </CardHeader>
                <CardContent>
                    <NewCustomerForm customer={localCustomer} setCustomer={setLocalCustomer} />
                </CardContent>
                </Card>
            )}
            
            <WegBerechnung 
                customer={localCustomer} 
                onWegBerechnet={handleWegBerechnet} 
                includeTravelHours={includeTravelHoursInPersonnel}
                onIncludeTravelHoursChange={setIncludeTravelHoursInPersonnel}
                kundenStart={localCustomer.abholadresse?.strasse || ''}
                setKundenStart={(value) => handleAddressChange('kundenStart', value)}
                kundenZiel={localCustomer.zieladresse?.strasse || ''}
                setKundenZiel={(value) => handleAddressChange('kundenZiel', value)}
            />
            <KubikmeterBerechnung 
                customer={localCustomer} 
                onTotalM3Change={setTotalM3}
                initialM3={totalM3}
                onItemsChange={handleItemsChange}
            />
            <ParameterBerechnung customer={localCustomer} params={calcParams} setParams={setCalcParams} />
            <TragewegBerechnung totalM3={totalM3} params={calcParams} setParams={setCalcParams} />
            <StockwerkBerechnung totalM3={totalM3} params={calcParams} />
            <Zusatzleistungen totalM3={totalM3} onActiveServicesChange={setActiveExtras} />
            
            {localCustomer.anmerkungen && (
                <Card>
                <CardHeader>
                    <CardTitle>Anmerkungen vom Kunden</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {localCustomer.anmerkungen}
                    </p>
                </CardContent>
                </Card>
            )}

            <KostenZusammenfassung 
                customer={localCustomerRef.current}
                totalM3={totalM3}
                distanceKm={totalKm}
                travelDurationHours={totalDuration / 3600}
                vehicle={vehicle}
                params={calcParams}
                activeExtras={activeExtras}
                includeTravelHoursInPersonnel={includeTravelHoursInPersonnel}
                isNewCustomerMode={isNewCustomerMode}
            />
        </div>
        <div className="lg:col-span-1 space-y-6 sticky top-6">
            <Card>
                <CardHeader>
                    <CardTitle>{customerForDisplay ? customerForDisplay.name : 'Kein Kunde ausgewählt'}</CardTitle>
                </CardHeader>
                <CardContent>
                    {customerForDisplay ? (
                    <CustomerDetails customer={customerForDisplay} />
                    ) : (
                    <p className="text-center text-muted-foreground py-10">
                        Wählen Sie einen Kunden aus oder starten Sie eine neue Berechnung.
                    </p>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
