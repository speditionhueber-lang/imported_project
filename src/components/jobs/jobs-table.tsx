
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import type { Job } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/contexts/role-context';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

export default function JobsTable({ jobs }: { jobs: Job[] }) {
  const { role } = useRole();

  const getStatusVariant = (status: Job['status']) => {
    switch (status) {
      case 'done':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'draft':
        return 'outline';
    }
  };

  const translateStatus = (status: Job['status']) => {
    switch (status) {
        case 'done':
            return 'erledigt';
        case 'scheduled':
            return 'geplant';
        case 'draft':
            return 'Entwurf';
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const zonedDate = toZonedTime(date, 'UTC');
    return format(zonedDate, 'PP', { locale: de });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Auftrag hinzufügen
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Geplantes Datum</TableHead>
              <TableHead className="hidden lg:table-cell">Notizen</TableHead>
              <TableHead>
                <span className="sr-only">Aktionen</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.customerName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(job.status)} className="capitalize">
                      {translateStatus(job.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(job.scheduledAt)}
                  </TableCell>
                  <TableCell className={cn("hidden lg:table-cell max-w-[300px] truncate", !job.notes && "text-muted-foreground")}>
                    {job.notes || 'Keine Notizen'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menü umschalten</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Details anzeigen</DropdownMenuItem>
                        <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                        {role === 'admin' && (
                          <DropdownMenuItem className="text-destructive">
                            Löschen
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Keine Aufträge gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
