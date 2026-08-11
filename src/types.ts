export type Role = 'supervisor' | 'technician';

export interface Technician {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

export interface EquipmentType {
  id: number;
  name: string;
  code: string; // XRAY, WTMD, HHMD, ETD
  priority: number; // 1: XRAY, 2: WTMD, 3: HHMD, 4: ETD
  active: boolean;
}

export interface Location {
  id: number;
  name: string;
  code: string; // LOC-001, etc.
  active: boolean;
}

export interface Equipment {
  id: number;
  equipment_code: string;
  equipment_type_id: number;
  location_id: number;
  name: string;
  brand: string;
  model?: string;
  serial_number?: string;
  default_view?: 'single' | 'dual'; // For XRAY
  active: boolean;
}

export interface ChecklistFrequency {
  id: number;
  name: string;
  code: string; // HARIAN, MINGGUAN, BULANAN, TRIWULAN, SEMESTERAN, TAHUNAN
  sort_order: number;
}

export interface ChecklistItem {
  id: number;
  equipment_type_id: number;
  checklist_frequency_id: number;
  description: string;
  sequence: number;
  active: boolean;
}

export type ShiftType = 'Pagi' | 'Malam';

export interface PreventiveSession {
  id: number;
  dataset_id?: string;
  operational_date: string; // YYYY-MM-DD
  shift: ShiftType;
  started_at: string; // HH:mm
  ended_at: string; // HH:mm
  status: 'active' | 'completed';
  technician_ids: number[];
  technician_names: string[];
}

export interface MeasurementValue {
  generator: 'A' | 'B';
  positive_high_voltage?: number; // kV
  negative_high_voltage?: number; // kV
  heater_current?: number; // mA
  anode_current?: number; // uA
}

export interface ChecklistResult {
  checklist_item_id: number;
  description: string;
  status: 'Baik' | 'Temuan' | 'OK' | 'NG' | 'N/A';
  note?: string;
}

export interface PreventiveEvidence {
  id: number;
  file_path: string;
  caption: string;
  drive_url?: string;
  file_id?: string;
}

export interface PreventiveEntry {
  id: number;
  dataset_id?: string;
  preventive_session_id: number;
  equipment_id: number;
  checklist_frequency_id: number;
  view_type?: 'single' | 'dual';
  sequence: number; // Urutan submit dalam shift
  submitted_at: string; // HH:mm
  submitted_by_technician_ids: number[];
  notes: string;
  status: 'OK' | 'NG' | 'NEEDS_REPAIR';
  checklist_results: ChecklistResult[];
  measurements: MeasurementValue[];
  evidences: PreventiveEvidence[];
  operational_date?: string;
  shift?: ShiftType;
  period_key?: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface CorrectiveReport {
  id: number;
  dataset_id?: string;
  corrective_code: string; // CR-20260807-001
  corrective_date: string; // YYYY-MM-DD
  shift?: ShiftType;
  equipment_id: number;
  location_id: number;
  problem_description: string;
  action_taken: string;
  result: 'Resolved' | 'Pending Sparepart' | 'Temporary Fix';
  result_text?: string;
  technicians?: string[];
  start_time?: string;
  end_time?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  evidences: string[];
  synced?: boolean;
}

export interface CloudDataset {
  id: string;
  name: string;
  preventive_count: number;
  corrective_count: number;
  last_updated?: string;
}

export interface StructuredCorrectiveEntry {
  id: number;
  corrective_code: string;
  equipment_name: string;
  type_code: string;
  location_name: string;
  problem_description: string;
  action_taken: string;
  result: 'Resolved' | 'Pending Sparepart' | 'Temporary Fix';
  result_text?: string;
  start_time: string;
  end_time: string;
  time_range: string;
  notes: string;
  technicians: string[];
  evidences: string[];
}

export interface StructuredReportData {
  operational_date: string; // 04 Agustus 2026
  shift: ShiftType;
  start_time: string; // 08.45
  end_time: string; // 09.30
  technicians: string[];
  lines_by_type: {
    type_code: string;
    type_name: string;
    equipment_names: string[];
  }[];
  entries_by_type: {
    type_code: string;
    type_name: string;
    priority: number;
    entries: {
      equipment_id?: number;
      equipment_name: string;
      location_name: string;
      view_type?: 'single' | 'dual';
      measurements: MeasurementValue[];
      notes: string;
      submitted_at: string;
      sequence: number;
      evidences?: PreventiveEvidence[];
      checklist_frequency_id?: number;
    }[];
  }[];
  corrective_entries?: StructuredCorrectiveEntry[];
}
