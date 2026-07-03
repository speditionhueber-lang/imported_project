// src/components/berechnung/parameter-berechnung.tsx
'use client';
import type { Customer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCustomer } from '@/contexts/customer-context';
import { useEffect } from 'react';

interface EditableFieldProps {
    label: string;
    value: number | string;
    onChange: (value: number) => void;
    unit: string;
    isMissing?: boolean;
    isOptional?: boolean;
}

const EditableField = ({ label, value, onChange, unit, isMissing, isOptional }: EditableFieldProps) => (
    <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
            <Input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className={cn("w-24 text-right", 
                    isMissing && "border-red-500",
                    isOptional && "border-green-500/50"
                )}
            />
            <span className="w-8 text-left text-sm text-muted-foreground">{unit}</span>
        </div>
    </div>
);

interface ParameterBerechnungProps {
    customer: Customer;
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
    setParams: React.Dispatch<React.SetStateAction<ParameterBerechnungProps['params']>>;
}

export default function ParameterBerechnung({ customer, params, setParams }: ParameterBerechnungProps) {
    const { setCustomerState, isNewCustomerMode, NEW_CUSTOMER_STATE_ID, customerStates } = useCustomer();

    useEffect(() => {
        const customerId = isNewCustomerMode ? NEW_CUSTOMER_STATE_ID : customer?.id;
        if (customerId && JSON.stringify(customerStates[customerId]?.calculationParams) !== JSON.stringify(params)) {
            setCustomerState(customerId, { calculationParams: params });
        }
    }, [params, customer, setCustomerState, isNewCustomerMode, NEW_CUSTOMER_STATE_ID, customerStates]);


    const handleChange = (field: keyof typeof params, value: number | string) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };
    
    const hasData = (field: keyof Customer, subkey?: string) => {
        if (!customer) return false;
        const mainField = customer[field];
        if (mainField === undefined) return false;
        if (subkey) {
            const subField = (mainField as any)[subkey];
             return subField !== undefined && subField !== null && subField !== '' && subField !== false;
        }
        return mainField !== undefined && mainField !== null && mainField !== '';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Parameter</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <EditableField 
                    label="Trageweg Abholung" 
                    value={params.pickupDistance} 
                    onChange={(v) => handleChange('pickupDistance', v)} 
                    unit="m" 
                    isMissing={!customer.abholadresse?.entfernungLKW}
                />
                <EditableField 
                    label="Trageweg Ziel" 
                    value={params.destinationDistance} 
                    onChange={(v) => handleChange('destinationDistance', v)} 
                    unit="m" 
                    isMissing={!customer.zieladresse?.entfernungLKW}
                />
                <EditableField 
                    label="Stockwerk Abholung" 
                    value={params.pickupFloor} 
                    onChange={(v) => handleChange('pickupFloor', v)} 
                    unit=""
                    isMissing={!customer.abholadresse?.stockwerk}
                />
                <EditableField 
                    label="Stockwerk Ziel" 
                    value={params.destinationFloor} 
                    onChange={(v) => handleChange('destinationFloor', v)} 
                    unit="" 
                    isMissing={!customer.zieladresse?.stockwerk}
                />
                <div className="flex items-center justify-between">
                    <Label>Aufzug Abholung</Label>
                    <Select value={params.pickupElevator} onValueChange={(v) => handleChange('pickupElevator', v)}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Keine Angabe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Kein</SelectItem>
                            <SelectItem value="small">Klein</SelectItem>
                            <SelectItem value="medium">Mittel</SelectItem>
                            <SelectItem value="large">Groß</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center justify-between">
                    <Label>Aufzug Ziel</Label>
                    <Select value={params.destinationElevator} onValueChange={(v) => handleChange('destinationElevator', v)}>
                         <SelectTrigger className="w-36">
                            <SelectValue placeholder="Keine Angabe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Kein</SelectItem>
                            <SelectItem value="small">Klein</SelectItem>
                            <SelectItem value="medium">Mittel</SelectItem>
                            <SelectItem value="large">Groß</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <EditableField 
                    label="Kundenhelfer" 
                    value={params.selfProvidedPersonnel} 
                    onChange={(v) => handleChange('selfProvidedPersonnel', v)} 
                    unit="P."
                    isOptional={!hasData('zusatzoptionen', 'helfer')}
                />
                <EditableField 
                    label="Küchenmontage" 
                    value={params.kitchenMeters} 
                    onChange={(v) => handleChange('kitchenMeters', v)} 
                    unit="lfm"
                    isOptional={true}
                />
                <EditableField 
                    label="Möbelmontage" 
                    value={params.assemblyHours} 
                    onChange={(v) => handleChange('assemblyHours', v)} 
                    unit="h" 
                     isOptional={true}
                />
                <EditableField 
                    label="Halteverbotszonen" 
                    value={params.hvzCount} 
                    onChange={(v) => handleChange('hvzCount', v)} 
                    unit="Stk." 
                    isOptional={!hasData('nebenleistungen', 'einrichtenHVZ')}
                />
                 <EditableField 
                    label="Faktor Trageweg" 
                    value={params.carryWayFactor} 
                    onChange={(v) => handleChange('carryWayFactor', v)} 
                    unit="Mh/m³/m"
                />
                <EditableField 
                    label="Satz Träger" 
                    value={params.carrierRate} 
                    onChange={(v) => handleChange('carrierRate', v)} 
                    unit="€/h"
                />
            </CardContent>
        </Card>
    );
}
