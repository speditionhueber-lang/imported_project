'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, List, Bot, Mic, Square, Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const predefinedRooms = ['Wohnzimmer', 'Schlafzimmer', 'Küche', 'Badezimmer', 'Kinderzimmer', 'Büro', 'Keller', 'Dachboden', 'Garage'];

type Step = 'customer' | 'room-selection' | 'item-entry';

export default function BesichtigungenPage() {
    const [step, setStep] = useState<Step>('customer');
    const [customerName, setCustomerName] = useState('');
    const [pickupAddress, setPickupAddress] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [customRooms, setCustomRooms] = useState<string[]>([]);
    const [isAddingCustomRoom, setIsAddingCustomRoom] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const router = useRouter();
    

    const handleCustomerSubmit = () => {
        if (customerName && pickupAddress) {
            setStep('room-selection');
        }
    };

    const handleRoomSelect = (roomName: string) => {
        setSelectedRoom(roomName);
        setStep('item-entry');
    };
    
    const handleAddCustomRoom = () => {
        if(newRoomName && !customRooms.includes(newRoomName) && !predefinedRooms.includes(newRoomName)) {
            setCustomRooms([...customRooms, newRoomName]);
            handleRoomSelect(newRoomName);
        }
        setNewRoomName('');
        setIsAddingCustomRoom(false);
    };

    const openGoogleMaps = (address: string) => {
        if (!address) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    };

    const renderCustomerStep = () => (
        <Card>
            <CardHeader>
                <CardTitle>Schritt 1: Kunde & Adressen</CardTitle>
                <CardDescription>Geben Sie die grundlegenden Informationen für die Besichtigung ein.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="customer-name">Kundenname</Label>
                    <div className="flex items-center gap-2">
                        <Input id="customer-name" name="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Max Mustermann"/>
                        <Button 
                            size="icon" 
                            variant="outline"
                            onClick={() => router.push('/telefonate')}
                            title="Zur Telefonate-Seite"
                        >
                            <Mic className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="pickup-address">Abholadresse</Label>
                    <div className="flex items-center gap-2">
                        <Input id="pickup-address" name="pickupAddress" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Musterstraße 1, 12345 Musterstadt"/>
                        <Button size="icon" variant="outline" onClick={() => openGoogleMaps(pickupAddress)}><MapPin className="h-5 w-5"/></Button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="delivery-address">Zieladresse</Label>
                     <div className="flex items-center gap-2">
                        <Input id="delivery-address" name="deliveryAddress" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Zielweg 2, 54321 Zielhausen"/>
                        <Button size="icon" variant="outline" onClick={() => openGoogleMaps(deliveryAddress)}><MapPin className="h-5 w-5"/></Button>
                    </div>
                </div>
                <Button onClick={handleCustomerSubmit} disabled={!customerName || !pickupAddress} className="w-full">Weiter zu den Räumen</Button>
            </CardContent>
        </Card>
    );

    const renderRoomSelectionStep = () => (
        <Card>
            <CardHeader>
                <CardTitle>Schritt 2: Raum auswählen</CardTitle>
                <CardDescription>Wählen Sie einen Raum aus, um Gegenstände zu erfassen, oder fügen Sie einen neuen Raum hinzu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {predefinedRooms.map(room => (
                        <Button key={room} variant="outline" className="h-20" onClick={() => handleRoomSelect(room)}>{room}</Button>
                    ))}
                    {customRooms.map(room => (
                        <Button key={room} variant="secondary" className="h-20" onClick={() => handleRoomSelect(room)}>{room}</Button>
                    ))}
                    <Button variant="outline" className="h-20 border-dashed" onClick={() => setIsAddingCustomRoom(true)}>
                        <Plus className="mr-2"/> Raum
                    </Button>
                </div>
                {isAddingCustomRoom && (
                    <div className="flex gap-2 pt-4">
                        <Input placeholder="Name des neuen Raumes" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} id="new-room" name="newRoom"/>
                        <Button onClick={handleAddCustomRoom}>Hinzufügen</Button>
                        <Button variant="ghost" onClick={() => setIsAddingCustomRoom(false)}>Abbrechen</Button>
                    </div>
                )}
                 <Button variant="link" onClick={() => setStep('customer')}>Zurück zu den Kundendaten</Button>
            </CardContent>
        </Card>
    );
    
    const renderItemEntryStep = () => (
        <Card>
             <CardHeader>
                <CardTitle>Schritt 3: Gegenstände erfassen</CardTitle>
                <CardDescription>Erfassen Sie das Umzugsgut für: <span className="font-bold">{selectedRoom}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Wählen Sie eine Methode, um die Gegenstände zu erfassen.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button className="h-24 text-lg"><Search className="mr-4" /> Suche</Button>
                    <Button className="h-24 text-lg" variant="secondary"><List className="mr-4" /> Liste</Button>
                    <Button className="h-24 text-lg" variant="secondary"><Bot className="mr-4" /> KI-Erfassung</Button>
                </div>
                <Separator className="my-6" />
                <div className="flex justify-between">
                     <Button variant="link" onClick={() => { setSelectedRoom(null); setStep('room-selection'); }}>Zurück zur Raumauswahl</Button>
                     <Button>Besichtigung abschließen</Button>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="max-w-4xl mx-auto">
            {step === 'customer' && renderCustomerStep()}
            {step === 'room-selection' && renderRoomSelectionStep()}
            {step === 'item-entry' && renderItemEntryStep()}
        </div>
    );
}
