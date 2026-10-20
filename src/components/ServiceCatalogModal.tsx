import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Search,
  Plus,
  FileSpreadsheet,
  Check,
  ClipboardList,
  Sparkles,
  Edit2,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Tag,
  Users,
  CheckCircle2,
  Link2,
  Calculator,
  ArrowLeftRight,
} from 'lucide-react';
import {
  ServiceCatalogItem,
  CANONICAL_SERVICE_CATALOG,
  parsePastedPriceList,
  parseSpreadsheetBuffer,
  convertItemForCleanersCount,
  normalizeAndRepairCatalogItems,
  buildPriceListWorkbook,
  generatePriceListSheetRows,
  generateCombinedAllCleanersCatalog,
  generateJobberMasterSinglePageSheetRows,
} from '../data/serviceCatalogData';
import { saveServiceCatalogToFirestore } from '../services/firestoreSyncService';
import { downloadFileFromApiWithoutNavigation } from '../services/googleDriveBackupService';

interface ServiceCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: ServiceCatalogItem[];
  onCatalogUpdated: (newCatalog: ServiceCatalogItem[]) => void;
  onSelectForQuote?: (item: ServiceCatalogItem) => void;
  projectId?: string;
}

export const ServiceCatalogModal: React.FC<ServiceCatalogModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onCatalogUpdated,
  onSelectForQuote,
  projectId = 'tidyups',
}) => {
  const [liveCatalog, setLiveCatalog] = useState<ServiceCatalogItem[]>(() =>
    normalizeAndRepairCatalogItems(
      catalog && catalog.length > 0 ? catalog : CANONICAL_SERVICE_CATALOG
    )
  );
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [pageLayoutMode, setPageLayoutMode] = useState<'COMBINED_1_2_3' | 'SINGLE_CREW'>('COMBINED_1_2_3');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [importMode, setImportMode] = useState<'REPLACE' | 'APPEND'>('REPLACE');
  const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Attached file state (Excel .xlsx, .xls, .csv, .tsv, Google Sheets export)
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    sizeKb: string;
    type: string;
    itemCount: number;
  } | null>(null);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state for Add/Edit
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ServiceCatalogItem['category']>('MOVE_OUT');
  const [formServiceType, setFormServiceType] = useState<ServiceCatalogItem['serviceType']>('Move-Out Cleaning');
  const [formBedrooms, setFormBedrooms] = useState('2 Bedrooms');
  const [formBathrooms, setFormBathrooms] = useState('2 Bathrooms');
  const [formQuantity, setFormQuantity] = useState('3.0');
  const [formUnitPrice, setFormUnitPrice] = useState('105.00');
  const [formTotal, setFormTotal] = useState('315.00');
  const [formCleanersCount, setFormCleanersCount] = useState('2');
  const [formDeposit, setFormDeposit] = useState('100.00');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formIsActive, setFormIsActive] = useState(true);

  // Sync when parent catalog prop changes
  useEffect(() => {
    if (catalog && catalog.length > 0) {
      setLiveCatalog(normalizeAndRepairCatalogItems(catalog));
    }
  }, [catalog]);

  // Fetch the latest saved price list from backend whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/price-list?project=${projectId}&t=${Date.now()}`, {
      headers: { 'x-project-id': projectId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
          const repaired = normalizeAndRepairCatalogItems(data.items);
          setLiveCatalog(repaired);
          onCatalogUpdated(repaired);
          try {
            localStorage.setItem('tidyups_service_catalog_live', JSON.stringify(repaired));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem('tidyups_service_catalog_live');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const repaired = normalizeAndRepairCatalogItems(parsed);
              setLiveCatalog(repaired);
              onCatalogUpdated(repaired);
            }
          }
        } catch {}
      });
  }, [isOpen, projectId]);

  const persistCatalogEverywhere = async (nextItems: ServiceCatalogItem[]) => {
    const repaired = normalizeAndRepairCatalogItems(nextItems);
    setLiveCatalog(repaired);
    onCatalogUpdated(repaired);
    try {
      localStorage.setItem('tidyups_service_catalog_live', JSON.stringify(repaired));
    } catch {}

    // Push live price list to Firebase Firestore in background
    saveServiceCatalogToFirestore(repaired).catch(() => {});

    const res = await fetch(`/api/price-list?project=${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
      body: JSON.stringify({ items: repaired }),
    });
    const data = await res.json();
    if (data?.items && Array.isArray(data.items)) {
      const serverItems = normalizeAndRepairCatalogItems(data.items);
      setLiveCatalog(serverItems);
      onCatalogUpdated(serverItems);
      return serverItems;
    }
    return repaired;
  };

  const currentItems = useMemo(
    () =>
      liveCatalog && liveCatalog.length > 0
        ? liveCatalog
        : normalizeAndRepairCatalogItems(catalog),
    [liveCatalog, catalog]
  );

  const combinedAllCleanersItems = useMemo(
    () => generateCombinedAllCleanersCatalog(currentItems),
    [currentItems]
  );

  const displayedBaseItems = useMemo(
    () => (pageLayoutMode === 'COMBINED_1_2_3' ? combinedAllCleanersItems : currentItems),
    [pageLayoutMode, combinedAllCleanersItems, currentItems]
  );

  // Filtered catalog list
  const filteredItems = useMemo(() => {
    return displayedBaseItems.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.shortName || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.bedrooms || '').toLowerCase().includes(q) ||
        (item.bathrooms || '').toLowerCase().includes(q) ||
        (item.jobberItemName || '').toLowerCase().includes(q) ||
        String(item.unitPrice).includes(q) ||
        String(item.total).includes(q)
      );
    });
  }, [displayedBaseItems, selectedCategory, search]);

  // Preview of pasted or attached file text
  const parsedPreview = useMemo(() => {
    if (!pastedText.trim()) return [];
    return parsePastedPriceList(pastedText);
  }, [pastedText]);

  const categories = [
    { id: 'ALL', label: 'All Catalog Items', count: currentItems.length },
    { id: 'MOVE_OUT', label: 'Move-Out Cleaning', count: currentItems.filter((i) => i.category === 'MOVE_OUT').length },
    { id: 'DEEP_CLEAN', label: 'Deep Cleaning', count: currentItems.filter((i) => i.category === 'DEEP_CLEAN').length },
    { id: 'STANDARD_CLEAN', label: 'Initial / Standard', count: currentItems.filter((i) => i.category === 'STANDARD_CLEAN').length },
    { id: 'POST_CONSTRUCTION', label: 'Post-Construction', count: currentItems.filter((i) => i.category === 'POST_CONSTRUCTION').length },
    { id: 'RECURRING', label: 'Bi-Weekly Recurring', count: currentItems.filter((i) => i.category === 'RECURRING').length },
    { id: 'ADD_ON', label: 'Add-on Services', count: currentItems.filter((i) => i.category === 'ADD_ON').length },
    { id: 'HOURLY', label: 'Hourly Rates', count: currentItems.filter((i) => i.category === 'HOURLY').length },
  ];

  // Auto-calculate Total or convert Cleaners in Add/Edit form
  // Formula: Number of Cleaners ( QTY × Unit Price ) = Total
  const handleCleanersCountChange = (newCleanersStr: string) => {
    const prevCleaners = Math.max(1, parseInt(formCleanersCount || '2', 10));
    const nextCleaners = Math.max(1, parseInt(newCleanersStr || '2', 10));
    setFormCleanersCount(newCleanersStr);

    const q = parseFloat(formQuantity);
    const u = parseFloat(formUnitPrice);
    if (!isNaN(q) && !isNaN(u) && formCategory !== 'ADD_ON' && prevCleaners !== nextCleaners) {
      const converted = convertItemForCleanersCount(
        {
          cleanersCount: prevCleaners,
          quantity: q,
          unitPrice: u,
          total: Math.round(q * u * 100) / 100,
          isAddon: false,
        },
        nextCleaners
      );
      setFormQuantity(String(converted.quantity));
      setFormUnitPrice(converted.unitPrice.toFixed(2));
      setFormTotal(converted.total.toFixed(2));
    }
  };

  const handleQuantityChange = (val: string) => {
    setFormQuantity(val);
    const q = parseFloat(val);
    const u = parseFloat(formUnitPrice);
    if (!isNaN(q) && !isNaN(u)) {
      setFormTotal((q * u).toFixed(2));
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setFormUnitPrice(val);
    const q = parseFloat(formQuantity);
    const u = parseFloat(val);
    if (!isNaN(q) && !isNaN(u)) {
      setFormTotal((q * u).toFixed(2));
    }
  };

  // Toggle a single item between 1 Cleaner ($52.50), 2 Cleaners ($105.00), and 3 Cleaners ($157.50)
  const handleToggleItemCleaners = async (item: ServiceCatalogItem) => {
    if (item.isAddon) return;
    const baseId = item.id.replace(/-crew-[123]$/, '');
    const currentCleaners = Math.max(1, Number(item.cleanersCount) || 2);
    const targetCleaners = currentCleaners === 1 ? 2 : currentCleaners === 2 ? 3 : 1;
    const conv = convertItemForCleanersCount(item, targetCleaners);

    const nextCatalog = currentItems.map((c) =>
      c.id === item.id || c.id === baseId
        ? {
            ...c,
            cleanersCount: conv.cleanersCount,
            quantity: conv.quantity,
            unitPrice: conv.unitPrice,
            total: conv.total,
            baseHours: conv.quantity,
            basePrice: conv.total,
          }
        : c
    );

    try {
      await persistCatalogEverywhere(nextCatalog);
      setFeedbackNotice(
        `✓ Updated "${item.name}" to ${conv.cleanersCount} Cleaner${conv.cleanersCount > 1 ? 's' : ''} (${conv.quantity} × $${conv.unitPrice.toFixed(2)}) = $${conv.total.toFixed(2)} CAD`
      );
    } catch {
      setLiveCatalog(nextCatalog);
      onCatalogUpdated(nextCatalog);
    }
  };

  // Convert ALL residential items in the price list to 1 Cleaner or 2 Cleaners
  const handleConvertAllCleaners = async (targetCleaners: number) => {
    setIsSaving(true);
    const nextCatalog = currentItems.map((item) => {
      if (item.isAddon) return item;
      const conv = convertItemForCleanersCount(item, targetCleaners);
      return {
        ...item,
        cleanersCount: conv.cleanersCount,
        quantity: conv.quantity,
        unitPrice: conv.unitPrice,
        total: conv.total,
        baseHours: conv.quantity,
        basePrice: conv.total,
      };
    });

    try {
      await persistCatalogEverywhere(nextCatalog);
      setFeedbackNotice(
        `✓ Converted price list to ${targetCleaners} Cleaner${targetCleaners > 1 ? 's' : ''} formula: ${targetCleaners} Cleaner${targetCleaners > 1 ? 's' : ''} (QTY × Unit Price) = Total!`
      );
    } catch {
      setLiveCatalog(nextCatalog);
      onCatalogUpdated(nextCatalog);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file upload (.xlsx, .xls, .csv, .tsv, .txt)
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const sizeKb = (file.size / 1024).toFixed(1);

      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const { rawText } = parseSpreadsheetBuffer(arrayBuffer);
        setPastedText(rawText);
        const parsed = parsePastedPriceList(rawText);
        setAttachedFile({
          name: file.name,
          sizeKb,
          type: 'Excel Spreadsheet (.xlsx / .xls)',
          itemCount: parsed.length,
        });
      } else {
        const text = await file.text();
        setPastedText(text);
        const parsed = parsePastedPriceList(text);
        setAttachedFile({
          name: file.name,
          sizeKb,
          type: 'CSV / Spreadsheet Export',
          itemCount: parsed.length,
        });
      }
    } catch (err: any) {
      setFeedbackNotice(`Could not parse file: ${err.message || 'Invalid spreadsheet file format'}`);
    }
  };

  // Handle Google Sheets URL import
  const handleFetchGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) return;
    setIsFetchingSheet(true);
    try {
      const match = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        setFeedbackNotice('Please paste a valid Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/YOUR_ID/edit).');
        return;
      }
      const sheetId = match[1];
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error(`Google Sheets export returned status ${res.status}. Make sure the sheet is shared as "Anyone with the link can view".`);
      }
      const csvText = await res.text();
      setPastedText(csvText);
      const parsed = parsePastedPriceList(csvText);
      setAttachedFile({
        name: `Google Sheets (ID: ${sheetId.slice(0, 8)}...)`,
        sizeKb: `${(csvText.length / 1024).toFixed(1)}`,
        type: 'Google Sheets Live Sync',
        itemCount: parsed.length,
      });
    } catch (err: any) {
      setFeedbackNotice(`Google Sheets Import Note: ${err.message}`);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleClearAttachedFile = () => {
    setAttachedFile(null);
    setPastedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyPastedPriceList = async () => {
    if (parsedPreview.length === 0) return;
    setIsSaving(true);
    try {
      const nextCatalog =
        importMode === 'REPLACE'
          ? parsedPreview
          : [
              ...currentItems.filter(
                (c) => !parsedPreview.some((p) => p.name.toLowerCase() === c.name.toLowerCase())
              ),
              ...parsedPreview,
            ];

      await persistCatalogEverywhere(nextCatalog);
      setFeedbackNotice(
        `✓ Successfully saved ${nextCatalog.length} price list items! Formula: Number of Cleaners (QTY × Unit Price) = Total.`
      );
      setIsImportModalOpen(false);
      setPastedText('');
      setAttachedFile(null);
    } catch {
      const fallback = importMode === 'REPLACE' ? parsedPreview : [...currentItems, ...parsedPreview];
      setLiveCatalog(fallback);
      onCatalogUpdated(fallback);
      setFeedbackNotice(`✓ Applied ${parsedPreview.length} price items.`);
      setIsImportModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToCanonical = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/price-list/reset?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
      });
      const data = await res.json();
      const restored = normalizeAndRepairCatalogItems(
        data?.items && data.items.length > 0 ? data.items : CANONICAL_SERVICE_CATALOG
      );
      setLiveCatalog(restored);
      onCatalogUpdated(restored);
      try {
        localStorage.setItem('tidyups_service_catalog_live', JSON.stringify(restored));
      } catch {}
      setFeedbackNotice('✓ Service catalog restored to canonical Tidyups prices (Number of Cleaners × QTY × Unit Price = Total).');
    } catch {
      setLiveCatalog(CANONICAL_SERVICE_CATALOG);
      onCatalogUpdated(CANONICAL_SERVICE_CATALOG);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUnitPrice) return;
    setIsSaving(true);

    const qtyNum = Math.round(parseFloat(formQuantity || '1') * 100) / 100;
    const unitPriceNum = Math.round(parseFloat(formUnitPrice || '0') * 100) / 100;
    const totalNum = Math.round(qtyNum * unitPriceNum * 100) / 100;
    const depositNum = Math.round(parseFloat(formDeposit || '50') * 100) / 100;
    const cleanersNum = Math.max(1, parseInt(formCleanersCount || '2', 10));

    const categoryLabel =
      formCategory === 'MOVE_OUT'
        ? 'Move-Out Cleaning 2026'
        : formCategory === 'DEEP_CLEAN'
        ? 'Deep Cleaning Services 2026'
        : formCategory === 'POST_CONSTRUCTION'
        ? 'MoveIn - Post Construction'
        : formCategory === 'ADD_ON'
        ? 'Add-on Services'
        : formCategory === 'RECURRING'
        ? 'Bi-Weekly Recurring Residential Clean'
        : formCategory === 'HOURLY'
        ? 'Hourly Crew Rates'
        : 'Initial Basic / Standard Cleaning 2026';

    const newItem: ServiceCatalogItem = {
      id: editingItem ? editingItem.id : `cat-item-${Date.now()}`,
      category: formCategory,
      categoryLabel,
      name: formName.trim(),
      shortName: formName.trim().length > 35 ? `${formName.trim().slice(0, 32)}...` : formName.trim(),
      serviceType: formServiceType,
      bedrooms: formCategory !== 'ADD_ON' && formCategory !== 'HOURLY' ? formBedrooms : undefined,
      bathrooms: formCategory !== 'ADD_ON' && formCategory !== 'HOURLY' ? formBathrooms : undefined,
      beds: formCategory !== 'ADD_ON' && formCategory !== 'HOURLY' ? formBedrooms : undefined,
      baths: formCategory !== 'ADD_ON' && formCategory !== 'HOURLY' ? formBathrooms : undefined,
      quantity: qtyNum,
      unitPrice: unitPriceNum,
      total: totalNum,
      basePrice: totalNum,
      baseHours: qtyNum,
      cleanersCount: cleanersNum,
      depositRequired: depositNum,
      taxable: true,
      jobberItemName: formName.trim(),
      description:
        formDescription.trim() ||
        `${formName.trim()}\n${cleanersNum} Cleaner${cleanersNum > 1 ? 's' : ''} (${qtyNum} × $${unitPriceNum.toFixed(2)}) = $${totalNum.toFixed(2)} CAD`,
      isAddon: formCategory === 'ADD_ON',
      status: formStatus,
      isActive: formIsActive,
      sortOrder: editingItem ? editingItem.sortOrder : currentItems.length * 10,
    };

    let nextCatalog: ServiceCatalogItem[];
    if (editingItem) {
      nextCatalog = currentItems.map((item) => (item.id === editingItem.id ? newItem : item));
    } else {
      nextCatalog = [newItem, ...currentItems];
    }

    try {
      await persistCatalogEverywhere(nextCatalog);
      setFeedbackNotice(
        `✓ Saved "${newItem.name}": ${cleanersNum} Cleaner${cleanersNum > 1 ? 's' : ''} (${newItem.quantity} × $${newItem.unitPrice.toFixed(2)}) = $${newItem.total.toFixed(2)} CAD`
      );
      setIsAddItemModalOpen(false);
      setEditingItem(null);
    } catch {
      setLiveCatalog(nextCatalog);
      onCatalogUpdated(nextCatalog);
      setIsAddItemModalOpen(false);
      setEditingItem(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    const nextCatalog = currentItems.filter((i) => i.id !== itemId);
    try {
      await persistCatalogEverywhere(nextCatalog);
      setFeedbackNotice(`✓ Removed "${name}" from price list.`);
    } catch {
      setLiveCatalog(nextCatalog);
      onCatalogUpdated(nextCatalog);
    }
  };

  const startEdit = (item: ServiceCatalogItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormServiceType(item.serviceType);
    setFormBedrooms(item.bedrooms || item.beds || '2 Bedrooms');
    setFormBathrooms(item.bathrooms || item.baths || '2 Bathrooms');
    setFormQuantity(String(item.quantity ?? item.baseHours ?? 3));
    setFormUnitPrice(String(item.unitPrice ?? item.basePrice ?? 105));
    setFormTotal(String(item.total ?? item.basePrice ?? 315));
    setFormCleanersCount(String(item.cleanersCount || 2));
    setFormDeposit(String(item.depositRequired || 0));
    setFormDescription(item.description || '');
    setFormStatus(item.status || 'Active');
    setFormIsActive(item.isActive !== false);
    setIsAddItemModalOpen(true);
  };

  const startAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('MOVE_OUT');
    setFormServiceType('Move-Out Cleaning');
    setFormBedrooms('2 Bedrooms');
    setFormBathrooms('2 Bathrooms');
    setFormQuantity('3');
    setFormUnitPrice('105.00');
    setFormTotal('315.00');
    setFormCleanersCount('2');
    setFormDeposit('100.00');
    setFormDescription('');
    setFormStatus('Active');
    setFormIsActive(true);
    setIsAddItemModalOpen(true);
  };

  // Download Single-Page Jobber Master Price List (.xlsx) with 1, 2 & 3 Cleaners + TAXABLE=true
  const handleDownloadGoogleSheetsXlsx = async () => {
    try {
      await persistCatalogEverywhere(currentItems);
    } catch {}

    const wb = buildPriceListWorkbook(currentItems);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Tidyups_Jobber_Master_Price_List_1_2_3_Cleaners_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    setFeedbackNotice(
      `✓ Downloaded "${filename}" (Single Page with 1 Cleaner, 2 Cleaners & 3 Cleaners + TAXABLE = true for all ${combinedAllCleanersItems.length} items)!`
    );
  };

  // Download Single-Page Jobber Master Price List as jobber-products-services-import.csv (all 108 items)
  const handleDownloadJobberMasterCsv = async () => {
    try {
      await persistCatalogEverywhere(currentItems);
    } catch {}

    const { headers, rows } = generateJobberMasterSinglePageSheetRows(currentItems);
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((r) => r.map(escapeCsv).join(',')),
    ].join('\r\n');

    const filename = `jobber-products-services-import.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedbackNotice(
      `✓ Downloaded "${filename}" (${rows.length} items)! Exact Jobber columns: Name, Description, Unit Price (plain number), Taxable (TRUE), Category (Service), Active (TRUE).`
    );
  };

  // Optional: Also allow uploading CSV to Google Drive folder
  const handleDownloadGoogleSheetsCsv = async () => {
    await handleDownloadJobberMasterCsv();
  };

  if (!isOpen) return null;

  // Live preview of formula in Add/Edit modal
  const formCleanersNum = Math.max(1, parseInt(formCleanersCount || '2', 10));
  const formQtyNum = parseFloat(formQuantity || '3') || 0;
  const formUnitNum = parseFloat(formUnitPrice || '105') || 0;
  const formTotalNum = Math.round(formQtyNum * formUnitNum * 100) / 100;
  const formAltCleaners = formCleanersNum === 2 ? 1 : 2;
  const formAltConverted = convertItemForCleanersCount(
    {
      cleanersCount: formCleanersNum,
      quantity: formQtyNum,
      unitPrice: formUnitNum,
      total: formTotalNum,
      isAddon: formCategory === 'ADD_ON',
    },
    formAltCleaners
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
              <ClipboardList className="w-5 h-5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Service Catalog &amp; Price List
                </h2>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-400/30">
                  Number of Cleaners ( QTY × Unit Price ) = Total
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Example: 1 Bed 1 Bath Move-Out → <strong className="text-white">2 Cleaners (3 × $105.00) = $315.00</strong> &nbsp;|&nbsp; <strong className="text-emerald-300">1 Cleaner (6 × $52.50) = $315.00</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Jobber Master CSV (108 Items: Name, Description, Unit Price, Taxable, Category, Active) */}
            <button
              onClick={handleDownloadJobberMasterCsv}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Download jobber-products-services-import.csv (All 108 items with exact Jobber headers: Name, Description, Unit Price, Taxable, Category, Active)"
            >
              <Download className="w-4 h-4" />
              <span>Download jobber-products-services-import.csv (108 Items)</span>
            </button>

            {/* Download Updated Single-Sheet (.xlsx) */}
            <button
              onClick={handleDownloadGoogleSheetsXlsx}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
              title="Download single-sheet Excel (.xlsx) with all 108 Jobber items"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Single-Page .XLSX</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Upload Excel, CSV, Google Sheets, or paste price list with quantities and unit prices"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Attach / Paste List</span>
            </button>

            <button
              onClick={startAdd}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <button
              onClick={handleResetToCanonical}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
              title="Reset & sync all 108 Jobber items"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formula & Single-Page 108-Item Jobber Mapping Banner */}
        <div className="px-4 py-2.5 bg-purple-950/5 border-b border-purple-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-extrabold text-purple-950">
              <Calculator className="w-4 h-4 text-purple-700" />
              <span>Jobber 108-Item Mapping:</span>
            </span>
            <code className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono font-extrabold text-xs">
              Name | Description | Unit Price | Taxable: TRUE | Category: Service | Active: TRUE
            </code>
            <span className="text-slate-600">
              • <strong>108 Items Mapped 1-to-1</strong> (31 × 1 Cleaner + 31 × 2 Cleaners + 31 × 3 Cleaners + 15 Hourly/Add-Ons)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPageLayoutMode('COMBINED_1_2_3')}
              className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                pageLayoutMode === 'COMBINED_1_2_3'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title="Show 1 Cleaner at top, 2 Cleaners lower down, and 3 Cleaners lower down again on ONE single page"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>All on 1 Page (1, 2 &amp; 3 Cleaners)</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setPageLayoutMode('SINGLE_CREW');
                handleConvertAllCleaners(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Convert base catalog to 1 Cleaner (QTY × $52.50)"
            >
              <Users className="w-3 h-3" />
              <span>1 Cleaner ($52.50)</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setPageLayoutMode('SINGLE_CREW');
                handleConvertAllCleaners(2);
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Convert base catalog to 2 Cleaners (QTY × $105.00)"
            >
              <Users className="w-3 h-3" />
              <span>2 Cleaners ($105.00)</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setPageLayoutMode('SINGLE_CREW');
                handleConvertAllCleaners(3);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Convert base catalog to 3 Cleaners (QTY × $157.50)"
            >
              <Users className="w-3 h-3" />
              <span>3 Cleaners ($157.50)</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Notice */}
        {feedbackNotice && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackNotice}</span>
            </div>
            <button onClick={() => setFeedbackNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toolbar: Search & Category Filter */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by service name, bedrooms, rate, Jobber line item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
            <span>Showing {filteredItems.length} of {displayedBaseItems.length} items</span>
            <span>•</span>
            <button
              type="button"
              onClick={handleDownloadJobberMasterCsv}
              className="text-emerald-700 hover:text-emerald-900 font-sans font-bold underline flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Jobber Master .CSV</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto text-xs font-medium no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] font-mono ${
                  selectedCategory === cat.id ? 'text-purple-100' : 'text-slate-500'
                }`}
              >
                ({cat.count})
              </span>
            </button>
          ))}
        </div>

        {/* Main Price List Table with exact schema: Service Name | Category | Beds/Baths | # Cleaners | Quantity | Unit Price | Formula | Total | TAXABLE | Status | Actions */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Name (Jobber Item Name)</th>
                <th className="py-2.5 px-2.5">Category</th>
                <th className="py-2.5 px-2.5">Beds / Baths</th>
                <th className="py-2.5 px-2.5 text-center"># Cleaners</th>
                <th className="py-2.5 px-2.5 text-center">QTY</th>
                <th className="py-2.5 px-2.5 text-right bg-amber-50/70 text-amber-950">Unit Price</th>
                <th className="py-2.5 px-3">Description / Formula (QTY × Unit Price = Total)</th>
                <th className="py-2.5 px-3 text-right">Total (CAD)</th>
                <th className="py-2.5 px-2.5 text-center bg-emerald-50 text-emerald-900">Taxable</th>
                <th className="py-2.5 px-2 text-center bg-emerald-50/60 text-emerald-900">Active</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No matching service items found</p>
                    <p className="text-xs mt-1">Try clearing your search or paste a new price list</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const cleaners = Math.max(1, Number(item.cleanersCount) || 1);
                  const qty = Number(item.quantity ?? item.baseHours ?? 1);
                  const unitPrice = Number(item.unitPrice ?? item.basePrice ?? 0);
                  const total = Number(item.total ?? Math.round(qty * unitPrice * 100) / 100);
                  const isTaxable = item.taxable !== false;

                  const prevItem = idx > 0 ? filteredItems[idx - 1] : null;
                  const getSectionGroup = (it: ServiceCatalogItem) => {
                    if (it.isAddon || it.category === 'HOURLY') return 'ADDON_HOURLY';
                    return `CREW_${it.cleanersCount || 2}`;
                  };
                  const currGroup = getSectionGroup(item);
                  const prevGroup = prevItem ? getSectionGroup(prevItem) : null;
                  const showSectionHeader = pageLayoutMode === 'COMBINED_1_2_3' && currGroup !== prevGroup;

                  const altCleaners = cleaners === 1 ? 2 : cleaners === 2 ? 3 : 1;
                  const altConv = convertItemForCleanersCount(item, altCleaners);
                  const exactJobberName = item.jobberItemName || item.name;

                  return (
                    <React.Fragment key={item.id}>
                      {showSectionHeader && (
                        <tr className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white">
                          <td colSpan={11} className="py-2.5 px-4 font-extrabold text-xs tracking-wide">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-400" />
                                <span>
                                  {currGroup === 'CREW_1'
                                    ? 'SECTION 1: 1 CLEANER PRICE LIST (31 Items — Unit Price: 52.50 / 57.50 / 49.00 — Category: Service — Taxable: TRUE)'
                                    : currGroup === 'CREW_2'
                                    ? 'SECTION 2: 2 CLEANERS PRICE LIST (31 Items — Unit Price: 105.00 / 115.00 / 98.00 — Category: Service — Taxable: TRUE)'
                                    : currGroup === 'CREW_3'
                                    ? 'SECTION 3: 3 CLEANERS PRICE LIST (31 Items — Unit Price: 157.50 / 172.50 / 147.00 — Category: Service — Taxable: TRUE)'
                                    : 'SECTION 4: HOURLY RATES & ADD-ON SERVICES (15 Items — Category: Service — Taxable: TRUE)'}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-emerald-300">
                                Mapped 1-to-1 with jobber-products-services-import.csv (108 Items)
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-purple-50/40 transition-colors group">
                        {/* Name & Jobber Item */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 group-hover:text-purple-900 flex items-center gap-1.5">
                            <span>{exactJobberName}</span>
                            {item.isAddon && (
                              <span className="text-[10px] font-bold text-pink-700">
                                · Add-on
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                            {item.description}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-2.5 text-[11px] text-slate-600">
                          <div className="font-mono font-bold text-slate-900">Service</div>
                          <div className="text-[10px] text-slate-400">{item.categoryLabel || item.category}</div>
                        </td>

                        {/* Beds / Baths */}
                        <td className="py-2.5 px-2.5 text-slate-600 font-mono text-[11px]">
                          {item.bedrooms || item.bathrooms || item.beds || item.baths ? (
                            <div className="flex items-center gap-1">
                              {(item.bedrooms || item.beds) && <span>{item.bedrooms || item.beds}</span>}
                              {(item.bedrooms || item.beds) && (item.bathrooms || item.baths) && <span>·</span>}
                              {(item.bathrooms || item.baths) && <span>{item.bathrooms || item.baths}</span>}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Number of Cleaners with 1-Click Toggle */}
                        <td className="py-2.5 px-2.5 text-center">
                          {item.isAddon ? (
                            <span className="text-[11px] font-mono text-slate-400">1</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleItemCleaners(item)}
                              title="Click to cycle between 1 Cleaner ($52.50), 2 Cleaners ($105.00), and 3 Cleaners ($157.50)"
                              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                cleaners === 3
                                  ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900'
                                  : cleaners === 2
                                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-900'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                              }`}
                            >
                              <span>{cleaners} Cln</span>
                              <ArrowLeftRight className="w-3 h-3 opacity-70" />
                            </button>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900">
                          {qty}
                        </td>

                        {/* Unit Price (Plain number for Jobber) */}
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 bg-amber-50/30">
                          <div>{unitPrice.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400 font-normal">(${unitPrice.toFixed(2)})</div>
                        </td>

                        {/* Formula: Number of Cleaners ( QTY × Unit Price ) = Total */}
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {item.isAddon ? (
                            <div className="text-slate-700 font-bold">
                              1 ({qty} × ${unitPrice.toFixed(2)}) = ${total.toFixed(2)}
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-purple-900">
                                {cleaners} Cleaner{cleaners > 1 ? 's' : ''} ({qty} × ${unitPrice.toFixed(2)}) = ${total.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {altCleaners} Cleaner{altCleaners > 1 ? 's' : ''} ({altConv.quantity} × ${altConv.unitPrice.toFixed(2)}) = ${altConv.total.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Total = Qty * Unit Price */}
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-700 text-xs">
                          ${total.toFixed(2)}
                        </td>

                        {/* Taxable (TRUE/FALSE) */}
                        <td className="py-2.5 px-2.5 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                            {isTaxable ? 'TRUE' : 'FALSE'}
                          </span>
                        </td>

                        {/* Active (TRUE/FALSE) */}
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${item.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                            {item.isActive !== false ? 'TRUE' : 'FALSE'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onSelectForQuote && (
                              <button
                                onClick={() => {
                                  onSelectForQuote({
                                    ...item,
                                    jobberItemName: exactJobberName,
                                  });
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                title="Add this line item to the current quote"
                              >
                                Use
                              </button>
                            )}
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 rounded cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-800">
              Single-Page Combined Items: {combinedAllCleanersItems.length} (1, 2 &amp; 3 Cleaners + Add-ons)
            </span>
            <span>·</span>
            <span className="font-mono text-emerald-700 font-bold">
              TAXABLE = true (All Items)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadJobberMasterCsv}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Jobber Master CSV (1, 2 &amp; 3 Cleaners)</span>
            </button>
            <button
              onClick={handleDownloadGoogleSheetsXlsx}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Single-Page .XLSX</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold cursor-pointer transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* ── PASTE / ATTACH / IMPORT PRICE LIST MODAL ── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
                  <Upload className="w-4 h-4 text-white" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Attach File or Paste Price List
                  </h3>
                  <p className="text-xs text-slate-400">
                    Formula: Number of Cleaners ( QTY × Unit Price ) = Total
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Attach Spreadsheet File (.xlsx, .xls, .csv, .tsv)
                </label>

                {attachedFile ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-emerald-950 flex items-center gap-2">
                          <span>{attachedFile.name}</span>
                          <span className="text-[10px] font-bold text-emerald-700">
                            · Attached &amp; Loaded
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700 mt-0.5">
                          {attachedFile.type} · {attachedFile.sizeKb} KB ·{' '}
                          <span className="font-bold">{attachedFile.itemCount} items detected</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearAttachedFile}
                      className="px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear File
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-2xl bg-slate-50 hover:bg-purple-50/30 transition-all">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Upload Excel (.xlsx, .xls) or CSV / TSV File
                        </div>
                        <div className="text-[11px] text-slate-500">
                          File name and parsed line items will stay loaded in the catalog
                        </div>
                      </div>
                    </div>

                    <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Browse Spreadsheet</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv, .tsv, text/csv, text/tab-separated-values, text/plain"
                        onChange={handleFileSelected}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Or Fetch from Google Sheets URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                      value={googleSheetsUrl}
                      onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchGoogleSheets}
                    disabled={isFetchingSheet || !googleSheetsUrl.trim()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {isFetchingSheet ? 'Fetching...' : 'Fetch Sheet'}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    3. Or Paste Cells from Google Sheets / Excel / Text
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    SERVICE NAME · CATEGORY · BEDS · BATHS · CLEANERS · QUANTITY · UNIT PRICE · TOTAL
                  </span>
                </div>
                <textarea
                  rows={6}
                  placeholder={`SERVICE NAME/JOBBER LINE ITEM	CATEGORY	BEDS	BATHS	NUMBER OF CLEANERS	QUANTITY	UNIT PRICE (CAD)	TOTAL (CAD)	STATUS	ACTIVE?
1Bed 1Bath Moveout Cleaning 2026	Move-Out Cleaning	1 Bedroom	1 Bathroom	2	3	105.00	315.00	Active	Yes
2Bed 2Bath Moveout Cleaning - Online Booking	Move-Out Cleaning	2 Bedrooms	2 Bathrooms	2	3	105.00	315.00	Active	Yes`}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[11px] uppercase font-mono">Mode:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'REPLACE'}
                    onChange={() => setImportMode('REPLACE')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>Replace entire catalog with this updated list (Recommended)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'APPEND'}
                    onChange={() => setImportMode('APPEND')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>Add / Update matching items (Keep existing)</span>
                </label>
              </div>

              {parsedPreview.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Detected {parsedPreview.length} Price List Items</span>
                    </span>
                    <span className="text-[11px] font-mono text-purple-700 font-bold">
                      Formula: Number of Cleaners ( QTY × Unit Price ) = Total
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-purple-200 bg-white">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-purple-100/60 text-purple-900 font-bold sticky top-0 text-[10px]">
                        <tr>
                          <th className="p-2">Service Name</th>
                          <th className="p-2 text-center"># Cleaners</th>
                          <th className="p-2 text-center">QTY</th>
                          <th className="p-2 text-right">Unit Price</th>
                          <th className="p-2">Formula</th>
                          <th className="p-2 text-right">Total (CAD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100 font-mono">
                        {parsedPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-purple-50/50">
                            <td className="p-2 font-sans font-bold text-slate-800">
                              {item.name}
                            </td>
                            <td className="p-2 text-center text-purple-800 font-bold">
                              {item.cleanersCount || 2}
                            </td>
                            <td className="p-2 text-center text-slate-700 font-bold">
                              {item.quantity}
                            </td>
                            <td className="p-2 text-right text-slate-700">
                              ${item.unitPrice.toFixed(2)}
                            </td>
                            <td className="p-2 text-[10px] text-purple-900">
                              {item.cleanersCount || 2} ({item.quantity} × ${item.unitPrice.toFixed(2)}) = ${item.total.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-bold text-emerald-700">
                              ${item.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedPreview.length === 0 || isSaving}
                onClick={handleApplyPastedPriceList}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSaving ? 'Saving to Price List...' : `Save ${parsedPreview.length} Items to Service Catalog`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT ITEM MODAL ── */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                  <Tag className="w-4 h-4 text-white" />
                </span>
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingItem ? 'Edit Service Catalog Item' : 'Add New Service Catalog Item'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Service Name / Jobber Line Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1Bed 1Bath Moveout Cleaning 2026"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as ServiceCatalogItem['category'];
                      setFormCategory(cat);
                      if (cat === 'MOVE_OUT') setFormServiceType('Move-Out Cleaning');
                      else if (cat === 'DEEP_CLEAN') setFormServiceType('Deep Cleaning');
                      else if (cat === 'POST_CONSTRUCTION') setFormServiceType('Post-Construction Cleaning');
                      else if (cat === 'ADD_ON') setFormServiceType('Add-on');
                      else if (cat === 'HOURLY') setFormServiceType('Hourly Crew Rates' as any);
                      else setFormServiceType('Standard Cleaning');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white font-medium"
                  >
                    <option value="MOVE_OUT">Move-Out Cleaning 2026</option>
                    <option value="DEEP_CLEAN">Deep Cleaning Services 2026</option>
                    <option value="STANDARD_CLEAN">Initial / Standard Clean 2026</option>
                    <option value="POST_CONSTRUCTION">MoveIn - Post Construction</option>
                    <option value="RECURRING">Bi-Weekly Recurring Residential Clean</option>
                    <option value="ADD_ON">Add-on Services</option>
                    <option value="HOURLY">Hourly Crew Rates</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {formCategory !== 'ADD_ON' && formCategory !== 'HOURLY' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bedrooms</label>
                    <select
                      value={formBedrooms}
                      onChange={(e) => setFormBedrooms(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white"
                    >
                      <option value="Studio Apartment">Studio Apartment</option>
                      <option value="1 Bedroom">1 Bedroom</option>
                      <option value="2 Bedrooms">2 Bedrooms</option>
                      <option value="3 Bedrooms">3 Bedrooms</option>
                      <option value="4 Bedrooms">4 Bedrooms</option>
                      <option value="5 Bedrooms">5 Bedrooms</option>
                      <option value="6+ Bedrooms">6+ Bedrooms</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bathrooms</label>
                    <select
                      value={formBathrooms}
                      onChange={(e) => setFormBathrooms(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white"
                    >
                      <option value="1 Bathroom">1 Bathroom</option>
                      <option value="1.5 Bathrooms">1.5 Bathrooms</option>
                      <option value="2 Bathrooms">2 Bathrooms</option>
                      <option value="2.5 Bathrooms">2.5 Bathrooms</option>
                      <option value="3 Bathrooms">3 Bathrooms</option>
                      <option value="3.5 Bathrooms">3.5 Bathrooms</option>
                      <option value="4+ Bathrooms">4+ Bathrooms</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Formula Calculation: Number of Cleaners ( QTY × Unit Price ) = Total */}
              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-1.5 text-purple-900 font-extrabold text-[11px]">
                    <Calculator className="w-3.5 h-3.5 text-purple-600" />
                    <span>Formula: Number of Cleaners ( QTY × Unit Price ) = Total</span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-700 font-bold">
                    Switching cleaners auto-adjusts QTY &amp; Unit Price
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1"># of Cleaners *</label>
                    <select
                      value={formCleanersCount}
                      onChange={(e) => handleCleanersCountChange(e.target.value)}
                      className="w-full px-2.5 py-2 border border-purple-300 rounded-xl font-bold text-purple-900 bg-white"
                    >
                      <option value="1">1 Cleaner ($52.50)</option>
                      <option value="2">2 Cleaners ($105.00)</option>
                      <option value="3">3 Cleaners ($157.50)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Crew size</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity (QTY) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={formQuantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl font-mono font-bold bg-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Hours / Units</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formUnitPrice}
                      onChange={(e) => handleUnitPriceChange(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl font-mono font-bold text-purple-700 bg-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Rate for crew</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total ($ CAD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formTotal}
                      onChange={(e) => setFormTotal(e.target.value)}
                      className="w-full px-2.5 py-2 border border-emerald-300 rounded-xl font-mono font-extrabold text-emerald-700 bg-emerald-50/50"
                    />
                    <span className="text-[10px] text-emerald-600 mt-0.5 block">Jobber Total</span>
                  </div>
                </div>

                {/* Live Formula Readout */}
                <div className="p-2.5 rounded-xl bg-white border border-purple-200/80 font-mono text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="font-bold text-purple-950">
                    {formCleanersNum} Cleaner{formCleanersNum > 1 ? 's' : ''} ( {formQtyNum} × ${formUnitNum.toFixed(2)} ) = ${formTotalNum.toFixed(2)} CAD
                  </div>
                  {formCategory !== 'ADD_ON' && (
                    <div className="text-slate-600 text-[10px]">
                      {formAltCleaners} Cleaner{formAltCleaners > 1 ? 's' : ''} eq: {formAltCleaners} ( {formAltConverted.quantity} × ${formAltConverted.unitPrice.toFixed(2)} ) = ${formAltConverted.total.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deposit Required ($)</label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={formDeposit}
                    onChange={(e) => setFormDeposit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Active in Catalog?</label>
                  <select
                    value={formIsActive ? 'yes' : 'no'}
                    onChange={(e) => setFormIsActive(e.target.value === 'yes')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="yes">Yes (Active)</option>
                    <option value="no">No (Hidden)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Line Item Description (Jobber &amp; Customer View)
                </label>
                <textarea
                  rows={2}
                  placeholder={`1Bed 1Bath Moveout Cleaning 2026\n2 Cleaners (3 × $105.00) = $315.00 CAD`}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Update Line Item' : 'Add to Catalog'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
