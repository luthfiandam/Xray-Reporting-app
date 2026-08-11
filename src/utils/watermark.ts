import { formatIndonesianDate, formatTimeShort } from './timeFormat';

export interface WatermarkOptions {
  equipmentName?: string;
  locationName?: string;
  equipmentType?: string;
  operationalDate?: string; // "2026-08-10"
  time?: string;            // "21:30" or "21.30"
  shift?: string;           // "Pagi" / "Malam"
  reportType?: 'PREVENTIVE' | 'CORRECTIVE';
}

/**
 * Sanitizes a string for safe file name / folder name generation
 */
export function sanitizeFileNamePart(str?: string): string {
  if (!str) return '';
  return str
    .replace(/[\\/:*?"<>|#%&{}]/g, '') // remove forbidden filename chars
    .replace(/\s+/g, ' ')               // normalize whitespace
    .trim();
}

/**
 * Generates standardized filename based on prompt rule:
 * "Lokasi Equipment_JJMM_TTGGBBYY"
 * Example: "Xray HBSCP LINE E_2130_050526" or "SCP LINE E_2130_100826.jpg"
 */
export function generateDriveFileName(
  locationOrEquipment: string,
  timeStr?: string, // e.g. "21:30" or "21.30"
  dateStr?: string, // e.g. "2026-08-10"
  index?: number
): string {
  const sanitizedLabel = sanitizeFileNamePart(locationOrEquipment) || 'Equipment';

  // Format JJMM (HHmm)
  let hhmm = '';
  if (timeStr) {
    const digits = timeStr.replace(/\D/g, '');
    if (digits.length >= 4) {
      hhmm = digits.substring(0, 4);
    } else if (digits.length === 2) {
      hhmm = digits + '00';
    }
  }
  if (!hhmm) {
    const now = new Date();
    hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  }

  // Format TTGGBBYY (DDMMYY)
  let ddmmyy = '';
  if (dateStr) {
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const yearStr = match[1].substring(2); // e.g. "26"
      const monthStr = match[2];              // e.g. "08"
      const dayStr = match[3];                // e.g. "10"
      ddmmyy = `${dayStr}${monthStr}${yearStr}`;
    }
  }
  if (!ddmmyy) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).substring(2);
    ddmmyy = `${dd}${mm}${yy}`;
  }

  const suffix = typeof index === 'number' ? `_${index + 1}` : '';
  return `${sanitizedLabel}_${hhmm}_${ddmmyy}${suffix}.jpg`;
}

/**
 * Builds Google Drive structured folder path per specifications:
 *
 * XRAY REPORTING APP/
 * └── 2. Foto Laporan/
 *     ├── 1. Foto Laporan Harian/
 *     ├── 1.1 Foto Laporan Corrective/
 *     ├── 2. Foto Laporan Mingguan/
 *     ├── 3. Foto Laporan Bulanan/
 *     ├── 4. Foto Laporan Triwulan/
 *     ├── 5. Foto Laporan Semesteran/
 *     └── 6. Foto Laporan Tahunan/
 */
