'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const VehicleSelector = ({ vehicles, setVehicles, disabled, isConflict }: { vehicles: string[], setVehicles: (vehicles: string[]) => void, disabled: boolean, isConflict?: boolean }) => {
  const [availableVehicles, setAvailableVehicles] = useState(['Sprinter', 'LKW 7.5t', 'LKW 12t', 'LKW 18t']);
  const [newVehicle, setNewVehicle] = useState('');

  const addVehicle = (vehicle: string) => {
    if (vehicle && !vehicles.includes(vehicle)) {
      setVehicles([...vehicles, vehicle]);
      if (!availableVehicles.includes(vehicle)) {
        setAvailableVehicles([...availableVehicles, vehicle]);
      }
      setNewVehicle('');
    }
  };

  const removeVehicle = (vehicleToRemove: string) => {
    setVehicles(vehicles.filter(v => v !== vehicleToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select onValueChange={addVehicle} value="" disabled={disabled}>
          <SelectTrigger className={cn(isConflict && "border-red-500")}>
            <SelectValue placeholder="Fahrzeug auswählen" />
          </SelectTrigger>
          <SelectContent>
            {availableVehicles.map(v => (
              <SelectItem key={v} value={v} disabled={vehicles.includes(v)}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input 
          id="new-vehicle"
          name="newVehicle"
          placeholder="Neues Fahrzeug" 
          value={newVehicle}
          onChange={(e) => setNewVehicle(e.target.value)}
          disabled={disabled}
        />
        <Button type="button" onClick={() => addVehicle(newVehicle)} disabled={disabled}><PlusCircle className="h-4 w-4" /></Button>
      </div>
      {isConflict && <p className="text-sm text-red-500 font-medium">Fahrzeug bereits vergeben</p>}
      <div className="flex flex-wrap gap-2 pt-2">
        {vehicles.map(vehicle => (
          <div key={vehicle} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
            <span>{vehicle}</span>
             {!disabled && (
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeVehicle(vehicle)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehicleSelector;
