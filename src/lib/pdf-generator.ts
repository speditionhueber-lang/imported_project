
// src/lib/pdf-generator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { OfferItem } from '@/contexts/offer-context';
import type { Customer, Job } from '@/lib/types';
import { companyData } from '@/lib/company-data';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { uploadFileToDriveAction } from '@/app/actions';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const formatQuantity = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    return String(parseFloat(rounded.toFixed(1)));
};

const addHeaderAndAddress = (doc: jsPDF, customer: Customer, logoBase64: string | null) => {
  if (logoBase64) {
    try {
      const logoWidth = 39 * 1.15; // 15% increase in width
      const logoHeight = 0; // Let jsPDF calculate the height to maintain aspect ratio
      doc.addImage(logoBase64, 'PNG', 20, 15, logoWidth, logoHeight);
    } catch (e) {
      console.error("Error adding logo to PDF. Is the base64 string correct?", e);
      doc.text('Logo', 20, 20); // Fallback text
    }
  } else {
     doc.text('Logo', 20, 20); // Fallback text
  }


  const companyDetails = [
    companyData.name,
    companyData.street,
    `${companyData.zip} ${companyData.city}`,
    `${companyData.email} | ${companyData.phone}`,
  ];
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(companyDetails, 190, 38, { align: 'right'});


  // --- Customer Address ---
  const customerAddress = [
    customer.name,
    customer.address?.street || '',
    `${customer.address?.zip || ''} ${customer.address?.city || ''}`,
    customer.address?.country || '',
  ];
  doc.setFontSize(8);
  doc.text('Empfänger', 20, 75);
  doc.setFontSize(10);
  doc.text(customerAddress.filter(line => line), 20, 80);
};

const addDocumentDetails = (doc: jsPDF, type: string, number: string, leistungsdatum: string, customer: Customer, startTime?: string, endTime?: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    let numLabel = 'Rechnungsnummer:';
    if (type === 'Anzahlung Rechnung' || type === 'Orientierungsangebot') numLabel = 'Angebotsnummer:';
    if (type === 'Storno-Rechnung') numLabel = 'Storno-Rechnungsnummer:';
    if (type === 'Lieferschein') numLabel = 'Lieferschein-Nr.:';

    const dateLabel = 'Datum:';

    const details = [
        { label: numLabel, value: number },
        { label: dateLabel, value: format(new Date(), 'dd.MM.yyyy', { locale: de }) },
        { label: 'Leistungsdatum:', value: leistungsdatum },
        { label: 'Kundennummer:', value: customer.id.substring(0, 10) },
    ];
    
    if (startTime && endTime && type === 'Lieferschein') {
        details.splice(3, 0, { label: 'Zeit:', value: `${startTime} - ${endTime}` });
    }

    let yPos = 65;
    details.forEach(detail => {
        doc.text(detail.label, 190, yPos, { align: 'right' });
        doc.text(detail.value, 190, yPos + 4, { align: 'right' });
        yPos += 10;
    });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(type, 20, 120);
};

const addItemsTable = (doc: jsPDF, items: OfferItem[]) => {
    const tableColumn = ["POS", "Leistung", "Menge", "Tarif", "Gesamt"];
    const tableRows: any[][] = [];
    
    let subtotal = 0;

    items.forEach((item, index) => {
      const itemData = [
        index + 1,
        item.description,
        formatQuantity(item.quantity),
        formatCurrency(item.unitPrice),
        formatCurrency(item.total),
      ];
      tableRows.push(itemData);
      subtotal += item.total;
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 130,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 220, 220],
        textColor: 0,
        fontStyle: 'bold',
      },
      styles: {
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      tableWidth: 170,
      margin: { left: 20 },
      columnStyles: {
          0: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'right' },
      }
    });
    
    return subtotal;
};

