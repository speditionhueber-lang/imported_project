
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/lib/mitarbeiter-data';

export default function WorkerSelector({ 
  allWorkers,
  selectedWorkers, 
  onSelectionChange, 
  isInvalid, 
  placeholder = "Mitarbeiter auswählen" 
}: { 
  allWorkers: Employee[],
  selectedWorkers: string[], 
  onSelectionChange: (workers: string[]) => void, 
  isInvalid?: boolean, 
  placeholder?: string 
}) {
  const currentWorkers = selectedWorkers || [];

  const addWorker = (workerName: string) => {
    if (workerName && !currentWorkers.includes(workerName)) {
      onSelectionChange([...currentWorkers, workerName]);
    }
  };

  const removeWorker = (workerToRemove: string) => {
    onSelectionChange(currentWorkers.filter(w => w !== workerToRemove));
  };
  
  const updateWorker = (index: number, newName: string) => {
    const updatedWorkers = [...currentWorkers];
    updatedWorkers[index] = newName;
    onSelectionChange(updatedWorkers);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {currentWorkers.map((worker, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Input id={`worker-${index}`} name={`worker-${index}`} value={worker} onChange={(e) => updateWorker(index, e.target.value)} />
            <Button size="icon" variant="ghost" onClick={() => removeWorker(worker)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Select onValueChange={addWorker} value="">
          <SelectTrigger className={cn(isInvalid && 'border-red-500 ring-red-500')}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allWorkers.map(w => (
              <SelectItem key={w.id} value={w.name} disabled={currentWorkers.includes(w.name)}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
