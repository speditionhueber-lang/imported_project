import PageHeader from '@/components/layout/page-header';
import { getFolderName, listAudioFiles } from '@/lib/google-drive';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { AudioFileList } from '@/components/telefonate/audio-file-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function FolderPage({ params, searchParams }: { params: { folderId: string }, searchParams: { customer?: string } }) {
  let files: { id: string; name: string; mimeType: string; modifiedTime: string; }[] = [];
  let folderName: string | null = 'Kundenordner';
  let error = null;

  const customerNameFromQuery = searchParams.customer ? decodeURIComponent(searchParams.customer) : null;

  try {
    // Safely get folder name and handle potential null return on error
    folderName = customerNameFromQuery || await getFolderName(params.folderId);
    
    if (folderName) {
        const fetchedFiles = await listAudioFiles(params.folderId);
        files = fetchedFiles.map(f => ({ id: f.id!, name: f.name!, mimeType: f.mimeType!, modifiedTime: f.modifiedTime! }));
    } else {
        // If folderName is null, it means there was an error fetching it.
        error = `Der Ordner mit der ID '${params.folderId}' konnte nicht gefunden werden.`;
    }
  } catch (e: any) {
    console.error(e);
    error = e.message || 'Ein unbekannter Fehler ist aufgetreten.';
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-4">
          <Link href="/telefonate">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Kundenübersicht
          </Link>
        </Button>
        <PageHeader
          title={folderName || 'Fehler'}
          description={folderName ? `Durchsuchen Sie die aufgezeichneten Gespräche für ${folderName}.` : 'Der angeforderte Ordner konnte nicht geladen werden.'}
        />
      </div>
      {error && (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Fehler beim Laden der Audiodateien</AlertTitle>
            <AlertDescription>
                <p>{error}</p>
            </AlertDescription>
        </Alert>
      )}
      {!error && <AudioFileList files={files} customerName={customerNameFromQuery}/>}
    </div>
  );
}
