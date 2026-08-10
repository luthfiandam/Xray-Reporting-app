import { PreventiveEntry, CorrectiveReport } from '../types';

export interface GasApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PhotoUploadResult {
  file_id: string;
  file_name: string;
  drive_url: string;
  download_url?: string;
}

/**
 * Returns the configured Google Apps Script Web App URL from Vite environment variables.
 */
export function getGasApiUrl(): string {
  const metaEnv = (import.meta as Record<string, any>).env;
  const url = metaEnv ? metaEnv.VITE_GAS_API_URL : '';
  return typeof url === 'string' ? url.trim() : '';
}

/**
 * Checks whether the Google Apps Script integration is configured.
 */
export function isCloudConfigured(): boolean {
  return Boolean(getGasApiUrl());
}

/**
 * Helper function to call the Google Apps Script Web App API using POST.
 * Uses text/plain header to avoid CORS preflight issues in Google Apps Script.
 */
async function callGasApi<T>(payload: Record<string, any>): Promise<GasApiResponse<T>> {
  const url = getGasApiUrl();
  if (!url) {
    return {
      success: false,
      message: 'VITE_GAS_API_URL belum dikonfigurasi. Aplikasi berjalan dalam mode lokal/offline.',
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Server merespons dengan status ${response.status}`);
    }

    const result: GasApiResponse<T> = await response.json();
    return result;
  } catch (err: any) {
    console.warn('Panggilan API Google Apps Script gagal:', err);
    return {
      success: false,
      message: err?.message || 'Gagal terhubung ke Google Apps Script backend.',
    };
  }
}

/**
 * Health check endpoint for Google Apps Script Web App.
 */
export async function checkHealth(): Promise<GasApiResponse> {
  return callGasApi({ action: 'healthCheck' });
}

/**
 * Fetches Preventive Records from Google Sheets.
 * Optionally filtered by operational date and shift.
 */
export async function fetchPreventiveRecords(
  operationalDate?: string,
  shift?: string
): Promise<GasApiResponse<PreventiveEntry[]>> {
  return callGasApi<PreventiveEntry[]>({
    action: 'getPreventiveRecords',
    operationalDate,
    shift,
  });
}

/**
 * Saves or updates a Preventive Record in Google Sheets and uploads photo evidences to Google Drive.
 */
export async function savePreventiveRecord(
  record: PreventiveEntry
): Promise<GasApiResponse<PreventiveEntry>> {
  return callGasApi<PreventiveEntry>({
    action: 'savePreventiveRecord',
    record,
  });
}

/**
 * Fetches Corrective Records from Google Sheets.
 * Optionally filtered by operational date and shift.
 */
export async function fetchCorrectiveRecords(
  operationalDate?: string,
  shift?: string
): Promise<GasApiResponse<CorrectiveReport[]>> {
  return callGasApi<CorrectiveReport[]>({
    action: 'getCorrectiveRecords',
    operationalDate,
    shift,
  });
}

/**
 * Saves or updates a Corrective Record in Google Sheets and uploads photo evidences to Google Drive.
 */
export async function saveCorrectiveRecord(
  record: CorrectiveReport
): Promise<GasApiResponse<CorrectiveReport>> {
  return callGasApi<CorrectiveReport>({
    action: 'saveCorrectiveRecord',
    record,
  });
}

/**
 * Uploads a single photo to Google Drive via Google Apps Script.
 */
export async function uploadPhotoToDrive(
  base64Data: string,
  folderPath?: string,
  fileName?: string,
  photoType?: string
): Promise<GasApiResponse<PhotoUploadResult>> {
  return callGasApi<PhotoUploadResult>({
    action: 'uploadPhoto',
    base64Data,
    folderPath,
    fileName,
    photoType,
  });
}
