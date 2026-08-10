import React, { useState, useEffect } from 'react';
import { compressImage } from '../utils/imageCompressor';
import {
  Equipment,
  EquipmentType,
  ChecklistFrequency,
  ChecklistItem,
  PreventiveEntry,
  MeasurementValue,
  ChecklistResult,
  Role,
} from '../types';
import {
  CheckCircle2,
  Camera,
  ArrowLeft,
  ListCheck,
  Zap,
  Search,
  Check,
  X,
  Upload,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  FileText,
  Trash2,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Download,
  Send,
  Scan,
  DoorClosed,
  Radio,
  Calendar,
} from 'lucide-react';
import { generatePhotoCollageUrl } from '../utils/collageService';
import { getPeriodKey } from '../utils/periodUtils';

interface PreventiveViewProps {
  equipments: Equipment[];
  equipmentTypes: EquipmentType[];
  frequencies: ChecklistFrequency[];
  checklistItems: ChecklistItem[];
  preventiveEntries: PreventiveEntry[];
  preSelectedEquipmentId?: number | null;
  onSubmitEntry: (entry: Omit<PreventiveEntry, 'id'>) => void;
  onBackToDashboard: () => void;
  role: Role;
  operationalDate?: string;
  shift?: string;
}

interface PhotoDocs {
  tegangan?: string;
  report?: string;
  sinyal_gen_a?: string;
  sinyal_gen_b?: string;
  bebersih?: string[];
}

