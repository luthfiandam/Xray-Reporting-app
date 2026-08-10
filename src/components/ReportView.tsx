import React, { useState } from 'react';
import { StructuredReportData } from '../types';
import { generateWhatsAppReportText, generateCorrectiveWhatsAppReportText } from '../services/reportService';
import { downloadReportPdf, shareReportPdf, generatePdfPuppeteerFallback, downloadBlob } from '../pdf/pdfService';
import { logoBase64 } from '../logoBase64';
import { formatTimeShort, formatTimeRange, formatIndonesianDate } from '../utils/timeFormat';
import {
  Send,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Printer,
  ExternalLink,
  Shield,
  Download,
  Share2,
  Loader2,
} from 'lucide-react';

interface ReportViewProps {
  structuredData: StructuredReportData;
}

export const formatReportFilename = (dateStr: string, shiftStr: string, targetFrequencyId?: number): string => {
  let day = '01';
  let month = 'Agustus';
  let year = '2026';

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  if (dateStr) {
    // Remove day names like "Minggu,", "Senin,", "Selasa,", etc.
    const cleanDate = dateStr.replace(/^(Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu)[,\s]*/i, '').trim();

    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          year = parts[0];
          const mIdx = parseInt(parts[1], 10) - 1;
          if (mIdx >= 0 && mIdx < 12) month = monthNames[mIdx];
          day = parts[2].padStart(2, '0');
        } else {
          // DD-MM-YYYY
          day = parts[0].padStart(2, '0');
          const mIdx = parseInt(parts[1], 10) - 1;
          if (mIdx >= 0 && mIdx < 12) month = monthNames[mIdx];
          year = parts[2];
        }
      }
    } else {
      const parts = cleanDate.split(/\s+/);
      if (parts.length >= 3) {
        day = parts[0].padStart(2, '0');
        const m = parts[1];
        if (!isNaN(Number(m))) {
          const mIdx = parseInt(m, 10) - 1;
          if (mIdx >= 0 && mIdx < 12) month = monthNames[mIdx];
        } else {
          const matchedMonth = monthNames.find(mn => mn.toLowerCase() === m.toLowerCase());
          month = matchedMonth || m;
        }
        year = parts[2];
      }
    }
  }

  day = day.replace(/\D/g, '').padStart(2, '0') || '01';
  year = year.replace(/\D/g, '') || '2026';

  let shiftCode = 'PS';
  const sUpper = (shiftStr || '').toUpperCase();
  if (sUpper.includes('MALAM') || sUpper === 'M') {
    shiftCode = 'M';
  } else if (sUpper.includes('PAGI') || sUpper === 'PS') {
    shiftCode = 'PS';
  } else if (sUpper) {
    shiftCode = sUpper;
  }

  const INTERVAL_NAMES_IND: Record<number, string> = {
    1: 'Harian',
    2: 'Mingguan',
    3: 'Bulanan',
    4: 'Triwulan',
    5: 'Semesteran',
    6: 'Tahunan'
  };

  const intervalSuffix = targetFrequencyId ? ` - Preventive ${INTERVAL_NAMES_IND[targetFrequencyId] || 'Harian'}` : '';

  return `${day} ${month} ${year} (${shiftCode})${intervalSuffix}.pdf`;
};

