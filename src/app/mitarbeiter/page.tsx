
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCustomer } from '@/contexts/customer-context';
import { type Employee, defaultSkills, type License, allRoles } from '@/lib/mitarbeiter-data';
import { differenceInHours, startOfMonth, endOfMonth, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { PlusCircle, FileDown, User, Truck, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import EmployeeDetails from '@/components/mitarbeiter/employee-details';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees } from '@/hooks/use-employees';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const MotorcycleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M12 18h-4" /><path d="M12 18h4" /><path d="M17 14 14 6h-2l-2.5 4" /><path d="m14 9-2.5 2.5" /></svg>
);
const licenseOrder: License[] = ['LKW', 'Auto', 'Motorrad'];
const licenseIcons: Record<License, React.ReactNode> = {
    'LKW': <Truck className="h-4 w-4" />,
    'Auto': <Car className="h-4 w-4" />,
    'Motorrad': <MotorcycleIcon className="h-4 w-4" />
}

export default function MitarbeiterPage() {
  const { customerStates } = useCustomer();
  const { employees, isLoading, error } = useEmployees();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isNewEmployeeDialogOpen, setIsNewEmployeeDialogOpen] = useState(false);
  const [employmentFilter, setEmploymentFilter] = useState('Gesamt');
  const [licenseSort, setLicenseSort] = useState('none');
  const [skillFilter, setSkillFilter] = useState('none');

  const workedHoursByEmployee = useMemo(() => {
    const hoursMap: Record<string, number> = {};
    const thisMonthStart = startOfMonth(new Date());
    const thisMonthEnd = endOfMonth(new Date());

    Object.values(customerStates).forEach(state => {
      (state.calendarEvents || []).forEach(event => {
        const eventStart = new Date(event.start);
        if (eventStart >= thisMonthStart && eventStart <= thisMonthEnd) {
            const duration = differenceInHours(new Date(event.end), eventStart);
            event.workers?.forEach(workerName => {
                if (!hoursMap[workerName]) {
                    hoursMap[workerName] = 0;
                }
                hoursMap[workerName] += duration;
            });
        }
      });
    });
    return hoursMap;
  }, [customerStates]);

  const filteredAndSortedEmployees = useMemo(() => {
      let filtered = employees ? [...employees] : [];

      if (employmentFilter !== 'Gesamt') {
          filtered = filtered.filter(emp => emp.employmentType === employmentFilter);
      }

      if (skillFilter !== 'none') {
          filtered = filtered.filter(emp => emp.skills?.includes(skillFilter));
      }
      
      if (licenseSort !== 'none') {
          filtered.sort((a, b) => {
              const aHasLicense = a.licenses.includes(licenseSort as License);
              const bHasLicense = b.licenses.includes(licenseSort as License);
              if (aHasLicense && !bHasLicense) return -1;
              if (!aHasLicense && bHasLicense) return 1;
              return 0;
          });
      }

      return filtered;
  }, [employees, employmentFilter, licenseSort, skillFilter]);

  const getSkillIcon = (skillName: string) => {
    const skill = defaultSkills.find(s => s.name === skillName);
    return skill ? <skill.icon className={`h-4 w-4 ${skill.color}`} /> : <User className="h-4 w-4 text-gray-400" />;
  };
  
  const handleSaveEmployee = (updatedEmployee: Employee) => {
    if (!firestore) return;
    const { id, ...dataToSave } = updatedEmployee;
    const docRef = doc(firestore, 'workers', id);
    setDoc(docRef, dataToSave, { merge: true })
        .then(() => {
            toast({ title: 'Gespeichert', description: `Daten für ${updatedEmployee.name} aktualisiert.` });
        })
        .catch(err => {
            console.error(err);
            toast({ variant: 'destructive', title: 'Fehler', description: 'Mitarbeiter konnte nicht gespeichert werden.' });
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: dataToSave
            }));
        });
  };
  
  const handleAddNewEmployee = async () => {
    if (!firestore) return;

    const newId = `emp_${Date.now()}`;
    const newEmployee: Omit<Employee, 'id'> = {
        name: 'Neuer Mitarbeiter',
        email: `neu_${newId}@hueber.at`,
        avatarUrl: `https://picsum.photos/seed/${newId}/40/40`,
        licenses: [],
        employmentType: 'Geringfügig',
        hourlyWage: 18.0,
        contractedHours: 0,
        role: 'Arbeiter',
        skills: [],
    };
    
    const collectionRef = collection(firestore, 'workers');
    addDoc(collectionRef, newEmployee)
        .then(() => {
            toast({ title: 'Mitarbeiter hinzugefügt', description: 'Ein neuer Mitarbeiter wurde angelegt.'});
            setIsNewEmployeeDialogOpen(false);
        })
        .catch(err => {
            console.error(err);
            toast({ variant: 'destructive', title: 'Fehler', description: 'Mitarbeiter konnte nicht hinzugefügt werden.' });
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: collectionRef.path,
                operation: 'create',
                requestResourceData: newEmployee
            }));
        });
  }

  const handleExportHours = () => {
    let csvContent = "data:text/csv;charset=utf-8,Mitarbeiter,Geleistete Stunden (diesen Monat),Soll-Stunden,Verdienst (diesen Monat)\n";

    filteredAndSortedEmployees.forEach(employee => {
      const workedHours = workedHoursByEmployee[employee.name] || 0;
      const earnings = workedHours * employee.hourlyWage;
      const row = [
        employee.name,
        workedHours.toFixed(1).replace('.',','),
        employee.contractedHours,
        formatCurrency(earnings)
      ].join(";");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const month = format(new Date(), 'MMMM-yyyy', { locale: de });
    link.setAttribute("download", `stundenabrechnung_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <div className="flex justify-between items-start flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <CardTitle>Mitarbeiterübersicht</CardTitle>
              <CardDescription>
                  Filtern und sortieren Sie Ihre Mitarbeiter, um die richtige Person für den Job zu finden.
              </CardDescription>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" onClick={handleExportHours}><FileDown className="mr-2 h-4 w-4" /> Stunden exportieren</Button>
                 <Button onClick={() => setIsNewEmployeeDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Hinzufügen</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
                 <ToggleGroup type="single" value={employmentFilter} onValueChange={(value) => value && setEmploymentFilter(value)} aria-label="Anstellung filtern">
                    <ToggleGroupItem value="Gesamt">Gesamt</ToggleGroupItem>
                    <ToggleGroupItem value="Vollzeit">Vollzeit</ToggleGroupItem>
                    <ToggleGroupItem value="Teilzeit">Teilzeit</ToggleGroupItem>
                    <ToggleGroupItem value="Geringfügig">Geringfügig</ToggleGroupItem>
                </ToggleGroup>
                <Select value={licenseSort} onValueChange={setLicenseSort}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sortieren nach Lizenz" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Keine Sortierung</SelectItem>
                        {licenseOrder.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={skillFilter} onValueChange={setSkillFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Nach Fähigkeit filtern" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Alle Fähigkeiten</SelectItem>
                        {defaultSkills.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedEmployees.map(employee => {
          const workedHours = workedHoursByEmployee[employee.name] || 0;
          const earnings = workedHours * employee.hourlyWage;
          const hoursPercentage = employee.contractedHours > 0 ? (workedHours / employee.contractedHours) * 100 : 0;
          const earningsGoal = employee.contractedHours * employee.hourlyWage;
          const earningsPercentage = earningsGoal > 0 ? (earnings / earningsGoal) * 100 : 0;

          return (
            <Dialog key={employee.id}>
                <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={employee.avatarUrl} alt={employee.name} />
                                <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle>{employee.name}</CardTitle>
                                <Badge variant="secondary">{employee.employmentType}</Badge>
                            </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Geleistete Stunden</span>
                                    <span className="font-semibold">{workedHours.toFixed(1)} / {employee.contractedHours} h</span>
                                </div>
                                <Progress value={hoursPercentage} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Guthaben (Monat)</span>
                                    <span className="font-semibold">{formatCurrency(earnings)} / {formatCurrency(earningsGoal)}</span>
                                </div>
                                <Progress value={earningsPercentage} className="[&>div]:bg-green-500" />
                            </div>
                            <div className="flex justify-between items-center text-sm text-muted-foreground pt-2">
                                <div className="flex items-center gap-2">
                                    {employee.skills?.map(skill => (
                                        <span key={skill} title={skill}>{getSkillIcon(skill)}</span>
                                    ))}
                                </div>
                                <span>Stundensatz: {formatCurrency(employee.hourlyWage)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mitarbeiterdetails: {employee.name}</DialogTitle>
                    </DialogHeader>
                    <EmployeeDetails employee={employee} onSave={handleSaveEmployee} />
                </DialogContent>
            </Dialog>
          );
        })}
      </div>
       <Dialog open={isNewEmployeeDialogOpen} onOpenChange={setIsNewEmployeeDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Neuen Mitarbeiter anlegen</DialogTitle>
           </DialogHeader>
           <p className="py-4">Möchten Sie wirklich einen neuen, leeren Mitarbeiterdatensatz erstellen?</p>
           <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsNewEmployeeDialogOpen(false)}>Abbrechen</Button>
                <Button onClick={handleAddNewEmployee}>Bestätigen & Erstellen</Button>
           </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
