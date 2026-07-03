'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { UserRole } from '@/lib/types';
import { PinDialog } from '@/components/auth/pin-dialog';
import { useToast } from '@/hooks/use-toast';


interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  requestAdminRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const ADMIN_PIN = 'Zuckerl0815';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setInternalRole] = useState<UserRole>('admin');
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const { toast } = useToast();

  const setRole = useCallback((newRole: UserRole) => {
    if (newRole === 'admin') {
      setInternalRole('admin');
    } else {
      setInternalRole(newRole);
    }
  }, []);

  const requestAdminRole = () => {
    setInternalRole('admin');
  };

  const handlePinSubmit = (pin: string) => {
    if (pin === ADMIN_PIN) {
      setInternalRole('admin');
      setIsPinDialogOpen(false);
      toast({
        title: 'Erfolgreich',
        description: 'Sie sind jetzt als Admin angemeldet.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Falscher PIN-Code.',
      });
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole, requestAdminRole }}>
      {children}
      <PinDialog
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        onPinSubmit={handlePinSubmit}
      />
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole muss innerhalb eines RoleProvider verwendet werden');
  }
  return context;
}
