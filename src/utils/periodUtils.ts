/**
 * Generates a standard period key for an operational date based on frequency ID.
 */
export function getPeriodKey(frequencyId: number, dateStr: string): string {
  if (!dateStr) return '';
  
  // Default values
  let year = 2026;
  let month = 7; // August (0-indexed)
  let day = 6;
  
  const matches = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matches) {
    year = parseInt(matches[1], 10);
    month = parseInt(matches[2], 10) - 1;
    day = parseInt(matches[3], 10);
  } else {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    } else {
      return dateStr; // fallback
    }
  }
  
  const dateObj = new Date(year, month, day);
  const monthStr = String(month + 1).padStart(2, '0');
  
  switch (frequencyId) {
    case 1: // Harian
      return `${year}-${monthStr}-${String(day).padStart(2, '0')}`; // e.g. '2026-08-06'
      
    case 2: { // Mingguan
      // Calculate week number of the year
      const firstJan = new Date(year, 0, 1);
      const timeDiff = dateObj.getTime() - firstJan.getTime();
      const dayOfYear = Math.floor(timeDiff / (24 * 60 * 60 * 1000)) + 1;
      const weekNum = Math.ceil((dayOfYear + firstJan.getDay()) / 7);
      return `${year}-W${String(weekNum).padStart(2, '0')}`;
    }
    
    case 3: // Bulanan
      return `${year}-${monthStr}`; // e.g. '2026-08'
      
    case 4: { // Triwulan
      const q = Math.ceil((month + 1) / 3);
      return `${year}-Q${q}`; // e.g. '2026-Q3'
    }
    
    case 5: { // Semesteran
      const s = month < 6 ? 1 : 2;
      return `${year}-S${s}`; // e.g. '2026-S2'
    }
    
    case 6: // Tahunan
      return String(year); // e.g. '2026'
      
    default:
      return dateStr;
  }
}
