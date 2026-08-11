import { PreventiveEntry, CorrectiveReport, CloudDataset } from '../types';

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

export interface PdfUploadResult {
  file_id: string;
  file_name: string;
  drive_url: string;
  download_url?: string;
  updated_at?: string;
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
 * Fetches available Datasets/Workspaces from Google Sheets.
 */
export async function fetchDatasets(): Promise<GasApiResponse<CloudDataset[]>> {
  return callGasApi<CloudDataset[]>({
    action: 'getDatasets',
  });
}

/**
 * Fetches Preventive Records from Google Sheets.
 * Optionally filtered by operational date, shift, and datasetId.
 */
export async function fetchPreventiveRecords(
  operationalDate?: string,
  shift?: string,
  datasetId?: string
): Promise<GasApiResponse<PreventiveEntry[]>> {
  return callGasApi<PreventiveEntry[]>({
    action: 'getPreventiveRecords',
    operationalDate,
    shift,
    datasetId,
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
 * Optionally filtered by operational date, shift, and datasetId.
 */
export async function fetchCorrectiveRecords(
  operationalDate?: string,
  shift?: string,
  datasetId?: string
): Promise<GasApiResponse<CorrectiveReport[]>> {
  return callGasApi<CorrectiveReport[]>({
    action: 'getCorrectiveRecords',
    operationalDate,
    shift,
    datasetId,
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

/**
 * Converts a Blob to base64 Data URL string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads or archives an exported PDF to Google Drive via Google Apps Script.
 */
export async function uploadPdfToDrive(
  blob: Blob,
  folderPath: string,
  fileName: string,
  metadata?: Record<string, any>
): Promise<GasApiResponse<PdfUploadResult>> {
  try {
    const base64Data = await blobToBase64(blob);
    return callGasApi<PdfUploadResult>({
      action: 'uploadPdf',
      base64Data,
      folderPath,
      fileName,
      metadata,
    });
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal mengubah PDF ke format base64.',
    };
  }
}
