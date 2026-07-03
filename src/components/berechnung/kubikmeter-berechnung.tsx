'use client';
import { useState, useMemo, useEffect } from 'react';
import type { Customer } from '@/lib/types';
import { ITEM_CBM_DEFAULTS } from '@/lib/item-cbm-defaults';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export type ItemCBM = {
  name: string;
  count: number;
  cbmPerUnit: number;
  key: string;
  category: string;
  isUnmapped: boolean;
  isCustom?: boolean;
};

interface KubikmeterBerechnungProps {
  customer: Customer;
  onTotalM3Change: (totalM3: number) => void;
  initialM3: number;
  onItemsChange: (items: ItemCBM[]) => void;
}

export default function KubikmeterBerechnung({ customer, onTotalM3Change, initialM3, onItemsChange }: KubikmeterBerechnungProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const defaultsRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'cbm_defaults', 'user_defined') : null), [firestore, user]);
  const { data: storedDefaults, isLoading: isLoadingDefaults } = useDoc(defaultsRef);

  const [cbmDefaults, setCbmDefaults] = useState(ITEM_CBM_DEFAULTS);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [itemToCategorize, setItemToCategorize] = useState<ItemCBM | null>(null);

  useEffect(() => {
    if (storedDefaults) {
        const mergedDefaults = JSON.parse(JSON.stringify(ITEM_CBM_DEFAULTS));
        for (const category in storedDefaults) {
            if (Object.prototype.hasOwnProperty.call(storedDefaults, category)) {
                if (!mergedDefaults[category]) {
                    mergedDefaults[category] = [];
                }
                const categoryItems = (storedDefaults as any)[category];
                for (const storedItem of categoryItems) {
                    const existingItemIndex = mergedDefaults[category].findIndex((item: any) => item.key === storedItem.key);
                    if (existingItemIndex > -1) {
                        mergedDefaults[category][existingItemIndex] = { ...mergedDefaults[category][existingItemIndex], ...storedItem };
                    } else {
                        mergedDefaults[category].push(storedItem);
                    }
                }
            }
        }
        setCbmDefaults(mergedDefaults);
    }
  }, [storedDefaults]);

  const saveDefaults = async (defaults: typeof ITEM_CBM_DEFAULTS) => {
    if (defaultsRef) {
      setDoc(defaultsRef, defaults, { merge: true }).catch(error => {
        const contextualError = new FirestorePermissionError({
          path: defaultsRef.path,
          operation: 'update',
          requestResourceData: defaults,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
    }
  };

  const initialItems = useMemo(() => {
    if (!customer.gegenstaende) return [];
    
    const items: ItemCBM[] = [];
    for (const [key, value] of Object.entries(customer.gegenstaende)) {
      const count = parseInt(String(value), 10);
      if (value && !isNaN(count) && count > 0) {
        let defaultEntry;
        let categoryName = 'Unbekannt';
        let isUnmapped = true;

        for(const [category, catItems] of Object.entries(cbmDefaults)) {
            const found = catItems.find(item => item.key === key);
            if(found) {
                defaultEntry = found;
                categoryName = category;
                isUnmapped = false;
                break;
            }
        }
        
        const name = defaultEntry?.name || key.split('_').join(' ');
        const cbmPerUnit = defaultEntry?.cbm ?? 0.0;
        items.push({ name, count, cbmPerUnit, key, category: categoryName, isUnmapped });
      }
    }
    return items;
  }, [customer.gegenstaende, cbmDefaults]);

  const [items, setItems] = useState<ItemCBM[]>(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);


  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
        const category = item.category || 'Unbekannt';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, ItemCBM[]>);
  }, [items]);

  const handleItemValueChange = (key: string, field: 'cbmPerUnit' | 'count', valueString: string) => {
      const newValue = parseFloat(valueString);
      if(isNaN(newValue)) return;

      const updatedItems = items.map(item => 
        item.key === key ? { ...item, [field]: newValue } : item
      );
      setItems(updatedItems);
      onItemsChange(updatedItems);
  };

  const handleRemoveItem = (key: string) => {
      const updatedItems = items.filter(item => item.key !== key);
      setItems(updatedItems);
      onItemsChange(updatedItems);
  }

  const handleAddNewItem = (category: string, itemKey?: string, customName?: string, customCbm?: number) => {
    let newItem: ItemCBM;
    if (itemKey) { // Add from predefined list
        const allDefaults = Object.values(cbmDefaults).flat();
        const defaultItem = allDefaults.find(i => i.key === itemKey);
        if (!defaultItem) return;
        newItem = {
            name: defaultItem.name,
            count: 1,
            cbmPerUnit: defaultItem.cbm,
            key: defaultItem.key,
            category: category,
            isUnmapped: false,
        };
    } else if (customName && customCbm !== undefined) { // Add custom item
        const key = `custom_${Date.now()}`;
        newItem = {
            name: customName,
            count: 1,
            cbmPerUnit: customCbm,
            key: key,
            category: category,
            isUnmapped: false,
            isCustom: true
        };
    } else {
        return;
    }
    
    const itemExists = items.some(i => i.key === newItem.key);
    if(itemExists) {
        toast({
            variant: "destructive",
            title: "Gegenstand bereits vorhanden",
            description: `"${newItem.name}" ist bereits in der Liste.`
        })
    } else {
        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        onItemsChange(updatedItems);
    }
  };

  const AddItemDialog = ({ category, onAdd }: { category: string, onAdd: (category: string, itemKey?: string, customName?: string, customCbm?: number) => void }) => {
    const [selectedItemKey, setSelectedItemKey] = useState<string>('');
    const [customName, setCustomName] = useState('');
    const [customCbm, setCustomCbm] = useState(0.1);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const availableDefaults = useMemo(() => {
        const allDefaults = Object.values(cbmDefaults).flat();
        const usedKeys = new Set(items.map(i => i.key));
        return allDefaults
          .filter(item => !!item.name)
          .sort((a, b) => a.name.localeCompare(b.name))
          .filter(i => !usedKeys.has(i.key));
    }, [cbmDefaults, items]);

    const handleAddPredefined = () => {
        if(selectedItemKey) {
            onAdd(category, selectedItemKey);
            setIsDialogOpen(false);
            setSelectedItemKey('');
        }
    }

    const handleAddCustom = () => {
        if(customName && customCbm > 0) {
            onAdd(category, undefined, customName, customCbm);
            setIsDialogOpen(false);
            setCustomName('');
            setCustomCbm(0.1);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Hinzufügen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gegenstand zu "{category}" hinzufügen</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2 p-4 border rounded-md">
                        <Label>Vordefinierten Gegenstand hinzufügen</Label>
                        <div className="flex gap-2">
                            <Select onValueChange={setSelectedItemKey}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Gegenstand auswählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableDefaults.map(item => (
                                        <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAddPredefined} disabled={!selectedItemKey}>Auswählen</Button>
                        </div>
                    </div>
                     <div className="space-y-2 p-4 border rounded-md">
                        <Label>Eigenen Gegenstand erstellen</Label>
                        <div className="grid grid-cols-2 gap-4">
                           <Input placeholder="Name des Gegenstands" id="custom-name" name="customName" value={customName} onChange={e => setCustomName(e.target.value)} />
                           <Input type="number" placeholder="m³" id="custom-cbm" name="customCbm" value={customCbm} onChange={e => setCustomCbm(parseFloat(e.target.value) || 0)} step="0.01"/>
                        </div>
                        <Button onClick={handleAddCustom} disabled={!customName || customCbm <= 0} className="w-full">Eigenen Gegenstand hinzufügen</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
  }

  const calculatedTotalCbm = useMemo(() => {
    return items.reduce((sum, item) => sum + item.count * item.cbmPerUnit, 0);
  }, [items]);

  useEffect(() => {
    onTotalM3Change(calculatedTotalCbm);
  }, [calculatedTotalCbm, onTotalM3Change]);
  
  const handleSaveChanges = () => {
    const newDefaults = JSON.parse(JSON.stringify(cbmDefaults));
    items.forEach(item => {
        if(item.category && newDefaults[item.category] && !item.isCustom) {
            const itemToUpdate = newDefaults[item.category].find((i: any) => i.key === item.key);
            if(itemToUpdate) {
                itemToUpdate.cbm = item.cbmPerUnit;
            }
        }
    });
    setCbmDefaults(newDefaults);
    saveDefaults(newDefaults);

    toast({
        title: "Gespeichert",
        description: "Die m³/Stück Vorgaben wurden für alle Benutzer aktualisiert."
    })
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Kubikmeter</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
            {Object.keys(groupedItems).length > 0 ? (
                Object.entries(groupedItems).sort(([catA], [catB]) => catA.localeCompare(catB)).map(([category, categoryItems]) => (
                    <div key={category}>
                        <h3 className="text-lg font-semibold mb-2">{category}</h3>
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Gegenstand</TableHead>
                                        <TableHead className="text-center">Stück</TableHead>
                                        <TableHead className="text-center">m³/Stück</TableHead>
                                        <TableHead className="text-right">Gesamt m³</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {categoryItems.map((item, index) => (
                                    <TableRow key={item.key}>
                                        <TableCell className={cn("font-medium", item.isUnmapped && "text-red-500")}>{item.name}</TableCell>
                                        <TableCell>
                                            <Input
                                                id={`item-count-${item.key}`}
                                                name={`item-count-${item.key}`}
                                                type="number"
                                                value={item.count}
                                                onChange={(e) => handleItemValueChange(item.key, 'count', e.target.value)}
                                                className="w-20 mx-auto text-center"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                id={`item-cbm-${item.key}`}
                                                name={`item-cbm-${item.key}`}
                                                type="number"
                                                value={item.cbmPerUnit.toFixed(2)}
                                                onChange={(e) => handleItemValueChange(item.key, 'cbmPerUnit', e.target.value)}
                                                className={cn("w-24 mx-auto text-center", item.isUnmapped && "border-red-500 text-red-500")}
                                                step="0.01"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(item.count * item.cbmPerUnit).toFixed(2).replace('.', ',')} m³
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.key)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </div>
                        <AddItemDialog category={category} onAdd={handleAddNewItem} />
                    </div>
                ))
            ) : (
                 <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <p>Noch keine Gegenstände erfasst.</p>
                    <AddItemDialog category="Wohnzimmer" onAdd={handleAddNewItem} />
                 </div>
            )}
        </div>
        <Separator className="my-6" />
        <div className="flex justify-end mt-4">
            <div className="space-y-2 text-right">
                <Label htmlFor="total-cbm-input">Gesamtkubikmeter (überschreibbar)</Label>
                <Input
                    id="total-cbm-input"
                    name="totalCbmInput"
                    type="number"
                    value={initialM3}
                    onChange={(e) => onTotalM3Change(parseFloat(e.target.value) || 0)}
                    className="text-xl font-bold w-40 ml-auto text-right"
                    step="0.1"
                />
                 <p className="text-xs text-muted-foreground">Berechnet: {calculatedTotalCbm.toFixed(2).replace('.', ',')} m³</p>
            </div>
        </div>
      </CardContent>
      <CardFooter className='justify-end'>
          <Button onClick={handleSaveChanges}>m³/Stück Vorgaben für alle speichern</Button>
      </CardFooter>
    </Card>
    </>
  );
}

    
