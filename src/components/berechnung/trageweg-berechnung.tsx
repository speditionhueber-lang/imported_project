
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import * as params from '@/lib/berechnungs-parameter';

interface ParameterBerechnungProps {
    params: {
        pickupDistance: number;
        destinationDistance: number;
        carryWayFactor: number;
        carrierRate: number;
        // Add other params from the main state to make the type compatible
        pickupFloor: number;
        destinationFloor: number;
        pickupElevator: string;
        destinationElevator: string;
        selfProvidedPersonnel: number;
        kitchenMeters: number;
        assemblyHours: number;
        hvzCount: number;
    };
    setParams: React.Dispatch<React.SetStateAction<ParameterBerechnungProps['params']>>;
}

interface TragewegBerechnungProps extends ParameterBerechnungProps {
    totalM3: number;
}


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const EditableRow = ({ label, value, onChange, unit }: { label: string, value: number, onChange: (v: number) => void, unit: string }) => (
    <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
            <Input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="w-24 text-right" step="0.001" />
            <span>{unit}</span>
        </div>
    </div>
);

const ReadOnlyRow = ({ label, value1, value2, value3, value4, result }: { 
    label: string; 
    value1: number;
    value2: number;
    value3: number;
    value4: number;
    result: number;
}) => {
    return (
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto_auto] items-center gap-2">
            <p>{label}</p>
            <p className="w-16 text-center font-semibold">{value1.toFixed(2)}</p>
            <span>x</span>
            <p className="w-12 text-center font-semibold">{value2}</p>
            <span>x</span>
            <p className="w-16 text-center font-semibold">{value3.toFixed(3)}</p>
            <span>x</span>
             <p className="w-16 text-center font-semibold">{value4.toFixed(2)}</p>
            <p className="font-bold text-right">= {formatCurrency(result)}</p>
        </div>
    )
}

export default function TragewegBerechnung({ totalM3, params: calcParams, setParams }: TragewegBerechnungProps) {
    
    const { pickupDistance, destinationDistance, carryWayFactor, carrierRate } = calcParams;

    const handleChange = (field: keyof TragewegBerechnungProps['params'], value: number) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };

    const carryCostPickup = useMemo(() => {
        return totalM3 * pickupDistance * carryWayFactor * carrierRate;
    }, [totalM3, pickupDistance, carryWayFactor, carrierRate]);

    const carryCostDestination = useMemo(() => {
        return totalM3 * destinationDistance * carryWayFactor * carrierRate;
    }, [totalM3, destinationDistance, carryWayFactor, carrierRate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trageweg Kosten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                    <EditableRow label="Faktor (Mh/m³/m)" value={carryWayFactor} onChange={(v) => handleChange('carryWayFactor', v)} unit="" />
                    <EditableRow label="Satz Träger (€/h)" value={carrierRate} onChange={(v) => handleChange('carrierRate', v)} unit="€" />
                 </div>

                 <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto_auto] items-center gap-2 text-sm text-muted-foreground px-2">
                    <span></span>
                    <span>m³</span>
                    <span></span>
                    <span>Weg (m)</span>
                    <span></span>
                    <span>Faktor</span>
                    <span></span>
                    <span>Satz (€)</span>
                    <span className="text-right">Ergebnis</span>
                </div>
                <ReadOnlyRow
                    label="Trageweg Abholung"
                    value1={totalM3}
                    value2={pickupDistance}
                    value3={carryWayFactor}
                    value4={carrierRate}
                    result={carryCostPickup}
                />
                 <ReadOnlyRow
                    label="Trageweg Ziel"
                    value1={totalM3}
                    value2={destinationDistance}
                    value3={carryWayFactor}
                    value4={carrierRate}
                    result={carryCostDestination}
                />
            </CardContent>
        </Card>
    );
}
