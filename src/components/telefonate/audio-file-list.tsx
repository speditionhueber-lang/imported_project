
'use client';

import React, { useState, useTransition, useRef } from 'react';
import { Loader2, Music4, Newspaper, AlignLeft, Calendar, Clock, UserPlus, Check, X } from 'lucide-react';
import { runAudioTranscription, runSummarization, runCustomerExtraction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import SaveCustomerWizard from './save-customer-wizard';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
};

export type AnalysisResult = {
  fileId: string;
  transcript: string;
  summary?: string;
  customerData?: Record<string, any>;
  error?: string;
};

function parseFileName(name: string): { date: string | null, time: string | null, displayName: string } {
    const nameWithoutExt = name.endsWith('.m4a') ? name.slice(0, -4) : name;
    const parts = nameWithoutExt.split('_');

    if (parts.length >= 2) {
        const datePart = parts[0];
        const timePart = parts[1].replace(/-/g, ':');

        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && /^\d{2}:\d{2}:\d{2}$/.test(timePart)) {
            return {
                date: new Date(datePart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                time: timePart,
                displayName: name
            };
        }
    }
    return { date: null, time: null, displayName: name };
}

export function AudioFileList({ files, customerName }: { files: DriveFile[], customerName: string | null }) {
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, startAnalysis] = useTransition();
  const { toast } = useToast();

  const [transcriptWords, setTranscriptWords] = useState<string[]>([]);
  const [editingWord, setEditingWord] = useState<{ index: number, text: string } | null>(null);

  const handleWordClick = (index: number, text: string) => {
    setEditingWord({ index, text });
  };
  
  const handleWordSave = (index: number, newText: string) => {
    const newWords = [...transcriptWords];
    newWords[index] = newText;
    setTranscriptWords(newWords);
    
    if (selectedAnalysis) {
      const newTranscript = newWords.join(' ');
      setSelectedAnalysis({ ...selectedAnalysis, transcript: newTranscript });
      // Optional: Re-run analysis with the new transcript
      reAnalyze(newTranscript);
    }
    setEditingWord(null);
  };
  
  const reAnalyze = async (newTranscript: string) => {
     startAnalysis(async () => {
        try {
            const [summaryResult, customerDataResult] = await Promise.all([
            runSummarization(newTranscript),
            runCustomerExtraction(newTranscript),
            ]);
            
            setSelectedAnalysis(prev => ({
            ...prev!,
            transcript: newTranscript,
            summary: summaryResult.data?.summary || 'Zusammenfassung fehlgeschlagen.',
            customerData: customerDataResult.data || {},
            error: summaryResult.error || customerDataResult.error,
            }));
            toast({ title: "Analyse aktualisiert", description: "Die Zusammenfassung und die Kundendaten wurden mit dem neuen Transkript aktualisiert."});
        } catch (e: any) {
            toast({ variant: "destructive", title: "Fehler", description: "Die Neuanalyse ist fehlgeschlagen."});
        }
     });
  }


  const handleFileClick = async (file: DriveFile) => {
    setTranscriptWords([]);
    setEditingWord(null);
    setSelectedAnalysis({ fileId: file.id, transcript: "Analyse wird durchgeführt..." });
    
    startAnalysis(async () => {
      try {
        const trans_res = await runAudioTranscription(file.id);
        if (trans_res.error || !trans_res.data?.transcript) {
          throw new Error(trans_res.error || 'Transkription fehlgeschlagen');
        }
        const transcript = trans_res.data.transcript;
        
        setTranscriptWords(transcript.split(' '));
        setSelectedAnalysis(prev => ({ ...prev!, transcript }));

        const [summaryResult, customerDataResult] = await Promise.all([
          runSummarization(transcript),
          runCustomerExtraction(transcript),
        ]);
        
        setSelectedAnalysis(prev => ({
          ...prev!,
          summary: summaryResult.data?.summary || 'Zusammenfassung fehlgeschlagen.',
          customerData: customerDataResult.data || {},
          error: summaryResult.error || customerDataResult.error,
        }));

      } catch (error: any) {
        console.error(`Analysis failed for ${file.id}:`, error);
        toast({
          variant: "destructive",
          title: "Analyse fehlgeschlagen",
          description: error.message || 'Ein unbekannter Fehler ist aufgetreten.'
        });
        setSelectedAnalysis(prev => ({ ...prev!, transcript: `Fehler bei der Analyse: ${error.message}`, error: error.message }));
      }
    });
  };
  
  const handleCustomerCreated = () => {
    setSelectedAnalysis(null);
  };

  const getFileNameById = (fileId: string) => files.find(f => f.id === fileId)?.name || 'Unbekannte Datei';

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="p-4">
          <h3 className="font-semibold">Aufgezeichnete Gespräche</h3>
        </div>
        <div className="border-t">
          <ul className="divide-y divide-border">
            {files.map((file) => {
              const { date, time, displayName } = parseFileName(file.name);
              return (
                <li key={file.id} onClick={() => handleFileClick(file)} className="cursor-pointer">
                  <div className="flex items-center gap-3 p-4 hover:bg-muted/50">
                    <Music4 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                        <p className="font-medium flex items-center gap-2">
                            {displayName}
                            {isRecent(file.modifiedTime) && (
                                <span className="h-2 w-2 rounded-full bg-red-500" title="Kürzlich aktualisiert"></span>
                            )}
                        </p>
                        {(date || time) && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                {time && <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {time}</span>}
                                {date && <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {date}</span>}
                            </div>
                        )}
                    </div>
                  </div>
                </li>
              )
            })}
            {files.length === 0 && (
              <li className="p-4 text-center text-muted-foreground">
                Keine Audiodateien in diesem Ordner gefunden.
              </li>
            )}
          </ul>
        </div>
      </div>

      <AlertDialog open={!!selectedAnalysis} onOpenChange={(open) => !open && setSelectedAnalysis(null)}>
        <AlertDialogContent className="max-w-4xl">
            <ScrollArea className="max-h-[85vh]">
                <div className="p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                        <Newspaper className="h-5 w-5"/>
                        {`Analyse für "${selectedAnalysis ? getFileNameById(selectedAnalysis.fileId) : ''}"`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                        Klicken Sie auf ein Wort im Transkript, um es zu korrigieren und die Analyse zu aktualisieren.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <AlignLeft className="h-4 w-4" />
                                    Zusammenfassung
                                </h4>
                                <div className="rounded-md border p-4 text-sm text-muted-foreground min-h-[100px]">
                                    {isAnalyzing && !selectedAnalysis?.summary ? <Loader2 className="h-5 w-5 animate-spin"/> : selectedAnalysis?.summary || '...'}
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Überprüfen & Speichern</h4>
                                <div className="rounded-md border p-4">
                                    {isAnalyzing && !selectedAnalysis?.customerData ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                                        </div>
                                    ) : selectedAnalysis?.customerData ? (
                                        <SaveCustomerWizard 
                                            initialData={{
                                                ...(selectedAnalysis.customerData || {}),
                                                'Name (Vor- und Nachname)': selectedAnalysis.customerData?.['Name (Vor- und Nachname)'] || customerName || ''
                                            }}
                                            onCustomerAdded={handleCustomerCreated}
                                        />
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">Keine strukturierten Kundendaten gefunden.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Gesamtes Transkript</h4>
                                <ScrollArea className="rounded-md border p-4 h-96">
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {isAnalyzing && selectedAnalysis?.transcript === 'Analyse wird durchgeführt...' ? (
                                            <Loader2 className="h-5 w-5 animate-spin"/>
                                        ) : (
                                            transcriptWords.map((word, index) => (
                                                <Popover key={index} open={editingWord?.index === index} onOpenChange={(open) => !open && setEditingWord(null)}>
                                                    <PopoverTrigger asChild>
                                                        <span onClick={() => handleWordClick(index, word)} className="cursor-pointer hover:bg-yellow-100/50 rounded p-0.5">{word}</span>
                                                    </PopoverTrigger>
                                                    {' '}
                                                    <PopoverContent className="w-auto p-2">
                                                        <div className="flex items-center gap-1">
                                                            <Input 
                                                                defaultValue={word} 
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleWordSave(index, (e.target as HTMLInputElement).value);
                                                                }}
                                                                onChange={(e) => setEditingWord({ index, text: e.target.value })}
                                                                autoFocus
                                                                className="h-8"
                                                            />
                                                            <Button size="icon" className="h-8 w-8" onClick={() => handleWordSave(index, editingWord?.text || word)}><Check className="h-4 w-4"/></Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingWord(null)}><X className="h-4 w-4"/></Button>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>

                    </div>
                    <AlertDialogCancel>Schließen</AlertDialogCancel>
                </div>
            </ScrollArea>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function isRecent(dateString: string) {
    if (!dateString) return false;
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    return new Date(dateString) > twentyFourHoursAgo;
}