const addTotals = async (doc: jsPDF, subtotal: number, startY: number, anzahlung: number, restbetrag: number, docNumber: string, docType: string) => {
    const vat = subtotal * 0.20;
    const total = subtotal + vat;
    const isAnzahlungRechnung = docType === 'Anzahlung Rechnung';
    const isOrientierungsangebot = docType === 'Orientierungsangebot';
    
    let totals: (string | number)[][] = [
        ['Netto', formatCurrency(subtotal)],
        ['zzgl. 20% MwSt.', formatCurrency(vat)],
        ['Brutto', formatCurrency(total)],
    ];
    
    if (anzahlung > 0 && !isOrientierungsangebot) {
        if (isAnzahlungRechnung) {
            totals.push(['zu zahlender Betrag', formatCurrency(anzahlung)]);
        } else {
            totals.push(['abzüglich Anzahlung', formatCurrency(-anzahlung)]);
            totals.push(['Restbetrag', formatCurrency(restbetrag)]);
        }
    }


    autoTable(doc, {
        body: totals,
        startY: startY,
        tableWidth: 80,
        margin: { left: 110 },
        theme: 'plain',
        styles: {
            fontStyle: 'bold',
            fontSize: 10,
        },
        columnStyles: {
            1: { halign: 'right' }
        },
        didParseCell: (data: any) => {
             const isBruttoRow = data.row.index === 2;
             const isLastRow = data.row.index === data.table.body.length - 1;

            if (isBruttoRow) {
                 data.cell.styles.textColor = 255;
                 data.cell.styles.fillColor = [105, 105, 105]; // Dark Grey
            }
             if (isLastRow && anzahlung > 0 && !isOrientierungsangebot) {
                 data.cell.styles.fontStyle = 'bold';
                 data.cell.styles.fontSize = 11;
             }
        }
    });

    return (doc as any).lastAutoTable.finalY;
};

const addFooter = (doc: jsPDF, finalY: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();

    // Footer with company details
    doc.setFontSize(8);
    const col1 = [`FN: ${companyData.companyRegistryNumber}`, `Landesgericht Innsbruck`, `UID: ${companyData.uidNumber}`];
    const col2 = ['Bankverbindung:', `IBAN: ${companyData.iban}`, `BIC: ${companyData.bic}`];
    const col3 = ['Sitz der Gesellschaft:', `${companyData.street},`, `${companyData.zip} ${companyData.city} Österreich`];
    
    const footerYPos = pageHeight - 30;
    doc.setLineWidth(0.1); // Thin line
    doc.line(20, footerYPos - 5, 190, footerYPos - 5);

    doc.text(col1, 20, footerYPos);
    doc.text(col2, 80, footerYPos);
    doc.text(col3, 140, footerYPos);
  };

type OutputType = 'download' | 'send' | 'save' | 'blob';

const generateEPCQRCode = async (amount: number, reference: string, recipientName: string, iban: string, bic: string) => {
  const payload = [
    'BCD', // Service Tag
    '002', // Version (001 or 002)
    '1', // Character Set (1 = UTF-8)
    'SCT', // Identification
    bic,
    recipientName,
    iban.replace(/\s/g, ''),
    `EUR${amount.toFixed(2)}`,
    '', // Purpose (optional)
    reference, // Reference
    '', // Reference (optional, beneficiary)
    '', // User hint
  ].join('\n');
  
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 4
    });
  } catch (err) {
    console.error('QR-Code-Erstellung fehlgeschlagen:', err);
    return null;
  }
};

