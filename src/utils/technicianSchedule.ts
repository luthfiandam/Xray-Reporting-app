import { Technician, ShiftType, CorrectiveReport } from '../types';

export interface OperationalShiftInfo {
  shift: ShiftType;
  shiftCode: 'PS' | 'M';
  operationalDate: string; // YYYY-MM-DD
  startDateTime: Date;
  endDateTime: Date;
}

/**
  * Centralized Operational Shift Resolver for Asia/Jakarta (WIB) timezone.
  *
  * Business Rules:
  * - 07:00:00 to 18:59:59 WIB -> Shift Pagi (PS), operationalDate = current calendar date
  * - 19:00:00 to 23:59:59 WIB -> Shift Malam (M), operationalDate = current calendar date
  * - 00:00:00 to 06:59:59 WIB -> Shift Malam (M), operationalDate = PREVIOUS calendar date (yesterday)
  */
export function getOperationalShift(dateInput?: Date | string | number): OperationalShiftInfo {
  let now: Date;
  if (!dateInput) {
    now = new Date();
  } else if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed.length === 10 && trimmed.includes('-')) {
      // Date string "YYYY-MM-DD", default to noon WIB
      const isoStr = `${trimmed}T12:00:00+07:00`;
      now = new Date(isoStr);
    } else if (trimmed.includes(' ') || trimmed.includes('T')) {
      // Could be "YYYY-MM-DD HH:mm"
      const normalized = trimmed.replace(' ', 'T');
      if (!normalized.includes('+') && !normalized.includes('Z')) {
        now = new Date(`${normalized}+07:00`);
      } else {
        now = new Date(normalized);
      }
    } else {
      now = new Date(trimmed);
    }
  } else {
    now = new Date(dateInput);
  }

  if (isNaN(now.getTime())) {
    now = new Date();
  }

  // Format into Asia/Jakarta timezone components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => {
    if (p.type !== 'literal') {
      partMap[p.type] = p.value;
    }
  });

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10); // 1-12
  const day = parseInt(partMap.day, 10); // 1-31
  const hour = parseInt(partMap.hour, 10); // 0-23
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);

  let shift: ShiftType = 'Pagi';
  let shiftCode: 'PS' | 'M' = 'PS';

  let opYear = year;
  let opMonth = month;
  let opDay = day;

  if (hour >= 7 && hour < 19) {
    // 07:00:00 - 18:59:59 -> Shift Pagi (PS)
    shift = 'Pagi';
    shiftCode = 'PS';
  } else if (hour >= 19) {
    // 19:00:00 - 23:59:59 -> Shift Malam (M)
    shift = 'Malam';
    shiftCode = 'M';
  } else {
    // 00:00:00 - 06:59:59 -> Shift Malam (M), PREVIOUS calendar date
    shift = 'Malam';
    shiftCode = 'M';

    // Subtract 1 day from Jakarta date
    const prevDate = new Date(Date.UTC(year, month - 1, day - 1));
    opYear = prevDate.getUTCFullYear();
    opMonth = prevDate.getUTCMonth() + 1;
    opDay = prevDate.getUTCDate();
  }

  const pad = (num: number) => String(num).padStart(2, '0');
  const operationalDate = `${opYear}-${pad(opMonth)}-${pad(opDay)}`;

  // Start and End UTC timestamps for this operational shift window
  let startUtc: Date;
  let endUtc: Date;

  if (shift === 'Pagi') {
    // Start: opDate 07:00:00 WIB = opDate 00:00:00 UTC
    startUtc = new Date(Date.UTC(opYear, opMonth - 1, opDay, 0, 0, 0));
    // End: opDate 18:59:59.999 WIB = opDate 11:59:59.999 UTC
    endUtc = new Date(Date.UTC(opYear, opMonth - 1, opDay, 11, 59, 59, 999));
  } else {
    // Shift Malam:
    // Start: opDate 19:00:00 WIB = opDate 12:00:00 UTC
    startUtc = new Date(Date.UTC(opYear, opMonth - 1, opDay, 12, 0, 0));
    // End: (opDate + 1 day) 06:59:59.999 WIB = (opDate + 1 day) 23:59:59.999 UTC
    const nextDayUtc = new Date(Date.UTC(opYear, opMonth - 1, opDay + 1));
    endUtc = new Date(
      Date.UTC(
        nextDayUtc.getUTCFullYear(),
        nextDayUtc.getUTCMonth(),
        nextDayUtc.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );
  }

  return {
    shift,
    shiftCode,
    operationalDate,
    startDateTime: startUtc,
    endDateTime: endUtc,
  };
}

/**
 * Helper to get local date string YYYY-MM-DD for Asia/Jakarta timezone.
 */
export function getLocalDateString(dateInput: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateInput);
}

/**
  * Resolves the operational shift for a CorrectiveReport based on its date & start_time.
  */
export function getOperationalShiftForCorrective(report: CorrectiveReport): OperationalShiftInfo {
  let dateStr = report.corrective_date; // "YYYY-MM-DD"
  let timeStr = report.start_time;       // "HH:mm" or "HH.mm"

  if (!dateStr || !timeStr) {
    if (report.created_at && report.created_at.includes(' ')) {
      const [cDate, cTime] = report.created_at.trim().split(/\s+/);
      if (!dateStr && cDate && cDate.includes('-')) dateStr = cDate;
      if (!timeStr && cTime && (cTime.includes(':') || cTime.includes('.'))) timeStr = cTime;
    }
  }

  if (!dateStr) dateStr = getLocalDateString();
  if (!timeStr) timeStr = '00:00';

  timeStr = timeStr.replace('.', ':');
  const timeParts = timeStr.split(':');
  const hh = String(parseInt(timeParts[0] || '0', 10)).padStart(2, '0');
  const mm = String(parseInt(timeParts[1] || '0', 10)).padStart(2, '0');

  const isoStr = `${dateStr}T${hh}:${mm}:00+07:00`;
  const dt = new Date(isoStr);

  if (isNaN(dt.getTime())) {
    return getOperationalShift(dateStr);
  }

  return getOperationalShift(dt);
}

export function getDefaultTechniciansForShift(
  technicians: Technician[],
  shift: ShiftType,
  dateStr: string
): number[] {
  const parts = dateStr.split('-');
  let dateObj: Date;
  if (parts.length === 3) {
    dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    dateObj = new Date();
  }

  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isPagi = shift.toLowerCase() === 'pagi';

  const luthfi = technicians.find((t) => t.name.toLowerCase().includes('luthfi'));
  const zaky = technicians.find((t) => t.name.toLowerCase().includes('zaky'));

  const result: number[] = [];

  // Monday - Friday during PAGI shift -> Luthfi is ON DUTY (auto-checked)
  if (isWeekday && isPagi && luthfi) {
    result.push(luthfi.id);
  }

  // Add Zaky as default partner
  if (zaky && !result.includes(zaky.id)) {
    result.push(zaky.id);
  }

  // Fallback if empty
  if (result.length === 0) {
    const activeTechs = technicians.filter((t) => t.active);
    if (activeTechs.length > 0) {
      result.push(activeTechs[0].id);
    }
  }

  return result;
}

