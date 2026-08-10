import React from 'react';
import { ShiftType, Role } from '../types';
import { Shield, UserCheck, Key, LogOut } from 'lucide-react';

interface HeaderProps {
  shift: ShiftType;
  operationalDate: string;
  technicianNames: string[];
  role: Role;
  onOpenShiftModal: () => void;
  onOpenSupervisorLogin: () => void;
  onLogoutSupervisor: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  shift,
  operationalDate,
  technicianNames,
  role,
  onOpenShiftModal,
  onOpenSupervisorLogin,
  onLogoutSupervisor,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-800">
                Aplikasi Reporting Faskampen
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Aviation Maintenance System
              </p>
            </div>
          </div>

          {/* Shift & Technicians Info */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right hidden md:block">
              <div className="flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                  Shift {shift} (07:00 - 19:00)
                </p>
              </div>
              <p className="text-xs text-slate-500">{operationalDate}</p>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

            {/* Technicians On Duty Avatars */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenShiftModal}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                title="Klik untuk memilih teknisi On Duty"
              >
                <div className="flex -space-x-2">
                  {technicianNames.length > 0 ? (
                    technicianNames.slice(0, 3).map((name, idx) => (
                      <div
                        key={idx}
                        className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase"
                      >
                        {name.charAt(0)}
                      </div>
                    ))
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-amber-600">
                      ?
                    </div>
                  )}
                </div>
                <span className="hidden sm:inline">
                  {technicianNames.length > 0
                    ? `${technicianNames.length} On Duty`
                    : 'Pilih Teknisi'}
                </span>
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            {/* Supervisor Toggle Button */}
            {role === 'supervisor' ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold border border-amber-200">
                  Supervisor Mode
                </span>
                <button
                  onClick={onLogoutSupervisor}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Keluar Modal Supervisor"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenSupervisorLogin}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>Supervisor Mode</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
