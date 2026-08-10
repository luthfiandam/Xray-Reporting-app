import React, { useState, useEffect, useCallback } from 'react';
import {
  Role,
  ShiftType,
  Technician,
  Equipment,
  EquipmentType,
  Location,
  ChecklistFrequency,
  ChecklistItem,
  PreventiveSession,
  PreventiveEntry,
  CorrectiveReport,
} from './types';
import {
  INITIAL_TECHNICIANS,
  INITIAL_EQUIPMENT_TYPES,
  INITIAL_LOCATIONS,
  INITIAL_EQUIPMENTS,
  INITIAL_FREQUENCIES,
  INITIAL_CHECKLIST_ITEMS,
  INITIAL_PREVENTIVE_SESSION,
  INITIAL_PREVENTIVE_ENTRIES,
  INITIAL_CORRECTIVE_REPORTS,
} from './data/initialData';
import { buildStructuredReportData } from './services/reportService';
import { getOperationalShift, getDefaultTechniciansForShift } from './utils/technicianSchedule';
import {
  isCloudConfigured,
  fetchPreventiveRecords,
  savePreventiveRecord,
  fetchCorrectiveRecords,
  saveCorrectiveRecord,
} from './services/cloudService';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { ShiftModal } from './components/ShiftModal';
import { SupervisorLoginModal } from './components/SupervisorLoginModal';
import { DashboardView } from './components/DashboardView';
import { PreventiveView } from './components/PreventiveView';
import { CorrectiveView } from './components/CorrectiveView';
import { ReportView } from './components/ReportView';
import { MasterDataView } from './components/MasterDataView';

