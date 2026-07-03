import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getNextInvoiceNumber = (prefix: string, separator: string, currentNumber: number): string => {
    // This function will now just return the next number without accessing localStorage
    return `${prefix}${separator}${String(currentNumber).padStart(3, '0')}`;
};

export const incrementInvoiceNumber = (storageKey: string, initialValue: number) => {
    try {
        const storedNumber = localStorage.getItem(storageKey);
        const currentNumber = storedNumber ? parseInt(storedNumber, 10) : initialValue -1;
        localStorage.setItem(storageKey, String(currentNumber + 1));
    } catch(e) {
        console.error("Could not increment invoice number in local storage", e);
    }
}
