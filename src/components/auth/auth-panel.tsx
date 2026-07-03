// src/components/auth/auth-panel.tsx
'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AuthPanel() {
  const auth = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleLogin = () => {
    if (!loginEmail || !loginPassword) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte E-Mail und Passwort eingeben.' });
      return;
    }
    startTransition(async () => {
      try {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        toast({ title: 'Erfolgreich angemeldet' });
      } catch (error: any) {
        console.error("Login failed:", error);
        toast({ variant: 'destructive', title: 'Anmeldung fehlgeschlagen', description: error.message });
      }
    });
  };

  const handleRegister = () => {
    if (!registerEmail || !registerPassword) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte E-Mail und Passwort eingeben.' });
        return;
    }
    startTransition(async () => {
        try {
            await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
            toast({ title: 'Registrierung erfolgreich', description: 'Sie wurden automatisch angemeldet.' });
        } catch (error: any) {
            console.error("Registration failed:", error);
            toast({ variant: 'destructive', title: 'Registrierung fehlgeschlagen', description: error.message });
        }
    });
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Anmelden</TabsTrigger>
          <TabsTrigger value="register">Registrieren</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Anmelden</CardTitle>
              <CardDescription>
                Melden Sie sich bei Ihrem Konto an, um fortzufahren.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-Mail</Label>
                <Input id="login-email" type="email" placeholder="max.mustermann@firma.de" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Passwort</Label>
                <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" />
                <Label htmlFor="remember-me" className="text-sm font-normal">
                  Angemeldet bleiben
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleLogin} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Anmelden
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Registrieren</CardTitle>
              <CardDescription>
                Erstellen Sie ein neues Konto, um Zugriff zu erhalten.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-email">E-Mail</Label>
                <Input id="register-email" type="email" placeholder="max.mustermann@firma.de" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Passwort</Label>
                <Input id="register-password" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleRegister} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrieren & Weiter
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
