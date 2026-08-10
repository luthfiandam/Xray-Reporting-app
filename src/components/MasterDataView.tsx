import React, { useState } from 'react';
import {
  Equipment,
  EquipmentType,
  Location,
  ChecklistFrequency,
  ChecklistItem,
} from '../types';
import { Settings, Plus, Trash2, Edit2, ShieldCheck, Database } from 'lucide-react';

interface MasterDataViewProps {
  equipments: Equipment[];
  equipmentTypes: EquipmentType[];
  locations: Location[];
  frequencies: ChecklistFrequency[];
  checklistItems: ChecklistItem[];
  onAddEquipment: (eq: Omit<Equipment, 'id'>) => void;
  onAddLocation: (loc: Omit<Location, 'id'>) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  equipments,
  equipmentTypes,
  locations,
  frequencies,
  checklistItems,
  onAddEquipment,
  onAddLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'equipment' | 'location' | 'type' | 'checklist'>('equipment');

  // Form states for new equipment
  const [eqName, setEqName] = useState('');
  const [eqCode, setEqCode] = useState('');
  const [eqTypeId, setEqTypeId] = useState<number>(equipmentTypes[0]?.id || 1);
  const [eqLocId, setEqLocId] = useState<number>(locations[0]?.id || 1);
  const [eqBrand, setEqBrand] = useState('');
  const [eqDefaultView, setEqDefaultView] = useState<'single' | 'dual'>('single');

  // Form states for new location
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');

  const handleCreateEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName) return;

    onAddEquipment({
      equipment_code: eqCode || `EQ-${Date.now().toString().slice(-4)}`,
      equipment_type_id: Number(eqTypeId),
      location_id: Number(eqLocId),
      name: eqName,
      brand: eqBrand || 'Nuctech',
      default_view: eqDefaultView,
      active: true,
    });

    setEqName('');
    setEqCode('');
    alert('Equipment baru berhasil ditambahkan!');
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName) return;

    onAddLocation({
      name: locName,
      code: locCode || `LOC-${locations.length + 1}`,
      active: true,
    });

    setLocName('');
    setLocCode('');
    alert('Lokasi baru berhasil ditambahkan!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-xs rounded border border-amber-200">
              Supervisor Access
            </span>
            <h2 className="text-lg font-bold text-slate-800">Master Data Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data dasar jenis mesin, lokasi, unit equipment, dan master checklist items
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'equipment'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Equipments ({equipments.length})
        </button>
        <button
          onClick={() => setActiveTab('location')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'location'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Lokasi ({locations.length})
        </button>
        <button
          onClick={() => setActiveTab('type')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'type'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Jenis Mesin ({equipmentTypes.length})
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'checklist'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Master Checklist ({checklistItems.length})
        </button>
      </div>

      {/* Tab 1: Equipment Master */}
      {activeTab === 'equipment' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              + Tambah Equipment Baru
            </h3>

            <form onSubmit={handleCreateEquipment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Nama Equipment
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Xray Pintu Laud"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Jenis Equipment
                  </label>
                  <select
                    value={eqTypeId}
                    onChange={(e) => setEqTypeId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {equipmentTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} - {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Lokasi
                  </label>
                  <select
                    value={eqLocId}
                    onChange={(e) => setEqLocId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Brand / Merk
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Nuctech / Rapiscan"
                    value={eqBrand}
                    onChange={(e) => setEqBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Default View (XRAY)
                  </label>
                  <select
                    value={eqDefaultView}
                    onChange={(e) => setEqDefaultView(e.target.value as 'single' | 'dual')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="single">Single View</option>
                    <option value="dual">Dual View</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                Simpan Equipment
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Daftar Master Equipment
            </h3>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {equipments.map((eq) => {
                const type = equipmentTypes.find((t) => t.id === eq.equipment_type_id);
                const loc = locations.find((l) => l.id === eq.location_id);

                return (
                  <div
                    key={eq.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{eq.name}</p>
                      <p className="text-[10px] text-slate-500">
                        Kode: {eq.equipment_code} • Type:{' '}
                        <strong className="text-blue-700">{type?.code}</strong> • Lokasi: {loc?.name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        MERK: <strong className="text-slate-700">{eq.brand}</strong> • Model:{' '}
                        <strong className="text-slate-700">{eq.model || '-'}</strong> • S/N:{' '}
                        <strong className="text-slate-700">{eq.serial_number || '-'}</strong>
                      </p>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      ACTIVE
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Location Master */}
      {activeTab === 'location' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              + Tambah Lokasi Baru
            </h3>

            <form onSubmit={handleCreateLocation} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Nama Lokasi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SCP 3 / Pintu VIP Baru"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Kode Lokasi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: LOC-007"
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                Simpan Lokasi
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Daftar Master Lokasi
            </h3>

            <div className="space-y-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{loc.name}</p>
                    <p className="text-[10px] text-slate-500">Kode: {loc.code}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Equipment Types */}
      {activeTab === 'type' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tabel Jenis Peralatan &amp; Prioritas Urutan Laporan
          </h3>

          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                <th className="p-3">ID</th>
                <th className="p-3">Kode Tipe</th>
                <th className="p-3">Nama Jenis Peralatan</th>
                <th className="p-3 text-center">Priority Report Order</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {equipmentTypes.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold">{t.id}</td>
                  <td className="p-3 font-bold text-blue-700">{t.code}</td>
                  <td className="p-3 font-semibold text-slate-800">{t.name}</td>
                  <td className="p-3 text-center font-bold font-mono">#{t.priority}</td>
                  <td className="p-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Master Checklist Items */}
      {activeTab === 'checklist' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Daftar Poin Checklist Per Jenis Mesin &amp; Frekuensi
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {checklistItems.map((item) => {
              const type = equipmentTypes.find((t) => t.id === item.equipment_type_id);
              const freq = frequencies.find((f) => f.id === item.checklist_frequency_id);

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded mr-2">
                      {type?.code} • {freq?.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {item.sequence}. {item.description}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-700">OK</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
