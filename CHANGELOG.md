# CHANGELOG

All notable changes to the **System Maintenance & Inspection Reporting — PT Nararya Teknologi Indonesia** will be documented in this file.

---

## [0.5.0] - 2026-08-10

### Added
- **Google Sheets & Google Drive Cloud Persistence Integration**:
  - Full cloud synchronization layer via Google Apps Script (GAS) Web App backend (`google-apps-script/Code.gs`).
  - Dedicated cloud service module (`src/services/cloudService.ts`) for health check, record fetching, record upserting, and Drive photo uploads.
  - Configurable endpoint environment variable `VITE_GAS_API_URL` without hardcoding server URLs.
- **Strict Tuple Upsert for Preventive Records**:
  - Preventive entries are uniquely upserted in Google Sheets based on: `(equipment_id, checklist_frequency_id, period_key, shift)`.
  - Editing an existing preventive report updates the cloud row in place without creating duplicate records.
- **Corrective Cloud Sync**:
  - Corrective maintenance logs are uniquely matched by `id` / `corrective_code` in Google Sheets (`Corrective_Records` tab).
- **Automated Google Drive Photo Organization**:
  - Field photos are automatically uploaded to Google Drive under folder hierarchy: `X-Ray Reporting App / YYYY / MM / YYYY-MM-DD / Preventive` (or `Corrective`).
  - Google Drive URLs and photo metadata are saved in Google Sheets instead of storing heavy base64 strings permanently.
  - Photos already hosted on Drive are preserved during edits to prevent duplicate file uploads.
- **Cross-Device Sync & Fallback Offline Storage**:
  - `localStorage` is preserved as a local cache and fallback mechanism, ensuring the app remains fully usable when offline or if Apps Script is temporarily unreachable.
  - Automatic background sync on startup and session shift/date changes merges records submitted from different devices (e.g., HP A and HP B) using `updated_at` conflict resolution.
- **Non-Blocking Cloud Sync Status Badge**:
  - Added visual sync indicator badge (`Tersimpan (Cloud)`, `Sinkronisasi...`, `Belum tersinkron (Lokal)`) in the Sidebar and session header with a 1-click manual sync trigger.

---

## [0.3.5] - 2026-08-10

### Added
- **Mobile Rear Camera Direct Capture (`capture="environment"`)**:
  - Directs mobile device browsers (Android & iOS) to trigger the rear/back camera by default when technicians tap documentation photo upload buttons in the field.
  - Added `capture="environment"` and standardized `accept="image/*"` across all operational documentation file inputs.

### Quickfix Details
- **Affected File Upload Inputs**:
  1. **Foto Report** (`PreventiveView.tsx`): Documentation photo for general preventive reports.
  2. **Foto Pembersihan / Bebersih** (`PreventiveView.tsx`): Equipment cleaning documentation photos.
  3. **Foto Pengukuran & Sinyal Generator** (`PreventiveView.tsx`): Voltage parameters & Generator A/B signal waveform photos.
  4. **Dokumen Sederhana / Simple Docs** (`PreventiveView.tsx`): Multi-photo uploads for simple maintenance documentation (max 7 photos).
  5. **Foto Corrective Maintenance** (`CorrectiveView.tsx`): Repair and troubleshooting documentation photos.
- **Preserved System Behaviors**:
  - Image compression & quality optimization remain intact.
  - Square photo collage generation (1200x1200px) with automatic date/time watermark.
  - Photo preview galleries and max image upload limits per field.
  - Existing PDF vector rendering pipeline and WhatsApp report formatters.

---

## [0.3.4] - 2026-08-09

### Added
- **Multi-Interval WhatsApp Report Split**:
  - Separated WhatsApp summary report generation by checklist frequency (Harian, Mingguan, Bulanan, Triwulan, Semesteran, Tahunan).
- **Dedicated Corrective WhatsApp Report**:
  - Implemented `generateCorrectiveWhatsAppReportText` in `reportService.ts` to generate standalone WhatsApp summaries for corrective maintenance logs.
- **Period Key Utilities (`src/utils/periodUtils.ts`)**:
  - Added `getPeriodKey` utility function to compute standardized period identifiers (`YYYY-MM-DD`, `YYYY-Wweek`, `YYYY-MM`, `YYYY-Qq`, `YYYY-Ss`, `YYYY`) for precise filtering across operational dates and frequencies.

### Changed
- Filtered preventive entry checks, dashboard statistics, and equipment status badges by shift, operational date, and period key.

---

## [0.3.3] - 2026-08-08

### Fixed
- **Multi-Page A4 PDF Header Consistency**:
  - Ensured repeating company header block, operational date, shift, dynamic 2-column technician grid, and table header row appear cleanly on every page of multi-page PDF reports.
- **Row-Based Border Model**:
  - Removed outer table wrapper border stretching across page breaks, eliminating fragmented border lines in Puppeteer PDF output.

---

## [0.3.2] - 2026-08-07

### Added
- **Pure Vector PDF Engine (`/api/generate-pdf`)**:
  - Replaced legacy canvas raster engine (`html2canvas`) with a high-resolution server-side Puppeteer Chromium PDF rendering backend.
  - Standardized A4 portrait page layout with 15mm margins, 0.5pt table borders, and Times New Roman typography.
- **Standardized Filename Format**:
  - Automatic report naming convention: `DD NamaBulan YYYY (KODE_SHIFT).pdf` (e.g., `06 Agustus 2026 (M).pdf` or `07 Agustus 2026 (PS).pdf`).
- **Web Share API Integration**:
  - Enabled direct mobile PDF sharing via native system dialogs (WhatsApp, Gmail, Drive, Telegram) with automatic fallback to browser download.

---

## [0.3.1] - 2026-08-05

### Added
- **Automated Square Photo Collage Generator (`collageService.ts`)**:
  - Merges up to 9+ field photos into a 1200x1200px square grid complete with timestamp & location watermarks.
- **XRAY Generator Parameter Measurements**:
  - High Voltage (kV), Heater Current (mA), and Anode Current (uA) measurement inputs for dual/single view XRAY inspection systems.

---

## [0.2.0] - 2026-08-03

### Added
- **Shift & Technician On Duty Modal (`ShiftModal.tsx`)**:
  - Interactive shift selection (PAGI / MALAM) and multi-technician duty assignment.
- **Role-Based Access Control**:
  - Technician Mode for quick field reporting.
  - Supervisor Mode with password authentication modal (`SupervisorLoginModal.tsx`).

---

## [0.1.0] - 2026-08-01

### Added
- Initial release of System Maintenance & Inspection Reporting for PT Nararya Teknologi Indonesia.
- Core modules:
  - Dashboard View (Equipment health & completion stats)
  - Preventive Maintenance Form (Checklist items & notes)
  - Corrective Maintenance Log (Issue tracking & action logs)
  - Report Generator (WhatsApp summary & PDF preview)
  - Master Data Management (Equipment, Locations, Checklist items)
