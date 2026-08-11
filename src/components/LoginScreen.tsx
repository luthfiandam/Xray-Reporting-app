import React, { useState } from 'react';
import { Technician } from '../types';
import { LogIn, ShieldCheck, Check, Lock, AlertCircle, User } from 'lucide-react';

import { getDefaultTechniciansForShift } from '../utils/technicianSchedule';

interface LoginScreenProps {
  technicians: Technician[];
  onLoginTechnician: (selectedTechIds: number[]) => void;
  onLoginSupervisor: (password: string) => boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  technicians,
  onLoginTechnician,
  onLoginSupervisor,
}) => {
  const [activeTab, setActiveTab] = useState<'technician' | 'supervisor'>('technician');
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    const currentShift = hour >= 7 && hour < 19 ? 'Pagi' : 'Malam';
    return getDefaultTechniciansForShift(technicians, currentShift, todayStr);
  });
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleTechnician = (id: number) => {
    if (selectedTechIds.includes(id)) {
      if (selectedTechIds.length === 1) {
        return; // Minimal 1 selected
      }
      setSelectedTechIds(selectedTechIds.filter((tId) => tId !== id));
    } else {
      setSelectedTechIds([...selectedTechIds, id]);
    }
  };

  const handleTechnicianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTechIds.length === 0) {
      setErrorMsg('Pilih minimal 1 teknisi on duty.');
      return;
    }
    setErrorMsg('');
    onLoginTechnician(selectedTechIds);
  };

  const handleSupervisorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorPassword) {
      setErrorMsg('Masukkan password supervisor.');
      return;
    }
    const success = onLoginSupervisor(supervisorPassword);
    if (!success) {
      setErrorMsg('Password supervisor salah.');
    } else {
      setErrorMsg('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-2 transition-all">
        {/* Left Blue Banner */}
        <div className="bg-blue-600 p-8 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle decoration background */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            {/* Title & Subtitle */}
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight uppercase">
              Aplikasi<br />
              Reporting<br />
              Faskampen
            </h1>
            <p className="text-xs text-blue-100 font-medium leading-relaxed mt-4 max-w-xs">
              Sistem Pelaporan dan Pemeliharaan Fasilitas Keamanan Penerbangan Terintegrasi.
            </p>
          </div>

          {/* Footer Company Name */}
          <div className="relative z-10 mt-12 sm:mt-16">
            <p className="text-xs text-blue-200/90 font-semibold tracking-wide uppercase">
              PT. Nararya Teknologi Indonesia
            </p>
          </div>
        </div>

        {/* Right White Form Panel */}
        <div className="bg-white p-6 sm:p-10 flex flex-col justify-between">
          {/* Top Tabs Switcher */}
          <div className="flex items-center justify-end gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('technician');
                setErrorMsg('');
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'technician'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              Teknisi On Duty
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('supervisor');
                setErrorMsg('');
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'supervisor'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              Supervisor
            </button>
          </div>

          {/* Tab 1: Teknisi On Duty */}
          {activeTab === 'technician' && (
            <form onSubmit={handleTechnicianSubmit} className="flex-1 flex flex-col justify-between">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-3 block">
                  Pilih teknisi yang sedang on duty
                </label>

                {errorMsg && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {technicians.map((tech) => {
                    const isSelected = selectedTechIds.includes(tech.id);
                    return (
                      <div
                        key={tech.id}
                        onClick={() => toggleTechnician(tech.id)}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'bg-blue-50/60 border-blue-300 text-slate-900 shadow-xs'
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-bold truncate">{tech.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer mt-4"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk sebagai Teknisi</span>
              </button>
            </form>
          )}

          {/* Tab 2: Supervisor */}
          {activeTab === 'supervisor' && (
            <form onSubmit={handleSupervisorSubmit} className="flex-1 flex flex-col justify-between">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-3 block">
                  Pilih Supervisor & Masukkan Password
                </label>

                {errorMsg && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Supervisor Info Card */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Luthfianda Muzaki S</h3>
                    <p className="text-xs text-blue-600 font-semibold">Supervisor Maintenance</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Password Supervisor
                  </label>
                  <input
                    type="password"
                    value={supervisorPassword}
                    onChange={(e) => setSupervisorPassword(e.target.value)}
                    placeholder="Masukkan password supervisor..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    autoFocus
                  />

                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer mt-4"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Masuk sebagai Supervisor</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
