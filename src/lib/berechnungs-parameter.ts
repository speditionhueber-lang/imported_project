
// src/lib/berechnungs-parameter.ts

// RECHNUNGSGRUNDLAGEN
export const CARRY_METER_PRICE_PER_M3 = 1.5; // DEPRECATED - Trageweg-Preis (€/m³)
export const FLOOR_PRICE_PER_M3 = 5; // DEPRECATED - Stockwerk-Preis (€/m³)
export const ASSEMBLY_WORKER_RATE = 55; // Stundensatz Monteur (€/h)
export const KITCHEN_ASSEMBLY_HOURS_PER_METER = 2.5; // Aufwand Küchenmontage (h/m)
export const CARRIER_RATE = 45; // Stundensatz Träger (€/h)

export const VEHICLE_RATES = {
  SPRINTER_RATE: 45, // (€/h)
  LKW_7_5_RATE: 65, // (€/h)
  LKW_12_RATE: 85, // (€/h)
};

// BERECHNUNGS-PARAMETER
export const ELEVATOR_FACTORS: { [key: string]: number } = {
  none: 1,
  small: 0.7, // 30% Reduktion
  medium: 0.5, // 50% Reduktion
  large: 0.3, // 70% Reduktion
};

export const MAN_HOUR_FACTOR = 0.8; // Personalstunden-Faktor (h/m³) für Be- und Entladen
export const FLOOR_MAN_HOUR_FACTOR = 0.1; // DEPRECATED - zusätzl. Stunden pro Stockwerk und m³
export const CARRY_MAN_HOUR_FACTOR = 0.006; // zusätzl. Stunden pro m³ und Meter Trageweg
export const MAN_HOUR_REDUCTION_FACTOR = 0.75; // Reduzierung der benötigten Arbeitszeit durch 1 Kundenhelfer

export const VEHICLE_SPEEDS = {
  SPRINTER_SPEED: 80, // (km/h)
  LKW_7_5_SPEED: 70, // (km/h)
  LKW_12_SPEED: 65, // (km/h)
};

export const BUILDING_TYPE_SURCHARGE = {
  altbau: 1.15, // 15% Zuschlag
  neubau: 1.0,
};

export const TOLL_COSTS = {
    DEFAULT: 0.18, // €/km
    DE: 0.15, // €/km
    CH_PAUSCHAL: 40, // €
};

export const OVERNIGHT_COSTS_PER_PERSON = 90; // €

// Schwellenwerte
export const OVERNIGHT_DISTANCE_THRESHOLD_KM = 400;
export const OVERNIGHT_WORKFORCE_THRESHOLD = 5;

// Sonstiges
export const HVZ_PRICE_PER_ZONE = 120; // Halteverbotszone
export const FIXED_BOOKING_DISCOUNT = 0.05; // 5% Rabatt
