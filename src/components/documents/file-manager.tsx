
'use client';
import { useState, useCallback, useEffect, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import { getDriveFolders, createDriveFolder, uploadFileToDriveAction, getDriveFiles } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, File, UploadCloud, PlusCircle, Loader2, ArrowLeft, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Customer } from '@/lib/types';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


type DriveFile = {
    id: string;
    name: string;
    modifiedTime: string;
    mimeType: string;
    webViewLink?: string | null;
    webContentLink?: string | null;
    thumbnailLink?: string | null;
};

type DriveItem = DriveFile & { isFolder: boolean };

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

export default function FileManager({ selectedCustomer }: { selectedCustomer: Customer | null }) {
    const [items, setItems] = useState<DriveItem[]>([]);
    const [folderStack, setFolderStack] = useState<{ id: string, name: string }[]>([{ id: '19aXIRe7kYGekLLjZBdO9mti3EE7rzRgP', name: 'Root' }]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, startUploading] = useTransition();
    const [newFolderName, setNewFolderName] = useState('');
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const { toast } = useToast();
    const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);

    const currentFolder = folderStack[folderStack.length - 1];

    useEffect(() => {
        if (selectedCustomer) {
            setNewFolderName(selectedCustomer.name);
        } else {
            setNewFolderName('');
        }
    }, [selectedCustomer]);

    const fetchItems = useCallback(async () => {
        if (!currentFolder.id) {
            toast({ variant: "destructive", title: "Fehler", description: "Keine Ordner-ID vorhanden." });
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const [foldersResult, filesResult] = await Promise.all([
            getDriveFolders(currentFolder.id),
            getDriveFiles(currentFolder.id)
        ]);
        
        let allItems: DriveItem[] = [];

        if (foldersResult.error) {
            toast({ variant: "destructive", title: "Fehler beim Laden der Ordner", description: foldersResult.error });
        } else {
            const validFolders = (foldersResult.data || [])
                .filter(f => f.id && f.name && f.modifiedTime)
                .map(f => ({ ...f, id: f.id!, name: f.name!, isFolder: true, mimeType: 'folder', modifiedTime: f.modifiedTime! }));
            allItems = allItems.concat(validFolders);
        }

        if (filesResult.error) {
            toast({ variant: "destructive", title: "Fehler beim Laden der Dateien", description: filesResult.error });
        } else {
            const validFiles = (filesResult.data || [])
                .filter(f => f.id && f.name && f.mimeType && f.modifiedTime)
                .map(f => ({ ...f, id: f.id!, name: f.name!, isFolder: false, mimeType: f.mimeType!, modifiedTime: f.modifiedTime! }));
            allItems = allItems.concat(validFiles);
        }
        
        allItems.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return a.name.localeCompare(b.name);
        });

        setItems(allItems);
        setIsLoading(false);
    }, [currentFolder.id, toast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);
    
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!currentFolder.id) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Kein Zielordner konfiguriert.' });
            return;
        }

        startUploading(async () => {
            setUploadProgress({});
            for (const file of acceptedFiles) {
                try {
                    const base64 = await fileToBase64(file);
                    let filename = file.name;
                    if(selectedCustomer) {
                        filename = `${selectedCustomer.name}_${file.name}`;
                    }

                    await uploadFileToDriveAction(currentFolder.id!, filename, base64, file.type);
                    
                    setUploadProgress(prev => ({...prev, [file.name]: 100 }));
                    toast({ title: "Upload erfolgreich", description: `${file.name} wurde hochgeladen.`});
                } catch (error: any) {
                    toast({ variant: 'destructive', title: `Upload fehlgeschlagen: ${file.name}`, description: error.message });
                }
            }
            fetchItems(); // Refresh list after upload
        });
    }, [currentFolder.id, toast, fetchItems, selectedCustomer]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });
    
    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !currentFolder.id) return;
        const { data, error } = await createDriveFolder(newFolderName, currentFolder.id);
        if (error) {
            toast({ variant: "destructive", title: "Fehler beim Erstellen des Ordners", description: error });
        } else {
            toast({ title: "Ordner erstellt", description: `"${newFolderName}" wurde erfolgreich erstellt.` });
            setNewFolderName(selectedCustomer ? selectedCustomer.name : '');
            fetchItems();
        }
    }

    const handleItemClick = (item: DriveItem) => {
        if (item.isFolder) {
            setFolderStack(prev => [...prev, { id: item.id, name: item.name }]);
        } else {
            setPreviewItem(item);
        }
    }
    
    const handleGoBack = () => {
        if (folderStack.length > 1) {
            setFolderStack(prev => prev.slice(0, -1));
        }
    }

    const getPreviewUrl = (item: DriveItem) => {
        // For Google Docs/Sheets/etc., use the webViewLink
        if (item.mimeType.includes('google-apps')) {
            return item.webViewLink?.replace('/view', '/preview');
        }
        // For other files, try to use a direct content link if available
        // Note: webContentLink requires specific permissions and might not always work for direct embedding
        return item.webContentLink || item.webViewLink || undefined;
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-center">
                {folderStack.length > 1 && (
                    <Button variant="outline" size="icon" onClick={handleGoBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                )}
                 <div className="flex-grow">
                    <h3 className="font-semibold text-lg">{currentFolder.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                        {folderStack.map(f => f.name).join(' / ')}
                    </p>
                </div>
            </div>
            
            <div className="flex gap-2">
                <Input 
                    placeholder="Neuer Ordnername..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                />
                <Button onClick={handleCreateFolder} disabled={!currentFolder.id || !newFolderName.trim()}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Ordner erstellen
                </Button>
            </div>
            
            <Card 
                {...getRootProps()} 
                className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-4">
                    <UploadCloud className="h-12 w-12 text-muted-foreground" />
                    {isDragActive ? (
                        <p className="font-semibold text-primary">Dateien hier ablegen...</p>
                    ) : (
                        <div>
                            <p className="font-semibold">Dateien per Drag & Drop hierher ziehen</p>
                            <p className="text-muted-foreground text-sm mt-1">oder</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); document.getElementById('file-upload-input')?.click() }}>
                                Dateien auswählen
                            </Button>
                            <input id="file-upload-input" type="file" multiple className="hidden" onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} />
                        </div>
                    )}
                </div>
            </Card>

            {isUploading && (
                <div>
                    <p className="text-sm font-medium mb-2">Hochladen...</p>
                    {Object.entries(uploadProgress).map(([name, progress]) => (
                        <div key={name} className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                                <span>{name}</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} />
                        </div>
                    ))}
                </div>
            )}

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                        </div>
                    ) : items.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {items.map(item => (
                                <div 
                                    key={item.id} 
                                    className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-muted/50 cursor-pointer group"
                                    onClick={() => handleItemClick(item)}
                                >
                                    {item.isFolder ? <Folder className="h-12 w-12 text-blue-500"/> : <File className="h-12 w-12 text-gray-500" />}
                                    <span className="text-sm font-medium mt-2 break-all">{item.name}</span>
                                    <span className="text-xs text-muted-foreground">{format(new Date(item.modifiedTime), 'dd.MM.yy', { locale: de })}</span>
                                    {!item.isFolder && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-6 w-6" title="Vorschau">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <a href={item.webViewLink || '#'} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" title="Herunterladen/Öffnen">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground">Keine Dateien oder Ordner gefunden.</p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>{previewItem?.name}</DialogTitle>
                        <DialogDescription>Vorschau</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow">
                        {previewItem && (
                            <iframe 
                                src={getPreviewUrl(previewItem)}
                                className="w-full h-full border-0"
                                title={`Vorschau für ${previewItem.name}`}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