const generatePDF = async (
  type: 'Rechnung' | 'Anzahlung Rechnung' | 'Storno-Rechnung' | 'Orientierungsangebot',
  customer: Customer,
  items: OfferItem[],
  logoBase64: string | null,
  outputType: OutputType,
  paymentTerms: string | null = null,
  docNumber: string,
  totalM3: number,
  leistungsdatum: string | undefined,
  anzahlung: number,
  restbetrag: number,
  handleUpload: (filename: string, buffer: ArrayBuffer, folderId: string) => Promise<void>,
  driveFolderId?: string
) => {
  const doc = new jsPDF();
  const finalLeistungsdatum = leistungsdatum || format(new Date(), 'dd.MM.yyyy', { locale: de });

  addHeaderAndAddress(doc, customer, logoBase64);
  addDocumentDetails(doc, type, docNumber, finalLeistungsdatum, customer);

  const subtotal = addItemsTable(doc, items);
  
  const tableEndY = (doc as any).lastAutoTable.finalY;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const startY = tableEndY + 10;
  
  const rightBlockY = await addTotals(doc, subtotal, startY, anzahlung, restbetrag, docNumber, type);
  
  let infoBlockY = startY;

  // Conditional info block for "Anzahlung Rechnung"
  if (type === 'Anzahlung Rechnung' || type === 'Orientierungsangebot') {
    const zeitwert = totalM3 > 0 ? (totalM3 / 4) * 1090 : 0;
    let infoText = [];

    if (type === 'Orientierungsangebot') {
        infoText = [
            'Das Angebot basiert auf den vom Kunden bereitgestellten Informationen.',
            'Das Angebot basiert auf realistischen Erfahrungswerten.',
            'Es gelten die Allgemeinen Österreichischen Spediteurbedingungen (AÖSp).',
            'Dieses Angebot ist unverbindlich.'
        ];
    } else {
        infoText = [
            `Zeitwert (Versicherung): ${formatCurrency(zeitwert)}`,
            'Die Rechnung basiert auf den vom Kunden bereitgestellten Informationen.',
            'Diese Rechnung basiert auf realistischen Erfahrungswerten.',
            'Es gelten die Allgemeinen Österreichischen Spediteurbedingungen (AÖSp).',
            'Es gelten die Allgemeinen Österreichischen Spediteurbedingungen (AÖSp).',
        ];
    }

    if (paymentTerms && type !== 'Orientierungsangebot') {
        infoText.push(paymentTerms);
    }
    doc.text(infoText, 20, infoBlockY, {
        maxWidth: 80,
        lineHeightFactor: 1.5,
    });
    infoBlockY += infoText.length * 5 + 10; // Adjust for spacing
  }

  // Conditional signature line for "Anzahlung Rechnung"
  if (type === 'Anzahlung Rechnung') {
    const signatureY = Math.max(rightBlockY, infoBlockY) + 10;
    doc.setLineWidth(0.2);
    doc.line(110, signatureY, 190, signatureY);
    doc.text('(Unterschrift Kunde) nach Erhalt der Rechnung', 150, signatureY + 5, { align: 'center'});
  }

  addFooter(doc, rightBlockY);
  
  // Add second page with QR Code for invoices and down payments
  if ((type === 'Rechnung' || type === 'Anzahlung Rechnung') && subtotal > 0) {
    doc.addPage();
    const isAnzahlungRechnung = type === 'Anzahlung Rechnung';
    const finalAmount = isAnzahlungRechnung ? anzahlung : (anzahlung > 0 ? restbetrag : subtotal * 1.2);
    const qrCodeDataUrl = await generateEPCQRCode(finalAmount, docNumber, companyData.accountHolder, companyData.iban, companyData.bic);

    if (qrCodeDataUrl) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Einfach bezahlen per QR-Code', 105, 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Scannen Sie diesen QR-Code mit Ihrer Banking-App, um die Überweisung automatisch auszufüllen.', 105, 40, { align: 'center', maxWidth: 160 });

        const qrWidth = 80;
        const qrX = (doc.internal.pageSize.getWidth() - qrWidth) / 2;
        doc.addImage(qrCodeDataUrl, 'PNG', qrX, 50, qrWidth, qrWidth);

        const detailsY = 140;
        doc.text(`Empfänger: ${companyData.accountHolder}`, qrX, detailsY);
        doc.text(`IBAN: ${companyData.iban}`, qrX, detailsY + 7);
        doc.text(`BIC: ${companyData.bic}`, qrX, detailsY + 14);
        doc.text(`Betrag: ${formatCurrency(finalAmount)}`, qrX, detailsY + 21);
        doc.text(`Verwendungszweck: ${docNumber}`, qrX, detailsY + 28);
    }
  }

  let filename;
  if (type === 'Orientierungsangebot') {
    filename = `OA-${customer.name}.pdf`;
  } else {
    filename = `${type.replace(/ /g, '_')}-${docNumber}-${customer.name}.pdf`;
  }

  if (driveFolderId) {
      try {
          const pdfBuffer = doc.output('arraybuffer');
          await handleUpload(filename, pdfBuffer, driveFolderId);
          console.log(`Successfully uploaded ${filename} to Google Drive.`);
      } catch (e) {
          console.error(`Failed to upload ${filename} to Google Drive.`, e);
          // We don't re-throw, so the download can still proceed.
      }
  }


  if (outputType === 'download' || outputType === 'save') {
    doc.save(filename);
    return { pdfOutput: null, filename };
  } else { // 'send' or 'blob'
    return { pdfOutput: doc.output('blob' as any), filename };
  }
};