export const PreventiveView: React.FC<PreventiveViewProps> = ({
  equipments,
  equipmentTypes,
  frequencies,
  checklistItems,
  preventiveEntries,
  preSelectedEquipmentId,
  onSubmitEntry,
  onBackToDashboard,
  operationalDate = '',
  shift = 'Shift 1',
}) => {
  // Navigation & Machine Selection State
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(
    preSelectedEquipmentId || null
  );
  const [isMachineSelected, setIsMachineSelected] = useState<boolean>(
    Boolean(preSelectedEquipmentId)
  );

  // Tab Selection: Hari Ini vs Semua Interval
  const [activeIntervalTab, setActiveIntervalTab] = useState<'hari-ini' | 'semua-interval'>('hari-ini');

  // Step flow state: 'interval' | 'category' | 'equipment'
  const [preventiveFlowStep, setPreventiveFlowStep] = useState<'interval' | 'category' | 'equipment'>(() => {
    if (preSelectedEquipmentId) {
      return 'equipment';
    }
    return 'interval';
  });

  // Search & Filters on Grid
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<number | 'ALL'>('ALL');

  // Selected Machine Form State
  const [selectedFrequencyId, setSelectedFrequencyId] = useState<number>(1); // Harian default
  const [viewType, setViewType] = useState<'single' | 'dual'>('dual');
  const [mobileStep, setMobileStep] = useState<number>(1); // 1: Foto, 2: Tegangan, 3: Checklist, 4: Selesai

  // Photo Documentation State
  const [photoDocs, setPhotoDocs] = useState<PhotoDocs>({ bebersih: [] });

  // Photo Collage Modal State
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [showCollageModal, setShowCollageModal] = useState(false);
  const [successPopupInfo, setSuccessPopupInfo] = useState<{
    show: boolean;
    typeName: string;
    eqName: string;
  }>({ show: false, typeName: '', eqName: '' });

  // Auto scroll to top when machine form opens
  useEffect(() => {
    if (isMachineSelected) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, [isMachineSelected, selectedEquipmentId]);

  // Auto scroll to top when mobile step changes
  useEffect(() => {
    if (isMachineSelected) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, [mobileStep, isMachineSelected]);

  // Auto close success popup after 2.5 - 3 seconds
  useEffect(() => {
    if (successPopupInfo.show) {
      const timer = setTimeout(() => {
        setSuccessPopupInfo({ show: false, typeName: '', eqName: '' });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [successPopupInfo.show]);

  // Measurements state for X-Ray
  const [genAMeasurement, setGenAMeasurement] = useState<MeasurementValue>({
    generator: 'A',
    positive_high_voltage: 80.0,
    negative_high_voltage: -75.0,
    heater_current: 450.0,
    anode_current: 400.0,
  });

  const [genBMeasurement, setGenBMeasurement] = useState<MeasurementValue>({
    generator: 'B',
    positive_high_voltage: 80.0,
    negative_high_voltage: -75.0,
    heater_current: 500.0,
    anode_current: 450.0,
  });

  // Checklist items results state ('Baik' | 'Temuan')
  const [checklistResults, setChecklistResults] = useState<Record<number, 'Baik' | 'Temuan'>>({});
  const [notes, setNotes] = useState<string>(
    'Sudah dilakukan kalibrasi dan pembersihan. Equipment bisa digunakan dengan normal.'
  );
  const [overallStatus, setOverallStatus] = useState<'OK' | 'NG' | 'NEEDS_REPAIR'>('OK');

  // Handle preSelectedEquipmentId changes from parent
  useEffect(() => {
    if (preSelectedEquipmentId) {
      setSelectedEquipmentId(preSelectedEquipmentId);
      setIsMachineSelected(true);
    }
  }, [preSelectedEquipmentId]);

  // Find selected equipment and type
  const selectedEquipment = equipments.find((e) => e.id === Number(selectedEquipmentId));
  const selectedType = equipmentTypes.find((t) => t.id === selectedEquipment?.equipment_type_id);
  const isXRay = selectedType?.code === 'XRAY';
  const isHidingMeasurements = Number(selectedFrequencyId) === 1 && [2, 3, 9].includes(Number(selectedEquipment?.id));

  const currentPeriodKey = getPeriodKey(Number(selectedFrequencyId), operationalDate);

  // Check if selected equipment already has an entry submitted today for the selected interval
  const existingEntry = preventiveEntries.find(
    (pe) =>
      pe.equipment_id === Number(selectedEquipmentId) &&
      pe.checklist_frequency_id === Number(selectedFrequencyId) &&
      (pe.shift || '') === (shift || '') &&
      (pe.period_key || '') === (currentPeriodKey || '')
  );

  // Load existing entry when equipment changes or reset form defaults
  useEffect(() => {
    if (!selectedEquipmentId || !selectedEquipment) return;
    setMobileStep(1);

    const entry = preventiveEntries.find(
      (pe) =>
        pe.equipment_id === Number(selectedEquipmentId) &&
        pe.checklist_frequency_id === Number(selectedFrequencyId) &&
        (pe.shift || '') === (shift || '') &&
        (pe.period_key || '') === (currentPeriodKey || '')
    );

    if (entry) {
      if (entry.view_type) setViewType(entry.view_type);
      if (entry.checklist_frequency_id) setSelectedFrequencyId(entry.checklist_frequency_id);
      if (entry.notes) setNotes(entry.notes);
      if (entry.status) setOverallStatus(entry.status);

      if (entry.measurements && entry.measurements.length > 0) {
        const genA = entry.measurements.find((m) => m.generator === 'A');
        if (genA) setGenAMeasurement(genA);
        const genB = entry.measurements.find((m) => m.generator === 'B');
        if (genB) setGenBMeasurement(genB);
      }

      if (entry.checklist_results && entry.checklist_results.length > 0) {
        const resObj: Record<number, 'Baik' | 'Temuan'> = {};
        entry.checklist_results.forEach((cr) => {
          resObj[cr.checklist_item_id] = cr.status as any || 'Baik';
        });
        setChecklistResults(resObj);
      }

      if (entry.evidences && entry.evidences.length > 0) {
        const docs: PhotoDocs = { bebersih: [] };
        entry.evidences.forEach((ev) => {
          if (ev.caption?.includes('Tegangan')) docs.tegangan = ev.file_path;
          else if (ev.caption?.includes('Report')) docs.report = ev.file_path;
          else if (ev.caption?.includes('Sinyal Gen A')) docs.sinyal_gen_a = ev.file_path;
          else if (ev.caption?.includes('Sinyal Gen B')) docs.sinyal_gen_b = ev.file_path;
          else if (ev.caption?.includes('Bebersih')) {
            if (!docs.bebersih) docs.bebersih = [];
            docs.bebersih.push(ev.file_path);
          }
        });
        setPhotoDocs(docs);
      }
    } else {
      if (selectedEquipment.default_view) {
        setViewType(selectedEquipment.default_view);
      } else {
        setViewType('single');
      }
      setGenAMeasurement({
        generator: 'A',
        positive_high_voltage: 80.0,
        negative_high_voltage: -75.0,
        heater_current: 450.0,
        anode_current: 400.0,
      });
      setGenBMeasurement({
        generator: 'B',
        positive_high_voltage: 80.0,
        negative_high_voltage: -75.0,
        heater_current: 500.0,
        anode_current: 450.0,
      });
      setPhotoDocs({ bebersih: [] });
      setNotes('Sudah dilakukan kalibrasi dan pembersihan. Equipment bisa digunakan dengan normal.');
      setOverallStatus('OK');
    }
  }, [selectedEquipmentId, selectedEquipment, preventiveEntries, selectedFrequencyId, currentPeriodKey, shift]);

  // Filter checklist items by selected equipment type and selected frequency
  const relevantChecklistItems = checklistItems.filter(
    (item) =>
      item.equipment_type_id === selectedEquipment?.equipment_type_id &&
      item.checklist_frequency_id === Number(selectedFrequencyId) &&
      item.active
  );

  // Initialize checklist results if no existing entry
  useEffect(() => {
    if (existingEntry) return;
    const initialResults: Record<number, 'Baik' | 'Temuan'> = {};
    relevantChecklistItems.forEach((item) => {
      initialResults[item.id] = 'Baik';
    });
    setChecklistResults(initialResults);
  }, [selectedEquipmentId, selectedFrequencyId, existingEntry]);

  // Handle Checklist Status Change
  const handleChecklistChange = (itemId: number, res: 'Baik' | 'Temuan') => {
    setChecklistResults((prev) => ({ ...prev, [itemId]: res }));
  };

  // Set All Checklist Items to Baik
  const handleSetAllBaik = () => {
    const updated: Record<number, 'Baik' | 'Temuan'> = {};
    relevantChecklistItems.forEach((item) => {
      updated[item.id] = 'Baik';
    });
    setChecklistResults(updated);
  };

  // Photo Upload Handlers
  const handleSinglePhotoUpload = async (
    key: 'tegangan' | 'report' | 'sinyal_gen_a' | 'sinyal_gen_b',
    file: File
  ) => {
    try {
      const compressedUrl = await compressImage(file, 1600, 0.82);
      setPhotoDocs((prev) => ({ ...prev, [key]: compressedUrl }));
    } catch (err) {
      console.error('Compression error:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhotoDocs((prev) => ({ ...prev, [key]: e.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSinglePhoto = (
    key: 'tegangan' | 'report' | 'sinyal_gen_a' | 'sinyal_gen_b'
  ) => {
    setPhotoDocs((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleBebersihUpload = async (files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files) as File[];
    const maxBebersih = isHidingMeasurements ? 7 : 4;

    try {
      const compressedPhotos = await Promise.all(
        fileList.map((file: File) => compressImage(file, 1600, 0.82))
      );
      setPhotoDocs((prev) => {
        const existing = prev.bebersih || [];
        if (existing.length >= maxBebersih) return prev;
        return {
          ...prev,
          bebersih: [...existing, ...compressedPhotos].slice(0, maxBebersih),
        };
      });
    } catch (err) {
      console.error('Bebersih compression error:', err);
    }
  };

  const handleSimpleDocsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files) as File[];

    const validFiles = fileList.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const currentCount = photoDocs.bebersih?.length || 0;
    if (currentCount + validFiles.length > 7) {
      alert('Maksimal 7 foto dokumentasi.');
      return;
    }

    try {
      const compressedPhotos = await Promise.all(
        validFiles.map((file: File) => compressImage(file, 1600, 0.82))
      );
      setPhotoDocs((prev) => ({
        ...prev,
        bebersih: [...(prev.bebersih || []), ...compressedPhotos].slice(0, 7),
      }));
    } catch (err) {
      console.error('Simple docs compression error:', err);
    }
  };

  const handleRemoveBebersih = (index: number) => {
    setPhotoDocs((prev) => ({
      ...prev,
      bebersih: (prev.bebersih || []).filter((_, i) => i !== index),
    }));
  };

  // Generate Photo Collage for WhatsApp
  const handleCreateCollage = async () => {
    const photosList: { key: string; title: string; dataUrl: string }[] = [];

    if (isXRay) {
      if (!isHidingMeasurements && photoDocs.tegangan) {
        photosList.push({ key: 'tegangan', title: '1. Foto Tegangan', dataUrl: photoDocs.tegangan });
      }
      if (photoDocs.report) {
        photosList.push({
          key: 'report',
          title: isHidingMeasurements ? '1. Foto Report' : '2. Foto Report',
          dataUrl: photoDocs.report
        });
      }
      if (!isHidingMeasurements && photoDocs.sinyal_gen_a) {
        photosList.push({ key: 'sinyal_gen_a', title: '3. Foto Sinyal Gen A', dataUrl: photoDocs.sinyal_gen_a });
      }
      if (!isHidingMeasurements && photoDocs.sinyal_gen_b) {
        photosList.push({ key: 'sinyal_gen_b', title: '4. Foto Sinyal Gen B', dataUrl: photoDocs.sinyal_gen_b });
      }
      if (photoDocs.bebersih && photoDocs.bebersih.length > 0) {
        photoDocs.bebersih.forEach((url, i) => {
          photosList.push({
            key: `bebersih_${i}`,
            title: isHidingMeasurements ? `2. Bebersih ${i + 1}` : `5. Bebersih ${i + 1}`,
            dataUrl: url
          });
        });
      }
    } else {
      if (photoDocs.bebersih && photoDocs.bebersih.length > 0) {
        photoDocs.bebersih.forEach((url, i) => {
          photosList.push({ key: `bebersih_${i}`, title: `Dokumentasi ${i + 1}`, dataUrl: url });
        });
      }
    }

    if (photosList.length === 0) {
      alert('Unggah minimal 1 foto untuk membuat kolase WhatsApp.');
      return;
    }

    setIsGeneratingCollage(true);
    try {
      const dateStr = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const url = await generatePhotoCollageUrl({
        equipmentName: selectedEquipment?.name || 'Security Machine',
        equipmentCode: selectedEquipment?.equipment_code || 'CODE',
        serialNumber: selectedEquipment?.serial_number,
        date: dateStr,
        shift: 'Shift 1',
        technicians: ['Technician Duty'],
        photos: photosList,
      });

      setCollageUrl(url);
      setShowCollageModal(true);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat kolase foto.');
    } finally {
      setIsGeneratingCollage(false);
    }
  };

  // Dynamic active steps based on machine configuration
  const hasMeasurements = isXRay && !isHidingMeasurements;
  const activeSteps = [
    1, // Foto
    ...(hasMeasurements ? [2] : []), // Tegangan / Pengukuran
    3, // Checklist
    4  // Selesai
  ];

  // Mobile step navigation helpers
  const handlePrevStep = () => {
    const currentIndex = activeSteps.indexOf(mobileStep);
    if (currentIndex > 0) {
      setMobileStep(activeSteps[currentIndex - 1]);
    }
  };

  const handleNextStep = () => {
    const currentIndex = activeSteps.indexOf(mobileStep);
    if (currentIndex < activeSteps.length - 1) {
      setMobileStep(activeSteps[currentIndex + 1]);
    }
  };

  // Calculate Data Completeness Percentage
  const calculateCompleteness = () => {
    let score = 0;

    // Photos (25%)
    let photoCount = 0;
    if (photoDocs.tegangan) photoCount++;
    if (photoDocs.report) photoCount++;
    if (photoDocs.sinyal_gen_a) photoCount++;
    if (photoDocs.sinyal_gen_b) photoCount++;
    if (photoDocs.bebersih && photoDocs.bebersih.length > 0) photoCount += photoDocs.bebersih.length;

    if (photoCount > 0) {
      score += Math.min(25, photoCount * 5);
    }

    // Measurements (25%)
    if (isXRay && !isHidingMeasurements) {
      if (genBMeasurement.positive_high_voltage) score += 25;
    } else {
      score += 25; // N/A for non-xray or hidden measurements
    }

    // Checklist (40%)
    const filledCount = Object.keys(checklistResults).length;
    if (relevantChecklistItems.length > 0) {
      score += Math.round((filledCount / relevantChecklistItems.length) * 40);
    } else {
      score += 40;
    }

    // Notes (10%)
    if (notes.trim().length > 5) score += 10;

    return Math.min(100, score);
  };

  const completenessPercent = calculateCompleteness();

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEquipment) {
      alert('Silakan pilih mesin terlebih dahulu.');
      return;
    }

    const nextSequence = preventiveEntries.length + 1;

    // Measurements array
    const measurements: MeasurementValue[] = [];
    if (isXRay && !isHidingMeasurements) {
      if (viewType === 'single') {
        measurements.push(genBMeasurement);
      } else {
        measurements.push(genAMeasurement, genBMeasurement);
      }
    }

    // Checklist results array
    const resultsArray: ChecklistResult[] = relevantChecklistItems.map((item) => ({
      checklist_item_id: item.id,
      description: item.description,
      status: checklistResults[item.id] || 'Baik',
    }));

    // Current time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    // Evidences array
    const evidencesList: { id: number; file_path: string; caption: string }[] = [];

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const formatSessionDate = (dString: string) => {
      if (!dString) return '';
      if (dString.includes('Jan') || dString.includes('Agt') || dString.includes('Aug') || dString.includes('Agustus') || dString.includes('Feb') || dString.includes('Mar')) {
        return dString;
      }
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      if (dString.includes('-')) {
        const parts = dString.split('-');
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (!isNaN(d.getTime())) {
            return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
          }
        }
      }
      return dString;
    };

    const finalDateStr = operationalDate ? formatSessionDate(operationalDate) : dateStr;

    if (isXRay) {
      const xrayPhotos: { key: string; title: string; dataUrl: string }[] = [];
      if (!isHidingMeasurements && photoDocs.tegangan) {
        xrayPhotos.push({ key: 'tegangan', title: '1. Foto Tegangan', dataUrl: photoDocs.tegangan });
      }
      if (photoDocs.report) {
        xrayPhotos.push({
          key: 'report',
          title: isHidingMeasurements ? '1. Foto Report' : '2. Foto Report',
          dataUrl: photoDocs.report
        });
      }
      if (!isHidingMeasurements && photoDocs.sinyal_gen_a) {
        xrayPhotos.push({ key: 'sinyal_gen_a', title: '3. Foto Sinyal Gen A', dataUrl: photoDocs.sinyal_gen_a });
      }
      if (!isHidingMeasurements && photoDocs.sinyal_gen_b) {
        xrayPhotos.push({ key: 'sinyal_gen_b', title: '4. Foto Sinyal Gen B', dataUrl: photoDocs.sinyal_gen_b });
      }
      if (photoDocs.bebersih && photoDocs.bebersih.length > 0) {
        photoDocs.bebersih.forEach((url, idx) => {
          xrayPhotos.push({
            key: `bebersih_${idx}`,
            title: isHidingMeasurements ? `2. Bebersih ${idx + 1}` : `5. Bebersih ${idx + 1}`,
            dataUrl: url
          });
        });
      }

      if (xrayPhotos.length > 0) {
        // Save individual photos first
        xrayPhotos.forEach((item, idx) => {
          evidencesList.push({
            id: Date.now() + idx,
            file_path: item.dataUrl,
            caption: item.title,
          });
        });

        try {
          const collageUrl = await generatePhotoCollageUrl({
            equipmentName: selectedEquipment.name,
            equipmentCode: selectedEquipment.equipment_code,
            serialNumber: selectedEquipment.serial_number,
            date: finalDateStr,
            shift: shift || 'Shift 1',
            technicians: ['Technician Duty'],
            photos: xrayPhotos,
          });
          evidencesList.push({
            id: Date.now() + 1000,
            file_path: collageUrl,
            caption: 'Dokumentasi Maintenance X-Ray (Kolase)',
          });

          // Automatic download
          const link = document.createElement('a');
          link.href = collageUrl;
          link.download = `Collage_${selectedEquipment.equipment_code}_${finalDateStr.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error('Gagal membuat kolase XRay:', err);
        }
      }
    } else {
      const photos = photoDocs.bebersih || [];
      if (photos.length > 0) {
        // Save individual photos first
        photos.forEach((url, idx) => {
          evidencesList.push({
            id: Date.now() + idx,
            file_path: url,
            caption: `Dokumentasi Bebersih ${idx + 1}`,
          });
        });

        try {
          const collageUrl = await generatePhotoCollageUrl({
            equipmentName: selectedEquipment.name,
            equipmentCode: selectedEquipment.equipment_code,
            serialNumber: selectedEquipment.serial_number,
            date: finalDateStr,
            shift: shift || 'Shift 1',
            technicians: ['Technician Duty'],
            photos: photos.map((url, idx) => ({
              key: `cleaning_${idx}`,
              title: `Dokumentasi ${idx + 1}`,
              dataUrl: url,
            })),
          });
          evidencesList.push({
            id: Date.now() + 1000,
            file_path: collageUrl,
            caption: 'Dokumentasi Kegiatan / Pembersihan (Kolase)',
          });

          // Automatic download
          const link = document.createElement('a');
          link.href = collageUrl;
          link.download = `Collage_${selectedEquipment.equipment_code}_${finalDateStr.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error('Gagal membuat kolase:', err);
        }
      }
    }

    const newEntry: Omit<PreventiveEntry, 'id'> = {
      preventive_session_id: 101,
      equipment_id: selectedEquipment.id,
      checklist_frequency_id: Number(selectedFrequencyId),
      view_type: isXRay ? viewType : undefined,
      sequence: nextSequence,
      submitted_at: timeString,
      submitted_by_technician_ids: [1, 2],
      notes: notes,
      status: overallStatus,
      checklist_results: resultsArray,
      measurements: measurements,
      evidences: evidencesList,
      operational_date: operationalDate,
      shift: shift as any,
      period_key: currentPeriodKey,
    };

    onSubmitEntry(newEntry);
    setSuccessPopupInfo({
      show: true,
      typeName: selectedType?.code || 'EQUIPMENT',
      eqName: selectedEquipment.name,
    });
    setIsMachineSelected(false);
  };

  // Filtered & sorted Equipment List for Selection Grid
  // 1. Get base list filtered by active and selected category type (order follows master)
  const baseCategoryEquipments = equipments.filter((eq) => {
    if (!eq.active) return false;
    if (selectedTypeFilter !== 'ALL' && eq.equipment_type_id !== selectedTypeFilter) {
      return false;
    }
    return true;
  });

  // 2. Sort them: unsubmitted first, submitted last (preserving master sequence order)
  const filteredEquipments = [...baseCategoryEquipments].sort((a, b) => {
    const hasEntryA = preventiveEntries.some(
      (pe) =>
        pe.equipment_id === a.id &&
        pe.checklist_frequency_id === Number(selectedFrequencyId) &&
        (pe.shift || '') === (shift || '') &&
        (pe.period_key || '') === (currentPeriodKey || '')
    );
    const hasEntryB = preventiveEntries.some(
      (pe) =>
        pe.equipment_id === b.id &&
        pe.checklist_frequency_id === Number(selectedFrequencyId) &&
        (pe.shift || '') === (shift || '') &&
        (pe.period_key || '') === (currentPeriodKey || '')
    );

    if (hasEntryA === hasEntryB) {
      // Both submitted or both unsubmitted: preserve original order in master
      const idxA = baseCategoryEquipments.findIndex((item) => item.id === a.id);
      const idxB = baseCategoryEquipments.findIndex((item) => item.id === b.id);
      return idxA - idxB;
    }

    // Unsubmitted goes first
    return hasEntryA ? 1 : -1;
  });

  // Calculate completed count for each interval
  const harianCount = preventiveEntries.filter(
    (pe) =>
      pe.checklist_frequency_id === 1 &&
      (pe.shift || '') === (shift || '') &&
      (pe.period_key || '') === (getPeriodKey(1, operationalDate) || '')
  ).length;
  const mingguanCount = preventiveEntries.filter(
    (pe) =>
      pe.checklist_frequency_id === 2 &&
      (pe.shift || '') === (shift || '') &&
      (pe.period_key || '') === (getPeriodKey(2, operationalDate) || '')
  ).length;
  const bulananCount = preventiveEntries.filter(
    (pe) =>
      pe.checklist_frequency_id === 3 &&
      (pe.shift || '') === (shift || '') &&
      (pe.period_key || '') === (getPeriodKey(3, operationalDate) || '')
  ).length;
  const triwulanCount = preventiveEntries.filter(
    (pe) =>
      pe.checklist_frequency_id === 4 &&
      (pe.shift || '') === (shift || '') &&
      (pe.period_key || '') === (getPeriodKey(4, operationalDate) || '')
  ).length;
  const semesteranCount = preventiveEntries.filter(
    (pe) =>
      pe.checklist_frequency_id === 5 &&
      (pe.shift || '') === (shift || '') &&
      (pe.period_key || '') === (getPeriodKey(5, operationalDate) || '')
  ).length;
  const tahunanCount = preventiveEntries.filter(
    (pe) =>
      pe.checklist_frequency_id === 6 &&
      (pe.shift || '') === (shift || '') &&
      (pe.period_key || '') === (getPeriodKey(6, operationalDate) || '')
  ).length;

  // Get status badge for machine card (per interval)
  const getMachineIntervalStatusBadge = (eqId: number) => {
    const hasEntry = preventiveEntries.some(
      (pe) =>
        pe.equipment_id === eqId &&
        pe.checklist_frequency_id === Number(selectedFrequencyId) &&
        (pe.shift || '') === (shift || '') &&
        (pe.period_key || '') === (currentPeriodKey || '')
    );
    if (hasEntry) {
      return {
        label: 'Selesai',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      };
    }
    return {
      label: 'Belum diperiksa',
      className: 'bg-slate-100 text-slate-500 border border-slate-200',
    };
  };

  // Get status badge for machine card
  const getMachineStatusBadge = (eqId: number) => {
    const hasEntryToday = preventiveEntries.some((pe) => pe.equipment_id === eqId);
    if (hasEntryToday) {
      return {
        label: 'Selesai Hari Ini',
        className: 'bg-blue-100 text-blue-700 border border-blue-200',
      };
    }
    return {
      label: 'Siap Diperiksa',
      className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
  };

  // =========================================================================
  // VIEW 1: MACHINE SELECTION GRID (IMAGE 1)
  // =========================================================================
  if (!isMachineSelected || !selectedEquipment) {
    return (
      <div className="space-y-4">
        {/* Step Indicator Header */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {preventiveFlowStep === 'interval' ? '1' : preventiveFlowStep === 'category' ? '2' : '3'}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
                {preventiveFlowStep === 'interval' 
                  ? 'STEP A: Pilih Interval Pemeriksaan' 
                  : preventiveFlowStep === 'category' 
                  ? 'STEP B: Pilih Jenis Peralatan' 
                  : 'STEP C: Daftar Peralatan ' + (equipmentTypes.find((t) => t.id === selectedTypeFilter)?.code || '')}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {preventiveFlowStep === 'interval' 
                  ? 'Tentukan rentang waktu pemeliharaan preventif' 
                  : preventiveFlowStep === 'category' 
                  ? 'Pilih kategori peralatan keamanan bandara' 
                  : 'Pilih lokasi peralatan untuk mulai pengisian checklist'}
              </p>
            </div>
          </div>
          
          {/* Progress Indicators */}
          <div className="flex items-center gap-1">
            <span className={`w-6 h-1.5 rounded-full ${preventiveFlowStep === 'interval' ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
            <span className={`w-6 h-1.5 rounded-full ${preventiveFlowStep === 'category' ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
            <span className={`w-6 h-1.5 rounded-full ${preventiveFlowStep === 'equipment' ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
          </div>
        </div>

        {/* STEP A — PILIH INTERVAL */}
        {preventiveFlowStep === 'interval' && (
          <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Silakan Pilih Interval Pemeriksaan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Harian Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFrequencyId(1);
                  setPreventiveFlowStep('category');
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  selectedFrequencyId === 1
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    selectedFrequencyId === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Harian</h4>
                    <p className="text-[10px] text-slate-400">Pemeriksaan Rutin Setiap Hari</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {harianCount}/15 selesai
                  </span>
                </div>
              </button>

              {/* Mingguan Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFrequencyId(2);
                  setPreventiveFlowStep('category');
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  selectedFrequencyId === 2
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    selectedFrequencyId === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Mingguan</h4>
                    <p className="text-[10px] text-slate-400">Pemeriksaan Rutin Mingguan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {mingguanCount}/15 selesai
                  </span>
                </div>
              </button>

              {/* Bulanan Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFrequencyId(3);
                  setPreventiveFlowStep('category');
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  selectedFrequencyId === 3
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    selectedFrequencyId === 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Bulanan</h4>
                    <p className="text-[10px] text-slate-400">Pemeriksaan Bulanan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {bulananCount}/15 selesai
                  </span>
                </div>
              </button>

              {/* Triwulan Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFrequencyId(4);
                  setPreventiveFlowStep('category');
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  selectedFrequencyId === 4
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    selectedFrequencyId === 4 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Triwulan</h4>
                    <p className="text-[10px] text-slate-400">Pemeriksaan Berkala 3 Bulanan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {triwulanCount}/15 selesai
                  </span>
                </div>
              </button>

              {/* Semesteran Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFrequencyId(5);
                  setPreventiveFlowStep('category');
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  selectedFrequencyId === 5
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    selectedFrequencyId === 5 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Semesteran</h4>
                    <p className="text-[10px] text-slate-400">Pemeriksaan Berkala 6 Bulanan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {semesteranCount}/15 selesai
                  </span>
                </div>
              </button>

              {/* Tahunan Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFrequencyId(6);
                  setPreventiveFlowStep('category');
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  selectedFrequencyId === 6
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    selectedFrequencyId === 6 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Tahunan</h4>
                    <p className="text-[10px] text-slate-400">Pemeriksaan Berkala 12 Bulanan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {tahunanCount}/15 selesai
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP B — PILIH JENIS PERALATAN */}
        {preventiveFlowStep === 'category' && (
          <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pilih Kategori Jenis Peralatan (Interval: {frequencies.find(f => f.id === selectedFrequencyId)?.name || 'Harian'})
              </h3>
              <button
                type="button"
                onClick={() => setPreventiveFlowStep('interval')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer self-start"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Interval
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {equipmentTypes.map((type) => {
                const count = equipments.filter(
                  (e) => e.equipment_type_id === type.id && e.active
                ).length;
                const isSelected = selectedTypeFilter === type.id;

                let label = type.code;
                let subtitle = type.name;
                let IconComponent = Scan;
                let colorClass = 'text-blue-600 bg-blue-50 border-blue-100';

                if (type.code === 'XRAY') {
                  label = 'X-RAY';
                  subtitle = 'X-Ray Inspection';
                  IconComponent = Scan;
                  colorClass = 'text-blue-600 bg-blue-50 border-blue-100';
                } else if (type.code === 'WTMD') {
                  label = 'WTMD';
                  subtitle = 'Walk Through Detector';
                  IconComponent = DoorClosed;
                  colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
                } else if (type.code === 'HHMD') {
                  label = 'HHMD';
                  subtitle = 'Handheld Metal Detector';
                  IconComponent = ShieldCheck;
                  colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-100';
                } else if (type.code === 'ETD') {
                  label = 'ETD';
                  subtitle = 'Explosive Trace Detector';
                  IconComponent = Radio;
                  colorClass = 'text-purple-600 bg-purple-50 border-purple-100';
                }

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setSelectedTypeFilter(type.id);
                      setPreventiveFlowStep('equipment');
                    }}
                    className={`p-3.5 sm:p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-[105px] sm:h-auto sm:aspect-square cursor-pointer group relative overflow-hidden ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div
                        className={`hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : `${colorClass} group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600`
                        }`}
                      >
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count} Unit
                      </span>
                    </div>

                    <div>
                      <h4
                        className={`text-sm sm:text-xl font-black tracking-tight ${
                          isSelected ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'
                        }`}
                      >
                        {label}
                      </h4>
                      <p
                        className={`text-[10px] sm:text-[11px] font-medium line-clamp-1 mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP C — DAFTAR PERALATAN */}
        {preventiveFlowStep === 'equipment' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header for Equipment List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPreventiveFlowStep('category')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer mb-1 self-start"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Jenis Peralatan
                </button>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800">
                    Daftar Mesin {equipmentTypes.find((t) => t.id === selectedTypeFilter)?.code || ''} ({frequencies.find(f => f.id === selectedFrequencyId)?.name || 'Harian'})
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">
                    ({filteredEquipments.length} lokasi)
                  </span>
                </div>
              </div>
            </div>

            {/* Equipment Selection Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredEquipments.map((eq) => {
                const hasEntryForInterval = preventiveEntries.some(
                  (pe) =>
                    pe.equipment_id === eq.id &&
                    pe.checklist_frequency_id === Number(selectedFrequencyId) &&
                    (pe.shift || '') === (shift || '') &&
                    (pe.period_key || '') === (currentPeriodKey || '')
                );
                const badge = getMachineIntervalStatusBadge(eq.id);
                const originalIndex = baseCategoryEquipments.findIndex((item) => item.id === eq.id) + 1;

                return (
                  <div
                    key={eq.id}
                    onClick={() => {
                      setSelectedEquipmentId(eq.id);
                      setIsMachineSelected(true);
                    }}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                  >
                    <div>
                      {/* Card Header: Icon & Status Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Card Body: Equipment Title & Location */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {originalIndex}. {eq.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {eq.equipment_code} {eq.serial_number ? `• SN ${eq.serial_number}` : ''}
                      </p>

                      <p className="text-xs font-semibold mt-2.5 flex items-center gap-1.5">
                        <span className="text-slate-400">Status:</span>
                        {hasEntryForInterval ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Selesai
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Belum diperiksa
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Card Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEquipmentId(eq.id);
                        setIsMachineSelected(true);
                      }}
                      className={`w-full py-2.5 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 border-2 ${
                        hasEntryForInterval
                          ? 'bg-amber-50 border-amber-500 text-amber-700 hover:bg-amber-500 hover:text-white'
                          : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      <span>{hasEntryForInterval ? 'Edit Data' : 'Periksa Mesin'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {filteredEquipments.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">Tidak ada equipment ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih jenis peralatan yang berbeda.
                </p>
              </div>
            )}
          </div>
        )}

        {/* SUCCESS POPUP MODAL */}
        {successPopupInfo.show && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Pemeriksaan Berhasil Disimpan</h3>
                <p className="text-xs font-bold text-blue-600 uppercase mt-1">
                  {successPopupInfo.typeName} - {successPopupInfo.eqName}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Data laporan preventive berhasil dimasukkan ke sistem.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessPopupInfo({ show: false, typeName: '', eqName: '' })}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FORM INSPECTION FOR SELECTED MACHINE (IMAGE 2 & 3)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pemeriksaan Peralatan Maintenance
          </h1>
          <p className="text-xs text-slate-500">
            {selectedEquipment.name} ({selectedEquipment.equipment_code})
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsMachineSelected(false)}
          className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </button>
      </div>

      {/* Blue Banner Card for Selected Machine */}
      <div className="bg-blue-600 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block mb-0.5">
              Mesin Terpilih
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">
              {selectedEquipment.name}
            </h2>
            <p className="text-xs font-mono text-blue-100">
              {selectedEquipment.equipment_code} • SN: {selectedEquipment.serial_number || 'N/A'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMachineSelected(false)}
          className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer text-nowrap self-stretch sm:self-auto justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ganti Mesin</span>
        </button>
      </div>

      {/* Mobile Step Wizard Tabs (Image 3 - visible on small screens) */}
      <div className="block md:hidden bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className={`grid ${activeSteps.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-1 text-center`}>
          {activeSteps.map((stepNum, idx) => {
            let label = '';
            if (stepNum === 1) label = '1. Foto';
            else if (stepNum === 2) label = '2. Tegangan';
            else if (stepNum === 3) label = `${idx + 1}. Checklist`;
            else if (stepNum === 4) label = `${idx + 1}. Selesai`;

            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => setMobileStep(stepNum)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                  mobileStep === stepNum
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Layout: Form Inputs (Left) & Inspection Summary Sticky (Right) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28 md:pb-6">
        {/* LEFT COLUMN: FORM SECTIONS */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: DOKUMENTASI FOTO */}
          <div
            className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 ${
              mobileStep !== 1 && 'hidden md:block'
            }`}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  <span>{isXRay ? 'Dokumentasi Foto' : 'Dokumentasi Kegiatan / Pembersihan'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isXRay ? 'Ambil foto kondisi aktual mesin' : 'Maksimal 7 foto'}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-600 text-white rounded-lg uppercase tracking-wider">
                Wajib
              </span>
            </div>

            {isXRay ? (
              /* 5 Photo Upload Box Grid for X-Ray */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Foto Tegangan */}
                {!isHidingMeasurements && (
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 rounded-2xl p-3.5 text-center transition-all relative group flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-700 block mb-2 text-left truncate">
                      1. Foto Tegangan
                    </span>
                    {photoDocs.tegangan ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-36">
                        <img src={photoDocs.tegangan} alt="Foto Tegangan" className="w-full h-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveSinglePhoto('tegangan')}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center py-4 bg-white/60 hover:bg-white rounded-xl border border-slate-100 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">Unggah Foto</span>
                        <span className="text-[9px] text-slate-400">Klik / Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => e.target.files?.[0] && handleSinglePhotoUpload('tegangan', e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* 2. Foto Report */}
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 rounded-2xl p-3.5 text-center transition-all relative group flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-700 block mb-2 text-left truncate">
                    {isHidingMeasurements ? '1. Foto Report' : '2. Foto Report'}
                  </span>
                  {photoDocs.report ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-36">
                      <img src={photoDocs.report} alt="Foto Report" className="w-full h-28 object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveSinglePhoto('report')}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-4 bg-white/60 hover:bg-white rounded-xl border border-slate-100 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">Unggah Foto</span>
                      <span className="text-[9px] text-slate-400">Klik / Kamera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => e.target.files?.[0] && handleSinglePhotoUpload('report', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 3. Foto Sinyal Generator A */}
                {!isHidingMeasurements && (
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 rounded-2xl p-3.5 text-center transition-all relative group flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-700 block mb-2 text-left truncate">
                      3. Foto Sinyal Generator A
                    </span>
                    {photoDocs.sinyal_gen_a ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-36">
                        <img src={photoDocs.sinyal_gen_a} alt="Foto Sinyal Gen A" className="w-full h-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveSinglePhoto('sinyal_gen_a')}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center py-4 bg-white/60 hover:bg-white rounded-xl border border-slate-100 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">Unggah Foto</span>
                        <span className="text-[9px] text-slate-400">Klik / Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => e.target.files?.[0] && handleSinglePhotoUpload('sinyal_gen_a', e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* 4. Foto Sinyal Generator B */}
                {!isHidingMeasurements && (
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 rounded-2xl p-3.5 text-center transition-all relative group flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-700 block mb-2 text-left truncate">
                      4. Foto Sinyal Generator B
                    </span>
                    {photoDocs.sinyal_gen_b ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-36">
                        <img src={photoDocs.sinyal_gen_b} alt="Foto Sinyal Gen B" className="w-full h-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveSinglePhoto('sinyal_gen_b')}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center py-4 bg-white/60 hover:bg-white rounded-xl border border-slate-100 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">Unggah Foto</span>
                        <span className="text-[9px] text-slate-400">Klik / Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => e.target.files?.[0] && handleSinglePhotoUpload('sinyal_gen_b', e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* 5. Foto Bebersih (Single box for up to 4 or 7 photos) */}
                <div className="sm:col-span-2 lg:col-span-2 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 rounded-2xl p-3.5 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      {isHidingMeasurements ? '2. Foto Pembersihan (Max 7 foto)' : '5. Foto Bebersih (Max 4 foto sekaligus)'}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                      {photoDocs.bebersih?.length || 0} / {isHidingMeasurements ? 7 : 4}
                    </span>
                  </div>

                  {/* Grid of uploaded Bebersih photos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {photoDocs.bebersih?.map((imgUrl, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={imgUrl} alt={`Bebersih ${idx + 1}`} className="w-full h-20 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveBebersih(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md shadow-md hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {(!photoDocs.bebersih || photoDocs.bebersih.length < (isHidingMeasurements ? 7 : 4)) && (
                    <label className="cursor-pointer flex items-center justify-center gap-2 py-3 bg-white hover:bg-blue-50/50 rounded-xl border border-slate-200 text-blue-600 transition-colors">
                      <Camera className="w-4 h-4" />
                      <span className="text-xs font-bold">
                        {photoDocs.bebersih && photoDocs.bebersih.length > 0 ? '+ Tambah Foto Pembersihan' : `Unggah Foto Pembersihan (1-${isHidingMeasurements ? 7 : 4} foto)`}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={(e) => handleBebersihUpload(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            ) : (
              /* Simplified Upload Section for WTMD / HHMD / ETD */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">
                    Dokumentasi Kegiatan / Pembersihan
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md">
                    {photoDocs.bebersih?.length || 0} / 7 foto
                  </span>
                </div>

                {/* Grid of uploaded photo thumbnails */}
                {photoDocs.bebersih && photoDocs.bebersih.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {photoDocs.bebersih.map((imgUrl, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-100">
                        <img src={imgUrl} alt={`Dokumentasi ${idx + 1}`} className="w-full h-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveBebersih(idx)}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                          title="Hapus foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {(!photoDocs.bebersih || photoDocs.bebersih.length < 7) && (
                  <label className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 group">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Pilih Foto
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Klik untuk mengambil/memilih foto (Bisa pilih beberapa sekaligus, max 7)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) => handleSimpleDocsUpload(e.target.files)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: PENGUKURAN TEGANGAN (FOR X-RAY) */}
          {isXRay && !isHidingMeasurements && (
            <div
              className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 ${
                mobileStep !== 2 && 'hidden md:block'
              }`}
            >
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600" />
                    <span>Pengukuran Tegangan</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Default menggunakan konfigurasi {viewType === 'dual' ? 'Dual View' : 'Single View'}
                  </p>
                </div>

                {/* Single View / Dual View Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto border border-slate-200">
                  <span className="text-xs font-bold text-slate-600 px-2">Mode Mesin</span>
                  <button
                    type="button"
                    onClick={() => setViewType(viewType === 'single' ? 'dual' : 'single')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewType === 'dual'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 shadow-xs'
                    }`}
                  >
                    {viewType === 'dual' ? 'Dual View' : 'Single View'}
                  </button>
                </div>
              </div>

              {/* Generator Measurements Input Grid */}
              <div className="space-y-4">
                {/* Generator A (if Dual View) */}
                {viewType === 'dual' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                      Generator A (Dual View Top/Side)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          + HV (kV)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={genAMeasurement.positive_high_voltage ?? ''}
                          onChange={(e) =>
                            setGenAMeasurement({
                              ...genAMeasurement,
                              positive_high_voltage: e.target.value === '' ? 0 : parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          - HV (kV)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={genAMeasurement.negative_high_voltage ?? ''}
                          onChange={(e) =>
                            setGenAMeasurement({
                              ...genAMeasurement,
                              negative_high_voltage: e.target.value === '' ? 0 : parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Heater (mA)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={genAMeasurement.heater_current ?? ''}
                          onChange={(e) =>
                            setGenAMeasurement({
                              ...genAMeasurement,
                              heater_current: e.target.value === '' ? 0 : parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Anode (µA)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={genAMeasurement.anode_current ?? ''}
                          onChange={(e) =>
                            setGenAMeasurement({
                              ...genAMeasurement,
                              anode_current: e.target.value === '' ? 0 : parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Generator B */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                    Generator B ({viewType === 'single' ? 'Single View Main' : 'Dual View Main'})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        + HV (kV)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={genBMeasurement.positive_high_voltage ?? ''}
                        onChange={(e) =>
                          setGenBMeasurement({
                            ...genBMeasurement,
                            positive_high_voltage: e.target.value === '' ? 0 : parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        - HV (kV)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={genBMeasurement.negative_high_voltage ?? ''}
                        onChange={(e) =>
                          setGenBMeasurement({
                            ...genBMeasurement,
                            negative_high_voltage: e.target.value === '' ? 0 : parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Heater (mA)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={genBMeasurement.heater_current ?? ''}
                        onChange={(e) =>
                          setGenBMeasurement({
                            ...genBMeasurement,
                            heater_current: e.target.value === '' ? 0 : parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Anode (µA)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={genBMeasurement.anode_current ?? ''}
                        onChange={(e) =>
                          setGenBMeasurement({
                            ...genBMeasurement,
                            anode_current: e.target.value === '' ? 0 : parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: HASIL CHECKLIST PEMERIKSAAN */}
          <div
            className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 ${
              mobileStep !== 3 && 'hidden md:block'
            }`}
          >
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ListCheck className="w-5 h-5 text-blue-600" />
                  <span>Item Pengecekan ({relevantChecklistItems.length} Item)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lakukan pengujian fisik dan fungsi sesuai daftar berikut
                </p>
              </div>

              <button
                type="button"
                onClick={handleSetAllBaik}
                className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Set Semua Baik</span>
              </button>
            </div>



            {/* Checklist Items Table / Cards */}
            <div className="space-y-2 border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
              {relevantChecklistItems.length > 0 ? (
                relevantChecklistItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                        {item.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleChecklistChange(item.id, 'Baik')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          checklistResults[item.id] === 'Baik'
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Baik
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChecklistChange(item.id, 'Temuan')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          checklistResults[item.id] === 'Temuan'
                            ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-600/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Temuan
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  Belum ada checklist item terdaftar untuk frekuensi {frequencies.find((f) => f.id === selectedFrequencyId)?.name}.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: SELESAI / KONDISI AKHIR */}
          <div
            className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 ${
              mobileStep !== 4 && 'hidden md:block'
            }`}
          >
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span>Selesai / Kondisi Akhir Peralatan</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Isi catatan pekerjaan dan tentukan status kondisi akhir peralatan
              </p>
            </div>

            {/* Notes & Summary Status */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Catatan Pekerjaan / Hasil Inspeksi
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Isi catatan pemeriksaan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Kondisi Akhir Peralatan
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setOverallStatus('OK')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      overallStatus === 'OK'
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Normal (OK)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverallStatus('NEEDS_REPAIR')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      overallStatus === 'NEEDS_REPAIR'
                        ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Perlu Perbaikan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverallStatus('NG')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      overallStatus === 'NG'
                        ? 'bg-red-500 border-red-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>Rusak (NG)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY SUMMARY PANEL (IMAGE 2) */}
        <div className={`lg:col-span-4 space-y-6 ${mobileStep !== 4 ? 'hidden lg:block' : ''}`}>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs sticky top-6 space-y-5">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              Ringkasan Pemeriksaan
            </h3>

            {/* Key Value Details */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-100">
                <span>Teknisi</span>
                <span className="font-bold text-slate-900">
                  {selectedEquipment ? 'Luthfi / Duty Tech' : 'Belum dipilih'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-100">
                <span>Tanggal</span>
                <span className="font-bold text-slate-900">
                  {new Date().toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-100">
                <span>Frekuensi</span>
                <span className="font-bold text-slate-900">
                  {frequencies.find((f) => f.id === selectedFrequencyId)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-100">
                <span>Mode</span>
                <span className="font-bold text-slate-900">
                  {isXRay ? (viewType === 'dual' ? 'Dual View' : 'Single View') : 'Standard'}
                </span>
              </div>
            </div>

            {/* Kelengkapan Data Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Kelengkapan data</span>
                <span>{completenessPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${completenessPercent}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-400">
                {completenessPercent < 100 ? 'Lengkapi foto dan checklist items' : 'Siap dikirim!'}
              </p>
            </div>

            {/* Submit & Draft Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCreateCollage}
                className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Buat Kolase Foto WA</span>
              </button>
              <button
                type="submit"
                className={`w-full py-3 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 text-white ${
                  existingEntry
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{existingEntry ? 'Update Data Laporan' : 'Kirim Laporan'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Navigation */}
        <div className="block md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg z-50">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            {mobileStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
            ) : (
              <div></div>
            )}

            {mobileStep < 4 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* SUCCESS POPUP MODAL */}
      {successPopupInfo.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Pemeriksaan Berhasil Disimpan</h3>
              <p className="text-xs font-bold text-blue-600 uppercase mt-1">
                {successPopupInfo.typeName} - {successPopupInfo.eqName}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Data laporan preventive berhasil dimasukkan ke sistem.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessPopupInfo({ show: false, typeName: '', eqName: '' })}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* PHOTO COLLAGE MODAL FOR WHATSAPP */}
      {showCollageModal && collageUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-4 shadow-2xl border border-slate-100 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Kolase Foto WhatsApp</h3>
                  <p className="text-[10px] text-slate-500">Siap diunduh dan dikirim ke grup WhatsApp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCollageModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 shadow-inner max-h-80 flex items-center justify-center p-1">
              <img src={collageUrl} alt="Photo Collage" className="max-h-80 w-auto object-contain rounded-lg" />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={collageUrl}
                download={`Kolase_XRay_${selectedEquipment?.equipment_code || 'Machine'}.jpg`}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
              >
                <Download className="w-4 h-4" />
                <span>Download Foto (JPG)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const text = `*DOKUMENTASI FOTO PREVENTIVE*\nMesin: ${selectedEquipment?.name}\nKode: ${selectedEquipment?.equipment_code}\nTanggal: ${new Date().toLocaleDateString('id-ID')}\nStatus: NORMAL (OK)\n\n*(Foto kolase telah diunduh, silakan lampirkan foto ke chat WhatsApp)*`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
              >
                <Send className="w-4 h-4" />
                <span>Kirim WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