export default function App() {
  // Login State (defaults to false so initial screen is shown as requested)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'preventive' | 'corrective' | 'reports' | 'master'>(
    'preventive'
  );

  // User / Role State
  const [role, setRole] = useState<Role>('technician');

  // Master Data States
  const [technicians] = useState<Technician[]>(INITIAL_TECHNICIANS);
  const [equipmentTypes] = useState<EquipmentType[]>(INITIAL_EQUIPMENT_TYPES);
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [equipments, setEquipments] = useState<Equipment[]>(INITIAL_EQUIPMENTS);
  const [frequencies] = useState<ChecklistFrequency[]>(INITIAL_FREQUENCIES);
  const [checklistItems] = useState<ChecklistItem[]>(INITIAL_CHECKLIST_ITEMS);

  // Shift & Session State
  const [currentSession, setCurrentSession] = useState<PreventiveSession>(INITIAL_PREVENTIVE_SESSION);
  const [preventiveEntries, setPreventiveEntries] = useState<PreventiveEntry[]>(() => {
    try {
      const saved = localStorage.getItem('nti_preventive_entries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.error('Error reading localStorage preventive entries:', err);
    }
    return INITIAL_PREVENTIVE_ENTRIES;
  });

  const [correctiveReports, setCorrectiveReports] = useState<CorrectiveReport[]>(() => {
    try {
      const saved = localStorage.getItem('nti_corrective_reports');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.error('Error reading localStorage corrective reports:', err);
    }
    return INITIAL_CORRECTIVE_REPORTS;
  });

  // Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>(
    isCloudConfigured() ? 'synced' : 'offline'
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Sync preventive entries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nti_preventive_entries', JSON.stringify(preventiveEntries));
    } catch (err) {
      console.error('Error saving preventive entries to localStorage:', err);
    }
  }, [preventiveEntries]);

  // Sync corrective reports to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nti_corrective_reports', JSON.stringify(correctiveReports));
    } catch (err) {
      console.error('Error saving corrective reports to localStorage:', err);
    }
  }, [correctiveReports]);

  // Cloud Synchronize Handler (Fetch & Merge)
  const syncFromCloud = useCallback(async () => {
    if (!isCloudConfigured()) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      const [prevRes, corrRes] = await Promise.all([
        fetchPreventiveRecords(),
        fetchCorrectiveRecords(),
      ]);

      if (prevRes.success && Array.isArray(prevRes.data)) {
        setPreventiveEntries((localEntries) => {
          const merged = [...localEntries];
          for (const cloudRec of prevRes.data!) {
            // Unique tuple match: equipment_id + checklist_frequency_id + period_key + shift
            const idx = merged.findIndex(
              (e) =>
                e.equipment_id === cloudRec.equipment_id &&
                e.checklist_frequency_id === cloudRec.checklist_frequency_id &&
                (e.period_key || '') === (cloudRec.period_key || '') &&
                (e.shift || '') === (cloudRec.shift || '')
            );
            if (idx >= 0) {
              const localUpdated = merged[idx].updated_at || '';
              const cloudUpdated = cloudRec.updated_at || '';
              if (!localUpdated || cloudUpdated >= localUpdated) {
                merged[idx] = { ...merged[idx], ...cloudRec };
              }
            } else {
              merged.push(cloudRec);
            }
          }
          return merged;
        });
      }

      if (corrRes.success && Array.isArray(corrRes.data)) {
        setCorrectiveReports((localReports) => {
          const merged = [...localReports];
          for (const cloudReport of corrRes.data!) {
            const idx = merged.findIndex(
              (r) =>
                r.id === cloudReport.id ||
                (r.corrective_code && r.corrective_code === cloudReport.corrective_code)
            );
            if (idx >= 0) {
              const localUpdated = merged[idx].updated_at || '';
              const cloudUpdated = cloudReport.updated_at || '';
              if (!localUpdated || cloudUpdated >= localUpdated) {
                merged[idx] = { ...merged[idx], ...cloudReport };
              }
            } else {
              merged.push(cloudReport);
            }
          }
          return merged;
        });
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('Sync from cloud failed:', err);
      setSyncStatus('error');
    }
  }, []);

  // Initial Sync on Mount and when shift/date changes
  useEffect(() => {
    syncFromCloud();
  }, [currentSession.operational_date, currentSession.shift, syncFromCloud]);

  // Modals & Pre-selection
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isSupervisorLoginOpen, setIsSupervisorLoginOpen] = useState(false);
  const [preSelectedEquipmentId, setPreSelectedEquipmentId] = useState<number | null>(null);

  // On Duty Technician Names
  const technicianNames = currentSession.technician_ids
    .map((id) => technicians.find((t) => t.id === id)?.name)
    .filter(Boolean) as string[];

  // Login Technician Handler
  const handleLoginTechnician = (selectedTechIds: number[]) => {
    const techNames = selectedTechIds
      .map((id) => technicians.find((t) => t.id === id)?.name)
      .filter(Boolean) as string[];

    setCurrentSession({
      ...currentSession,
      technician_ids: selectedTechIds,
      technician_names: techNames,
    });
    setRole('technician');
    setActiveTab('preventive'); // Halaman utama teknisi langsung disuguhkan dengan preventif
    setIsLoggedIn(true);
  };

  // Login Supervisor Handler
  const handleLoginSupervisor = (password: string): boolean => {
    const validPasswords = ['admin', 'supervisor', '123456', 'luthfianda'];
    if (validPasswords.includes(password.toLowerCase().trim())) {
      setRole('supervisor');
      setActiveTab('dashboard');
      setIsLoggedIn(true);
      return true;
    }
    return false;
  };

  // Save Shift Handler
  const handleSaveShift = (selectedIds: number[], shift: ShiftType, date: string) => {
    const techNames = selectedIds
      .map((id) => technicians.find((t) => t.id === id)?.name)
      .filter(Boolean) as string[];

    setCurrentSession({
      ...currentSession,
      operational_date: date,
      shift: shift,
      technician_ids: selectedIds,
      technician_names: techNames,
    });
  };

  // Submit Preventive Entry Handler (Strict Upsert by equipment_id + checklist_frequency_id + period_key + shift)
  const handleSubmitPreventiveEntry = async (entry: Omit<PreventiveEntry, 'id'>) => {
    const now = new Date().toISOString();
    const fullEntry: PreventiveEntry = {
      ...entry,
      id: (entry as any).id || Date.now(),
      operational_date: entry.operational_date || currentSession.operational_date,
      shift: entry.shift || currentSession.shift,
      created_at: (entry as any).created_at || now,
      updated_at: now,
    };

    // 1. Immediately save to local state & localStorage
    setPreventiveEntries((prev) => {
      const existingIndex = prev.findIndex(
        (e) =>
          e.equipment_id === fullEntry.equipment_id &&
          e.checklist_frequency_id === fullEntry.checklist_frequency_id &&
          (e.period_key || '') === (fullEntry.period_key || '') &&
          (e.shift || '') === (fullEntry.shift || '')
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...fullEntry,
          id: prev[existingIndex].id,
        };
        return updated;
      } else {
        return [...prev, fullEntry];
      }
    });

    // 2. Asynchronously sync to Google Sheets & Drive
    if (isCloudConfigured()) {
      setSyncStatus('syncing');
      try {
        const res = await savePreventiveRecord(fullEntry);
        if (res.success && res.data) {
          const cloudRecord = res.data;
          setPreventiveEntries((prev) => {
            const idx = prev.findIndex(
              (e) =>
                e.equipment_id === cloudRecord.equipment_id &&
                e.checklist_frequency_id === cloudRecord.checklist_frequency_id &&
                (e.period_key || '') === (cloudRecord.period_key || '') &&
                (e.shift || '') === (cloudRecord.shift || '')
            );
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...cloudRecord };
              return updated;
            }
            return prev;
          });
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        } else {
          console.warn('Preventive cloud sync warning:', res.message);
          setSyncStatus('error');
        }
      } catch (err) {
        console.warn('Preventive cloud sync exception:', err);
        setSyncStatus('error');
      }
    } else {
      setSyncStatus('offline');
    }
  };

  // Add/Update Corrective Handler
  const handleAddCorrective = async (report: Omit<CorrectiveReport, 'id'>) => {
    const now = new Date().toISOString();
    const newReport: CorrectiveReport = {
      ...report,
      id: (report as any).id || Date.now(),
      corrective_date: report.corrective_date || currentSession.operational_date,
      shift: report.shift || currentSession.shift,
      created_at: (report as any).created_at || now,
      updated_at: now,
    };

    // 1. Immediately save to local state & localStorage
    setCorrectiveReports((prev) => {
      const existingIndex = prev.findIndex(
        (r) =>
          r.id === newReport.id ||
          (r.corrective_code && r.corrective_code === newReport.corrective_code)
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...newReport, id: prev[existingIndex].id };
        return updated;
      } else {
        return [newReport, ...prev];
      }
    });

    // 2. Asynchronously sync to Google Sheets & Drive
    if (isCloudConfigured()) {
      setSyncStatus('syncing');
      try {
        const res = await saveCorrectiveRecord(newReport);
        if (res.success && res.data) {
          const cloudRecord = res.data;
          setCorrectiveReports((prev) => {
            const idx = prev.findIndex(
              (r) =>
                r.id === cloudRecord.id ||
                (r.corrective_code && r.corrective_code === cloudRecord.corrective_code)
            );
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...cloudRecord };
              return updated;
            }
            return prev;
          });
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        } else {
          console.warn('Corrective cloud sync warning:', res.message);
          setSyncStatus('error');
        }
      } catch (err) {
        console.warn('Corrective cloud sync exception:', err);
        setSyncStatus('error');
      }
    } else {
      setSyncStatus('offline');
    }
  };

  // Automatic Shift Update Effect
  useEffect(() => {
    const checkAndUpdateShift = () => {
      const op = getOperationalShift();
      setCurrentSession((prev) => {
        if (prev.operational_date !== op.operationalDate || prev.shift !== op.shift) {
          const defaultTechIds = getDefaultTechniciansForShift(technicians, op.shift, op.operationalDate);
          const defaultTechNames = defaultTechIds
            .map((id) => technicians.find((t) => t.id === id)?.name)
            .filter(Boolean) as string[];

          return {
            ...prev,
            id: Date.now(),
            operational_date: op.operationalDate,
            shift: op.shift,
            started_at: op.shift === 'Pagi' ? '07:00' : '19:00',
            ended_at: op.shift === 'Pagi' ? '18:59' : '06:59',
            technician_ids: defaultTechIds.length > 0 ? defaultTechIds : prev.technician_ids,
            technician_names: defaultTechNames.length > 0 ? defaultTechNames : prev.technician_names,
          };
        }
        return prev;
      });
    };

    checkAndUpdateShift();

    // Poll shift every 30 seconds
    const intervalId = setInterval(checkAndUpdateShift, 30000);

    // Refresh on window focus or visibilitychange
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndUpdateShift();
      }
    };
    window.addEventListener('focus', checkAndUpdateShift);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', checkAndUpdateShift);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [technicians]);

  // Master Data Add Handlers
  const handleAddEquipment = (eq: Omit<Equipment, 'id'>) => {
    const newEq: Equipment = { ...eq, id: Date.now() };
    setEquipments((prev) => [...prev, newEq]);
  };

  const handleAddLocation = (loc: Omit<Location, 'id'>) => {
    const newLoc: Location = { ...loc, id: Date.now() };
    setLocations((prev) => [...prev, newLoc]);
  };

  // Structured Report Builder Data
  const structuredReportData = buildStructuredReportData(
    currentSession,
    preventiveEntries,
    equipments,
    equipmentTypes,
    technicians,
    correctiveReports,
    locations
  );

  // Render Login Screen if not logged in
  if (!isLoggedIn) {
    return (
      <LoginScreen
        technicians={technicians}
        onLoginTechnician={handleLoginTechnician}
        onLoginSupervisor={handleLoginSupervisor}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row selection:bg-blue-100">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        shift={currentSession.shift}
        operationalDate={currentSession.operational_date}
        technicianNames={technicianNames}
        onLogout={() => setIsLoggedIn(false)}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenSupervisorLogin={() => setIsSupervisorLoginOpen(true)}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onManualSync={syncFromCloud}
      />

      {/* Main Views Layout */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              equipments={equipments}
              equipmentTypes={equipmentTypes}
              preventiveEntries={preventiveEntries}
              currentSession={currentSession}
              frequencies={frequencies}
              onStartPreventive={(eqId) => {
                setPreSelectedEquipmentId(eqId || null);
                setActiveTab('preventive');
              }}
              onStartCorrective={() => setActiveTab('corrective')}
              onOpenReport={() => setActiveTab('reports')}
              technicianNames={technicianNames}
              onOpenShiftModal={() => setIsShiftModalOpen(true)}
            />
          )}

          {activeTab === 'preventive' && (
            <PreventiveView
              equipments={equipments}
              equipmentTypes={equipmentTypes}
              frequencies={frequencies}
              checklistItems={checklistItems}
              preventiveEntries={preventiveEntries}
              preSelectedEquipmentId={preSelectedEquipmentId}
              onSubmitEntry={handleSubmitPreventiveEntry}
              onBackToDashboard={() => setActiveTab('dashboard')}
              role={role}
              operationalDate={currentSession.operational_date}
              shift={currentSession.shift}
            />
          )}

          {activeTab === 'corrective' && (
            <CorrectiveView
              correctiveReports={correctiveReports}
              equipments={equipments}
              equipmentTypes={equipmentTypes}
              locations={locations}
              onAddCorrective={handleAddCorrective}
              technicianNames={technicianNames}
            />
          )}

          {activeTab === 'reports' && (
            <ReportView structuredData={structuredReportData} />
          )}

          {activeTab === 'master' && (
            <MasterDataView
              equipments={equipments}
              equipmentTypes={equipmentTypes}
              locations={locations}
              frequencies={frequencies}
              checklistItems={checklistItems}
              onAddEquipment={handleAddEquipment}
              onAddLocation={handleAddLocation}
            />
          )}
        </main>
      </div>

      {/* Shift On Duty Selection Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        technicians={technicians}
        selectedTechIds={currentSession.technician_ids}
        currentShift={currentSession.shift}
        operationalDate={currentSession.operational_date}
        onSaveShift={handleSaveShift}
      />

      {/* Supervisor Password Login Modal */}
      <SupervisorLoginModal
        isOpen={isSupervisorLoginOpen}
        onClose={() => setIsSupervisorLoginOpen(false)}
        onLoginSuccess={() => {
          setRole('supervisor');
          setActiveTab('dashboard');
        }}
      />
    </div>
  );
}
