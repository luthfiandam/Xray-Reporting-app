import React, { useState } from 'react';
import { compressImage } from '../utils/imageCompressor';
import { applyWatermark, buildDriveFolderPath } from '../utils/watermark';
import { CorrectiveReport, Equipment, EquipmentType, Location } from '../types';
import { getLocalDateString } from '../utils/technicianSchedule';
import { formatIndonesianDate, formatTimeRange } from '../utils/timeFormat';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Camera,
  Trash2,
  Copy,
  Send,
  X,
  FileText,
  Clock,
  User,
  AlertTriangle,
  Upload,
  Check,
  Share2,
} from 'lucide-react';

interface CorrectiveViewProps {
  correctiveReports: CorrectiveReport[];
  equipments: Equipment[];
  equipmentTypes?: EquipmentType[];
  locations: Location[];
  onAddCorrective: (report: Omit<CorrectiveReport, 'id'>) => void;
  technicianNames: string[];
  shift?: string;
  operationalDate?: string;
}

export const CorrectiveView: React.FC<CorrectiveViewProps> = ({
  correctiveReports,
  equipments,
  equipmentTypes = [],
  locations,
  onAddCorrective,
  technicianNames,
  shift = 'Pagi',
  operationalDate = '',
}) => {
  const [showForm, setShowForm] = useState(false);

  // Equipment Selection Split (Jenis Mesin -> Peralatan)
  const defaultTypeId = equipmentTypes[0]?.id || 1;
  const [selectedTypeId, setSelectedTypeId] = useState<number>(defaultTypeId);

  const filteredEquipments = equipments.filter(
    (e) => e.equipment_type_id === Number(selectedTypeId) && e.active
  );
  const [equipmentId, setEquipmentId] = useState<number>(
    filteredEquipments[0]?.id || equipments[0]?.id || 1
  );

  // Time & Date State
  const now = new Date();
  const defaultStart = `${String(now.getHours()).padStart(2, '0')}.${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const endHour = new Date(now.getTime() + 30 * 60000);
  const defaultEnd = `${String(endHour.getHours()).padStart(2, '0')}.${String(
    endHour.getMinutes()
  ).padStart(2, '0')}`;

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);

  // Selected Technicians
  const availableTechs =
    technicianNames.length > 0 ? technicianNames : ['Luthfi', 'Zaky', 'Yoan', 'Fariz'];
  const [selectedTechs, setSelectedTechs] = useState<string[]>(availableTechs);

  // Form Inputs
  const [problemDescription, setProblemDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [result, setResult] = useState<'Resolved' | 'Pending Sparepart' | 'Temporary Fix'>('Resolved');
  const [resultText, setResultText] = useState('Xray sudah bisa di Gunakan dengan Normal 🙏🏻');
  const [notes, setNotes] = useState('-');

  // Photos State (Max 10)
  const [photos, setPhotos] = useState<string[]>([]);

  // WhatsApp Modal State
  const [generatedReportText, setGeneratedReportText] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Update selected equipment when equipment type changes
  const handleTypeChange = (typeId: number) => {
    setSelectedTypeId(typeId);
    const available = equipments.filter((e) => e.equipment_type_id === typeId && e.active);
    if (available.length > 0) {
      setEquipmentId(available[0].id);
    }
  };

  // Handle Photo Uploads (Max 10)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const fileList = Array.from(e.target.files) as File[];

    if (photos.length + fileList.length > 10) {
      alert('Maksimal foto yang dapat diunggah adalah 10 foto.');
    }

    const availableSlots = 10 - photos.length;
    const selectedFiles: File[] = fileList.slice(0, availableSlots);

    const eq = equipments.find((item) => item.id === Number(equipmentId));
    const loc = locations.find((l) => l.id === eq?.location_id);
    const eqType = equipmentTypes.find((t) => t.id === eq?.equipment_type_id);

    const watermarkOpts = {
      equipmentName: eq?.name || 'Equipment',
      locationName: loc?.name || '',
      equipmentType: eqType?.name || '',
      operationalDate: operationalDate || getLocalDateString(new Date()),
      time: startTime || '08:00',
      shift: shift,
      reportType: 'CORRECTIVE' as const,
    };

    try {
      const watermarkedPhotos = await Promise.all(
        selectedFiles.map((file: File) => applyWatermark(file, watermarkOpts, 1600, 0.85))
      );
      setPhotos((prev) => [...prev, ...watermarkedPhotos].slice(0, 10));
    } catch (err) {
      console.error('Corrective photo watermark/compression error:', err);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTechnician = (tech: string) => {
    if (selectedTechs.includes(tech)) {
      if (selectedTechs.length === 1) {
        alert('Pilih minimal satu teknisi.');
        return;
      }
      setSelectedTechs((prev) => prev.filter((t) => t !== tech));
    } else {
      setSelectedTechs((prev) => [...prev, tech]);
    }
  };

  // Format WhatsApp Text helper
  const buildWhatsAppText = (data: {
    dateObj: Date;
    startTime: string;
    endTime: string;
    technicians: string[];
    equipmentName: string;
    problem: string;
    action: string;
    resultText: string;
    notes: string;
  }) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    const dayName = days[data.dateObj.getDay()];
    const dateNum = String(data.dateObj.getDate()).padStart(2, '0');
    const monthName = months[data.dateObj.getMonth()];
    const year = data.dateObj.getFullYear();
    const dateFormatted = `${dayName}, ${dateNum} ${monthName} ${year}`;

    const techListFormatted = data.technicians.map((t) => `- *${t}*`).join('\n');

    const actionLines = data.action
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => (line.startsWith('-') ? line : `- ${line}`))
      .join('\n');

    return `Corrective Maintenance
Tanggal : ${dateFormatted}
Jam : ${formatTimeRange(data.startTime, data.endTime)}

Teknisi: 
${techListFormatted}

Alat: ${data.equipmentName}
Kerusakan: ${data.problem}
Tindakan:
${actionLines || '- Melakukan perbaikan peralatan'}
Hasil : ${data.resultText || 'Mesin sudah bisa digunakan dengan normal 🙏🏻'}
Notes : ${data.notes || '-'}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim() || !actionTaken.trim()) {
      alert('Mohon isi deskripsi kerusakan dan tindakan perbaikan.');
      return;
    }

    const eq = equipments.find((e) => e.id === Number(equipmentId));
    const nowDate = new Date();
    const dateStr = getLocalDateString(nowDate);
    const code = `CR-${dateStr.replace(/-/g, '')}-${String(correctiveReports.length + 1).padStart(
      3,
      '0'
    )}`;

    const loc = locations.find((l) => l.id === eq?.location_id);
    const eqType = equipmentTypes.find((t) => t.id === eq?.equipment_type_id);

    const driveFolderPath = buildDriveFolderPath({
      reportType: 'CORRECTIVE',
      operationalDate: dateStr,
      shift: shift,
      equipmentType: eqType?.name || 'EQUIPMENT',
      locationName: loc?.name || 'LOCATION',
      equipmentName: eq?.name || 'Equipment',
    });

    const newReport: Omit<CorrectiveReport, 'id'> & { folder_path?: string } = {
      corrective_code: code,
      corrective_date: dateStr,
      equipment_id: Number(equipmentId),
      location_id: eq?.location_id || 1,
      problem_description: problemDescription,
      action_taken: actionTaken,
      result: result,
      result_text: resultText,
      technicians: selectedTechs,
      start_time: startTime,
      end_time: endTime,
      notes: notes,
      created_by: selectedTechs.join(', '),
      created_at: `${dateStr} ${startTime}`,
      evidences: photos,
      folder_path: driveFolderPath,
    };

    onAddCorrective(newReport);

    // Generate WhatsApp report text
    const waText = buildWhatsAppText({
      dateObj: nowDate,
      startTime: startTime,
      endTime: endTime,
      technicians: selectedTechs,
      equipmentName: eq?.name || 'Security Equipment',
      problem: problemDescription,
      action: actionTaken,
      resultText: resultText,
      notes: notes,
    });

    setGeneratedReportText(waText);

    // Reset Form
    setProblemDescription('');
    setActionTaken('');
    setPhotos([]);
    setShowForm(false);
  };

  const handleCopyWA = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span>Corrective Maintenance</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pelaporan perbaikan kerusakan &amp; penanganan masalah peralatan
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-200 transition-all cursor-pointer"
        >
          {showForm ? (
            <>
              <X className="w-4 h-4" />
              <span>Tutup Form</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>+ Buat Laporan Corrective</span>
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Form Laporan Perbaikan (Corrective)</span>
            </h3>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Format WA Otomatis
            </span>
          </div>

          {/* Equipment Dropdown Split: Jenis Mesin & Peralatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                1. Jenis Mesin
              </label>
              <select
                value={selectedTypeId}
                onChange={(e) => handleTypeChange(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {equipmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                2. Lokasi / Peralatan
              </label>
              <select
                value={equipmentId}
                onChange={(e) => setEquipmentId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {filteredEquipments.map((eq) => {
                  const loc = locations.find((l) => l.id === eq.location_id);
                  return (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({loc?.name || 'Area Bandara'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Jam Pengerjaan & Teknisi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Jam Mulai</span>
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="misal: 13.30"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Jam Selesai</span>
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="misal: 14.00"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Hasil / Status Perbaikan
              </label>
              <select
                value={result}
                onChange={(e) =>
                  setResult(e.target.value as 'Resolved' | 'Pending Sparepart' | 'Temporary Fix')
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="Resolved">Resolved (Selesai/Normal)</option>
                <option value="Temporary Fix">Temporary Fix (Perbaikan Sementara)</option>
                <option value="Pending Sparepart">Pending Sparepart (Menunggu Suku Cadang)</option>
              </select>
            </div>
          </div>

          {/* Teknisi Multi-Select */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Pilih Teknisi Bertugas</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTechs.map((tech) => {
                const isSelected = selectedTechs.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => toggleTechnician(tech)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    <span>{tech}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kerusakan */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Kerusakan (Problem Description)
            </label>
            <textarea
              rows={2}
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Contoh: Air tumpah kedalam baki conveyor belt."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* Tindakan */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Tindakan (Action Taken) - Pisahkan per baris
            </label>
            <textarea
              rows={3}
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder={`Contoh:\nMelakukan pengecekan tumpahan air di conveyor belt, dalam tunnel, dan didalam mesin xray.\nMelakukan restart mesin xray\nMelakukan kalibrasi detector line.`}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            ></textarea>
          </div>

          {/* Hasil & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Pesan Hasil Laporan WA
              </label>
              <input
                type="text"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Contoh: Xray sudah bisa di Gunakan dengan Normal 🙏🏻"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Catatan Tambahan (Notes)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan (default: -)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Photo Upload Field (Max 10) */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Upload Foto Dokumentasi Corrective ({photos.length}/10 Foto)</span>
              </label>

              {photos.length < 10 && (
                <label className="cursor-pointer px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 border border-blue-200">
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Tambah Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Photo Thumbnails Preview Grid */}
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-100"
                  >
                    <img
                      src={photo}
                      alt={`Foto Corrective ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all cursor-pointer shadow-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                <p className="text-xs text-slate-400 font-medium">
                  Belum ada foto diunggah. Anda dapat mengunggah hingga 10 foto bukti perbaikan.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan &amp; Buat Laporan WA</span>
            </button>
          </div>
        </form>
      )}

      {/* Generated WhatsApp Report Modal */}
      {generatedReportText && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <Share2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Format Laporan WhatsApp</h3>
              </div>
              <button
                onClick={() => setGeneratedReportText(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed select-all">
              {generatedReportText}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCopyWA(generatedReportText)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Berhasil Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Salin Laporan WA</span>
                  </>
                )}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(generatedReportText)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-center"
              >
                <Send className="w-4 h-4" />
                <span>Kirim ke WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* List of Corrective Reports History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Riwayat Laporan Corrective Maintenance</span>
          <span>{correctiveReports.length} Laporan</span>
        </h3>

        <div className="space-y-4">
          {correctiveReports.length > 0 ? (
            correctiveReports.map((report) => {
              const eq = equipments.find((e) => e.id === report.equipment_id);
              const loc = locations.find((l) => l.id === report.location_id);

              const nowObj = new Date(report.corrective_date || Date.now());
              const reportWaText = buildWhatsAppText({
                dateObj: nowObj,
                startTime: report.start_time || '13.30',
                endTime: report.end_time || '14.00',
                technicians: report.technicians || [report.created_by],
                equipmentName: eq?.name || 'Security Equipment',
                problem: report.problem_description,
                action: report.action_taken,
                resultText: report.result_text || 'Sudah bisa digunakan dengan normal 🙏🏻',
                notes: report.notes || '-',
              });

              return (
                <div
                  key={report.id}
                  className="p-4 sm:p-5 border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                        {report.corrective_code}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{eq?.name}</span>
                      <span className="text-xs text-slate-500">({loc?.name})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">
                        {formatIndonesianDate(report.corrective_date, { shortMonth: true })} • {formatTimeRange(report.start_time, report.end_time)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          report.result === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {report.result}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <strong className="text-slate-500 block mb-0.5 uppercase tracking-wider text-[10px]">
                        Kerusakan:
                      </strong>
                      <p className="text-slate-800 font-medium">{report.problem_description}</p>
                    </div>

                    <div>
                      <strong className="text-slate-500 block mb-0.5 uppercase tracking-wider text-[10px]">
                        Tindakan Perbaikan:
                      </strong>
                      <p className="text-slate-800 font-medium whitespace-pre-line">
                        {report.action_taken}
                      </p>
                    </div>
                  </div>

                  {/* Evidences / Photos attached */}
                  {report.evidences && report.evidences.length > 0 && (
                    <div className="pt-2">
                      <strong className="text-slate-400 block mb-1.5 text-[10px] uppercase tracking-wider">
                        Foto Dokumentasi ({report.evidences.length} Foto):
                      </strong>
                      <div className="flex flex-wrap gap-2">
                        {report.evidences.map((imgUrl, i) => (
                          <a
                            key={i}
                            href={imgUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 block bg-slate-100 hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={imgUrl}
                              alt={`Evidence ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <div>
                      Teknisi: <strong className="text-slate-800">{report.created_by}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGeneratedReportText(reportWaText)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-all inline-flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer self-start sm:self-auto"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Lihat / Salin Format WA</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              Belum ada riwayat laporan corrective maintenance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
