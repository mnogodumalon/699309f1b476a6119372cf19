// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export interface Werkzeuge {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeugname?: string;
    kategorie?: 'handwerkzeuge' | 'messgeraete' | 'pruefgeraete' | 'kabelwerkzeuge' | 'leitern_gerueste' | 'sicherheitsausruestung' | 'sonstiges' | 'elektrowerkzeuge';
    hersteller?: string;
    modellnummer?: string;
    seriennummer?: string;
    kaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    kaufpreis?: number;
    zustand?: 'neu' | 'sehr_gut' | 'gut' | 'befriedigend' | 'reparaturbeduerftig' | 'defekt';
    lagerort?: string;
    bemerkungen?: string;
  };
}

export interface Mitarbeiter {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    personalnummer?: string;
    abteilung?: 'elektroinstallation' | 'wartung_service' | 'projektleitung' | 'lager_logistik' | 'verwaltung';
    telefon?: string;
    email?: string;
  };
}

export interface Projekte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    projektname?: string;
    projektnummer?: string;
    kundenname?: string;
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    stadt?: string;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    projektleiter?: string;
  };
}

export interface Werkzeugzuweisung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeug?: string; // applookup -> URL zu 'Werkzeuge' Record
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiter' Record
    projekt?: string; // applookup -> URL zu 'Projekte' Record
    zuweisungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplante_rueckgabe?: string; // Format: YYYY-MM-DD oder ISO String
    tatsaechliche_rueckgabe?: string; // Format: YYYY-MM-DD oder ISO String
    notizen?: string;
  };
}

export interface Wartung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeug?: string; // applookup -> URL zu 'Werkzeuge' Record
    wartungsart?: 'inspektion' | 'reparatur' | 'kalibrierung' | 'reinigung' | 'pruefung_dguv' | 'sonstiges';
    wartungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    beschreibung?: string;
    kosten?: number;
    durchgefuehrt_von?: 'intern' | 'extern';
    naechste_wartung?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Werkzeugausgabe {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiter' Record
    werkzeuge?: string; // applookup -> URL zu 'Werkzeuge' Record
    ausgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplante_rueckgabe?: string; // Format: YYYY-MM-DD oder ISO String
    projekt?: string; // applookup -> URL zu 'Projekte' Record
    notizen?: string;
  };
}

export const APP_IDS = {
  WERKZEUGE: '699309c16be8c2151371e8d2',
  MITARBEITER: '699309c93eb42a21bc951830',
  PROJEKTE: '699309ca9b44b421957f7850',
  WERKZEUGZUWEISUNG: '699309ca891b89afb25878a1',
  WARTUNG: '699309cb6e8bcd312c5b2897',
  WERKZEUGAUSGABE: '699309cc15ab1dc81d204368',
} as const;

// Helper Types for creating new records
export type CreateWerkzeuge = Werkzeuge['fields'];
export type CreateMitarbeiter = Mitarbeiter['fields'];
export type CreateProjekte = Projekte['fields'];
export type CreateWerkzeugzuweisung = Werkzeugzuweisung['fields'];
export type CreateWartung = Wartung['fields'];
export type CreateWerkzeugausgabe = Werkzeugausgabe['fields'];