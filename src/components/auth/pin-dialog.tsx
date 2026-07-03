'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPinSubmit: (pin: string) => void;
}

export function PinDialog({ isOpen, onClose, onPinSubmit }: PinDialogProps) {
  const [pin, setPin] = useState('');

  const handleSubmit = () => {
    onPinSubmit(pin);
    setPin(''); // Reset pin after submit
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Admin-Zugang</DialogTitle>
          <DialogDescription>
            Bitte geben Sie den Admin-PIN ein, um fortzufahren.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="PIN-Code"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