export const generateOfferPDF = async (customer: Customer, items: OfferItem[], logoBase64: string | null, outputType: OutputType, paymentTerms: string | null = null, docId: string, totalM3: number, leistungsdatum?: string, anzahlung?: number, restbetrag?: number, handleUpload?: any) => {
  const anzahlungFolderId = '1DRoWMJnfwVkSzqSisJl62Plx3c6B7VoC';
  return generatePDF('Anzahlung Rechnung', customer, items, logoBase64, outputType, paymentTerms, docId, totalM3, leistungsdatum, anzahlung || 0, restbetrag || 0, handleUpload, anzahlungFolderId);
};

export const generateOrientierungsangebotPDF = async (customer: Customer, items: OfferItem[], logoBase64: string | null, outputType: OutputType, docId: string, totalM3: number, leistungsdatum?: string, handleUpload?: any) => {
    const orientierungsFolderId = '1DRoWMJnfwVkSzqSisJl62Plx3c6B7VoC'; // Or a different folder
    return generatePDF('Orientierungsangebot', customer, items, logoBase64, outputType, 'Dieses Angebot ist unverbindlich.', docId, totalM3, leistungsdatum, 0, 0, handleUpload, orientierungsFolderId);
};

export const generateInvoicePDF = async (customer: Customer, items: OfferItem[], logoBase64: string | null, outputType: OutputType, docId: string, totalM3: number, leistungsdatum?: string, anzahlung?: number, restbetrag?: number, handleUpload?: any) => {
  const rechnungFolderId = '18ST7pxnx3d42R2wrqk9l1ElJXwJLfIXX';
  const type = items.every(item => item.total <= 0) ? 'Storno-Rechnung' : 'Rechnung';
  return generatePDF(type, customer, items, logoBase64, outputType, null, docId, totalM3, leistungsdatum, anzahlung || 0, restbetrag || 0, handleUpload, rechnungFolderId);
};

