import {
  PreventiveSession,
  PreventiveEntry,
  Equipment,
  EquipmentType,
  Technician,
  Location,
  CorrectiveReport,
  StructuredReportData,
  StructuredCorrectiveEntry,
} from '../types';
import { getOperationalShiftForCorrective } from '../utils/technicianSchedule';
import { formatIndonesianDate, formatTimeShort, formatTimeRange } from '../utils/timeFormat';

export function formatDateIndonesian(dateString: string): string {
  return formatIndonesianDate(dateString, { includeDayName: true });
}

export function buildStructuredReportData(
  session: PreventiveSession,
  entries: PreventiveEntry[],
  equipments: Equipment[],
  equipmentTypes: EquipmentType[],
  technicians: Technician[],
  correctiveReports: CorrectiveReport[] = [],
  locations: Location[] = []
): StructuredReportData {
  const techNames = session.technician_ids
    .map((id) => technicians.find((t) => t.id === id)?.name)
    .filter(Boolean) as string[];

  // Find min & max submit times or fallback to session start/end
  const submitTimes = entries.map((e) => e.submitted_at).sort();
  const startTime = submitTimes.length > 0 ? submitTimes[0] : session.started_at;
  const endTime =
    submitTimes.length > 0 ? submitTimes[submitTimes.length - 1] : session.ended_at;

  // Group entries by Equipment Type Priority (1: XRAY, 2: WTMD, 3: HHMD, 4: ETD)
  const sortedTypes = [...equipmentTypes].sort((a, b) => a.priority - b.priority);

  const linesByType: StructuredReportData['lines_by_type'] = [];
  const entriesByType: StructuredReportData['entries_by_type'] = [];

  for (const type of sortedTypes) {
    // Find all entries of this equipment type
    const typeEntries = entries
      .filter((e) => {
        const eq = equipments.find((eqItem) => eqItem.id === e.equipment_id);
        return eq?.equipment_type_id === type.id;
      })
      .sort((a, b) => a.sequence - b.sequence); // ORDER BY sequence chronological

    if (typeEntries.length === 0) continue;

    const eqNames = typeEntries
      .map((e) => equipments.find((eqItem) => eqItem.id === e.equipment_id)?.name)
      .filter(Boolean) as string[];

    linesByType.push({
      type_code: type.code,
      type_name: type.name,
      equipment_names: eqNames,
    });

    entriesByType.push({
      type_code: type.code,
      type_name: type.name,
      priority: type.priority,
      entries: typeEntries.map((e) => {
        const eq = equipments.find((eqItem) => eqItem.id === e.equipment_id);
        return {
          equipment_id: e.equipment_id,
          equipment_name: eq?.name || 'Equipment',
          location_name: eq?.name || '',
          view_type: e.view_type || eq?.default_view || 'single',
          measurements: e.measurements || [],
          notes: e.notes || 'Sudah dilakukan pembersihan dan bisa digunakan dengan normal.',
          submitted_at: e.submitted_at,
          sequence: e.sequence,
          evidences: e.evidences || [],
          checklist_frequency_id: e.checklist_frequency_id,
        };
      }),
    });
  }

  // Filter corrective reports for this operational shift
  const filteredCorrectives = (correctiveReports || []).filter((report) => {
    const shiftInfo = getOperationalShiftForCorrective(report);
    return (
      shiftInfo.operationalDate === session.operational_date &&
      shiftInfo.shift === session.shift
    );
  });

  // Sort ascending chronologically by actual datetime of start_time within shift window
  filteredCorrectives.sort((a, b) => {
    const getTimestamp = (r: CorrectiveReport) => {
      const d = r.corrective_date || session.operational_date;
      const t = (r.start_time || '00:00').replace('.', ':');
      const parts = t.split(':');
      const hh = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
      const mm = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
      const ts = new Date(`${d}T${hh}:${mm}:00+07:00`).getTime();
      return isNaN(ts) ? 0 : ts;
    };
    return getTimestamp(a) - getTimestamp(b);
  });

  const correctiveEntries: StructuredCorrectiveEntry[] = filteredCorrectives.map((report) => {
    const eq = equipments.find((e) => e.id === report.equipment_id);
    const eqType = equipmentTypes.find((t) => t.id === eq?.equipment_type_id);
    const loc = locations.find((l) => l.id === (report.location_id || eq?.location_id));

    const sTime = formatTimeShort(report.start_time, false);
    const eTime = formatTimeShort(report.end_time, false);
    const timeRange = formatTimeRange(report.start_time, report.end_time);

    return {
      id: report.id,
      corrective_code: report.corrective_code,
      equipment_name: eq?.name || 'Equipment',
      type_code: eqType?.code || 'XRAY',
      location_name: loc?.name || eq?.name || '',
      problem_description: report.problem_description,
      action_taken: report.action_taken,
      result: report.result,
      result_text: report.result_text,
      start_time: sTime,
      end_time: eTime || sTime,
      time_range: timeRange,
      notes: report.notes || '-',
      technicians: report.technicians || [report.created_by],
      evidences: report.evidences || [],
    };
  });

  return {
    operational_date: formatDateIndonesian(session.operational_date),
    shift: session.shift,
    start_time: formatTimeShort(startTime, false),
    end_time: formatTimeShort(endTime, false),
    technicians: techNames.length > 0 ? techNames : session.technician_names,
    lines_by_type: linesByType,
    entries_by_type: entriesByType,
    corrective_entries: correctiveEntries,
  };
}

