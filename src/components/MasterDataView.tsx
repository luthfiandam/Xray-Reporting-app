import React, { useState, useEffect } from 'react';
import {
  Equipment,
  EquipmentType,
  Location,
  ChecklistFrequency,
  ChecklistItem,
  CloudDataset,
} from '../types';
import { Settings, Plus, Trash2, Edit2, ShieldCheck, Database, Layers, RefreshCw, CheckCircle2, AlertTriangle, Cloud } from 'lucide-react';
import { fetchDatasets, isCloudConfigured } from '../services/cloudService';
import { formatDateTimeShort } from '../utils/timeFormat';

interface MasterDataViewProps {
  equipments: Equipment[];
  equipmentTypes: EquipmentType[];
  locations: Location[];
  frequencies: ChecklistFrequency[];
  checklistItems: ChecklistItem[];
  onAddEquipment: (eq: Omit<Equipment, 'id'>) => void;
  onAddLocation: (loc: Omit<Location, 'id'>) => void;
  activeDatasetId?: string;
  onSwitchDataset?: (datasetId: string) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  equipments,
  equipmentTypes,
  locations,
  frequencies,
  checklistItems,
  onAddEquipment,
  onAddLocation,
  activeDatasetId = 'default',
  onSwitchDataset,
}) => {
  const [activeTab, setActiveTab] = useState<'equipment' | 'location' | 'type' | 'checklist' | 'dataset'>('equipment');

  // Datasets state
  const [cloudDatasets, setCloudDatasets] = useState<CloudDataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [newDatasetInput, setNewDatasetInput] = useState('');

  const loadCloudDatasets = async () => {
    if (!isCloudConfigured()) return;
    setLoadingDatasets(true);
    try {
      const res = await fetchDatasets();
      if (res.success && Array.isArray(res.data)) {
        setCloudDatasets(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat daftar dataset:', err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dataset') {
      loadCloudDatasets();
    }
  }, [activeTab]);

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
        <button
          onClick={() => setActiveTab('dataset')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'dataset'
              ? 'bg-amber-600 text-white'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Workspace / Dataset Cloud
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

      {/* Tab 5: Dataset & Workspace Management */}
      {activeTab === 'dataset' && (
        <div className="space-y-6">
          {/* Active Dataset Status Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Status Dataset / Workspace Aktif</h3>
                  <p className="text-xs text-slate-500">
                    Sistem mengisolasi data laporan Preventif & Korrektif berdasarkan Dataset ID.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Dataset ID Aktif</span>
                <span className="text-sm font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 inline-block mt-0.5">
                  {activeDatasetId === 'default' ? 'default (Data Existing Utama)' : activeDatasetId}
                </span>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Prinsip Keamanan Reset Data v0.5.0:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li><strong>Gunakan Data Existing (Default):</strong> Membaca dan menyimpan ke dataset <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800 font-mono">default</code> di Google Sheets & Google Drive.</li>
                <li><strong>Mulai Dataset Baru / Reset:</strong> Membuat ruang kerja bersih tanpa menghapus baris data lama di Google Sheets maupun foto di Google Drive.</li>
                <li>Anda dapat berganti (switch) kembali ke dataset lama kapan saja tanpa ada data yang hilang.</li>
              </ul>
            </div>
          </div>

          {/* Create or Switch Dataset Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action 1: Switch to Default */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Option 1: Gunakan Data Existing (Default)</span>
                </div>
                <p className="text-xs text-slate-500">
                  Gunakan dataset utama tempat semua laporan Google Sheets & foto Google Drive sebelum versi baru disimpan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchDataset) onSwitchDataset('default');
                  alert('Berhasil berpindah ke Dataset Existing (default)');
                }}
                disabled={activeDatasetId === 'default'}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeDatasetId === 'default'
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {activeDatasetId === 'default' ? 'Dataset Existing Sedang Aktif' : 'Switch ke Dataset Existing (Default)'}
              </button>
            </div>

            {/* Action 2: Start New Dataset / Reset */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Option 2: Mulai Dataset Baru / Reset Data</span>
                </div>
                <p className="text-xs text-slate-500">
                  Buat dataset/batch baru (misal: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">2026-reset-1</code>) untuk memulai lembar kerja bersih.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Masukkan nama dataset baru (contoh: 2026-reset-1)"
                  value={newDatasetInput}
                  onChange={(e) => setNewDatasetInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />

                <button
                  type="button"
                  onClick={() => {
                    const dsName = newDatasetInput.trim() || `dataset-${Date.now().toString().slice(-4)}`;
                    if (onSwitchDataset) {
                      onSwitchDataset(dsName);
                    }
                    setNewDatasetInput('');
                    alert(`Berhasil membuat & menggunakan Dataset Baru: ${dsName}`);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  Mulai Data Baru (Switch Context)
                </button>
              </div>
            </div>
          </div>

          {/* List of Cloud Datasets */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-blue-500" />
                Daftar Dataset Terdeteksi di Cloud (Google Sheets)
              </h3>
              <button
                type="button"
                onClick={loadCloudDatasets}
                disabled={loadingDatasets}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDatasets ? 'animate-spin' : ''}`} />
                Refresh List
              </button>
            </div>

            {loadingDatasets ? (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                Memuat daftar dataset dari Google Sheets...
              </div>
            ) : cloudDatasets.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                Belum ada dataset terdeteksi atau Google Sheets belum terhubung.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="p-3">Dataset ID</th>
                      <th className="p-3 text-center">Record Preventif</th>
                      <th className="p-3 text-center">Record Korrektif</th>
                      <th className="p-3">Terakhir Update</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cloudDatasets.map((ds) => {
                      const isActive = activeDatasetId === ds.id;
                      return (
                        <tr key={ds.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {ds.id}
                            {ds.id === 'default' && (
                              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded border border-slate-200 font-sans">
                                Existing Utama
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-blue-700">{ds.preventive_count}</td>
                          <td className="p-3 text-center font-bold text-amber-700">{ds.corrective_count}</td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {ds.last_updated ? formatDateTimeShort(ds.last_updated) : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {isActive ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg inline-block">
                                AKTIFF
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSwitchDataset) onSwitchDataset(ds.id);
                                  alert(`Berhasil berpindah ke Dataset: ${ds.id}`);
                                }}
                                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                Switch ke Ini
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
