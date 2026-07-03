
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ExtraService {
  id: string;
  name: string;
  cost: number;
  isActive: boolean;
  isCustom: boolean;
}

const initialServices: Omit<ExtraService, 'cost' | 'isActive'>[] = [
    { id: 'msvs', name: 'MSVS Be- und Entladeversicherung', isCustom: false },
    { id: 'transportversicherung', name: 'Transportversicherung', isCustom: false },
    { id: 'hvz', name: 'HVZ (Halteverbotszone)', isCustom: false },
    { id: 'maut', name: 'Maut', isCustom: false },
    { id: 'zoll', name: 'Zoll', isCustom: false },
    { id: 'hotel', name: 'Hotel', isCustom: false },
    { id: 'spesen', name: 'Spesen', isCustom: false },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

// Tariff table for MSVS insurance costs
const msvsTariffs = [
    { from: 0, to: 4000, cost: 4 },
    { from: 4001, to: 8000, cost: 8 },
    { from: 8001, to: 12000, cost: 12 },
    { from: 12001, to: 16000, cost: 16 },
    { from: 16001, to: 20000, cost: 20 },
    { from: 20001, to: 25000, cost: 24 },
    { from: 25001, to: 30000, cost: 28 },
    { from: 30001, to: 35000, cost: 32 },
    { from: 35001, to: 40000, cost: 36 },
    { from: 40001, to: 45000, cost: 40 },
    { from: 45001, to: 50000, cost: 44 },
    { from: 50001, to: 60000, cost: 50 },
    { from: 60001, to: 70000, cost: 56 },
    { from: 70001, to: 80000, cost: 62 },
    { from: 80001, to: 90000, cost: 68 },
    { from: 90001, to: 100000, cost: 74 },
    { from: 100001, to: 110000, cost: 80 },
    { from: 110001, to: 120000, cost: 86 },
    { from: 120001, to: 130000, cost: 92 },
    { from: 130001, to: 140000, cost: 108 },
    { from: 140001, to: 150000, cost: 114 },
    { from: 150001, to: 175000, cost: 128 },
    { from: 175001, to: 200000, cost: 142 },
    { from: 200001, to: Infinity, cost: 170 }, // Assuming the last tier is open-ended
];

const getMsvsInsuranceCost = (zeitwert: number) => {
    const applicableTariff = msvsTariffs.find(t => zeitwert >= t.from && zeitwert <= t.to);
    return applicableTariff ? applicableTariff.cost : 0;
};


interface ZusatzleistungenProps {
  totalM3: number;
  onActiveServicesChange: (activeServices: ExtraService[]) => void;
}

export default function Zusatzleistungen({ totalM3, onActiveServicesChange }: ZusatzleistungenProps) {
  const [services, setServices] = useState<ExtraService[]>(
      initialServices.map(s => ({...s, cost: 0, isActive: s.id === 'msvs' })) // Transportversicherung default off
  );
  const [newServiceName, setNewServiceName] = useState('');
  const { toast } = useToast();

  const zeitwert = useMemo(() => totalM3 / 4 * 1090, [totalM3]);
  const transportInsuranceCost = useMemo(() => zeitwert * 0.0083, [zeitwert]);
  const msvsInsuranceCost = useMemo(() => getMsvsInsuranceCost(zeitwert), [zeitwert]);

  useEffect(() => {
    const activeServicesWithCosts = services.map(s => {
      let currentCost = s.cost;
      if (s.id === 'transportversicherung' && s.isActive) {
        currentCost = transportInsuranceCost;
      } else if (s.id === 'msvs' && s.isActive) {
        currentCost = msvsInsuranceCost;
      }
      return { ...s, cost: currentCost };
    });
    
    // Pass only active services up
    onActiveServicesChange(activeServicesWithCosts.filter(s => s.isActive));
  }, [services, transportInsuranceCost, msvsInsuranceCost, onActiveServicesChange]);

  const handleToggle = (id: string) => {
    setServices(services.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const handleCostChange = (id: string, cost: number) => {
    setServices(services.map(s => s.id === id ? { ...s, cost } : s));
  };

  const handleAddService = () => {
    if (!newServiceName.trim()) {
        toast({
            variant: 'destructive',
            title: "Fehler",
            description: "Bitte geben Sie einen Namen für die neue Leistung ein."
        });
        return;
    }
    const newService: ExtraService = {
        id: `custom_${'' + Date.now()}`,
        name: newServiceName,
        cost: 0,
        isActive: true,
        isCustom: true,
    };
    setServices([...services, newService]);
    setNewServiceName('');
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  }

  const renderServiceDetails = (service: ExtraService) => {
    let calculatedCost = 0;
    
    if (service.id === 'transportversicherung') {
        calculatedCost = transportInsuranceCost;
    } else if (service.id === 'msvs') {
        calculatedCost = msvsInsuranceCost;
    }

    if (service.id === 'transportversicherung' || service.id === 'msvs') {
        return (
            <div className="text-sm text-muted-foreground italic space-y-1">
                <div className="flex justify-between">
                    <span>Zeitwert:</span>
                    <span>{formatCurrency(zeitwert)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Kosten:</span>
                    <span className='font-semibold'>{formatCurrency(calculatedCost)}</span>
                </div>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2">
            <Label className="text-sm">Kosten (Pauschal):</Label>
            <Input
                type="number"
                value={service.cost}
                onChange={e => handleCostChange(service.id, parseFloat(e.target.value) || 0)}
                className="h-8 w-28 text-right"
            />
            <span>€</span>
        </div>
    );
};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zusatzleistungen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map(service => (
          <div key={service.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={service.id} className="flex-1">{service.name}</Label>
              <div className="flex items-center gap-4">
                {service.isCustom && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveService(service.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
                <Switch
                  id={service.id}
                  checked={service.isActive}
                  onCheckedChange={() => handleToggle(service.id)}
                />
              </div>
            </div>
            {service.isActive && (
              <div className="pl-6 space-y-2">
                {renderServiceDetails(service)}
              </div>
            )}
          </div>
        ))}
        <Separator />
        <div className="flex items-center gap-2 pt-2">
          <Input
            placeholder="Name für neue Leistung..."
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            className="h-9"
          />
          <Button onClick={handleAddService} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
