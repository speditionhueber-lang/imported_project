
import { Wrench, Car, Users, Handshake, Zap, Construction } from 'lucide-react';
import React from 'react';
import type { UserRole } from '@/lib/types';

export type License = 'LKW' | 'Auto' | 'Motorrad';

export const allRoles: UserRole[] = ['Arbeiter', 'Büro', 'Geschäftsführer', 'IT Admin', 'Steuerberater'];


export type Skill = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

export const defaultSkills: Skill[] = [
  { name: 'Monteur', icon: Wrench, color: 'text-blue-500' },
  { name: 'Fahrer', icon: Car, color: 'text-green-500' },
  { name: 'Teamleiter', icon: Users, color: 'text-purple-500' },
  { name: 'Kundenumgang', icon: Handshake, color: 'text-orange-500' },
  { name: 'Elektro', icon: Zap, color: 'text-yellow-500' },
  { name: 'Klempner', icon: Construction, color: 'text-red-500' },
];

export type Employee = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl: string;
  licenses: License[];
  employmentType: 'Vollzeit' | 'Teilzeit' | 'Geringfügig';
  hourlyWage: number;
  contractedHours: number; // pro Monat
  role: UserRole;
  skills: string[];
};

export const employees: Employee[] = [
  {
    id: 'emp_1',
    name: 'Dominik Sturm',
    email: 'dominik.sturm@worker.company.com',
    phone: '+436601234567',
    avatarUrl: 'https://picsum.photos/seed/emp1/40/40',
    licenses: ['LKW', 'Auto', 'Motorrad'],
    employmentType: 'Vollzeit',
    hourlyWage: 25.5,
    contractedHours: 160,
    role: 'Geschäftsführer',
    skills: ['Teamleiter', 'Kundenumgang', 'Fahrer']
  },
  {
    id: 'emp_2',
    name: 'Dragan Dojkovic',
    email: 'dragan.dojkovic@worker.company.com',
    phone: '+436602345678',
    avatarUrl: 'https://picsum.photos/seed/emp2/40/40',
    licenses: ['LKW', 'Auto'],
    employmentType: 'Vollzeit',
    hourlyWage: 24.0,
    contractedHours: 160,
    role: 'Arbeiter',
    skills: ['Monteur', 'Fahrer']
  },
  {
    id: 'emp_3',
    name: 'Michl Tragert',
    email: 'michl.tragert@worker.company.com',
    phone: '+436603456789',
    avatarUrl: 'https://picsum.photos/seed/emp3/40/40',
    licenses: ['Auto'],
    employmentType: 'Teilzeit',
    hourlyWage: 22.0,
    contractedHours: 80,
    role: 'Arbeiter',
    skills: ['Monteur']
  },
  {
    id: 'emp_4',
    name: 'Eva Aushilfe',
    email: 'eva.aushilfe@worker.company.com',
    phone: '+436604567890',
    avatarUrl: 'https://picsum.photos/seed/emp4/40/40',
    licenses: [],
    employmentType: 'Geringfügig',
    hourlyWage: 18.0,
    contractedHours: 40,
    role: 'Büro',
    skills: ['Kundenumgang']
  },
];

export type { UserRole };
