
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer } from '@/lib/types';
import * as params from '@/lib/berechnungs-parameter';

interface StockwerkBerechnungProps {
    totalM3: number;
    params: {
        pickupFloor: number;
        destinationFloor: number;
        pickupElevator: string;
        destinationElevator: string;
        carrierRate: number;
    };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const getFloorFactor = (floor: number) => {
    if (floor < 0) return 0;
    // Base factor for ground floor + incremental factor for each additional floor
    return 0.20 + (floor * 0.05);
}

const ReadOnlyRow = ({ label, m3, floor, elevatorSize, carrierRate }: { 
    label: string, 
    m3: number, 
    floor: number,
    elevatorSize: string,
    carrierRate: number
}) => {
    const floorFactor = getFloorFactor(floor);
    const elevatorFactor = params.ELEVATOR_FACTORS[elevatorSize] ?? 1;
    const finalFactor = floorFactor * elevatorFactor;
    const result = m3 * finalFactor * carrierRate;

    return (
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
            <p>{label} (Stock {floor})</p>
            <div className="flex items-center justify-end gap-2 text-right">
                <p className="font-semibold">{m3.toFixed(2)}</p>
                <span>x</span>
                <p className="font-semibold w-16 text-center" title={`Faktor für Stock ${floor} mit Aufzug '${elevatorSize}'`}>{finalFactor.toFixed(4)}</p>
                <span>x</span>
                <p className="font-semibold">{carrierRate.toFixed(2)}</p>
                <p className="font-bold w-[100px] text-right">= {formatCurrency(result)}</p>
            </div>
        </div>
    )
}

export default function StockwerkBerechnung({ totalM3, params: calcParams }: StockwerkBerechnungProps) {
    
    const { pickupFloor, destinationFloor, pickupElevator, destinationElevator, carrierRate } = calcParams;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Stockwerk Berechnung (Mannstunden)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 text-sm text-muted-foreground px-2">
                    <span></span>
                    <div className="flex items-center justify-end gap-2 text-right">
                        <span className="w-12 text-center">m³</span>
                        <span></span>
                        <span className="w-16 text-center">Faktor</span>
                         <span></span>
                        <span className="w-12 text-center">Satz (€)</span>
                        <span className="w-[100px] text-right">Ergebnis</span>
                    </div>
                </div>
                <ReadOnlyRow
                    label="Stockwerk Abholung"
                    m3={totalM3}
                    floor={pickupFloor}
                    elevatorSize={pickupElevator}
                    carrierRate={carrierRate}
                />
                 <ReadOnlyRow
                    label="Stockwerk Ziel"
                    m3={totalM3}
                    floor={destinationFloor}
                    elevatorSize={destinationElevator}
                    carrierRate={carrierRate}
                />
            </CardContent>
        </Card>
    );
}
