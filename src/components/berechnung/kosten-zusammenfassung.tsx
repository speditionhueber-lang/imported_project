
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Customer } from '@/lib/types';
import { useOffer, type OfferItem } from '@/contexts/offer-context';
import { useCustomer } from '@/contexts/customer-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import * as params from '@/lib/berechnungs-parameter';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ExtraService } from './zusatzleistungen';
import { cn } from '@/lib/utils';
import { Job } from '@/lib/types';
import { addDoc, collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { normalizeCustomerData } from '@/lib/customer-adapter';

interface KostenZusammenfassungProps {
  customer: Customer | null;
  totalM3: number;
  distanceKm: number;
  travelDurationHours: number;
  vehicle: string;
  params: {
    pickupDistance: number;
    destinationDistance: number;
    pickupFloor: number;
    destinationFloor: number;
    pickupElevator: string;
    destinationElevator: string;
    selfProvidedPersonnel: number;
    kitchenMeters: number;
    assemblyHours: number;
    hvzCount: number;
    carryWayFactor: number;
    carrierRate: number;
  };
  activeExtras: ExtraService[];
  includeTravelHoursInPersonnel: boolean;
  isNewCustomerMode?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const EditableField = ({ label, value, onChange, unit, isCurrency = false, isHighlighted = false }: { label: string, value: number, onChange: (value: number) => void, unit?: string, isCurrency?: boolean, isHighlighted?: boolean }) => (
  <div className="flex items-center justify-between">
    <Label>{label}</Label>
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn("w-28 text-right", isHighlighted && "border-yellow-500/80")}
      />
      {isCurrency ? <span>€</span> : <span>{unit}</span>}
    </div>
  </div>
);


export default function KostenZusammenfassung({ customer, totalM3, distanceKm, travelDurationHours, vehicle, params: calcParams, activeExtras, includeTravelHoursInPersonnel, isNewCustomerMode }: KostenZusammenfassungProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setOfferData } = useOffer();
  const { selectedCustomer, setSelectedCustomer, setCustomerState, customerStates } = useCustomer();
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const {
      pickupDistance,
      destinationDistance,
      pickupFloor,
      destinationFloor,
      pickupElevator,
      destinationElevator,
      selfProvidedPersonnel,
      kitchenMeters,
      assemblyHours,
      hvzCount,
      carryWayFactor,
      carrierRate
  } = calcParams;


  const [isFixedBooking, setIsFixedBooking] = useState(false);

  // Einstellbare Stundensätze und Arbeitskräfte
  const [vehicleRates, setVehicleRates] = useState(params.VEHICLE_RATES);
  const [workforce, setWorkforce] = useState(1);

  const handleRateChange = (vehicle: keyof typeof vehicleRates, rate: number) => {
    setVehicleRates(prev => ({...prev, [vehicle]: rate}));
  }
  
  // Stundensatz für das ausgewählte Fahrzeug
  const hourlyRate = useMemo(() => {
    if (vehicle === 'Sprinter') return vehicleRates.SPRINTER_RATE;
    if (vehicle === 'LKW 7,5t') return vehicleRates.LKW_7_5_RATE;
    return vehicleRates.LKW_12_RATE;
  }, [vehicle, vehicleRates]);
  
  // Berechnung der benötigten Arbeitskräfte, wird als Vorschlag verwendet
  const calculatedWorkforce = useMemo(() => {
    if (totalM3 <= 0) return 1;
    if (totalM3 <= 10) return 2;
    // For every 10m3 more, add one person. 11-20 -> 3, 21-30 -> 4, etc.
    return 2 + Math.floor((totalM3 - 1) / 10);
  }, [totalM3]);

  // Beim Ändern der m³ wird der Vorschlag für Arbeitskräfte aktualisiert
  useEffect(() => {
    setWorkforce(calculatedWorkforce);
  }, [calculatedWorkforce]);


  // KOSTENBERECHNUNG
  
  // 1. Fahrtkosten
  const distanceCost = travelDurationHours * hourlyRate;

  // 2. Trageweg-Kosten
  const pickupCarryCost = totalM3 * pickupDistance * carryWayFactor * carrierRate;
  const destinationCarryCost = totalM3 * destinationDistance * carryWayFactor * carrierRate;
  
  // 3. Stockwerk-Kosten
  const getFloorFactor = (floor: number) => {
    if (floor < 0) return 0;
    return 0.20 + (floor * 0.05);
  };
  
  const getFloorCost = (floor: number, elevatorSize: string) => {
    const floorFactor = getFloorFactor(floor);
    const elevatorFactor = params.ELEVATOR_FACTORS[elevatorSize] ?? 1;
    const finalFactor = floorFactor * elevatorFactor;
    return totalM3 * finalFactor * carrierRate;
  };
  
  const pickupFloorCost = getFloorCost(pickupFloor, pickupElevator);
  const destinationFloorCost = getFloorCost(destinationFloor, destinationElevator);
  
  const carryAndFloorSurcharge = pickupCarryCost + destinationCarryCost + pickupFloorCost + destinationFloorCost;


  // 4. Personalstunden & Kosten
  const workforceReduction = selfProvidedPersonnel * params.MAN_HOUR_REDUCTION_FACTOR;
  const finalWorkforce = Math.max(1, Math.ceil(workforce - workforceReduction));

  const loadingHours = totalM3 * params.MAN_HOUR_FACTOR;
  
  const getFloorManHours = (floor: number, elevatorSize: string) => {
      const floorFactor = getFloorFactor(floor);
      const elevatorFactor = params.ELEVATOR_FACTORS[elevatorSize] ?? 1;
      return totalM3 * floorFactor * elevatorFactor;
  };

  const pickupFloorHours = getFloorManHours(pickupFloor, pickupElevator);
  const destinationFloorHours = getFloorManHours(destinationFloor, destinationElevator);
  
  const carryWayPickupMh = totalM3 * pickupDistance * carryWayFactor;
  const carryWayDestinationMh = totalM3 * destinationDistance * carryWayFactor;

  const personnelTravelHours = travelDurationHours * Math.max(0, finalWorkforce - 1);
  const personnelTravelCost = includeTravelHoursInPersonnel ? personnelTravelHours * carrierRate : 0;
  
  const totalWorkHours = loadingHours + pickupFloorHours + destinationFloorHours + carryWayPickupMh + carryWayDestinationMh;
  const totalManHours = includeTravelHoursInPersonnel ? totalWorkHours + personnelTravelHours : totalWorkHours;
  
  
  // 5. Zusatzleistungen
  const assemblyCost = assemblyHours * params.ASSEMBLY_WORKER_RATE;
  const kitchenAssemblyCost = kitchenMeters * params.KITCHEN_ASSEMBLY_HOURS_PER_METER * params.ASSEMBLY_WORKER_RATE;
  const hvzCost = hvzCount * params.HVZ_PRICE_PER_ZONE;
  const tollCost = (distanceKm / 3) * params.TOLL_COSTS.DEFAULT; // Simplified
  const overnightCost = (finalWorkforce > params.OVERNIGHT_WORKFORCE_THRESHOLD || distanceKm > params.OVERNIGHT_DISTANCE_THRESHOLD_KM) ? finalWorkforce * params.OVERNIGHT_COSTS_PER_PERSON : 0;
  
  const totalExtras = activeExtras.reduce((sum, service) => sum + service.cost, 0);
  
  const subTotal =
    distanceCost +
    carryAndFloorSurcharge +
    assemblyCost +
    kitchenAssemblyCost +
    hvzCost +
    tollCost +
    overnightCost +
    totalExtras +
    personnelTravelCost;

  const discount = isFixedBooking ? subTotal * params.FIXED_BOOKING_DISCOUNT : 0;
  const total = subTotal - discount;

  const createOfferItems = (): OfferItem[] => {
    const items: OfferItem[] = [];
    if (distanceCost > 0) items.push({ id: 'fahrtkosten', description: 'Fahrtkosten', quantity: travelDurationHours, unit: 'h', unitPrice: hourlyRate, total: distanceCost });
    
    if(includeTravelHoursInPersonnel && personnelTravelCost > 0) {
        items.push({ id: 'personal_fahrtzeit', description: 'Fahrzeit Personal', quantity: personnelTravelHours, unit: 'h', unitPrice: carrierRate, total: personnelTravelCost });
    }

    if (carryAndFloorSurcharge > 0) {
        items.push({ id: 'trageweg_stockwerk_zuschlag', description: 'Trageweg/Stockwerk Zuschlag', quantity: 1, unit: 'Pauschal', unitPrice: carryAndFloorSurcharge, total: carryAndFloorSurcharge });
    }

    if (assemblyCost > 0) items.push({ id: 'moebelmontage', description: 'Möbelmontage', quantity: assemblyHours, unit: 'Stunden', unitPrice: params.ASSEMBLY_WORKER_RATE, total: assemblyCost });
    if (kitchenAssemblyCost > 0) items.push({ id: 'kuechenmontage', description: 'Küchenmontage', quantity: kitchenMeters, unit: 'lfm', unitPrice: params.KITCHEN_ASSEMBLY_HOURS_PER_METER * params.ASSEMBLY_WORKER_RATE, total: kitchenAssemblyCost });
    if (hvzCost > 0) items.push({ id: 'hvz', description: 'Halteverbotszone(n)', quantity: hvzCount, unit: 'Zone(n)', unitPrice: params.HVZ_PRICE_PER_ZONE, total: hvzCost });
    if (tollCost > 0) items.push({ id: 'maut', description: 'Maut', quantity: 1, unit: 'Pauschal', unitPrice: tollCost, total: tollCost });
    if (overnightCost > 0) items.push({ id: 'uebernachtung', description: 'Übernachtungskosten', quantity: finalWorkforce, unit: 'P.', unitPrice: params.OVERNIGHT_COSTS_PER_PERSON, total: overnightCost });
    
    activeExtras.forEach(service => {
        items.push({
            id: service.id,
            description: service.name,
            quantity: 1,
            unit: 'Pauschal',
            unitPrice: service.cost,
            total: service.cost
        });
    });
    
    if (isFixedBooking) items.push({ id: 'rabatt', description: 'Rabatt (Feste Buchung)', quantity: 1, unit: 'Pauschal', unitPrice: -discount, total: -discount });
    return items;
  }

  const handleCreateOffer = async () => {
    let finalCustomer: Customer;
    
    if (!firestore) {
        toast({ variant: "destructive", title: "Fehler", description: "Datenbankverbindung nicht verfügbar." });
        return;
    }
    
    if (!customer) {
        toast({ variant: "destructive", title: "Fehler", description: "Kein Kunde ausgewählt oder definiert." });
        return;
    }

    if (isNewCustomerMode) {
      if (!customer.name) {
         toast({ variant: "destructive", title: "Fehler", description: "Bitte geben Sie einen Kundennamen ein." });
        return;
      }
      const dataToSave = normalizeCustomerData(customer, calcParams);
      try {
        const docRef = await addDoc(collection(firestore, 'customers'), {
            ...dataToSave,
            createdAt: serverTimestamp(),
        });
        finalCustomer = { ...dataToSave, id: docRef.id, createdAt: new Date().toISOString() };
        setSelectedCustomer(finalCustomer);
      } catch (error) {
        console.error("Error adding customer:", error);
        toast({ variant: "destructive", title: "Fehler beim Speichern", description: "Der Kunde konnte nicht in der Datenbank gespeichert werden." });
        return;
      }
    } else {
        finalCustomer = customer;
        const dataToSave = normalizeCustomerData(finalCustomer, calcParams);
        try {
            const docRef = doc(firestore, 'customers', finalCustomer.id);
            await setDoc(docRef, dataToSave, { merge: true });
        } catch (error) {
            console.error("Error updating customer:", error);
            toast({ variant: "destructive", title: "Fehler beim Speichern", description: "Die Kundendaten konnten nicht aktualisiert werden." });
            return;
        }
    }


    if (finalCustomer) {
      const offerItems = createOfferItems();
      const offerData = {
        items: offerItems,
        totalM3,
        calculatedHours: totalManHours,
        createdAt: Date.now(),
        vehicle,
      };
      
      setOfferData(finalCustomer, offerItems, totalM3, totalManHours, vehicle);
      
      setCustomerState(finalCustomer.id, {
        offerData,
        highlightedNav: { '/berechnung': 'completed', '/angebot': 'pending' },
        calculationParams: calcParams
      });

      router.push('/angebot');
      toast({
        title: "Angebotsdaten erstellt",
        description: `Die Berechnung für ${finalCustomer.name} wurde zum Angebot übertragen.`,
      });
    }
  };

  const estimatedJobTime = finalWorkforce > 0 ? totalManHours / finalWorkforce : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kostenübersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <h3 className="font-semibold text-lg">Stundensätze & Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField label="Satz Sprinter" value={vehicleRates.SPRINTER_RATE} onChange={(rate) => handleRateChange('SPRINTER_RATE', rate)} isCurrency/>
          <EditableField label="Satz LKW 7,5t" value={vehicleRates.LKW_7_5_RATE} onChange={(rate) => handleRateChange('LKW_7_5_RATE', rate)} isCurrency/>
          <EditableField label="Satz LKW 12t" value={vehicleRates.LKW_12_RATE} onChange={(rate) => handleRateChange('LKW_12_RATE', rate)} isCurrency/>
          <EditableField label="Benötigte Arbeitskräfte" value={workforce} onChange={setWorkforce} unit="P." isHighlighted={true} />
        </div>

        <Separator />

        <h3 className="font-semibold text-lg">Berechnungsdetails</h3>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between"><p>Fahrzeug:</p> <p className="font-medium">{vehicle}</p></div>
            <div className="flex justify-between"><p>Benötigte Arbeitskräfte (final):</p> <p className="font-medium">{finalWorkforce}</p></div>
            {includeTravelHoursInPersonnel && <div className="flex justify-between"><p>Personal-Fahrstunden (Hilfspersonal):</p> <p className="font-medium">{personnelTravelHours.toFixed(2)} h</p></div>}
            <div className="flex justify-between"><p>Geschätzte Arbeitsstunden (vor Ort):</p> <p className="font-medium">{totalWorkHours.toFixed(2)} h</p></div>
            <div className="flex justify-between font-semibold"><p>Geschätzte Personalstunden (Gesamt):</p> <p className="font-medium">{totalManHours.toFixed(2)} h</p></div>
            <div className="flex justify-between"><p>Geschätzte Auftragszeit pro Mitarbeiter:</p> <p className="font-medium">{estimatedJobTime.toFixed(2)} h</p></div>
        </div>

        <Separator />

        <h3 className="font-semibold text-lg">Kostenaufstellung</h3>
         <div className="space-y-2 text-sm">
            <div className="flex justify-between"><p>Fahrtkosten (Fahrzeug inkl. Fahrer):</p> <p>{formatCurrency(distanceCost)}</p></div>
            {includeTravelHoursInPersonnel && <div className="flex justify-between"><p>Fahrzeit Personal (Hilfspersonal):</p> <p>{formatCurrency(personnelTravelCost)}</p></div>}
            <div className="flex justify-between"><p>Trageweg/Stockwerk Zuschlag:</p> <p>{formatCurrency(carryAndFloorSurcharge)}</p></div>
            <div className="flex justify-between"><p>Möbelmontage:</p> <p>{formatCurrency(assemblyCost)}</p></div>
            <div className="flex justify-between"><p>Küchenmontage:</p> <p>{formatCurrency(kitchenAssemblyCost)}</p></div>
            {activeExtras.map(service => (
                <div key={service.id} className="flex justify-between">
                    <p>{service.name}:</p>
                    <p>{formatCurrency(service.cost)}</p>
                </div>
            ))}
            <Separator className="my-2"/>
            <div className="flex justify-between font-semibold"><p>Zwischensumme:</p> <p>{formatCurrency(subTotal)}</p></div>
             {isFixedBooking && (
                <div className="flex justify-between text-green-600"><p>Rabatt (5%):</p> <p>-{formatCurrency(discount)}</p></div>
             )}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <Label htmlFor="fixed-booking" className="flex flex-col">
                <span className="font-semibold">Feste Buchungsbestätigung</span>
                <span className="text-sm text-muted-foreground">5% Rabatt sichern</span>
            </Label>
            <Switch id="fixed-booking" checked={isFixedBooking} onCheckedChange={setIsFixedBooking} />
        </div>
        <div className="text-right">
            <p className="text-muted-foreground">Gesamtkosten</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        </div>
        <Button size="lg" className="w-full" onClick={handleCreateOffer}>Angebot erstellen</Button>
      </CardFooter>
    </Card>
  );
}
