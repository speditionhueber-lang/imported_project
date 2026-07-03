'use client';

import { Folder, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type DriveFolder = {
  id: string;
  name: string;
  modifiedTime: string;
};

function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }),
        time: date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        })
    };
}

function isRecent(dateString: string) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    return new Date(dateString) > twentyFourHoursAgo;
}


export function FolderList({ folders, isLoading }: { folders: DriveFolder[], isLoading: boolean }) {
  
  const folderItems = isLoading ? Array.from({ length: 5 }) : folders;

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4">
        <h3 className="font-semibold">Kundenordner in Google Drive</h3>
      </div>
      <div className="border-t">
        <ul className="divide-y divide-border">
          {isLoading ? (
            folderItems.map((_, index) => (
                <li key={index}>
                    <div className="flex items-center gap-3 p-4">
                        <Skeleton className="h-5 w-5" />
                        <div className="flex-1 flex justify-between items-center">
                            <Skeleton className="h-4 w-3/5" />
                            <Skeleton className="h-4 w-1/5" />
                        </div>
                    </div>
                </li>
            ))
          ) : folders.length > 0 ? (
            folders.map((folder) => {
                const { date, time } = formatDateTime(folder.modifiedTime);
                return (
                    <li key={folder.id}>
                    <Link href={`/telefonate/${folder.id}`}>
                        <div className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer">
                        <Folder className="h-5 w-5 text-primary" />
                        <span className="flex-1 font-medium flex items-center gap-2">
                            {folder.name}
                            {isRecent(folder.modifiedTime) && (
                                <span className="h-2 w-2 rounded-full bg-red-500" title="Kürzlich aktualisiert"></span>
                            )}
                        </span>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{date}</span>
                            </div>
                        </div>
                        </div>
                    </Link>
                    </li>
                );
            })
          ) : (
            <li className="p-4 text-center text-muted-foreground">
              Keine Kundenordner gefunden.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
