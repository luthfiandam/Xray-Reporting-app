import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { StructuredReportData } from '../types';
import { logoBase64 } from '../logoBase64';
import { formatTimeRange } from '../utils/timeFormat';

export interface PdfRowData {
  kind: 'preventive' | 'corrective';
  equipment_name: string;
  type_code: string;
  view_type?: string;
  notes?: string;
  evidences?: any[];
  problem_description?: string;
  action_taken?: string;
  result?: string;
  result_text?: string;
  time_range?: string;
  checklist_frequency_id?: number;
  equipment_id?: number;
}

// Single Source of Truth for Numeric Column Widths in Points (Sum = 551 pt)
// Usable Page Width = 595.28 (A4 Width) - 22 (Left Padding) - 22 (Right Padding) = 551.28 pt
const COL_WIDTHS = {
  no: 25,        // ~4.5%
  type: 62,      // ~11.3% (slightly reduced from 69)
  kind: 68,      // ~12.3% (slightly reduced from 74)
  time: 42,      // ~7.6%
  uraian: 114,   // ~20.7% (increased to keep total 551)
  notes: 120,    // ~21.8% (increased to keep total 551)
  docs: 120,     // ~21.8%
};
// 25 + 62 + 68 + 42 + 114 + 120 + 120 = 551 pt total

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 22,
    paddingLeft: 22,
    paddingRight: 22,
    fontFamily: 'Times-Roman',
    backgroundColor: '#FFFFFF',
    fontSize: 8.5,
    color: '#000000',
  },

  // Fixed Full Report Header Block (Repeated on Every Page)
  fullHeaderContainer: {
    flexDirection: 'column',
    width: 551,
    marginBottom: 0,
  },

  // 1. Company Header Block
  headerTable: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: '#000000',
    height: 64,
    alignItems: 'center',
  },
  logoCol: {
    width: 130,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  logoImage: {
    width: 122,
    height: 58,
    objectFit: 'contain',
  },
  titleCol: {
    width: 421,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontFamily: 'Times-Bold',
    fontSize: 14.5,
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // 2. Operational Info Block
  infoTable: {
    flexDirection: 'column',
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#000000',
    width: 551,
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#000000',
    minHeight: 17,
    alignItems: 'center',
  },
  infoRowLast: {
    flexDirection: 'row',
    minHeight: 17,
    alignItems: 'center',
  },
  labelCell18: {
    width: 130, // matching logoCol width for aligned vertical line
    padding: 3,
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    borderRightWidth: 0.5,
    borderColor: '#000000',
  },
  valCell42: {
    width: 211, // adjusted to keep 551 total (130 + 211 + 65 + 145 = 551)
    padding: 3,
    fontFamily: 'Times-Roman',
    fontSize: 8.5,
    borderRightWidth: 0.5,
    borderColor: '#000000',
  },
  labelCell12: {
    width: 65,
    padding: 3,
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    borderRightWidth: 0.5,
    borderColor: '#000000',
  },
  valCell28: {
    width: 145, // adjusted to fit within 551 (130 + 211 + 65 + 145 = 551)
    padding: 3,
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
  },

  techValCellLeft: {
    width: 211, // adjusted
    padding: 3,
    fontFamily: 'Times-Roman',
    fontSize: 8.5,
    borderRightWidth: 0.5,
    borderColor: '#000000',
  },
  techValCellRight: {
    width: 210, // adjusted
    padding: 3,
    fontFamily: 'Times-Roman',
    fontSize: 8.5,
  },

  // 3. Table Column Header Row
  tableHeaderRow: {
    flexDirection: 'row',
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#000000',
    backgroundColor: '#FAFAFA',
    height: 22,
    alignItems: 'stretch',
    width: 551,
  },

  headerCellText: {
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    textAlign: 'center',
    color: '#000000',
  },

  // 4. Clean Single Table Row Model
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#000000',
    width: 551,
    minHeight: 28,
    alignItems: 'stretch',
  },

  colNoCell: {
    width: COL_WIDTHS.no,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colTypeCell: {
    width: COL_WIDTHS.type,
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colKindCell: {
    width: COL_WIDTHS.kind,
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colTimeHeaderCell: {
    width: COL_WIDTHS.time,
    padding: 2,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colTimeCell: {
    width: COL_WIDTHS.time,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colUraianCell: {
    width: COL_WIDTHS.uraian,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colNotesCell: {
    width: COL_WIDTHS.notes,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colDocsCell: {
    width: COL_WIDTHS.docs,
    paddingVertical: 5,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cellText: {
    fontFamily: 'Times-Roman',
    fontSize: 8,
    color: '#000000',
    lineHeight: 1.25,
    textAlign: 'center',
  },
  cellTextLeft: {
    fontFamily: 'Times-Roman',
    fontSize: 8,
    color: '#000000',
    lineHeight: 1.25,
    textAlign: 'left',
  },
  cellTextCenter: {
    fontFamily: 'Times-Roman',
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 1.25,
  },
  cellTextBoldCenter: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 1.25,
  },

  // Corrective Items List
  boldText: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
    marginTop: 1,
    marginBottom: 1,
  },
  bulletItem: {
    fontFamily: 'Times-Roman',
    fontSize: 7.5,
    marginLeft: 0,
    lineHeight: 1.2,
  },

  // Compact Image Grid
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    padding: 1,
  },
  docImage1: {
    width: '95%',
    height: 60,
    objectFit: 'contain',
    borderWidth: 0.5,
    borderColor: '#666666',
  },
  docImage2: {
    width: '46%',
    height: 45,
    objectFit: 'cover',
    borderWidth: 0.5,
    borderColor: '#666666',
  },
  docImage3or4: {
    width: '46%',
    height: 32,
    objectFit: 'cover',
    borderWidth: 0.5,
    borderColor: '#666666',
  },
  docImage5or6: {
    width: '46%',
    height: 25,
    objectFit: 'cover',
    borderWidth: 0.5,
    borderColor: '#666666',
  },

  // Signature Block
  signatureContainer: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    width: 551,
  },
  signatureCol: {
    width: '45%',
    alignItems: 'center',
    textAlign: 'center',
  },
  sigTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    textAlign: 'center',
  },
  sigSubTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    marginTop: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  sigSpace: {
    height: 48,
  },
  sigName: {
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    textDecoration: 'underline',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

const formatDayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  if (days.some((day) => dateStr.toLowerCase().startsWith(day.toLowerCase()))) {
    return dateStr;
  }

  const cleanStr = dateStr.replace(/^(Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu)[,\s]*/i, '').trim();

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  let d: Date | null = null;
  if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
  } else {
    d = new Date(cleanStr);
  }

  if (!d || isNaN(d.getTime())) {
    const now = new Date();
    return `${days[now.getDay()]}, ${cleanStr}`;
  }

  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatListItems = (text: string) => {
  if (!text || !text.trim()) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[\s\-\*•\d\.\)]+/, '').trim() || line);
};

interface ReportPdfProps {
  structuredData: StructuredReportData;
  targetFrequencyId?: number;
}

const INTERVAL_NAMES: Record<number, string> = {
  1: 'Harian',
  2: 'Mingguan',
  3: 'Bulanan',
  4: 'Triwulan',
  5: 'Semesteran',
  6: 'Tahunan'
};

export const ShiftReportPdfDocument: React.FC<ReportPdfProps> = ({ structuredData, targetFrequencyId }) => {
  const defaultTimeStr = formatTimeRange(structuredData.start_time, structuredData.end_time);

  const preventivePdfRows: PdfRowData[] = structuredData.entries_by_type.flatMap((group) =>
    group.entries
      .filter((e) => !targetFrequencyId || e.checklist_frequency_id === targetFrequencyId)
      .map((e) => ({
        kind: 'preventive' as const,
        equipment_name: e.equipment_name,
        type_code: group.type_code,
        view_type: e.view_type,
        notes: e.notes,
        evidences: e.evidences || [],
        checklist_frequency_id: e.checklist_frequency_id,
        equipment_id: e.equipment_id,
      }))
  );

  const includeCorrective = !targetFrequencyId || targetFrequencyId === 1;
  const correctivePdfRows: PdfRowData[] = includeCorrective
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

  const renderRow = (row: PdfRowData, idx: number) => {
    const eqNameUpper = row.equipment_name.toUpperCase();
    const typeUpper = row.type_code.toUpperCase();
    const displayEquipmentName = eqNameUpper.includes(typeUpper)
      ? eqNameUpper
      : `${typeUpper} ${eqNameUpper}`;
    const isPreventiveRow = row.kind === 'preventive';

    const rawEvidences = row.evidences || [];
    const validPhotoUrls = rawEvidences
      .map((ev: any) => (typeof ev === 'string' ? ev : ev?.file_path))
      .filter((src: any) => typeof src === 'string' && src.trim() !== '');

    let defaultNote = `${row.type_code} bisa digunakan dengan normal`;
    if (row.type_code === 'XRAY') defaultNote = 'Xray bisa digunakan dengan normal';
    if (row.type_code === 'WTMD') defaultNote = 'WTMD bisa digunakan dengan normal';
    if (row.type_code === 'HHMD') defaultNote = 'HHMD bisa digunakan dengan normal';

    const probItems = row.problem_description ? formatListItems(row.problem_description) : [];
    const actItems = row.action_taken ? formatListItems(row.action_taken) : [];

    let rowTimeStr = defaultTimeStr;
    if (row.kind === 'corrective' && row.time_range) {
      rowTimeStr = row.time_range.includes('WIB') ? row.time_range : `${row.time_range} WIB`;
    }

    return (
      <View key={idx} style={styles.tableRow} wrap={false}>
        {/* No */}
        <View style={styles.colNoCell}>
          <Text style={styles.cellTextCenter}>{idx + 1}</Text>
        </View>

        {/* Tipe Alat */}
        <View style={styles.colTypeCell}>
          <Text style={styles.cellTextCenter}>{displayEquipmentName}</Text>
        </View>

        {/* Jenis Kegiatan */}
        <View style={styles.colKindCell}>
          <Text style={styles.cellTextCenter}>
            {isPreventiveRow
              ? `Preventive Maintenance ${INTERVAL_NAMES[row.checklist_frequency_id || targetFrequencyId || 1] || 'Harian'}`
              : 'Corrective Maintenance'}
          </Text>
        </View>

        {/* Waktu */}
        <View style={styles.colTimeCell}>
          <Text style={styles.cellTextCenter}>{rowTimeStr}</Text>
        </View>

        {/* Uraian Kegiatan */}
        <View style={styles.colUraianCell}>
          {isPreventiveRow ? (
            <Text style={styles.cellTextCenter}>Melakukan Pembersihan dan Check List</Text>
          ) : (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <Text style={[styles.boldText, { textAlign: 'center' }]}>Kerusakan :</Text>
              {probItems.length > 0 ? (
                probItems.map((pItem, pIdx) => (
                  <Text key={pIdx} style={[styles.bulletItem, { textAlign: 'center' }]}>{pItem}</Text>
                ))
              ) : (
                <Text style={[styles.bulletItem, { textAlign: 'center' }]}>-</Text>
              )}
              <Text style={[styles.boldText, { textAlign: 'center' }]}>Tindakan :</Text>
              {actItems.length > 0 ? (
                actItems.map((aItem, aIdx) => (
                  <Text key={aIdx} style={[styles.bulletItem, { textAlign: 'center' }]}>{aItem}</Text>
                ))
              ) : (
                <Text style={[styles.bulletItem, { textAlign: 'center' }]}>-</Text>
              )}
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.colNotesCell}>
          <Text style={styles.cellTextCenter}>
            {isPreventiveRow
              ? row.notes || defaultNote
              : row.result_text || row.notes || 'Equipment sudah dapat digunakan kembali dengan normal.'}
          </Text>
        </View>

        {/* Dokumentasi */}
        <View style={styles.colDocsCell}>
          {validPhotoUrls.length > 0 ? (
            <View style={styles.imageGrid}>
              {validPhotoUrls.slice(0, 6).map((src, pIdx) => (
                <Image
                  key={pIdx}
                  src={src}
                  style={
                    validPhotoUrls.length === 1
                      ? styles.docImage1
                      : validPhotoUrls.length === 2
                      ? styles.docImage2
                      : (validPhotoUrls.length === 3 || validPhotoUrls.length === 4)
                      ? styles.docImage3or4
                      : styles.docImage5or6
                  }
                />
              ))}
            </View>
          ) : (
            <Text style={styles.cellTextCenter}>-</Text>
          )}
        </View>
      </View>
    );
  };

  const rawTechs = structuredData.technicians && structuredData.technicians.length > 0
    ? structuredData.technicians
    : ['LUTHFIANDA MUZAKI SULAEMAN'];

  const techRowsCount = Math.max(1, Math.ceil(rawTechs.length / 2));

  return (
    <Document title={`Laporan Maintenance - ${structuredData.operational_date}`}>
      <Page size="A4" style={styles.page} wrap>
        {/* Unified Reusable Full Header (Company Header + Operational Info + Table Column Header) - Repeated on Every Page */}
        <View style={styles.fullHeaderContainer} fixed>
          {/* 1. Company Header Table */}
          <View style={styles.headerTable}>
            <View style={styles.logoCol}>
              <Image src={logoBase64} style={styles.logoImage} />
            </View>
            <View style={styles.titleCol}>
              <Text style={styles.titleText}>PT. NARARYA TEKNOLOGI INDONESIA</Text>
            </View>
          </View>

          {/* 2. Operational Info Table */}
          <View style={styles.infoTable}>
            {/* Row 1: Date & Shift */}
            <View style={styles.infoRow}>
              <Text style={styles.labelCell18}>Hari / Tanggal</Text>
              <Text style={styles.valCell42}>: {formatDayDate(structuredData.operational_date)}</Text>
              <Text style={styles.labelCell12}>Shift</Text>
              <Text style={styles.valCell28}>: {structuredData.shift ? structuredData.shift.toUpperCase() : 'PAGI'}</Text>
            </View>

            {/* Row 2: Technicians Section (with clean vertical lines mimicking rowSpan) */}
            <View style={{ flexDirection: 'row', minHeight: 17 * techRowsCount }} wrap={false}>
              {/* Left Title Block - mimicking rowSpan */}
              <View style={{ width: 130, borderRightWidth: 0.5, borderColor: '#000000', padding: 3, justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Times-Bold', fontSize: 8.5 }}>Teknisi On Duty</Text>
              </View>
              
              {/* Right Rows Block */}
              <View style={{ width: 421, flexDirection: 'column' }}>
                {Array.from({ length: techRowsCount }).map((_, r) => {
                  const leftIdx = r * 2;
                  const rightIdx = r * 2 + 1;
                  const leftTech = rawTechs[leftIdx];
                  const rightTech = rawTechs[rightIdx];
                  const isLastTechRow = r === techRowsCount - 1;
                  
                  return (
                    <View key={r} style={{
                      flexDirection: 'row',
                      borderBottomWidth: isLastTechRow ? 0 : 0.5,
                      borderColor: '#000000',
                      minHeight: 17,
                      alignItems: 'center'
                    }}>
                      <View style={{ width: 211, borderRightWidth: 0.5, borderColor: '#000000', padding: 3, justifyContent: 'center' }}>
                        <Text style={{ fontFamily: 'Times-Roman', fontSize: 8.5 }}>
                          {leftTech ? `: ${leftIdx + 1}. ${leftTech}` : ''}
                        </Text>
                      </View>
                      <View style={{ width: 210, padding: 3, justifyContent: 'center' }}>
                        <Text style={{ fontFamily: 'Times-Roman', fontSize: 8.5 }}>
                          {rightTech ? `${rightIdx + 1}. ${rightTech}` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 3. Table Column Header Row */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.colNoCell}><Text style={styles.headerCellText}>No</Text></View>
            <View style={styles.colTypeCell}><Text style={styles.headerCellText}>Tipe Alat</Text></View>
            <View style={styles.colKindCell}><Text style={styles.headerCellText}>Jenis Kegiatan</Text></View>
            <View style={styles.colTimeHeaderCell}><Text style={styles.headerCellText}>Waktu</Text></View>
            <View style={styles.colUraianCell}><Text style={styles.headerCellText}>Uraian Kegiatan</Text></View>
            <View style={styles.colNotesCell}><Text style={styles.headerCellText}>Notes</Text></View>
            <View style={styles.colDocsCell}><Text style={styles.headerCellText}>Dokumentasi</Text></View>
          </View>
        </View>

        {/* Natural Page Flow Table Row Model */}
        {allPdfRows.slice(0, -1).map((row, idx) => renderRow(row, idx))}

        {allPdfRows.length > 0 && (
          <View wrap={false}>
            {renderRow(allPdfRows[allPdfRows.length - 1], allPdfRows.length - 1)}

            {/* Signature Block (Placed after table, wrap={false} prevents signature splitting) */}
            <View style={styles.signatureContainer} wrap={false}>
              <View style={styles.signatureCol}>
                <Text style={styles.sigTitle}>Pelaksana</Text>
                <Text style={styles.sigSubTitle}>PT. NARARYA TEKNOLOGI INDONESIA</Text>
                <View style={styles.sigSpace} />
                <Text style={styles.sigName}>LUTHFIANDA MUZAKI SULAEMAN</Text>
              </View>

              <View style={styles.signatureCol}>
                <Text style={styles.sigTitle}>Pengawas Pekerjaan</Text>
                <Text style={styles.sigSubTitle}>FACILITY MAINTENANCE - ELEKTRONIKA</Text>
                <View style={styles.sigSpace} />
                <Text style={styles.sigName}>RIZKO ENDRA NUGRAHA</Text>
              </View>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};

export const PreventivePdfDocument = ShiftReportPdfDocument;
export const CorrectivePdfDocument = ShiftReportPdfDocument;
