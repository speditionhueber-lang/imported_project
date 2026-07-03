import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/lib/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

interface JobWithRevenue extends Job {
    revenue: number;
}

export function RecentJobs({ jobs }: { jobs: JobWithRevenue[] }) {
    const recentJobs = jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

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
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Ungültig';
        const zonedDate = toZonedTime(date, 'UTC');
        return format(zonedDate, 'PP', { locale: de });
      };
      
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Letzte Aufträge</CardTitle>
                <CardDescription>Eine Liste der 5 zuletzt erstellten Aufträge.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kunde</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Geplant</TableHead>
                            <TableHead className="text-right">Umsatz</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentJobs.map((job) => (
                            <TableRow key={job.id}>
                                <TableCell>
                                    <div className="font-medium">{job.customerName}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge className="text-xs capitalize" variant={getStatusVariant(job.status)}>
                                        {translateStatus(job.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell>{formatDate(job.scheduledAt)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(job.revenue)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