function cleanLocationName(rawName: string, typeCode: string): string {
  let name = rawName.trim();
  const regex = new RegExp(`^${typeCode}\\s*`, 'i');
  name = name.replace(regex, '').trim();

  if (name === name.toUpperCase()) {
    name = name
      .toLowerCase()
      .split(' ')
      .map((word) => {
        if (['vip', 'vvip', 'cip', 'bhs', 'hbscp', 'mscp', 'etd', 'wtmd', 'hhmd', 'xray'].includes(word)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
  return name;
}

export function generateWhatsAppReportText(data: StructuredReportData, targetFrequencyId?: number): string {
  // Map of interval names
  const INTERVAL_NAMES: Record<number, string> = {
    1: 'HARIAN',
    2: 'MINGGUAN',
    3: 'BULANAN',
    4: 'TRIWULAN',
    5: 'SEMESTERAN',
    6: 'TAHUNAN'
  };

  // Extract all entries across all types
  const allEntries = data.entries_by_type.flatMap((g) => g.entries);
  
  // Find which intervals were actually submitted
  const submittedFrequencyIds = Array.from(
    new Set(allEntries.map((e) => e.checklist_frequency_id).filter(Boolean) as number[])
  ).sort((a, b) => a - b);

  // If a targetFrequencyId is provided, only generate text for that specific interval
  const activeFrequencies = targetFrequencyId !== undefined
    ? [targetFrequencyId]
    : (submittedFrequencyIds.length > 0 ? submittedFrequencyIds : [1]);

  let text = `*LAPORAN PREVENTIVE MAINTENANCE*\n\n`;
  text += `Hari / Tanggal : ${data.operational_date} (${data.shift})\n`;
  text += `Jam : ${formatTimeRange(data.start_time, data.end_time)}\n\n`;

  text += `Teknisi :\n`;
  for (const tech of data.technicians) {
    text += `⦁ *${tech}*\n`;
  }
  text += `\n`;

  // Loop through each submitted interval
  activeFrequencies.forEach((freqId) => {
    const freqName = INTERVAL_NAMES[freqId] || 'PENGUJIAN';
    
    text += `===================================\n`;
    text += `*=== PREVENTIVE ${freqName} ===*\n`;
    text += `===================================\n\n`;

    // 1. Line lists for this interval
    let hasLineList = false;
    data.entries_by_type.forEach((group) => {
      // Filter entries for this type in this specific frequency/interval
      const filteredEntries = group.entries.filter((e) => e.checklist_frequency_id === freqId);
      if (filteredEntries.length === 0) return;

      hasLineList = true;
      text += `Berikut Lokasi Line ${group.type_code}:\n`;
      filteredEntries.forEach((item) => {
        text += `• ${item.equipment_name}\n`;
      });
      text += `\n`;
    });

    if (!hasLineList) {
      text += `Tidak ada pemeriksaan untuk interval ini.\n\n`;
      return;
    }

    // 2. Notes / Details for this interval
    text += `Notes :\n`;

    // Filter type groups that have entries in this frequency
    const activeGroups = data.entries_by_type
      .map((group) => ({
        ...group,
        entries: group.entries.filter((e) => e.checklist_frequency_id === freqId),
      }))
      .filter((group) => group.entries.length > 0);

    const totalGroups = activeGroups.length;

    activeGroups.forEach((group, groupIdx) => {
      if (group.type_code === 'XRAY') {
        group.entries.forEach((item, itemIdx) => {
          const isHarianExclusion = freqId === 1 && (item.equipment_id === 2 || item.equipment_id === 3 || item.equipment_id === 9);

          if (isHarianExclusion) {
            const formattedName = `XRAY ${item.equipment_name.toUpperCase()}`;
            text += `⦁ *${formattedName}*\n`;
            text += `## Sudah dilakukan pengecekan dan pembersihan. Equipment bisa digunakan dengan normal.\n`;
          } else {
            text += `⦁ *${item.equipment_name}*\n`;
            text += `Hasil pengecekan\n`;

            if (item.measurements && item.measurements.length > 0) {
              text += `*Positive high voltage & Negative high Voltage*\n`;
              item.measurements.forEach((m) => {
                const pos = m.positive_high_voltage !== undefined ? `${m.positive_high_voltage}kV` : '-';
                const neg = m.negative_high_voltage !== undefined ? `${m.negative_high_voltage}kV` : '-';
                text += `(Gen ${m.generator} ${pos} & ${neg})\n`;
              });

              text += `1. *Heater current*\n`;
              const heaterParts = item.measurements.map((m) => {
                const h = m.heater_current !== undefined ? `${m.heater_current}mA` : '-';
                return `(Gen ${m.generator}: ${h})`;
              });
              text += `${heaterParts.join(' ')}\n`;

              text += `2. *Anode Current*\n`;
              const anodeParts = item.measurements.map((m) => {
                const a = m.anode_current !== undefined ? `${m.anode_current}uA` : '-';
                return `(Gen ${m.generator}: ${a})`;
              });
              text += `${anodeParts.join(' ')}\n`;
            }

            text += `${item.notes}\n`;
          }

          if (groupIdx < totalGroups - 1 || itemIdx < group.entries.length - 1) {
            text += `_______________________________________\n`;
          }
        });
      } else {
        // Non-XRAY equipment (WTMD, HHMD, ETD)
        const firstNote = group.entries[0]?.notes;
        const allSameNote = group.entries.every((e) => e.notes === firstNote);

        if (allSameNote && group.entries.length > 1) {
          const cleanedNames = group.entries.map((e) => cleanLocationName(e.equipment_name, group.type_code));
          let joinedNames = '';
          if (cleanedNames.length === 2) {
            joinedNames = cleanedNames.join(' dan ');
          } else {
            joinedNames = cleanedNames.slice(0, -1).join(', ') + ' dan ' + cleanedNames[cleanedNames.length - 1];
          }

          text += `⦁ *${group.type_code} ${joinedNames}*\n`;
          text += `${firstNote}\n`;
        } else {
          group.entries.forEach((item, itemIdx) => {
            const cleaned = cleanLocationName(item.equipment_name, group.type_code);
            text += `⦁ *${group.type_code} ${cleaned}*\n`;
            text += `${item.notes}\n`;

            if (itemIdx < group.entries.length - 1) {
              text += `_______________________________________\n`;
            }
          });
        }

        if (groupIdx < totalGroups - 1) {
          text += `_______________________________________\n`;
        }
      }
    });

    text += `\n`;
  });

  return text.trim();
}

export function generateCorrectiveWhatsAppReportText(data: StructuredReportData): string {
  let text = `*LAPORAN CORRECTIVE MAINTENANCE*\n\n`;
  text += `Hari / Tanggal : ${data.operational_date} (${data.shift})\n`;
  text += `Jam : ${formatTimeRange(data.start_time, data.end_time)}\n\n`;

  text += `Teknisi :\n`;
  for (const tech of data.technicians) {
    text += `⦁ *${tech}*\n`;
  }
  text += `\n`;

  text += `===================================\n`;
  text += `*=== CORRECTIVE MAINTENANCE ===*\n`;
  text += `===================================\n\n`;
  
  if (data.corrective_entries && data.corrective_entries.length > 0) {
    data.corrective_entries.forEach((c, idx) => {
      text += `⦁ *[${c.type_code}] ${c.equipment_name}*\n`;
      text += `Waktu: ${c.time_range}\n`;
      text += `Kendala: ${c.problem_description}\n`;
      text += `Tindakan: ${c.action_taken}\n`;
      text += `Hasil: ${c.result_text || c.result}\n`;
      if (idx < data.corrective_entries.length - 1) {
        text += `_______________________________________\n`;
      }
    });
  } else {
    text += `Tidak ada kendala corrective.\n`;
  }

  return text.trim();
}
