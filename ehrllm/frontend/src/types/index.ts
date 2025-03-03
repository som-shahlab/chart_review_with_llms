// Common interfaces used across components

export interface Note {
  note_id: string;
  text: string;
  chartdatetime: string;
  note_type: string;
  hadm_id: string;
}

export interface PatientMetadata {
  name: string;
  age: number;
  mrn: string;
  n_notes: number;
  labels: any[] | null;
}

export interface PatientData {
  metadata: {
    name: string;
    age: number;
    mrn: string;
    n_notes: number;
  };
  notes: Note[];
}

export interface Quote {
  quote: string;
  source: string;
  note_id: string;
}

export interface Evidence {
  claim?: string;
  quotes?: Quote[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  reflection?: string;
  evidence?: Evidence[];
}