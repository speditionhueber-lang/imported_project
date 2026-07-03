'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function OutlookKalenderPage() {
  return (
    <Card className="h-[calc(100vh-120px)] flex flex-col">
      <CardHeader>
        <CardTitle>Outlook Kalender</CardTitle>
        <CardDescription>
          Hier sehen Sie den geteilten Outlook-Kalender.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <iframe
          src="https://outlook.office365.com/owa/calendar/d042085b376d4105ba513414f81986db@spedition-hueber.at/c6441b25fb2946cb806f12050d55b42d15598027320276438960/calendar.html"
          title="Outlook Kalender"
          className="w-full h-full border-0"
        />
      </CardContent>
    </Card>
  );
}