export function buildDriveFolderPath(options: {
  reportType: 'PREVENTIVE' | 'CORRECTIVE';
  frequencyName?: string;  // "Harian", "Mingguan", "Bulanan", "Triwulan", "Semesteran", "Tahunan"
  operationalDate?: string; // "2026-08-10"
  shift?: string;           // "Pagi" / "Malam"
  equipmentType?: string;   // "XRAY" / "WTMD" / "HHMD" / "ETD"
  locationName?: string;    // "SCP LINE E"
  equipmentName?: string;   // "X-RAY HEIMANN"
}): string {
  const root = 'XRAY REPORTING APP/2. Foto Laporan';

  let categoryFolder = '1. Foto Laporan Harian';
  if (options.reportType === 'CORRECTIVE') {
    categoryFolder = '1.1 Foto Laporan Corrective';
  } else if (options.reportType === 'PREVENTIVE') {
    const freq = (options.frequencyName || 'Harian').toLowerCase();
    if (freq.includes('minggu')) categoryFolder = '2. Foto Laporan Mingguan';
    else if (freq.includes('bulan')) categoryFolder = '3. Foto Laporan Bulanan';
    else if (freq.includes('triwulan')) categoryFolder = '4. Foto Laporan Triwulan';
    else if (freq.includes('semester')) categoryFolder = '5. Foto Laporan Semesteran';
    else if (freq.includes('tahun')) categoryFolder = '6. Foto Laporan Tahunan';
    else categoryFolder = '1. Foto Laporan Harian';
  }

  let dateObj = new Date();
  if (options.operationalDate) {
    const parts = options.operationalDate.split('T')[0].split('-');
    if (parts.length === 3) {
      dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  }

  const yyyy = dateObj.getFullYear();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const mmNum = String(dateObj.getMonth() + 1).padStart(2, '0');
  const monthName = monthNames[dateObj.getMonth()];
  const ddNum = String(dateObj.getDate()).padStart(2, '0');

  const mmFolder = `${mmNum}. ${monthName} ${yyyy}`;
  const ddFolder = `${ddNum} ${monthName}`;
  const shiftFolder = options.shift || 'Pagi';

  const eqType = sanitizeFileNamePart(options.equipmentType || 'EQUIPMENT');
  const eqLoc = sanitizeFileNamePart(options.locationName || options.equipmentName || 'LOCATION');
  const eqLocFolder = `${eqType} - ${eqLoc}`;

  return `${root}/${categoryFolder}/${yyyy}/${mmFolder}/${ddFolder}/${shiftFolder}/${eqLocFolder}`;
}

/**
 * Applies a neat, clear watermark directly onto an image using HTML Canvas.
 * Stamped cleanly at the bottom of the image with a subtle dark backdrop.
 */
export async function applyWatermark(
  input: File | string,
  options: WatermarkOptions,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const process = () => {
      let width = img.width;
      let height = img.height;

      if (!width || !height) {
        if (typeof input === 'string') resolve(input);
        else resolve('');
        return;
      }

      // Scale proportionally if width or height exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        if (typeof input === 'string') resolve(input);
        else resolve('');
        return;
      }

      // Draw Base Image
      ctx.drawImage(img, 0, 0, width, height);

      // Watermark Overlay Geometry
      const bannerHeight = Math.max(Math.round(height * 0.085), 52);
      const bannerY = height - bannerHeight;

      // Dark translucent bar
      const gradient = ctx.createLinearGradient(0, bannerY, 0, height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.78)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.94)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, bannerY, width, bannerHeight);

      // Accent border line at top of watermark bar
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, bannerY, width, Math.max(Math.round(bannerHeight * 0.05), 3));

      // Text Specs
      const primaryFontSize = Math.max(Math.round(bannerHeight * 0.32), 14);
      const secondaryFontSize = Math.max(Math.round(bannerHeight * 0.25), 11);
      const paddingX = Math.max(Math.round(width * 0.03), 16);

      // Primary Line: Equipment & Location
      const eqLabel = options.equipmentName || 'Equipment';
      const locLabel = options.locationName ? ` • ${options.locationName}` : '';
      const typeLabel = options.reportType ? ` [${options.reportType}]` : '';
      const line1Text = `${eqLabel}${locLabel}${typeLabel}`;

      // Secondary Line: Date, Time & Shift
      const dateText = options.operationalDate
        ? formatIndonesianDate(options.operationalDate)
        : formatIndonesianDate(new Date().toISOString().split('T')[0]);
      const timeText = options.time ? formatTimeShort(options.time) : formatTimeShort(new Date().toLocaleTimeString('id-ID'));
      const shiftText = options.shift ? ` • Shift ${options.shift}` : '';
      const line2Text = `${dateText} • ${timeText}${shiftText}`;

      // Draw Line 1
      ctx.font = `bold ${primaryFontSize}px "Plus Jakarta Sans", sans-serif, Arial`;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(line1Text, paddingX, bannerY + bannerHeight * 0.42);

      // Draw Line 2
      ctx.font = `600 ${secondaryFontSize}px "Plus Jakarta Sans", sans-serif, Arial`;
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(line2Text, paddingX, bannerY + bannerHeight * 0.78);

      // Top-Right Watermark Brand Stamp
      const brandFontSize = Math.max(Math.round(bannerHeight * 0.22), 10);
      ctx.font = `700 ${brandFontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const brandText = 'NTI MAINTENANCE';
      const brandMetrics = ctx.measureText(brandText);
      ctx.fillText(brandText, width - brandMetrics.width - paddingX, bannerY + bannerHeight * 0.45);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      // Memory cleanup
      canvas.width = 0;
      canvas.height = 0;

      resolve(dataUrl);
    };

    img.onload = () => {
      process();
    };

    img.onerror = (err) => {
      console.warn('Watermark overlay error, falling back:', err);
      if (typeof input === 'string') resolve(input);
      else reject(err);
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Failed to read file for watermark'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(input);
    }
  });
}
