'use client';

import { useState, useEffect } from 'react';
import type { Customer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateDistance } from '@/actions/calculate-distance';
import { Loader2, Route, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
// import AddressAutocomplete from '../shared/address-autocomplete';

type Etappe = {
  distanz: number; // in metern
  dauer: number; // in sekunden
  distanzText: string;
  dauerText: string;
};

interface WegBerechnungProps {
    customer: Customer;
    onWegBerechnet: (totalKm: number, totalDuration: number, vehicle: string) => void;
    includeTravelHours: boolean;
    onIncludeTravelHoursChange: (checked: boolean) => void;
    kundenStart: string;
    setKundenStart: (value: string) => void;
    kundenZiel: string;
    setKundenZiel: (value: string) => void;
}

type VehicleType = 'Sprinter' | 'LKW 7,5t' | 'LKW 12t';
type CalculationStatus = 'idle' | 'loading' | 'error' | 'success';


export default function WegBerechnung({ 
    customer, 
    onWegBerechnet, 
    includeTravelHours, 
    onIncludeTravelHoursChange,
    kundenStart,
    setKundenStart,
    kundenZiel,
    setKundenZiel,
}: WegBerechnungProps) {
  const { toast } = useToast();
  const [basisStart, setBasisStart] = useState('Andreas-Hofer-Straße 42, 6020 Innsbruck, Österreich');
  const [basisZiel, setBasisZiel] = useState('Andreas-Hofer-Straße 42, 6020 Innsbruck, Österreich');
  
  const [calculationStatus, setCalculationStatus] = useState<CalculationStatus>('idle');
  const [etappen, setEtappen] = useState<Etappe[]>([]);
  
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('LKW 7,5t');

  const [totalKm, setTotalKm] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const handleBerechnen = async () => {
      setCalculationStatus('loading');
      setEtappen([]);

      if (!kundenStart || !kundenZiel) {
        toast({
          variant: "destructive",
          title: "Fehlende Adressen",
          description: "Bitte geben Sie eine gültige Start- und Zieladresse für den Kunden an.",
        });
        setCalculationStatus('error');
        return;
      }

      const route: [string, string][] = [
        [basisStart, kundenStart],
        [kundenStart, kundenZiel],
        [kundenZiel, basisZiel],
      ];

      try {
        const results: Etappe[] = [];
        for (const leg of route) {
          const result = await calculateDistance({ origin: leg[0], destination: leg[1] });
          results.push({
            distanz: result.distance.value,
            dauer: result.duration.value,
            distanzText: result.distance.text,
            dauerText: result.duration.text,
          });
        }
        setEtappen(results);
        const totalMeters = results.reduce((sum, e) => sum + e.distanz, 0);
        setTotalKm(totalMeters / 1000);
        setCalculationStatus('success');

      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Fehler bei der Berechnung",
          description: error.message || "Die Wegstrecke konnte nicht berechnet werden. Bitte überprüfen Sie die Adressen.",
        });
        setCalculationStatus('error');
      }
    };

  const openGoogleMaps = (address: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
    window.open(url, '_blank');
  };


  useEffect(() => {
    if (calculationStatus !== 'success') return;
    
    const vehicleFactors: Record<VehicleType, number> = {
      'Sprinter': 1.10,  // +10%
      'LKW 7,5t': 1.25,  // +25%
      'LKW 12t': 1.35,   // +35%
    };

    const baseDurationInSeconds = etappen.reduce((sum, e) => sum + e.dauer, 0);
    const finalDurationInSeconds = baseDurationInSeconds * vehicleFactors[selectedVehicle];
    
    setTotalDuration(finalDurationInSeconds);
    onWegBerechnet(totalKm, finalDurationInSeconds, selectedVehicle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etappen, selectedVehicle, calculationStatus, totalKm]);
  
  const formatTotalDuration = () => {
    if (totalDuration === 0) return '0 Min.';
    
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);

    let result = '';
    if (hours > 0) result += `${hours} Std. `;
    if (minutes > 0) result += `${minutes} Min.`;

    return result.trim();
  };
  
  const getInputClass = (isEmpty: boolean) => {
    if (calculationStatus === 'error' && isEmpty) return "border-red-500";
    if (calculationStatus === 'error' && !isEmpty) return "border-yellow-500";
    return "";
  }
  
  const handleAddressSelect = (setter: (value: string) => void) => (address: { fullAddress: string }) => {
    setter(address.fullAddress);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <span>Weg</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="basis-start">Basisadresse Start</Label>
            <div className="flex items-center gap-2">
              {/* <AddressAutocomplete id="basis-start" value={basisStart} onValueChange={setBasisStart} onAddressSelect={handleAddressSelect(setBasisStart)} /> */}
              <Input id="basis-start" name="basisStart" value={basisStart} onChange={(e) => setBasisStart(e.target.value)} />
              <Button size="icon" variant="outline" onClick={() => openGoogleMaps(basisStart)}><MapPin className="h-4 w-4" /></Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground md:text-right">
            Etappe 1: {etappen[0] ? `${etappen[0].distanzText} (${etappen[0].dauerText})` : '- km'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="kunden-start">Kundenadresse Start</Label>
             <div className="flex items-center gap-2">
              {/* <AddressAutocomplete id="kunden-start" value={kundenStart} onValueChange={setKundenStart} onAddressSelect={handleAddressSelect(setKundenStart)} className={getInputClass(!kundenStart)} /> */}
              <Input id="kunden-start" name="kundenStart" value={kundenStart} onChange={(e) => setKundenStart(e.target.value)} className={getInputClass(!kundenStart)} />
              <Button size="icon" variant="outline" onClick={() => openGoogleMaps(kundenStart)}><MapPin className="h-4 w-4" /></Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground md:text-right">
            Etappe 2: {etappen[1] ? `${etappen[1].distanzText} (${etappen[1].dauerText})` : '- km'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="kunden-ziel">Kundenadresse Ziel</Label>
            <div className="flex items-center gap-2">
              {/* <AddressAutocomplete id="kunden-ziel" value={kundenZiel} onValueChange={setKundenZiel} onAddressSelect={handleAddressSelect(setKundenZiel)} className={getInputClass(!kundenZiel)} /> */}
              <Input id="kunden-ziel" name="kundenZiel" value={kundenZiel} onChange={(e) => setKundenZiel(e.target.value)} className={getInputClass(!kundenZiel)} />
               <Button size="icon" variant="outline" onClick={() => openGoogleMaps(kundenZiel)}><MapPin className="h-4 w-4" /></Button>
            </div>
          </div>
           <p className="text-sm text-muted-foreground md:text-right">
            Etappe 3: {etappen[2] ? `${etappen[2].distanzText} (${etappen[2].dauerText})` : '- km'}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="basis-ziel">Basisadresse Ziel</Label>
          <div className="flex items-center gap-2">
            {/* <AddressAutocomplete id="basis-ziel" value={basisZiel} onValueChange={setBasisZiel} onAddressSelect={handleAddressSelect(setBasisZiel)} /> */}
            <Input id="basis-ziel" name="basisZiel" value={basisZiel} onChange={(e) => setBasisZiel(e.target.value)} />
             <Button size="icon" variant="outline" onClick={() => openGoogleMaps(basisZiel)}><MapPin className="h-4 w-4" /></Button>
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
            <Button onClick={handleBerechnen} disabled={calculationStatus === 'loading'}>
                {calculationStatus === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Route className="mr-2 h-4 w-4"/>}
                Wegstrecke berechnen
            </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
                <Label>Fahrzeug</Label>
                <Select value={selectedVehicle} onValueChange={(v) => setSelectedVehicle(v as VehicleType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Sprinter">Sprinter (+10%)</SelectItem>
                        <SelectItem value="LKW 7,5t">LKW 7,5t (+25%)</SelectItem>
                        <SelectItem value="LKW 12t">LKW 12t (+35%)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="total-km">Gesamtweg (km)</Label>
                <Input id="total-km" name="totalKm" type="number" value={totalKm.toFixed(2)} onChange={(e) => setTotalKm(parseFloat(e.target.value) || 0)} />
            </div>
        </div>

        <div className="flex justify-end items-center pt-4">
          <div className="text-right">
            <p className="font-semibold">Neu berechnete Fahrzeit</p>
            <p className="text-xl font-bold">{formatTotalDuration()}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-start items-center gap-4">
         <div className="flex items-center space-x-2">
            <Switch 
                id="include-travel-hours" 
                checked={includeTravelHours}
                onCheckedChange={onIncludeTravelHoursChange}
            />
            <Label htmlFor="include-travel-hours">Fahrstunden für Hilfsarbeiter einrechnen</Label>
        </div>
      </CardFooter>
    </Card>
  );
}
