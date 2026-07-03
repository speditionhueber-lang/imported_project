'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FIELD_MAP, FIELD_MAP_NORM, mapBracketItem } from "@/lib/field-map";
import { ITEM_CBM_DEFAULTS } from "@/lib/item-cbm-defaults";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

export default function DatenMappingPage() {

    const gegenstaendeMap = useMemo(() => {
        const items: {key: string, name: string}[] = [];
        for (const category in ITEM_CBM_DEFAULTS) {
            for (const item of (ITEM_CBM_DEFAULTS as any)[category]) {
                if (item.key) {
                    // Create a pseudo-bracket-notation for display
                    items.push({ key: `[${item.name}]`, name: `gegenstaende.${item.key}` });
                }
            }
        }
        // Deduplicate
        const uniqueItems = Array.from(new Map(items.map(item => [item.name, item])).values());
        return uniqueItems;
    }, []);

    const allMappings = useMemo(() => {
        const standard = Object.entries(FIELD_MAP);
        const bracketed = gegenstaendeMap.map(item => [item.key, item.name]);
        return [...standard, ...bracketed].sort((a, b) => a[1].localeCompare(b[1]));
    }, [gegenstaendeMap]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Daten-Mapping Referenz</CardTitle>
                <CardDescription>
                    Hier finden Sie eine Liste aller Feldnamen aus Google Forms / Sheets und deren zugehöriges internes Datenfeld in der Anwendung.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50%]">Sheet / Formular Feldname</TableHead>
                                <TableHead className="w-[50%]">Internes Datenfeld</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allMappings.map(([formField, internalField], index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">{formField}</TableCell>
                                    <TableCell className="font-mono text-xs text-primary">
                                        {internalField}
                                        {internalField.startsWith('gegenstaende.') && <Badge variant="outline" className="ml-2">Gegenstand</Badge>}
                                        {internalField.startsWith('nebenleistungen.') && <Badge variant="outline" className="ml-2">Leistung</Badge>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
