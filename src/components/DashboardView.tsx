import React from 'react';
import {
  Equipment,
  EquipmentType,
  PreventiveEntry,
  PreventiveSession,
  ChecklistFrequency,
} from '../types';
import {
  PlusCircle,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface DashboardViewProps {
  equipments: Equipment[];
  equipmentTypes: EquipmentType[];
  preventiveEntries: PreventiveEntry[];
  currentSession: PreventiveSession;
  frequencies: ChecklistFrequency[];
  onStartPreventive: (equipmentId?: number) => void;
  onStartCorrective: () => void;
  onOpenReport: () => void;
  technicianNames: string[];
  onOpenShiftModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  equipments,
  equipmentTypes,
  preventiveEntries,
  currentSession,
  frequencies,
  onStartPreventive,
  onStartCorrective,
  onOpenReport,
  technicianNames,
  onOpenShiftModal,
}) => {
  // Card 1 calculation
  const totalEquipmentCount = equipments.length;
  const countByType = equipmentTypes.map((type) => {
    const count = equipments.filter((e) => e.equipment_type_id === type.id).length;
    return { type, count };
  });

  // Card 2 calculation: X-Ray Today Progress
  const xrayType = equipmentTypes.find((t) => t.code === 'XRAY');
  const xrayEquipments = equipments.filter((e) => e.equipment_type_id === xrayType?.id);

  const entriesMap = new Map<number, PreventiveEntry>();
  preventiveEntries.forEach((entry) => {
    if (
      (!entry.shift || entry.shift === currentSession.shift) &&
      (!entry.operational_date || entry.operational_date === currentSession.operational_date)
    ) {
      entriesMap.set(entry.equipment_id, entry);
    }
  });

  const completedXrayCount = xrayEquipments.filter((eq) => entriesMap.has(eq.id)).length;

  // Reminders based on checklist frequencies
  const pendingDaily = equipments.filter((e) => !entriesMap.has(e.id));

  return (
    <div className="space-y-6">
      {/* Top Banner / On-Duty Crew Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Teknisi On Duty Saat Ini
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {technicianNames.length > 0 ? (
              technicianNames.map((name, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-semibold text-slate-800">{name}</span>
                  {idx === 0 && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                      LEAD
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                Belum ada teknisi terpilih untuk shift ini.
              </div>
            )}
            <button
              onClick={onOpenShiftModal}
              className="px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all"
            >
              + Edit Personel On Duty
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onStartPreventive()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-all text-xs tracking-wider"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ NEW PREVENTIVE</span>
          </button>
          <button
            onClick={onStartCorrective}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 border-2 border-slate-800 text-slate-800 rounded-xl font-bold hover:bg-slate-800 hover:text-white transition-all text-xs tracking-wider"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>LAPOR CORRECTIVE</span>
          </button>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Progress Monitoring & Quick Cards */}
        <div className="md:col-span-8 space-y-6">
          {/* Card 1 & Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Equipment
              </p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800">
                  {totalEquipmentCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">Unit Aktif</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1 flex-wrap">
                {countByType.map((item) => (
                  <span
                    key={item.type.id}
                    className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"
                  >
                    {item.type.code}: {item.count}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                X-Ray Checked Today
              </p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-blue-600">
                  {completedXrayCount} / {xrayEquipments.length}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {xrayEquipments.length > 0
                    ? `${Math.round((completedXrayCount / xrayEquipments.length) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="mt-3 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{
                    width: `${
                      xrayEquipments.length > 0
                        ? (completedXrayCount / xrayEquipments.length) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Checked Shift In
              </p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-emerald-600">
                  {preventiveEntries.length}
                </span>
                <span className="text-xs text-slate-500">Pemeriksaan</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 italic">
                Waktu: {currentSession.started_at} - {currentSession.ended_at}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Report Status
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Gen
                </span>
              </div>
              <button
                onClick={onOpenReport}
                className="mt-3 w-full py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1"
              >
                <span>Lihat Laporan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2 — X-Ray Daily Maintenance List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Status Monitoring X-Ray Hari Ini
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar seluruh mesin X-Ray dan status pemeriksaan fisik &amp; tegangan High Voltage Generator
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                {completedXrayCount} dari {xrayEquipments.length} Selesai
              </span>
            </div>

            <div className="space-y-3">
              {xrayEquipments.map((eq, index) => {
                const entry = entriesMap.get(eq.id);
                const isDone = !!entry;

                return (
                  <div
                    key={eq.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{eq.name}</p>
                        <p className="text-xs text-slate-500">
                          {isDone ? (
                            <>
                              Submit jam {entry.submitted_at} WIB • Mode{' '}
                              <strong className="text-slate-700">
                                {entry.view_type === 'dual' ? 'Dual View' : 'Single View'}
                              </strong>
                            </>
                          ) : (
                            <span className="italic text-slate-400">Belum diperiksa shift ini</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isDone && entry.measurements && entry.measurements.length > 0 && (
                        <div className="text-right hidden sm:block">
                          {entry.measurements.map((m, idx) => (
                            <p
                              key={idx}
                              className="text-[10px] font-mono text-slate-600 font-semibold"
                            >
                              Gen {m.generator}: {m.positive_high_voltage || '-'}kV / {m.negative_high_voltage || '-'}kV
                            </p>
                          ))}
                        </div>
                      )}

                      {isDone ? (
                        <button
                          onClick={() => onStartPreventive(eq.id)}
                          className="px-3.5 py-1.5 bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-500 hover:text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>EDIT</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartPreventive(eq.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                          MULAI
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Reports Action & Reminder Card 3 */}
        <div className="md:col-span-4 space-y-6">
          {/* Quick Generate Laporan WA & Exports Box */}
          <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-md">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Ringkasan Shift Report
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-end border-b border-slate-700 pb-2">
                <span className="text-xs text-slate-400">Durasi Pemeriksaan</span>
                <span className="text-sm font-medium font-mono tracking-wider">
                  {currentSession.started_at} - {currentSession.ended_at}
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-slate-700 pb-2">
                <span className="text-xs text-slate-400">Equipment Checked</span>
                <span className="text-sm font-medium">{preventiveEntries.length} Items</span>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={onOpenReport}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>GENERATE LAPORAN WA</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onOpenReport}
                    className="py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold tracking-wider transition-all"
                  >
                    EXPORT EXCEL
                  </button>
                  <button
                    onClick={onOpenReport}
                    className="py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold tracking-wider transition-all"
                  >
                    EXPORT PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 — Reminder Checklist & Frequency Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Reminder Jadwal Checklist
              </h3>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-4">
              {/* Daily status */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Harian</span>
                  <span className="font-bold text-blue-600">
                    {pendingDaily.length === 0
                      ? 'Lengkap (100%)'
                      : `${pendingDaily.length} Belum Dicek`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all"
                    style={{
                      width: `${
                        equipments.length > 0
                          ? ((equipments.length - pendingDaily.length) / equipments.length) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Weekly status */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Mingguan</span>
                  <span className="font-bold text-slate-500">Due in 2 hari</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-slate-300 h-full w-[70%]"></div>
                </div>
              </div>

              {/* Monthly status */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Bulanan</span>
                  <span className="font-bold text-slate-500">Due in 12 hari</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-slate-300 h-full w-[30%]"></div>
                </div>
              </div>
            </div>

            {pendingDaily.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-600 mb-2">Pending Harian Hari Ini:</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {pendingDaily.map((eq) => (
                    <div
                      key={eq.id}
                      onClick={() => onStartPreventive(eq.id)}
                      className="flex items-center justify-between text-xs p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-slate-800">{eq.name}</span>
                      <span className="text-[10px] font-bold text-blue-600">Mulai &rarr;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