export const generateLieferscheinPDF = (
  customer: Customer,
  job: Job,
  gegenstaende: { name: string; count: string, isNew?: boolean, montage?: boolean }[],
  workers: string[],
  note: string,
  logoBase64: string | null,
  outputType: 'save' | 'blob',
  docNumber: string,
  totalM3: number,
  startTime: string,
  endTime: string,
) => {
    const doc = new jsPDF();
    const leistungsdatum = format(new Date(job.scheduledAt), 'dd.MM.yyyy', { locale: de });

    const leftMargin = 20;
    const rightMargin = 20;
    const contentWidth = doc.internal.pageSize.getWidth() - leftMargin - rightMargin;
    const halfContentWidth = contentWidth / 2;
    const midPoint = leftMargin + halfContentWidth;

    addHeaderAndAddress(doc, customer, logoBase64);
    addDocumentDetails(doc, 'Lieferschein', docNumber, leistungsdatum, customer, startTime, endTime);

    let finalY = 130;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Abholadresse:', leftMargin, finalY, { maxWidth: halfContentWidth - 5 });
    doc.setFont('helvetica', 'normal');
    let abholLines = [job.abholadresse?.strasse || ''];
    if (job.abholadresse?.stockwerk) abholLines.push(`Stockwerk: ${job.abholadresse.stockwerk}`);
    if (job.abholadresse?.aufzug) abholLines.push(`Lift: ${job.abholadresse.aufzug}`);
    doc.text(abholLines, leftMargin, finalY + 5, { maxWidth: halfContentWidth - 5 });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Zieladresse:', midPoint, finalY, { maxWidth: halfContentWidth - 5 });
    doc.setFont('helvetica', 'normal');
    let zielLines = [job.zieladresse?.strasse || ''];
    if (job.zieladresse?.stockwerk) zielLines.push(`Stockwerk: ${job.zieladresse.stockwerk}`);
    if (job.zieladresse?.aufzug) zielLines.push(`Lift: ${job.zieladresse.aufzug}`);
    doc.text(zielLines, midPoint, finalY + 5, { maxWidth: halfContentWidth - 5 });
    
    finalY += 25;
    
    doc.setLineWidth(0.1);
    doc.line(leftMargin, finalY, leftMargin + contentWidth, finalY);
    finalY += 10;
    
    let leftY = finalY;
    let rightY = finalY;

    if (workers.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Eingeteilte Mitarbeiter:', leftMargin, leftY, { maxWidth: halfContentWidth - 5 });
        leftY += 5;
        doc.setFont('helvetica', 'normal');
        const workerLines = doc.splitTextToSize(workers.join(', '), halfContentWidth - 5);
        doc.text(workerLines, leftMargin, leftY);
        leftY += workerLines.length * 5;
    }
    
    if (totalM3 > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Gesamtvolumen:', leftMargin, leftY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${totalM3.toFixed(2)} m³`, leftMargin, leftY + 10);
      leftY += 15;
    }

    if (note) {
        doc.setFont('helvetica', 'bold');
        doc.text('Wichtige Hinweise für das Team:', midPoint, rightY, { maxWidth: halfContentWidth - 5 });
        rightY += 5;
        doc.setFont('helvetica', 'normal');
        const noteLines = doc.splitTextToSize(note, halfContentWidth - 5);
        doc.text(noteLines, midPoint, rightY);
        rightY += noteLines.length * 5;
    }
    
    let tableStartY = Math.max(leftY, rightY) + 5;
    
    // Add customer notes if they exist
    if (customer.anmerkungen) {
        doc.setFont('helvetica', 'bold');
        doc.text('Anmerkungen vom Kunden:', leftMargin, tableStartY);
        tableStartY += 5;
        doc.setFont('helvetica', 'normal');
        const anmerkungenLines = doc.splitTextToSize(customer.anmerkungen, contentWidth);
        doc.text(anmerkungenLines, leftMargin, tableStartY);
        tableStartY += anmerkungenLines.length * 5 + 5;
    }


    const itemTableRows = gegenstaende.map(item => {
        let nameCell: any = item.name;
        
        let extraText = [];
        if (item.isNew) extraText.push("zusätzlich hinzugefügt");
        if (item.montage) extraText.push("Montage");
        
        if (extraText.length > 0) {
            nameCell = {
                content: `${item.name} (${extraText.join(', ')})`,
                styles: { textColor: [255, 0, 0] }
            };
        }

        return [nameCell, item.count];
    });

    autoTable(doc, {
        head: [['Gegenstand', 'Anzahl']],
        body: itemTableRows,
        startY: tableStartY,
        theme: 'grid',
        margin: { left: leftMargin, right: rightMargin },
        headStyles: {
            fillColor: [240, 240, 240], // Light gray
            textColor: 0,
            fontStyle: 'bold',
        },
        columnStyles: {
            1: { halign: 'right' },
        },
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;
    
    const signatureY = Math.max(tableEndY + 20, 230);

    doc.setLineWidth(0.2);
    doc.line(30, signatureY, 90, signatureY);
    doc.text('Unterschrift (Übergebend)', 60, signatureY + 5, { align: 'center' });

    doc.line(120, signatureY, 180, signatureY);
    doc.text('Unterschrift (Übernehmend)', 150, signatureY + 5, { align: 'center' });


    const filename = `Lieferschein-${docNumber}-${customer.name}.pdf`;

    if (outputType === 'blob') {
        return { pdfOutput: doc.output('blob' as any), filename };
    } else { // 'save'
        doc.save(filename);
        return { pdfOutput: null, filename };
    }
};

    