
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCustomer, type ChangeSuggestionData } from '@/contexts/customer-context';
import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AenderungsvorschlaegePage() {
  const [problem, setProblem] = useState('');
  const [idea, setIdea] = useState('');
  const [details, setDetails] = useState('');
  const { toast } = useToast();
  const { setCustomerState } = useCustomer();
  const router = useRouter();

  const handleSubmit = () => {
    if (!problem && !idea && !details) {
      toast({
        variant: "destructive",
        title: "Leere Eingabe",
        description: "Bitte füllen Sie mindestens ein Feld aus.",
      });
      return;
    }
    
    const suggestion: ChangeSuggestionData = { problem, idea, details };

    // This is a global suggestion, but we need a customer context for approvals.
    // We'll create a dummy/system context for it.
    const systemCustomerId = 'system_suggestions';

    setCustomerState(systemCustomerId, {
        pendingChangeSuggestion: true,
        changeSuggestionData: suggestion
    });

    toast({
      title: "Vielen Dank!",
      description: "Ihr Vorschlag wurde zur Überprüfung an den Admin gesendet.",
    });

    setProblem('');
    setIdea('');
    setDetails('');

    // Optional: Redirect or give more feedback
    router.push('/');
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Änderungsvorschläge & Ideen</CardTitle>
        <CardDescription>
          Haben Sie ein Problem bemerkt oder eine Idee, wie man diese App verbessern könnte? Teilen Sie es uns mit!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="problem">Welches Problem haben Sie festgestellt?</Label>
          <Textarea
            id="problem"
            placeholder="Beschreiben Sie das Problem oder den umständlichen Prozess..."
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="idea">Was ist Ihre Idee für eine Verbesserung?</Label>
          <Textarea
            id="idea"
            placeholder="Beschreiben Sie kurz Ihre Idee oder Lösung..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="details">Wie stellen Sie sich die genaue Umsetzung vor? (Optional)</Label>
          <Textarea
            id="details"
            placeholder="Wenn Sie eine genaue Vorstellung haben, beschreiben Sie hier die Funktion, das Aussehen oder den Ablauf..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={6}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} className="w-full">
          <Send className="mr-2 h-4 w-4" />
          Vorschlag an Admin senden
        </Button>
      </CardFooter>
    </Card>
  );
}
