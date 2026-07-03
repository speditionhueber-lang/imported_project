
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, UserPlus, Wrench, Car, Users, Handshake, Zap, Construction } from 'lucide-react';
import { cn } from '@/lib/utils';
import { defaultSkills, type Skill } from '@/lib/mitarbeiter-data';
import { Badge } from '../ui/badge';

const getSkillIcon = (skillName: string) => {
    const skill = defaultSkills.find(s => s.name === skillName);
    return skill ? <skill.icon className={`h-4 w-4 mr-2 ${skill.color}`} /> : <Users className="h-4 w-4 mr-2 text-gray-400" />;
};


export default function SkillSelector({ selectedSkills, onSkillsChange, disabled }: { selectedSkills: string[], onSkillsChange: (skills: string[]) => void, disabled?: boolean }) {
    const [availableSkills, setAvailableSkills] = useState(defaultSkills.map(s => s.name));
    const [newSkillName, setNewSkillName] = useState('');

    const addSkill = (skill: string) => {
        if (skill && !selectedSkills.includes(skill)) {
            onSkillsChange([...selectedSkills, skill]);
        }
    };

    const removeSkill = (skillToRemove: string) => {
        onSkillsChange(selectedSkills.filter(s => s !== skillToRemove));
    };
    
    const addNewSkillToList = () => {
        if(newSkillName && !availableSkills.includes(newSkillName)) {
            setAvailableSkills(prev => [...prev, newSkillName]);
            addSkill(newSkillName);
            setNewSkillName('');
        }
    }

    return (
        <div className="space-y-4">
             <div className="flex flex-wrap gap-2">
                {selectedSkills.map(skill => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {getSkillIcon(skill)}
                        {skill}
                        {!disabled && (
                            <button onClick={() => removeSkill(skill)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                        )}
                    </Badge>
                ))}
            </div>
            {!disabled && (
                <>
                <div className="flex gap-2">
                    <Select onValueChange={addSkill} value="">
                        <SelectTrigger>
                            <SelectValue placeholder="Fähigkeit hinzufügen" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSkills.map(s => (
                                <SelectItem key={s} value={s} disabled={selectedSkills.includes(s)}>
                                    <div className="flex items-center">{getSkillIcon(s)} {s}</div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex gap-2">
                    <Input 
                        placeholder="Neue Fähigkeit..."
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                    />
                    <Button type="button" size="icon" variant="outline" onClick={addNewSkillToList} title="Neue Fähigkeit zur Liste hinzufügen">
                        <UserPlus className="h-4 w-4" />
                    </Button>
                </div>
                </>
            )}
        </div>
    )
}
