import React, { useState } from 'react';
import { Role, ShiftType } from '../types';
import { formatIndonesianDate } from '../utils/timeFormat';
import {
  LayoutDashboard,
  CheckSquare,
  Wrench,
  FileText,
  Database,
  Users,
  LogOut,
  Menu,
  X,
  UserCheck,
  Shield,
  Key,
  Building2,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'preventive' | 'corrective' | 'reports' | 'master';
  setActiveTab: (tab: 'dashboard' | 'preventive' | 'corrective' | 'reports' | 'master') => void;
  role: Role;
  shift: ShiftType;
  operationalDate: string;
  technicianNames: string[];
  onLogout: () => void;
  onOpenShiftModal: () => void;
  onOpenSupervisorLogin: () => void;
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime?: string | null;
  onManualSync?: () => void;
  activeDatasetId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  role,
  shift,
  operationalDate,
  technicianNames,
  onLogout,
  onOpenShiftModal,
  onOpenSupervisorLogin,
  syncStatus = 'synced',
  lastSyncTime = null,
  onManualSync,
  activeDatasetId = 'default',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    ...(role === 'supervisor'
      ? [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            badge: null,
          },
        ]
      : []),
    {
      id: 'preventive',
      label: 'Preventif',
      icon: CheckSquare,
      badge: 'Main',
    },
    {
      id: 'corrective',
      label: 'Corrective',
      icon: Wrench,
      badge: null,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      badge: null,
    },
    ...(role === 'supervisor'
      ? [
          {
            id: 'master',
            label: 'Master Data',
            icon: Database,
            badge: 'Admin',
          },
        ]
      : []),
  ];

  const handleSelectTab = (tab: any) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header (only visible on mobile screens) */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">Aplikasi Reporting Faskampen</h1>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 transition-transform duration-200 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & Logo */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug">
                Aplikasi Reporting Faskampen
              </h2>
            </div>
          </div>

          {/* User Session Status Box */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Active Session
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  role === 'supervisor'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {role === 'supervisor' ? 'Supervisor' : 'Teknisi On Duty'}
              </span>
            </div>

            <p className="text-xs font-bold text-slate-800 truncate">
              {role === 'supervisor'
                ? 'Luthfianda'
                : technicianNames.length > 0
                ? technicianNames.join(', ')
                : 'Belum memilih teknisi'}
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/60 font-medium">
              <span>Shift {shift}</span>
              <span>{formatIndonesianDate(operationalDate)}</span>
            </div>

            {/* Cloud Sync Status Indicator */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                ) : syncStatus === 'synced' ? (
                  <Cloud className="w-3 h-3 text-emerald-500" />
                ) : (
                  <CloudOff className="w-3 h-3 text-amber-500" />
                )}
                <span
                  className={`font-semibold ${
                    syncStatus === 'syncing'
                      ? 'text-blue-600'
                      : syncStatus === 'synced'
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {syncStatus === 'syncing'
                    ? 'Sinkronisasi...'
                    : syncStatus === 'synced'
                    ? 'Tersimpan (Cloud)'
                    : 'Belum tersinkron (Lokal)'}
                </span>
              </div>
              {onManualSync && (
                <button
                  onClick={onManualSync}
                  title="Sinkronkan data dengan Google Sheets"
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Active Workspace / Dataset Indicator */}
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Dataset:</span>
              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[120px]" title={activeDatasetId}>
                {activeDatasetId === 'default' ? 'Default (Existing)' : activeDatasetId}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Navigation Menu
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Sidebar Action Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {role === 'technician' ? (
            <button
              onClick={onOpenSupervisorLogin}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-200/80 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>Masuk Supervisor</span>
            </button>
          ) : (
            <button
              onClick={onOpenShiftModal}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Ubah Shift / On Duty</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ganti Duty / Logout</span>
          </button>

          <p className="text-[10px] text-center text-slate-400 font-semibold tracking-wider pt-2">
            v1.0.4
          </p>
        </div>
      </aside>
    </>
  );
};
