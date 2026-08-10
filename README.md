# System Maintenance & Inspection Reporting — PT Nararya Teknologi Indonesia

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](CHANGELOG.md)
[![React](https://img.shields.io/badge/React-19.0.1-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.3-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.14-06b6d4.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000.svg)](https://expressjs.com/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-25.5.0-40b5a4.svg)](https://pptr.dev/)

Aplikasi web internal **PT Nararya Teknologi Indonesia** untuk pencatatan *Preventive Maintenance* harian, berkala, dan *Corrective Maintenance* peralatan keamanan penerbangan (X-Ray, WTMD, HHMD, ETD) di lokasi operasional bandara.

Aplikasi dirancang hybrid untuk kenyamanan penggunaan di **Desktop Dashboard** maupun **Mobile Web Interface** oleh teknisi lapangan.

---

## 🌟 Fitur Utama

### 1. Preventive Maintenance Reporting
- Checklist harian, mingguan, bulanan, triwulan, semesteran, dan tahunan.
- Input parameter generator X-Ray (High Voltage kV, Heater Current mA, Anode Current uA) untuk tampilan Single & Dual View.
- Otomatisasi pembuatan **Kolase Foto Dokumentasi 1200x1200px** dengan *watermark* tanggal dan waktu.

### 2. Mobile Rear Camera Integration (`v0.3.5`)
- Tombol penangkap foto dokumentasi langsung memicu **kamera belakang mobile** (`capture="environment"`) di perangkat Android dan iOS.
- Mendukung pengambilkan foto cepat di lapangan untuk:
  - Foto Report Laporan
  - Foto Hasil Pembersihan (Bebersih)
  - Foto Paramater & Sinyal Waveform Generator A/B
  - Foto Dokumentasi Sederhana / Multi-photo (hingga 7 foto)
  - Foto Log Corrective Maintenance

### 3. Corrective Maintenance Log
- Pencatatan insiden kerusakan, penanganan teknisi, serta status hasil perbaikan (*Resolved*, *Pending Sparepart*, *Temporary Fix*).
- Laporan WhatsApp khusus *Corrective Maintenance* terpisah.

### 4. Vector A4 PDF Generator & Export
- Backend **Express + Puppeteer Chromium** (`/api/generate-pdf`) menghasilkan dokumen PDF A4 vector murni beresolusi tinggi.
- Header resmi perusahaan dengan logo Nararya *Symbol-Only*, grid teknisi piket 2-kolom dinamis, dan footer penandatanganan otomatis di halaman terakhir.
- Penamaan file terstandar: `DD NamaBulan YYYY (KODE_SHIFT).pdf` (misal: `06 Agustus 2026 (M).pdf`).
- Dukungan **Web Share API** untuk langsung mengirimkan file PDF ke WhatsApp, Gmail, Drive, atau simpan ke penyimpanan lokal dari HP.

### 5. Structured WhatsApp Text Summary
- Format ringkasan teks WhatsApp terstruktur dengan pemisah per frekuensi (Harian, Mingguan, Bulanan, etc.) dan laporan *Corrective* terpisah.
- Tombol 1-klik *Copy Text* dan *Direct Open WhatsApp*.

### 6. Role & Shift Management
- **Mode Teknisi**: Akses cepat input pemeliharaan tanpa password.
- **Mode Supervisor**: Akses dilindungi modal PIN/password untuk pengelolaan data master.
- **Pilihan Shift Piket**: Pengaturan Shift PAGI (`PS`) & MALAM (`M`) serta daftar teknisi *On Duty*.

---

## 🛠️ Tech Stack

### Frontend
- **React**: `v19.0.1`
- **TypeScript**: `~5.8.2`
- **Vite**: `v6.2.3`
- **Tailwind CSS**: `v4.1.14` (menggunakan `@tailwindcss/vite`)
- **Lucide React**: `v0.546.0` (Icon vector)
- **Motion**: `v12.23.24` (Animasi UI)

### Backend & PDF Engine
- **Node.js**: `v22.x`
- **Express**: `v4.21.2`
- **TSX**: `v4.21.0` (Dev runner)
- **Esbuild**: `v0.25.0` (Production bundler)
- **Puppeteer**: `v25.5.0` (Headless Chromium PDF generator)

---

## 📁 Struktur Project

```
/
├── server.ts                   # Express server & Puppeteer PDF endpoint (/api/generate-pdf)
├── index.html                  # HTML entry point Vite
├── package.json                # Dependencies & scripts
├── CHANGELOG.md                # Riwayat versi aplikasi
├── PROJECT_HANDOFF.md          # Dokumen konteks teknis & arsitektur PDF
├── public/
│   └── logopt.png              # Asset logo publik PT Nararya Teknologi Indonesia
├── src/
│   ├── App.tsx                 # Root component & state orchestrator
│   ├── main.tsx                # Entry point React DOM
│   ├── index.css               # Global CSS & Tailwind imports
│   ├── logoBase64.ts           # Logo Nararya Base64
│   ├── types.ts                # TypeScript interfaces & types
│   ├── components/
│   │   ├── CorrectiveView.tsx  # Form & Log Corrective Maintenance
│   │   ├── DashboardView.tsx   # Dashboard pemantauan & statistik
│   │   ├── Header.tsx          # Bar header aplikasi
│   │   ├── LoginScreen.tsx     # Layar login teknisi / supervisor
│   │   ├── MasterDataView.tsx  # Pengelolaan Master Data alat & lokasi
│   │   ├── PreventiveView.tsx  # Form input checklist & foto dokumentasi
│   │   ├── ReportView.tsx      # Preview PDF Vector & Format Teks WhatsApp
│   │   ├── ShiftModal.tsx      # Modal pilihan Shift & Teknisi On Duty
│   │   └── Sidebar.tsx         # Navigasi sidebar
│   ├── data/
│   │   └── initialData.ts      # Data master awal & mock entries
│   ├── services/
│   │   └── reportService.ts    # Service formatter teks WA & structured report
│   └── utils/
│       ├── collageService.ts   # Engine pembuatan kolase foto 1200x1200px
│       ├── periodUtils.ts      # Utility perhitungan kunci periode frekuensi
│       └── technicianSchedule.ts # Logic jadwal teknisi
└── tsconfig.json               # Konfigurasi TypeScript
```

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Install Dependensi
```bash
npm install
```

### 2. Jalankan Mode Development
```bash
npm run dev
```
Aplikasi akan berjalan pada `http://localhost:3000` (Mengintegrasikan API Express `/api/*` dan Vite dev server dalam 1 port).

### 3. Build & Run Mode Produksi
```bash
npm run build
npm run start
```

### 4. Pengecekan Linter / TypeScript
```bash
npm run lint
```

---

## 📄 Lisensi & Hak Cipta

© 2026 PT Nararya Teknologi Indonesia. Hak Cipta Dilindungi.
Aplikasi ini dikembangkan untuk penggunaan internal operasional maintenance & inspection.
