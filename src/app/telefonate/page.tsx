import PageHeader from '@/components/layout/page-header';
import { CustomerCallList } from '@/components/telefonate/folder-list';
import { listFolders, listAudioFiles } from '@/lib/google-drive';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { getFolderName } from '@/lib/google-drive';

type AudioFile = {
  id: string;
  name: string;
  modifiedTime: string;
  folderId: string;
  folderName: string;
};

// Extracts customer name from file or folder name
const extractCustomerName = (fileName: string, folderName: string): string => {
    // Priority: Filename might contain a more specific name
    const fileNameMatch = fileName.match(/^([a-zA-Z\s]+)_\d{4}-\d{2}-\d{2}/);
    if (fileNameMatch && fileNameMatch[1]) {
        const name = fileNameMatch[1].replace(/_/g, ' ').trim();
        if (name.toLowerCase() !== 'call') {
            return name;
        }
    }
    // Fallback to folder name
    return folderName;
};

export default async function TelefonatePage() {
  let allAudioFiles: AudioFile[] = [];
  let error: string | null = null;
  let isLoading = false;

  try {
    isLoading = true;
    const topLevelFolders = await listFolders();
    
    for (const folder of topLevelFolders) {
        if (folder.id) {
            const folderName = folder.name || 'Unbenannt';
            const audioFilesInFolder = await listAudioFiles(folder.id);
            const processedFiles = audioFilesInFolder.map(f => ({ 
              id: f.id!, 
              name: f.name!,
              modifiedTime: f.modifiedTime!,
              folderId: folder.id!,
              folderName: folderName,
            }));
            allAudioFiles = allAudioFiles.concat(processedFiles);
        }
    }
    
  } catch (e: any) {
    console.error('Error fetching data for TelefonatePage:', e.message, e.stack);
    error = e.message || 'Ein unbekannter Fehler ist aufgetreten.';
  } finally {
    isLoading = false;
  }
  
  // Group files by customer
  const callsByCustomer = allAudioFiles.reduce((acc, file) => {
    const customerName = extractCustomerName(file.name, file.folderName);
    if (!acc[customerName]) {
      acc[customerName] = {
        files: [],
        lastCall: new Date(0),
        folderId: file.folderId // Assuming all calls for a customer are in one folder
      };
    }
    acc[customerName].files.push(file);
    const callDate = new Date(file.modifiedTime);
    if (callDate > acc[customerName].lastCall) {
        acc[customerName].lastCall = callDate;
    }
    return acc;
  }, {} as Record<string, { files: AudioFile[], lastCall: Date, folderId: string }>);

  // Sort customers by the date of their last call
  const sortedCustomers = Object.entries(callsByCustomer).sort(([, a], [, b]) => {
      return b.lastCall.getTime() - a.lastCall.getTime();
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Telefonate"
        description="Durchsuchen Sie aufgezeichnete Telefongespräche, gruppiert nach Kunden."
      />
      {error && (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Fehler beim Laden der Anrufe</AlertTitle>
            <AlertDescription>
                <p>Die Anrufdaten aus Google Drive konnten nicht geladen werden. Bitte überprüfen Sie die folgenden Punkte:</p>
                <ul className="list-disc pl-5 mt-2">
                    <li>Die Umgebungsvariablen (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`) sind korrekt in der `.env`-Datei eingetragen.</li>
                    <li>Die Google Drive API ist in Ihrem Google Cloud Projekt aktiviert.</li>
                    <li>Der Google Drive Ordner wurde für die Service-Account-Email (`GOOGLE_CLIENT_EMAIL`) freigegeben.</li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground font-mono">{error}</p>
            </AlertDescription>
        </Alert>
      )}
      <CustomerCallList customers={sortedCustomers} isLoading={isLoading} />
    </div>
  );
}
