import React, { useState } from 'react';
import { Technician, ShiftType } from '../types';
import { Check, Users, Clock, Calendar } from 'lucide-react';

import { getDefaultTechniciansForShift } from '../utils/technicianSchedule';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: Technician[];
  selectedTechIds: number[];
  currentShift: ShiftType;
  operationalDate: string;
  onSaveShift: (selectedIds: number[], shift: ShiftType, date: string) => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  technicians,
  selectedTechIds,
  currentShift,
  operationalDate,
  onSaveShift,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>(selectedTechIds);
  const [shift, setShift] = useState<ShiftType>(currentShift);
  const [date, setDate] = useState<string>(operationalDate);

  if (!isOpen) return null;

  const handleShiftChange = (newShift: ShiftType) => {
    setShift(newShift);
    setSelectedIds(getDefaultTechniciansForShift(technicians, newShift, date));
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setSelectedIds(getDefaultTechniciansForShift(technicians, shift, newDate));
  };

  const toggleTechnician = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal 1 teknisi yang sedang bertugas On Duty.');
      return;
    }
    onSaveShift(selectedIds, shift, date);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Pilih Teknisi On Duty
              </h2>
              <p className="text-xs text-slate-500">
                Pilih teknisi yang aktif bertugas dalam shift ini
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Shift & Date Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Shift Kerja
              </label>
              <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleShiftChange('Pagi')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    shift === 'Pagi'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pagi (07-19)
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftChange('Malam')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    shift === 'Malam'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Malam (19-07)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Tanggal Operasional
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* List of Active Technicians */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Daftar Teknisi
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {technicians
                .filter((t) => t.active)
                .map((tech) => {
                  const isSelected = selectedIds.includes(tech.id);
                  return (
                    <div
                      key={tech.id}
                      onClick={() => toggleTechnician(tech.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tech.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{tech.name}</p>
                          <p className="text-[10px] text-slate-500">{tech.code}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Selected: <strong className="text-slate-800">{selectedIds.length}</strong> teknisi
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all"
            >
              Mulai Shift
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