export const ReportView: React.FC<ReportViewProps> = ({ structuredData }) => {
  const [activeSubTab, setActiveSubTab] = useState<'wa' | 'excel' | 'pdf'>('wa');
  const [copiedFreqId, setCopiedFreqId] = useState<number | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const INTERVAL_NAMES: Record<number, string> = {
    1: 'Harian',
    2: 'Mingguan',
    3: 'Bulanan',
    4: 'Triwulan',
    5: 'Semesteran',
    6: 'Tahunan'
  };

  const allEntries = structuredData.entries_by_type.flatMap((g) => g.entries);
  const submittedFrequencyIds = Array.from(
    new Set(allEntries.map((e) => e.checklist_frequency_id).filter(Boolean) as number[])
  ).sort((a, b) => a - b);

  const [selectedPdfFreqId, setSelectedPdfFreqId] = useState<number>(() => {
    return submittedFrequencyIds[0] || 1;
  });

  const handleCopyForInterval = (text: string, freqId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedFreqId(freqId);
    setTimeout(() => setCopiedFreqId(null), 2000);
  };

  const handleOpenWhatsAppForInterval = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleDownloadExcel = () => {
    let csv = `LAPORAN PREVENTIVE MAINTENANCE HARIAN PT. NARARYA TEKNOLOGI INDONESIA\n`;
    csv += `Tanggal,${structuredData.operational_date},Shift,${structuredData.shift}\n`;
    csv += `Jam,${formatTimeRange(structuredData.start_time, structuredData.end_time)}\n`;
    csv += `Teknisi,${structuredData.technicians.join('; ')}\n\n`;

    csv += `Sequence,Category,Equipment Name,View Type,Status,Notes\n`;

    structuredData.entries_by_type.forEach((group) => {
      group.entries.forEach((item) => {
        csv += `${item.sequence},${group.type_code},"${item.equipment_name}",${item.view_type || '-'},OK,"${item.notes.replace(/"/g, '""')}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Preventive_${structuredData.operational_date.replace(/ /g, '_')}_Shift_${structuredData.shift}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    setActiveSubTab('pdf');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleGeneratePDF = async (action: 'download' | 'share', freqId?: number) => {
    const targetFreqId = freqId !== undefined ? freqId : selectedPdfFreqId;
    setActiveSubTab('pdf');
    setIsGeneratingPDF(true);
    try {
      if (action === 'share') {
        await shareReportPdf(structuredData, targetFreqId);
      } else {
        await downloadReportPdf(structuredData, targetFreqId);
      }
    } catch (reactPdfErr) {
      console.error('React-PDF vector generation failed:', reactPdfErr);
      const errorMsg = reactPdfErr instanceof Error ? reactPdfErr.message : String(reactPdfErr);
      alert(`Gagal membuat dokumen PDF: ${errorMsg}. Silakan coba kembali atau gunakan tombol Print jika ingin mencetak halaman langsung.`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveSubTab('wa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeSubTab === 'wa'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Laporan WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveSubTab('excel')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeSubTab === 'excel'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pdf')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeSubTab === 'pdf'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>

        {activeSubTab === 'pdf' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleGeneratePDF('download')}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isGeneratingPDF ? 'Membuat PDF...' : 'Export PDF'}</span>
            </button>

            <button
              onClick={() => handleGeneratePDF('share')}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span>Bagikan PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp Preview Mode */}
      {activeSubTab === 'wa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {submittedFrequencyIds.length === 0 && (!structuredData.corrective_entries || structuredData.corrective_entries.length === 0) ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center text-slate-500">
                Belum ada data preventive atau corrective yang disubmit pada shift ini.
              </div>
            ) : (
              <>
                {submittedFrequencyIds.map((freqId) => {
                  const freqName = INTERVAL_NAMES[freqId] || 'PENGUJIAN';
                  const waTextForInterval = generateWhatsAppReportText(structuredData, freqId);
                  const isCopied = copiedFreqId === freqId;

                  return (
                    <div key={freqId} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-bold text-slate-800">
                            Preventive {freqName}
                          </h3>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Laporan WhatsApp {freqName}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyForInterval(waTextForInterval, freqId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Tercopy!' : 'Copy Text'}</span>
                          </button>

                          <button
                            onClick={() => handleOpenWhatsAppForInterval(waTextForInterval)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim WhatsApp</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto selection:bg-emerald-800 selection:text-white max-h-[350px] overflow-y-auto">
                        {waTextForInterval}
                      </div>
                    </div>
                  );
                })}

                {structuredData.corrective_entries && structuredData.corrective_entries.length > 0 && (() => {
                  const correctiveWaText = generateCorrectiveWhatsAppReportText(structuredData);
                  const isCorrectiveCopied = copiedFreqId === 999;

                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-bold text-slate-800">
                            Corrective Maintenance
                          </h3>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Laporan WhatsApp Corrective
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyForInterval(correctiveWaText, 999)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            {isCorrectiveCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCorrectiveCopied ? 'Tercopy!' : 'Copy Text'}</span>
                          </button>

                          <button
                            onClick={() => handleOpenWhatsAppForInterval(correctiveWaText)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim WhatsApp</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto selection:bg-emerald-800 selection:text-white max-h-[350px] overflow-y-auto">
                        {correctiveWaText}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 h-fit">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Metrik Shift
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-semibold">Tanggal &amp; Shift</span>
                <span className="font-bold text-slate-800 text-sm">
                  {structuredData.operational_date} ({structuredData.shift})
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-semibold">Jam Pemeriksaan</span>
                <span className="font-bold text-slate-800 text-sm">
                  {formatTimeRange(structuredData.start_time, structuredData.end_time)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-semibold">Teknisi On Duty</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {structuredData.technicians.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Table Mode */}
      {activeSubTab === 'excel' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 overflow-x-auto">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">
              Format Preview Export Excel Sheet
            </h3>
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download CSV/Excel</span>
            </button>
          </div>

          <table className="w-full text-xs text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <th className="p-2.5 border border-slate-200 text-center w-12">Seq</th>
                <th className="p-2.5 border border-slate-200">Tipe</th>
                <th className="p-2.5 border border-slate-200">Nama Equipment / Line</th>
                <th className="p-2.5 border border-slate-200 text-center">View</th>
                <th className="p-2.5 border border-slate-200">Generator &amp; Measurement</th>
                <th className="p-2.5 border border-slate-200">Notes / Keterangan</th>
                <th className="p-2.5 border border-slate-200 text-center">Jam</th>
              </tr>
            </thead>
            <tbody>
              {structuredData.entries_by_type.map((group) =>
                group.entries.map((item, idx) => (
                  <tr key={`${group.type_code}-${idx}`} className="hover:bg-slate-50">
                    <td className="p-2.5 border border-slate-200 text-center font-bold font-mono">
                      #{item.sequence}
                    </td>
                    <td className="p-2.5 border border-slate-200 font-bold text-blue-700">
                      {group.type_code}
                    </td>
                    <td className="p-2.5 border border-slate-200 font-bold text-slate-800">
                      {item.equipment_name}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center uppercase font-semibold text-[10px]">
                      {item.view_type || '-'}
                    </td>
                    <td className="p-2.5 border border-slate-200 font-mono text-[11px]">
                      {item.measurements.length > 0 ? (
                        item.measurements.map((m, mIdx) => (
                          <div key={mIdx}>
                            Gen {m.generator}: {m.positive_high_voltage}kV / {m.negative_high_voltage}kV | H:{m.heater_current}mA | A:{m.anode_current}uA
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-slate-700">
                      {item.notes}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono text-slate-500">
                      {formatTimeShort(item.submitted_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PDF Printable Document View (Official Form Format) */}
      {activeSubTab === 'pdf' && (() => {
        const preventivePdfRows = structuredData.entries_by_type.flatMap((group) =>
          group.entries
            .filter((e) => !selectedPdfFreqId || e.checklist_frequency_id === selectedPdfFreqId)
            .map((e) => ({
              kind: 'preventive' as const,
              equipment_name: e.equipment_name,
              type_code: group.type_code,
              view_type: e.view_type,
              notes: e.notes,
              evidences: e.evidences || [],
              problem_description: '',
              action_taken: '',
              result: '',
              result_text: '',
              time_range: '',
              checklist_frequency_id: e.checklist_frequency_id,
              equipment_id: e.equipment_id,
            }))
        );

        const includeCorrective = !selectedPdfFreqId || selectedPdfFreqId === 1;
        const correctivePdfRows = includeCorrective
          ? (structuredData.corrective_entries || []).map((c) => ({
              kind: 'corrective' as const,
              equipment_name: c.equipment_name,
              type_code: c.type_code,
              view_type: 'single' as const,
              notes: c.notes,
              evidences: c.evidences || [],
              problem_description: c.problem_description,
              action_taken: c.action_taken,
              result: c.result,
              result_text: c.result_text,
              time_range: c.time_range,
            }))
          : [];

        const allPdfRows = [...preventivePdfRows, ...correctivePdfRows];

        const formatDayDate = (dateStr: string) => {
          if (!dateStr) return '';
          const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          if (days.some(day => dateStr.startsWith(day))) {
            return dateStr;
          }
          const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];

          let d: Date | null = null;
          if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            }
          } else {
            d = new Date(dateStr);
          }

          if (!d || isNaN(d.getTime())) {
            const now = new Date();
            return `${days[now.getDay()]}, ${dateStr}`;
          }

          return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
        };

        const samplePhotos = [
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=200&auto=format&fit=crop&q=80',
        ];

        const renderCorrectiveUraian = (problemText: string, actionText: string) => {
          const formatListItems = (text: string) => {
            if (!text || !text.trim()) return [];
            return text
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
              .map((line) => line.replace(/^[\s\-\*•\d\.\)]+/, '').trim() || line);
          };

          const problemItems = formatListItems(problemText);
          const actionItems = formatListItems(actionText);

          return (
            <div style={{ textAlign: 'left', fontSize: '9.5px', lineHeight: '1.25', color: '#000000', padding: '2px 0' }}>
              <div style={{ fontWeight: 'bold' }}>Kerusakan :</div>
              <ul style={{ margin: '1px 0 4px 0', paddingLeft: '12px', listStyleType: 'disc' }}>
                {problemItems.length > 0 ? (
                  problemItems.map((item, idx) => <li key={idx}>{item}</li>)
                ) : (
                  <li>-</li>
                )}
              </ul>
              <div style={{ fontWeight: 'bold', marginTop: '3px' }}>Tindakan :</div>
              <ul style={{ margin: '1px 0 0 0', paddingLeft: '12px', listStyleType: 'disc' }}>
                {actionItems.length > 0 ? (
                  actionItems.map((item, idx) => <li key={idx}>{item}</li>)
                ) : (
                  <li>-</li>
                )}
              </ul>
            </div>
          );
        };

        const rawTechs = structuredData.technicians && structuredData.technicians.length > 0
          ? structuredData.technicians
          : ['LUTHFIANDA MUZAKI SULAEMAN'];

        const CHUNK_SIZE = 6;
        const pageChunks: (typeof allPdfRows)[] = [];
        for (let i = 0; i < allPdfRows.length; i += CHUNK_SIZE) {
          pageChunks.push(allPdfRows.slice(i, i + CHUNK_SIZE));
        }
        if (pageChunks.length === 0) {
          pageChunks.push([]);
        }

        return (
          <>
            {/* print:hidden Card List to trigger specific Interval PDF exports */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6 print:hidden space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Export Laporan PDF Resmi per Interval
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {submittedFrequencyIds.map((freqId) => {
                  const freqName = INTERVAL_NAMES[freqId] || 'PENGUJIAN';
                  const isSelected = selectedPdfFreqId === freqId;
                  return (
                    <div
                      key={freqId}
                      className={`p-4 border rounded-2xl transition-all space-y-3 flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-800 bg-slate-50/50 ring-1 ring-slate-800'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 text-sm block">
                            Preventive {freqName}
                          </span>
                          {freqId === 1 && (
                            <span className="text-[10px] text-emerald-600 font-bold block">
                              + Corrective Maintenance
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-white rounded">
                            Preview Aktif
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedPdfFreqId(freqId);
                            handleGeneratePDF('download', freqId);
                          }}
                          disabled={isGeneratingPDF}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export PDF</span>
                        </button>

                        <button
                          onClick={() => setSelectedPdfFreqId(freqId)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                          }`}
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              id="pdf-report-document"
              className="bg-white p-4 sm:p-6 max-w-[760px] mx-auto shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 print:max-w-none space-y-4 box-border"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                fontFamily: "'Times New Roman', Times, serif",
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
            {pageChunks.map((chunk, pageIndex) => {
              const prevCountInChunk = chunk.filter((r) => r.kind === 'preventive').length;
              const firstPrevIdxInChunk = chunk.findIndex((r) => r.kind === 'preventive');

              return (
                <div
                  key={pageIndex}
                  className="pdf-page"
                  style={{
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    width: '100%',
                    pageBreakAfter: pageIndex < pageChunks.length - 1 ? 'always' : 'auto',
                    breakAfter: pageIndex < pageChunks.length - 1 ? 'page' : 'auto',
                    paddingBottom: pageIndex < pageChunks.length - 1 ? '10px' : '0',
                  }}
                >
                  {/* Header Table (Logo + Title) */}
                  <table
                    style={{
                      width: '100%',
                      tableLayout: 'fixed',
                      borderCollapse: 'collapse',
                      border: '0.5px solid #000000',
                      fontSize: '11px',
                      color: '#000000',
                      backgroundColor: '#ffffff',
                      fontFamily: "'Times New Roman', Times, serif",
                    }}
                  >
                    <tbody>
                      <tr>
                        {/* Compact Logo Column */}
                        <td
                          style={{
                            width: '18%',
                            border: '0.5px solid #000000',
                            padding: '3px 4px',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            backgroundColor: '#ffffff',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                            <img
                              src={logoBase64}
                              alt="Logo PT Nararya Teknologi Indonesia"
                              style={{
                                height: '14mm',
                                maxHeight: '60px',
                                width: 'auto',
                                maxWidth: '80%',
                                objectFit: 'contain',
                                display: 'block',
                                margin: '0 auto',
                              }}
                            />
                          </div>
                        </td>

                        {/* Title Column */}
                        <td
                          style={{
                            width: '82%',
                            border: '0.5px solid #000000',
                            padding: '6px 8px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            backgroundColor: '#ffffff',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 'bold',
                              fontSize: '18px',
                              color: '#000000',
                              letterSpacing: '0.02em',
                              textTransform: 'uppercase',
                              fontFamily: "'Times New Roman', Times, serif",
                              lineHeight: '1.1',
                            }}
                          >
                            PT. NARARYA TEKNOLOGI INDONESIA
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Operational Info Table */}
                  <table
                    style={{
                      width: '100%',
                      tableLayout: 'fixed',
                      borderCollapse: 'collapse',
                      border: '0.5px solid #000000',
                      borderTop: 'none',
                      fontSize: '11px',
                      color: '#000000',
                      backgroundColor: '#ffffff',
                      fontFamily: "'Times New Roman', Times, serif",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: '18%',
                            border: '0.5px solid #000000',
                            padding: '1.5mm 6px',
                            fontWeight: 'bold',
                            backgroundColor: '#ffffff',
                            fontSize: '11px',
                            boxSizing: 'border-box',
                          }}
                        >
                          Hari / Tanggal
                        </td>
                        <td
                          style={{
                            width: '42%',
                            border: '0.5px solid #000000',
                            padding: '1.5mm 6px',
                            fontSize: '11px',
                            boxSizing: 'border-box',
                          }}
                        >
                          : {formatDayDate(structuredData.operational_date)}
                        </td>
                        <td
                          style={{
                            width: '12%',
                            border: '0.5px solid #000000',
                            padding: '1.5mm 6px',
                            fontWeight: 'bold',
                            backgroundColor: '#ffffff',
                            fontSize: '11px',
                            boxSizing: 'border-box',
                          }}
                        >
                          Shift
                        </td>
                        <td
                          style={{
                            width: '28%',
                            border: '0.5px solid #000000',
                            padding: '1.5mm 6px',
                            fontWeight: 'bold',
                            color: '#000000',
                            fontSize: '11px',
                            boxSizing: 'border-box',
                          }}
                        >
                          : {structuredData.shift ? structuredData.shift.toUpperCase() : 'PAGI'}
                        </td>
                      </tr>

                      {Array.from({ length: Math.max(1, Math.ceil(rawTechs.length / 2)) }).map((_, r, arr) => {
                        const leftIdx = r * 2;
                        const rightIdx = r * 2 + 1;
                        const leftTech = rawTechs[leftIdx];
                        const rightTech = rawTechs[rightIdx];

                        return (
                          <tr key={r}>
                            {r === 0 && (
                              <td
                                rowSpan={arr.length}
                                style={{
                                  width: '18%',
                                  border: '0.5px solid #000000',
                                  padding: '1.5mm 6px',
                                  fontWeight: 'bold',
                                  backgroundColor: '#ffffff',
                                  verticalAlign: 'middle',
                                  fontSize: '11px',
                                  boxSizing: 'border-box',
                                }}
                              >
                                Teknisi On Duty
                              </td>
                            )}
                            <td
                              style={{
                                width: '42%',
                                border: '0.5px solid #000000',
                                padding: '1.5mm 6px',
                                fontSize: '11px',
                                verticalAlign: 'middle',
                                boxSizing: 'border-box',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ width: '10px', flexShrink: 0 }}>{r === 0 ? ':' : ''}</span>
                                <span>
                                  {rawTechs.length > 1
                                    ? `${leftIdx + 1}. ${leftTech}`
                                    : leftTech}
                                </span>
                              </div>
                            </td>
                            <td
                              colSpan={2}
                              style={{
                                width: '40%',
                                border: '0.5px solid #000000',
                                padding: '1.5mm 6px',
                                fontSize: '11px',
                                verticalAlign: 'middle',
                                boxSizing: 'border-box',
                              }}
                            >
                              {rightTech ? (
                                <span>{`${rightIdx + 1}. ${rightTech}`}</span>
                              ) : (
                                <span>&nbsp;</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Main Inspection Equipment Table */}
                  <table
                    style={{
                      width: '100%',
                      tableLayout: 'fixed',
                      borderCollapse: 'collapse',
                      border: '0.5px solid #000000',
                      borderTop: 'none',
                      fontSize: '11px',
                      textAlign: 'left',
                      backgroundColor: '#ffffff',
                      color: '#000000',
                      fontFamily: "'Times New Roman', Times, serif",
                      boxSizing: 'border-box',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold', textAlign: 'center' }}>
                        <th style={{ padding: '2mm 2px', border: '0.5px solid #000000', width: '4%', color: '#000000', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }}>No</th>
                        <th style={{ padding: '2mm 3px', border: '0.5px solid #000000', width: '11%', color: '#000000', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }}>Tipe Alat</th>
                        <th style={{ padding: '2mm 3px', border: '0.5px solid #000000', width: '13%', color: '#000000', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }}>Jenis Kegiatan</th>
                        <th style={{ padding: '2mm 2px', border: '0.5px solid #000000', width: '6%', color: '#000000', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }}>Waktu</th>
                        <th style={{ padding: '2mm 3px', border: '0.5px solid #000000', width: '15%', color: '#000000', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }}>Uraian Kegiatan</th>
                        <th style={{ padding: '2mm 3px', border: '0.5px solid #000000', width: '23%', color: '#000000', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }}>Notes</th>
                        <th style={{ padding: '2mm 3px', border: '0.5px solid #000000', width: '28%', color: '#000000', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }}>Dokumentasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((row, itemIdx) => {
                        const globalIdx = pageIndex * CHUNK_SIZE + itemIdx;

                        // Extract valid photo URLs (no samplePhotos fallback!)
                        const rawEvidences = row.evidences || [];
                        const validPhotoUrls = rawEvidences
                          .map((ev: any) => (typeof ev === 'string' ? ev : ev?.file_path))
                          .filter((src: any) => typeof src === 'string' && src.trim() !== '');

                        let defaultNote = `${row.type_code} bisa digunakan dengan normal`;
                        if (row.type_code === 'XRAY') defaultNote = 'Xray bisa digunakan dengan normal';
                        if (row.type_code === 'WTMD') defaultNote = 'WTMD bisa digunakan dengan normal';
                        if (row.type_code === 'HHMD') defaultNote = 'HHMD bisa digunakan dengan normal';

                        const eqNameUpper = row.equipment_name.toUpperCase();
                        const typeUpper = row.type_code.toUpperCase();
                        const displayEquipmentName = eqNameUpper.includes(typeUpper)
                          ? eqNameUpper
                          : `${typeUpper} ${eqNameUpper}`;

                        const formattedEquipmentName = displayEquipmentName.split(' ').join('\n');

                        const photoCount = validPhotoUrls.length;
                        let gridCols = '1fr 1fr';
                        let photoHeight = '48px';
                        if (photoCount === 1) {
                          gridCols = '1fr';
                          photoHeight = '72px';
                        } else if (photoCount === 2) {
                          gridCols = '1fr 1fr';
                          photoHeight = '54px';
                        } else if (photoCount >= 5) {
                          gridCols = '1fr 1fr 1fr';
                          photoHeight = '36px';
                        }

                        const isPreventiveRow = row.kind === 'preventive';

                        // Format time range for this row
                        let rowTimeStr = formatTimeRange(structuredData.start_time, structuredData.end_time);
                        if (row.kind === 'corrective' && row.time_range) {
                          rowTimeStr = row.time_range.includes('-') || row.time_range.includes('WIB')
                            ? row.time_range
                            : `${row.time_range} WIB`;
                        }

                        return (
                          <tr key={itemIdx} style={{ backgroundColor: '#ffffff' }}>
                            <td style={{ padding: '1.5mm 2px', border: '0.5px solid #000000', textAlign: 'center', fontWeight: 'normal', verticalAlign: 'middle', fontSize: '11px', boxSizing: 'border-box' }}>
                              {globalIdx + 1}
                            </td>
                            <td style={{ padding: '1.5mm 3px', border: '0.5px solid #000000', fontWeight: 'normal', textTransform: 'uppercase', verticalAlign: 'middle', textAlign: 'center', color: '#000000', whiteSpace: 'pre-line', fontSize: '10.5px', lineHeight: '1.25', wordBreak: 'break-word', boxSizing: 'border-box' }}>
                              {formattedEquipmentName}
                            </td>
                            <td style={{ padding: '1.5mm 3px', border: '0.5px solid #000000', fontWeight: 'normal', verticalAlign: 'middle', textAlign: 'center', fontSize: '10.5px', boxSizing: 'border-box' }}>
                              {isPreventiveRow
                                ? `Preventive Maintenance ${INTERVAL_NAMES[row.checklist_frequency_id || selectedPdfFreqId || 1] || 'Harian'}`
                                : 'Corrective Maintenance'}
                            </td>

                            {/* Waktu column */}
                            <td
                              style={{
                                padding: '1.5mm 2px',
                                border: '0.5px solid #000000',
                                fontWeight: 'normal',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                                fontSize: '10.5px',
                                boxSizing: 'border-box',
                                backgroundColor: '#ffffff',
                              }}
                            >
                              {rowTimeStr}
                            </td>

                            {/* Uraian Kegiatan */}
                            <td style={{ padding: '1.5mm 3px', border: '0.5px solid #000000', fontWeight: 'normal', verticalAlign: 'middle', textAlign: isPreventiveRow ? 'center' : 'left', fontSize: '10.5px', boxSizing: 'border-box' }}>
                              {isPreventiveRow
                                ? 'Melakukan Pembersihan dan Check List'
                                : renderCorrectiveUraian(row.problem_description, row.action_taken)}
                            </td>

                            {/* Notes */}
                            <td style={{ padding: '1.5mm 3px', border: '0.5px solid #000000', fontWeight: 'normal', verticalAlign: 'middle', textAlign: 'center', fontSize: '10.5px', boxSizing: 'border-box' }}>
                              {isPreventiveRow ? (
                                row.notes || defaultNote
                              ) : (
                                <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '1.3', color: '#000000' }}>
                                  {row.result_text || row.notes || 'Equipment sudah dapat digunakan kembali dengan normal.'}
                                </div>
                              )}
                            </td>

                            {/* Dokumentasi */}
                            <td style={{ padding: '1.5mm 3px', border: '0.5px solid #000000', textAlign: 'center', verticalAlign: 'middle', boxSizing: 'border-box' }}>
                              {validPhotoUrls.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '2px', width: '100%', boxSizing: 'border-box' }}>
                                  {validPhotoUrls.slice(0, 6).map((src, pIdx) => (
                                    <img
                                      key={pIdx}
                                      src={src}
                                      alt="Dokumentasi"
                                      style={{
                                        width: '100%',
                                        height: photoCount === 1 ? 'auto' : photoHeight,
                                        objectFit: photoCount === 1 ? 'contain' : 'cover',
                                        maxHeight: photoCount === 1 ? '170px' : undefined,
                                        border: '0.5px solid #000000',
                                        boxSizing: 'border-box',
                                        display: 'block',
                                        margin: '0 auto',
                                      }}
                                      crossOrigin="anonymous"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span style={{ fontSize: '10px', color: '#888888' }}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Official Signature Footer - ONLY on the LAST page */}
                  {pageIndex === pageChunks.length - 1 && (
                    <div
                      className="signature-block"
                      style={{
                        marginTop: '18px',
                        padding: '4px 0',
                        border: 'none',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        textAlign: 'center',
                        fontSize: '11px',
                        color: '#000000',
                        backgroundColor: '#ffffff',
                        fontFamily: "'Times New Roman', Times, serif",
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 'bold', fontSize: '11px', color: '#000000', margin: 0 }}>Pelaksana</p>
                        <p style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#000000', marginTop: '2px', marginBottom: 0 }}>
                          PT. NARARYA TEKNOLOGI INDONESIA
                        </p>
                        <div style={{ height: '64px' }}></div>
                        <p style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', color: '#000000', fontSize: '11px', letterSpacing: '0.02em', margin: 0 }}>
                          LUTHFIANDA MUZAKI SULAEMAN
                        </p>
                      </div>

                      <div>
                        <p style={{ fontWeight: 'bold', fontSize: '11px', color: '#000000', margin: 0 }}>Pengawas Pekerjaan</p>
                        <p style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#000000', marginTop: '2px', marginBottom: 0 }}>
                          FACILITY MAINTENANCE - ELEKTRONIKA
                        </p>
                        <div style={{ height: '64px' }}></div>
                        <p style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', color: '#000000', fontSize: '11px', letterSpacing: '0.02em', margin: 0 }}>
                          RIZKO ENDRA NUGRAHA
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      );
      })()}
    </div>
  );
};
