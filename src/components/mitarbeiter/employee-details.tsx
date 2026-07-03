
'use client';

import { useState, useMemo } from 'react';
import type { Employee, License, UserRole } from '@/lib/mitarbeiter-data';
import { allRoles } from '@/lib/mitarbeiter-data';
import { useRole } from '@/contexts/role-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Car } from 'lucide-react';
import { useCustomer } from '@/contexts/customer-context';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { eachDayOfInterval, startOfMonth, endOfMonth, format, differenceInHours, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import SkillSelector from './skill-selector';
import { ScrollArea } from '../ui/scroll-area';

const MotorcycleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M12 18h-4" />
        <path d="M12 18h4" />
        <path d="M17 14 14 6h-2l-2.5 4" />
        <path d="m14 9-2.5 2.5" />
    </svg>
);


const allLicenses: License[] = ['LKW', 'Auto', 'Motorrad'];
const licenseIcons: Record<License, React.ReactNode> = {
    'LKW': <Truck className="h-5 w-5" />,
    'Auto': <Car className="h-5 w-5" />,
    'Motorrad': <MotorcycleIcon className="h-5 w-5" />
}

export default function EmployeeDetails({ employee: initialEmployee, onSave }: { employee: Employee, onSave: (updatedEmployee: Employee) => void }) {
    const { role } = useRole();
    const { calendarEvents } = useCustomer();
    const isAdmin = role === 'admin';
    const [employee, setEmployee] = useState(initialEmployee);

    const monthlyHoursData = useMemo(() => {
        if (!calendarEvents) return [];
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        const daysInMonth = eachDayOfInterval({ start, end });

        const employeeEvents = calendarEvents.filter(event => 
            event.workers?.includes(employee.name)
        );

        return daysInMonth.map(day => {
            const dayEvents = employeeEvents.filter(event => isSameDay(new Date(event.start), day));
            const totalHours = dayEvents.reduce((sum, event) => {
                const duration = differenceInHours(new Date(event.end), new Date(event.start));
                return sum + duration;
            }, 0);
            return {
                name: format(day, 'd', { locale: de }),
                Stunden: totalHours
            }
        });
    }, [calendarEvents, employee.name]);


    const handleChange = (field: keyof Employee, value: any) => {
        setEmployee(prev => ({...prev, [field]: value}));
    };
    
    const handleLicenseChange = (license: License, checked: boolean) => {
        const currentLicenses = employee.licenses || [];
        if(checked) {
            if(!currentLicenses.includes(license)) {
                handleChange('licenses', [...currentLicenses, license]);
            }
        } else {
            handleChange('licenses', currentLicenses.filter(l => l !== license));
        }
    }

    const handleSaveChanges = () => {
        onSave(employee);
    }

    return (
        <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 pr-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={employee.name} onChange={e => handleChange('name', e.target.value)} disabled={!isAdmin} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={employee.email} onChange={e => handleChange('email', e.target.value)} disabled={!isAdmin} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input id="phone" type="tel" value={employee.phone} onChange={e => handleChange('phone', e.target.value)} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="hourlyWage">Stundensatz (€)</Label>
                    <Input id="hourlyWage" type="number" value={employee.hourlyWage} onChange={e => handleChange('hourlyWage', parseFloat(e.target.value))} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contractedHours">Soll-Stunden (Monat)</Label>
                    <Input id="contractedHours" type="number" value={employee.contractedHours} onChange={e => handleChange('contractedHours', parseInt(e.target.value))} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="role">Rolle</Label>
                    <Select value={employee.role} onValueChange={(value: UserRole) => handleChange('role', value)} disabled={!isAdmin}>
                        <SelectTrigger>
                            <SelectValue placeholder="Rolle auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                            {allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Führerscheine</Label>
                    <div className="flex gap-4">
                        {allLicenses.map(license => (
                            <div key={license} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`license-${license}`}
                                    checked={(employee.licenses || []).includes(license)}
                                    onChange={(e) => handleLicenseChange(license, e.target.checked)}
                                    disabled={!isAdmin}
                                />
                                <Label htmlFor={`license-${license}`} className="flex items-center gap-1 text-muted-foreground">
                                    {licenseIcons[license]}
                                    {license}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Fähigkeiten</Label>
                    <SkillSelector 
                        selectedSkills={employee.skills || []}
                        onSkillsChange={(newSkills) => handleChange('skills', newSkills)}
                        disabled={!isAdmin}
                    />
                </div>
                <div className="pt-4">
                    <h4 className="font-semibold text-sm mb-2">Arbeitsstunden {format(new Date(), 'MMMM yyyy', {locale: de})}</h4>
                    <div className="h-40 w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyHoursData}>
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                <RechartsTooltip 
                                    contentStyle={{ fontSize: '12px', padding: '5px' }}
                                    labelStyle={{ fontWeight: 'bold' }}
                                    formatter={(value: number) => [`${value} Std.`, "Geleistet"]}
                                />
                                <Bar dataKey="Stunden" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {isAdmin && <Button onClick={handleSaveChanges} className="w-full">Änderungen speichern</Button>}
            </div>
        </ScrollArea>
    );
};
