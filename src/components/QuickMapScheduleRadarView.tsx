import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Phone,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Trash2,
  Maximize2,
  Layers,
  Compass,
  Crosshair,
  Route,
  ExternalLink,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowLeft,
  Eye,
  Home,
  FileSpreadsheet,
} from 'lucide-react';
import { AdLeadItem } from '../types/lead';
import { Technician } from '../types/dispatch';
import { ScheduledJobItem, getEdmontonToday, getCleanerColor } from '../data/jobberCalendarData';
import { JobberQuote } from '../services/jobberSyncModules';
import { forwardGeocode, reverseGeocode, calculateDistanceKm, calculateDriveEstimates } from '../services/geocodingService';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

export interface DroppedRadarPin {
  id: string;
  label: string;
  subtitle?: string;
  address: string;
  phone?: string;
  amount?: number;
  lat: number;
  lng: number;
  color: string;
  sourceType?: 'CUSTOM' | 'LEAD' | 'QUOTE' | 'VISIT' | 'HUB';
}

export type MapClickBehavior = 'DROP_NEW_PIN' | 'MOVE_ACTIVE_PIN' | 'PAN_ONLY';
export type StreetTileStyle = 'OSM_STREETS' | 'VOYAGER_RETINA' | 'SATELLITE_HYBRID' | 'GOOGLE_EMBED';

interface QuickMapScheduleRadarViewProps {
  mode?: 'FULL_PAGE' | 'EMBEDDED';
  technicians: Technician[];
  scheduledJobs: ScheduledJobItem[];
  leads?: AdLeadItem[];
  quotes?: JobberQuote[];
  selectedDate?: string;
  onSelectedDateChange?: (dateIso: string) => void;
  externalPinRequest?: {
    title: string;
    subtitle?: string;
    address: string;
    phone?: string;
    amount?: number;
    lat?: number;
    lng?: number;
    type?: 'LEAD' | 'QUOTE' | 'VISIT' | 'HUB';
    addAsExtraPin?: boolean;
    timestamp: number;
  } | null;
  onOpenDedicatedPage?: () => void;
  onNavigateToMasterHub?: () => void;
  onNavigateToFullDispatchMap?: () => void;
  onNavigateToSchedule?: () => void;
  onBookCleaner?: (
    cleaner: Technician,
    clientAddress: string,
    clientName?: string,
    clientPhone?: string,
    serviceType?: string
  ) => void;
}

const PIN_PALETTE = [
  '#E11D48', // Pin 1 (A): Rose Red
  '#0284C7', // Pin 2 (B): Sky Blue
  '#7C3AED', // Pin 3 (C): Royal Violet
  '#D97706', // Pin 4 (D): Amber Gold
  '#059669', // Pin 5 (E): Emerald
  '#DB2777', // Pin 6 (F): Pink
  '#4F46E5', // Pin 7 (G): Indigo
  '#0D9488', // Pin 8 (H): Teal
];

const EDMONTON_PRESETS = [
  { label: 'Downtown (Jasper Ave)', addr: '10405 Jasper Ave NW, Edmonton, AB', lat: 53.5412, lng: -113.4988 },
  { label: 'Chappelle (SW)', addr: '7221 Chivers Pl SW, Edmonton, AB', lat: 53.4150, lng: -113.5720 },
  { label: 'Mill Woods (SE)', addr: '740 Knottwood Rd S NW, Edmonton, AB', lat: 53.4540, lng: -113.4350 },
  { label: 'West Edm Mall', addr: '8882 170 St NW, Edmonton, AB', lat: 53.5225, lng: -113.6242 },
  { label: 'Clareview (NE)', addr: '3751 139 Ave NW, Edmonton, AB', lat: 53.6025, lng: -113.4010 },
  { label: 'Whyte Ave / Strathcona', addr: '8440 112 St NW, Edmonton, AB', lat: 53.5190, lng: -113.4980 },
  { label: 'St. Albert', addr: '201 Boudreau Rd, St. Albert, AB', lat: 53.6300, lng: -113.6250 },
  { label: 'Sherwood Park', addr: '2000 Premier Way, Sherwood Park, AB', lat: 53.5320, lng: -113.3150 },
];

const STORAGE_KEY_PINS = 'tidyups_quick_map_radar_pins_v2';

// Fallback deterministic coordinate estimator for Edmonton addresses if offline
function estimateEdmontonCoords(address: string): { lat: number; lng: number } {
  const s = (address || '').toLowerCase();
  if (s.includes('chappelle') || s.includes('chivers') || s.includes('sw')) return { lat: 53.418, lng: -113.568 };
  if (s.includes('sherwood')) return { lat: 53.532, lng: -113.315 };
  if (s.includes('st. albert') || s.includes('st albert')) return { lat: 53.630, lng: -113.625 };
  if (s.includes('spruce grove')) return { lat: 53.545, lng: -113.901 };
  if (s.includes('leduc')) return { lat: 53.259, lng: -113.549 };
  if (s.includes('mill woods') || s.includes('knottwood')) return { lat: 53.454, lng: -113.435 };
  if (s.includes('clareview') || s.includes('139 ave')) return { lat: 53.602, lng: -113.401 };
  if (s.includes('170 st') || s.includes('west edmonton')) return { lat: 53.522, lng: -113.624 };
  if (s.includes('jasper')) return { lat: 53.5412, lng: -113.4988 };

  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) % 10000;
  }
  const latOffset = ((hash % 100) / 100 - 0.5) * 0.16;
  const lngOffset = ((Math.floor(hash / 100) % 100) / 100 - 0.5) * 0.24;
  return {
    lat: Number((53.525 + latOffset).toFixed(5)),
    lng: Number((-113.505 + lngOffset).toFixed(5)),
  };
}

// Web Mercator projection helpers for true street-level zoom (z = 9 .. 18)
function latLngToWorldPx(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldPxToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lat: Number(Math.max(-85, Math.min(85, lat)).toFixed(6)),
    lng: Number(Math.max(-180, Math.min(180, lng)).toFixed(6)),
  };
}

export const QuickMapScheduleRadarView: React.FC<QuickMapScheduleRadarViewProps> = ({
  mode = 'FULL_PAGE',
  technicians,
  scheduledJobs = [],
  leads = [],
  quotes = [],
  selectedDate: controlledSelectedDate,
  onSelectedDateChange,
  externalPinRequest,
  onOpenDedicatedPage,
  onNavigateToMasterHub,
  onNavigateToFullDispatchMap,
  onNavigateToSchedule,
  onBookCleaner,
}) => {
  // 1. Multi-Pin State (persisted to localStorage so pins stay synced between Master Hub & Full Page)
  const [pins, setPins] = useState<DroppedRadarPin[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PINS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'pin-1',
        label: 'Pin 1 (A)',
        subtitle: 'Primary Target Address',
        address: '10405 Jasper Ave NW, Edmonton, AB',
        lat: 53.5412,
        lng: -113.4988,
        color: PIN_PALETTE[0],
        sourceType: 'CUSTOM',
      },
    ];
  });

  const [activePinIndex, setActivePinIndex] = useState<number>(0);
  const [mapClickBehavior, setMapClickBehavior] = useState<MapClickBehavior>('DROP_NEW_PIN');
  const [isGeocodingPin, setIsGeocodingPin] = useState<boolean>(false);
  const [newPinSearchInput, setNewPinSearchInput] = useState<string>('');

  // Persist pins whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PINS, JSON.stringify(pins));
    } catch {
      // ignore
    }
  }, [pins]);

  // 2. Map Camera State: Center Lat/Lng + Integer/Smooth Zoom Level (10 = Metro, 13 = Area, 15 = Streets, 17 = Houses)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => {
    const first = pins[0];
    return first ? { lat: first.lat, lng: first.lng } : { lat: 53.5412, lng: -113.4988 };
  });
  const [mapZoom, setMapZoom] = useState<number>(mode === 'FULL_PAGE' ? 13 : 12);
  const [tileStyle, setTileStyle] = useState<StreetTileStyle>('OSM_STREETS');
  const [layerFilter, setLayerFilter] = useState<
    'ALL' | 'PINS_ONLY' | 'CLEANERS' | 'HUBS_AND_CLEANERS' | 'VISITS' | 'LEADS_QUOTES'
  >('ALL');
  const [showRadarRings, setShowRadarRings] = useState<boolean>(true);
  const [showCleanerLines, setShowCleanerLines] = useState<boolean>(true);
  const [selectedSingleHubTechId, setSelectedSingleHubTechId] = useState<string>('ALL'); // 'ALL' | 'OFF' | tech.id
  const [selectedSingleLiveTechId, setSelectedSingleLiveTechId] = useState<string>('ALL'); // 'ALL' | 'OFF' | tech.id
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState<boolean>(mode === 'FULL_PAGE');
  const [inspectorTab, setInspectorTab] = useState<
    'CLEANERS_AND_HUBS' | 'DAY_SCHEDULE' | 'LEADS_QUOTES' | 'DROPPED_PINS'
  >('CLEANERS_AND_HUBS');

  // 3. Schedule Date State
  const [internalDate, setInternalDate] = useState<string>(() => getEdmontonToday().dateString);
  const selectedDateFilter = controlledSelectedDate !== undefined ? controlledSelectedDate : internalDate;
  const setSelectedDateFilter = (nextDate: string) => {
    setInternalDate(nextDate);
    onSelectedDateChange?.(nextDate);
  };

  // Viewport measurement for accurate Web Mercator pixel placement
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: mode === 'FULL_PAGE' ? 580 : 420,
  });

  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        setViewportSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    updateSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Dragging / Panning state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startCenterPx: { x: number; y: number };
    movedPx: number;
  } | null>(null);

  // Handle external pin request from Master Leads & Quotes table or Schedule table
  const lastProcessedRequestRef = useRef<number>(0);
  useEffect(() => {
    if (!externalPinRequest || externalPinRequest.timestamp === lastProcessedRequestRef.current) return;
    lastProcessedRequestRef.current = externalPinRequest.timestamp;

    const coords =
      externalPinRequest.lat && externalPinRequest.lng
        ? { lat: externalPinRequest.lat, lng: externalPinRequest.lng }
        : estimateEdmontonCoords(externalPinRequest.address);

    if (externalPinRequest.addAsExtraPin) {
      setPins((prev) => {
        const nextNum = prev.length + 1;
        const letter = String.fromCharCode(64 + nextNum);
        const newPin: DroppedRadarPin = {
          id: `pin-${Date.now()}`,
          label: externalPinRequest.title || `Pin ${nextNum} (${letter})`,
          subtitle: externalPinRequest.subtitle,
          address: externalPinRequest.address,
          phone: externalPinRequest.phone,
          amount: externalPinRequest.amount,
          lat: coords.lat,
          lng: coords.lng,
          color: PIN_PALETTE[(nextNum - 1) % PIN_PALETTE.length],
          sourceType: externalPinRequest.type || 'CUSTOM',
        };
        const updated = [...prev, newPin];
        setActivePinIndex(updated.length - 1);
        return updated;
      });
    } else {
      setPins((prev) => {
        const next = [...prev];
        const idx = activePinIndex < next.length ? activePinIndex : 0;
        next[idx] = {
          ...next[idx],
          label: externalPinRequest.title || `Pin ${idx + 1} (${String.fromCharCode(65 + idx)})`,
          subtitle: externalPinRequest.subtitle,
          address: externalPinRequest.address,
          phone: externalPinRequest.phone,
          amount: externalPinRequest.amount,
          lat: coords.lat,
          lng: coords.lng,
          sourceType: externalPinRequest.type || 'CUSTOM',
        };
        return next;
      });
    }

    setMapCenter(coords);
    setMapZoom((z) => Math.max(z, 15)); // Zoom right into street level when pinning an item!
  }, [externalPinRequest, activePinIndex]);

  // Date helpers
  const shiftDateStr = useCallback((isoDate: string, deltaDays: number): string => {
    const base = isoDate || getEdmontonToday().dateString;
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + deltaDays));
    return dt.toISOString().slice(0, 10);
  }, []);

  const twoWeekDays = useMemo(() => {
    const todayStr = getEdmontonToday().dateString;
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayUtc = new Date(Date.UTC(ty, tm - 1, td));
    const dow = todayUtc.getUTCDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const monUtc = new Date(Date.UTC(ty, tm - 1, td + diffToMon));

    const list: {
      iso: string;
      dayShort: string;
      dateLabel: string;
      isToday: boolean;
      jobCount: number;
    }[] = [];

    for (let i = 0; i < 14; i++) {
      const dUtc = new Date(Date.UTC(monUtc.getUTCFullYear(), monUtc.getUTCMonth(), monUtc.getUTCDate() + i));
      const iso = dUtc.toISOString().slice(0, 10);
      const dayShort = dUtc.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const dateLabel = dUtc.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const jobCount = scheduledJobs.filter((j) => String(j.startAt || '').slice(0, 10) === iso).length;
      list.push({
        iso,
        dayShort,
        dateLabel,
        isToday: iso === todayStr,
        jobCount,
      });
    }
    return list;
  }, [scheduledJobs]);

  const dateJobs = useMemo(() => {
    if (!selectedDateFilter) return scheduledJobs.slice(0, 20);
    return scheduledJobs
      .filter((j) => String(j.startAt || '').slice(0, 10) === selectedDateFilter)
      .sort((a, b) => String(a.startAt || '').localeCompare(String(b.startAt || '')));
  }, [scheduledJobs, selectedDateFilter]);

  const activePin = pins[activePinIndex] || pins[0];

  // Multi-pin route legs (Pin 1 -> Pin 2 -> Pin 3...)
  const pinRouteMetrics = useMemo(() => {
    if (pins.length < 2) {
      return { legs: [], totalDrivingKm: 0, totalDriveMins: 0 };
    }
    const legs: Array<{
      fromPin: DroppedRadarPin;
      toPin: DroppedRadarPin;
      straightKm: number;
      drivingKm: number;
      driveMins: number;
      midLat: number;
      midLng: number;
    }> = [];
    let totalKm = 0;
    let totalMins = 0;

    for (let i = 0; i < pins.length - 1; i++) {
      const a = pins[i];
      const b = pins[i + 1];
      const straightKm = calculateDistanceKm(a.lat, a.lng, b.lat, b.lng);
      const est = calculateDriveEstimates(straightKm);
      totalKm += est.drivingDistanceKm;
      totalMins += est.driveMinutes;
      legs.push({
        fromPin: a,
        toPin: b,
        straightKm: Number(straightKm.toFixed(1)),
        drivingKm: est.drivingDistanceKm,
        driveMins: est.driveMinutes,
        midLat: (a.lat + b.lat) / 2,
        midLng: (a.lng + b.lng) / 2,
      });
    }

    return {
      legs,
      totalDrivingKm: Number(totalKm.toFixed(1)),
      totalDriveMins: Math.round(totalMins),
    };
  }, [pins]);

  // Ranked cleaners by distance to activePin (and total route across all dropped pins)
  const rankedCleaners = useMemo(() => {
    const refPin = activePin || { lat: 53.5412, lng: -113.4988, address: 'Edmonton, AB' };
    return technicians
      .map((tech) => {
        const hubLat = tech.depotLocation?.lat || tech.currentLocation?.lat || 53.5412;
        const hubLng = tech.depotLocation?.lng || tech.currentLocation?.lng || -113.4988;
        const hubAddr = tech.depotLocation?.address || tech.homeAddress || tech.currentLocation?.address || 'Edmonton Hub';

        const hubStraight = calculateDistanceKm(refPin.lat, refPin.lng, hubLat, hubLng);
        const hubEst = calculateDriveEstimates(hubStraight);

        const techFirst = tech.name.split(' ')[0].toLowerCase();
        const jobsOnDay = dateJobs.filter((j) =>
          (j.assignedCleaners || []).some(
            (c) => c.toLowerCase().includes(techFirst) || c.toLowerCase().includes(tech.name.toLowerCase())
          )
        );
        const activeJobOnDay = jobsOnDay[0];
        const jobStraight = activeJobOnDay
          ? calculateDistanceKm(refPin.lat, refPin.lng, activeJobOnDay.lat, activeJobOnDay.lng)
          : null;
        const jobEst = jobStraight !== null ? calculateDriveEstimates(jobStraight) : null;

        const bestDistKm = jobEst ? Math.min(hubEst.drivingDistanceKm, jobEst.drivingDistanceKm) : hubEst.drivingDistanceKm;
        const bestMins = jobEst ? Math.min(hubEst.driveMinutes, jobEst.driveMinutes) : hubEst.driveMinutes;

        return {
          tech,
          hubLat,
          hubLng,
          hubAddr,
          hubDistKm: hubEst.drivingDistanceKm,
          hubEstMinutes: hubEst.driveMinutes,
          jobsOnSelectedDay: jobsOnDay,
          activeJobOnDay,
          jobDistKm: jobEst ? jobEst.drivingDistanceKm : null,
          jobEstMinutes: jobEst ? jobEst.driveMinutes : null,
          distKm: bestDistKm,
          estMinutes: bestMins,
          totalChainKm: Number((bestDistKm + pinRouteMetrics.totalDrivingKm).toFixed(1)),
          totalChainMins: bestMins + pinRouteMetrics.totalDriveMins,
        };
      })
      .sort((a, b) => a.distKm - b.distKm);
  }, [technicians, activePin, dateJobs, pinRouteMetrics]);

  // Add a new pin (either from search input, preset, or default offset)
  const handleAddPin = async (customAddr?: string, customTitle?: string, customCoords?: { lat: number; lng: number }) => {
    const nextNum = pins.length + 1;
    const letter = String.fromCharCode(64 + nextNum);
    const preset = EDMONTON_PRESETS[(nextNum - 1) % EDMONTON_PRESETS.length];
    const addrToUse = (customAddr || newPinSearchInput || preset.addr).trim();

    let coords = customCoords || (customAddr ? estimateEdmontonCoords(addrToUse) : { lat: preset.lat, lng: preset.lng });
    let resolvedAddress = addrToUse;

    if (customAddr || newPinSearchInput.trim()) {
      setIsGeocodingPin(true);
      try {
        const geo = await forwardGeocode(addrToUse);
        coords = { lat: geo.lat, lng: geo.lng };
        if (geo.formattedAddress) resolvedAddress = geo.formattedAddress;
      } catch {
        coords = estimateEdmontonCoords(addrToUse);
      } finally {
        setIsGeocodingPin(false);
      }
    }

    const newPin: DroppedRadarPin = {
      id: `pin-${Date.now()}-${nextNum}`,
      label: customTitle || `Pin ${nextNum} (${letter})`,
      subtitle: `Dropped Stop #${nextNum}`,
      address: resolvedAddress,
      lat: coords.lat,
      lng: coords.lng,
      color: PIN_PALETTE[(nextNum - 1) % PIN_PALETTE.length],
      sourceType: 'CUSTOM',
    };

    const nextPins = [...pins, newPin];
    setPins(nextPins);
    setActivePinIndex(nextPins.length - 1);
    setNewPinSearchInput('');
    setMapCenter(coords);
  };

  // Update an existing pin's address and geocode it
  const handleGeocodePinAtIndex = async (idx: number, addressText?: string) => {
    const target = pins[idx];
    if (!target) return;
    const query = (addressText ?? target.address).trim();
    if (!query) return;

    setIsGeocodingPin(true);
    try {
      const geo = await forwardGeocode(query);
      const next = [...pins];
      next[idx] = {
        ...next[idx],
        address: geo.formattedAddress || query,
        lat: geo.lat,
        lng: geo.lng,
      };
      setPins(next);
      setActivePinIndex(idx);
      setMapCenter({ lat: geo.lat, lng: geo.lng });
      setMapZoom((z) => Math.max(z, 15)); // Zoom to street level on search!
    } catch {
      const fallback = estimateEdmontonCoords(query);
      const next = [...pins];
      next[idx] = { ...next[idx], lat: fallback.lat, lng: fallback.lng };
      setPins(next);
      setMapCenter(fallback);
    } finally {
      setIsGeocodingPin(false);
    }
  };

  // Remove a pin
  const handleRemovePin = (idx: number) => {
    if (pins.length <= 1) return;
    const filtered = pins
      .filter((_, i) => i !== idx)
      .map((p, i) => ({
        ...p,
        label: p.label.startsWith('Pin ') ? `Pin ${i + 1} (${String.fromCharCode(65 + i)})` : p.label,
        color: PIN_PALETTE[i % PIN_PALETTE.length],
      }));
    setPins(filtered);
    setActivePinIndex(Math.max(0, Math.min(activePinIndex, filtered.length - 1)));
  };

  // Fit all active pins in the map viewport
  const handleFitAllPins = useCallback(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      setMapCenter({ lat: pins[0].lat, lng: pins[0].lng });
      setMapZoom(15);
      return;
    }
    const lats = pins.map((p) => p.lat);
    const lngs = pins.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const spanLat = Math.max(0.005, maxLat - minLat);
    const spanLng = Math.max(0.005, maxLng - minLng);

    let bestZoom = 15;
    if (spanLat > 0.25 || spanLng > 0.35) bestZoom = 11;
    else if (spanLat > 0.12 || spanLng > 0.18) bestZoom = 12;
    else if (spanLat > 0.06 || spanLng > 0.09) bestZoom = 13;
    else if (spanLat > 0.025 || spanLng > 0.04) bestZoom = 14;
    else bestZoom = 15;

    setMapCenter({ lat: centerLat, lng: centerLng });
    setMapZoom(bestZoom);
  }, [pins]);

  // Pin an item from the directory (either replace active pin OR add as a new pin)
  const handlePinDirectoryItem = (
    item: {
      title: string;
      subtitle?: string;
      address: string;
      phone?: string;
      amount?: number;
      lat?: number;
      lng?: number;
      type: 'LEAD' | 'QUOTE' | 'VISIT' | 'HUB';
    },
    asNewPin: boolean
  ) => {
    const coords =
      item.lat && item.lng ? { lat: item.lat, lng: item.lng } : estimateEdmontonCoords(item.address);

    if (asNewPin) {
      const nextNum = pins.length + 1;
      const letter = String.fromCharCode(64 + nextNum);
      const newPin: DroppedRadarPin = {
        id: `pin-${Date.now()}-${nextNum}`,
        label: `Pin ${nextNum} (${letter}): ${item.title}`,
        subtitle: item.subtitle,
        address: item.address,
        phone: item.phone,
        amount: item.amount,
        lat: coords.lat,
        lng: coords.lng,
        color: PIN_PALETTE[(nextNum - 1) % PIN_PALETTE.length],
        sourceType: item.type,
      };
      const updated = [...pins, newPin];
      setPins(updated);
      setActivePinIndex(updated.length - 1);
    } else {
      const targetIdx = activePinIndex < pins.length ? activePinIndex : 0;
      const letter = String.fromCharCode(65 + targetIdx);
      const updated = [...pins];
      updated[targetIdx] = {
        ...updated[targetIdx],
        label: `Pin ${targetIdx + 1} (${letter}): ${item.title}`,
        subtitle: item.subtitle,
        address: item.address,
        phone: item.phone,
        amount: item.amount,
        lat: coords.lat,
        lng: coords.lng,
        sourceType: item.type,
      };
      setPins(updated);
    }

    setMapCenter(coords);
    setMapZoom((z) => Math.max(z, 15));
  };

  // Web Mercator viewport calculations for current mapCenter & mapZoom
  const zInt = Math.max(9, Math.min(18, Math.round(mapZoom)));
  const centerWorldPx = useMemo(
    () => latLngToWorldPx(mapCenter.lat, mapCenter.lng, zInt),
    [mapCenter.lat, mapCenter.lng, zInt]
  );

  const topLeftWorldPx = useMemo(
    () => ({
      x: centerWorldPx.x - viewportSize.width / 2,
      y: centerWorldPx.y - viewportSize.height / 2,
    }),
    [centerWorldPx, viewportSize]
  );

  // Project any (lat, lng) to pixel coordinates inside the map container
  const projectToViewportPx = useCallback(
    (lat: number, lng: number) => {
      const w = latLngToWorldPx(lat, lng, zInt);
      return {
        x: w.x - topLeftWorldPx.x,
        y: w.y - topLeftWorldPx.y,
      };
    },
    [zInt, topLeftWorldPx]
  );

  // Visible tiles at current zoom level zInt
  const visibleTiles = useMemo(() => {
    const maxTileIdx = Math.pow(2, zInt) - 1;
    const minTx = Math.max(0, Math.floor(topLeftWorldPx.x / 256) - 1);
    const maxTx = Math.min(maxTileIdx, Math.floor((topLeftWorldPx.x + viewportSize.width) / 256) + 1);
    const minTy = Math.max(0, Math.floor(topLeftWorldPx.y / 256) - 1);
    const maxTy = Math.min(maxTileIdx, Math.floor((topLeftWorldPx.y + viewportSize.height) / 256) + 1);

    const tiles: Array<{ tx: number; ty: number; left: number; top: number }> = [];
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        tiles.push({
          tx,
          ty,
          left: Math.round(tx * 256 - topLeftWorldPx.x),
          top: Math.round(ty * 256 - topLeftWorldPx.y),
        });
      }
    }
    return tiles;
  }, [zInt, topLeftWorldPx, viewportSize]);

  // Handle clicking on the map surface (after distinguishing from drag)
  const handleMapSurfaceClick = async (clientX: number, clientY: number) => {
    if (mapClickBehavior === 'PAN_ONLY') return;
    const el = mapViewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const worldX = topLeftWorldPx.x + clickX;
    const worldY = topLeftWorldPx.y + clickY;
    const clickedCoords = worldPxToLatLng(worldX, worldY, zInt);

    if (mapClickBehavior === 'DROP_NEW_PIN') {
      const nextNum = pins.length + 1;
      const letter = String.fromCharCode(64 + nextNum);
      const tempId = `pin-${Date.now()}-${nextNum}`;
      const newPin: DroppedRadarPin = {
        id: tempId,
        label: `Pin ${nextNum} (${letter})`,
        subtitle: 'Dropped on Street Map',
        address: `${clickedCoords.lat.toFixed(4)}, ${clickedCoords.lng.toFixed(4)}, Edmonton, AB`,
        lat: clickedCoords.lat,
        lng: clickedCoords.lng,
        color: PIN_PALETTE[(nextNum - 1) % PIN_PALETTE.length],
        sourceType: 'CUSTOM',
      };
      const updated = [...pins, newPin];
      setPins(updated);
      setActivePinIndex(updated.length - 1);

      // Reverse geocode street address
      setIsGeocodingPin(true);
      try {
        const rev = await reverseGeocode(clickedCoords.lat, clickedCoords.lng);
        if (rev?.formattedAddress) {
          setPins((prev) =>
            prev.map((p) => (p.id === tempId ? { ...p, address: rev.formattedAddress } : p))
          );
        }
      } catch {
        // keep coordinate label
      } finally {
        setIsGeocodingPin(false);
      }
    } else if (mapClickBehavior === 'MOVE_ACTIVE_PIN') {
      const idx = activePinIndex < pins.length ? activePinIndex : 0;
      const targetId = pins[idx]?.id;
      setPins((prev) => {
        const next = [...prev];
        if (next[idx]) {
          next[idx] = {
            ...next[idx],
            lat: clickedCoords.lat,
            lng: clickedCoords.lng,
            address: `${clickedCoords.lat.toFixed(4)}, ${clickedCoords.lng.toFixed(4)}, Edmonton, AB`,
          };
        }
        return next;
      });

      setIsGeocodingPin(true);
      try {
        const rev = await reverseGeocode(clickedCoords.lat, clickedCoords.lng);
        if (rev?.formattedAddress && targetId) {
          setPins((prev) =>
            prev.map((p) => (p.id === targetId ? { ...p, address: rev.formattedAddress } : p))
          );
        }
      } catch {
        // ignore
      } finally {
        setIsGeocodingPin(false);
      }
    }
  };

  // Multi-stop Google Maps Directions URL for all dropped pins
  const googleMapsMultiPinUrl = useMemo(() => {
    if (pins.length === 0) return 'https://www.google.com/maps';
    if (pins.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pins[0].address)}`;
    }
    const origin = encodeURIComponent(pins[0].address);
    const destination = encodeURIComponent(pins[pins.length - 1].address);
    const waypoints = pins
      .slice(1, -1)
      .map((p) => encodeURIComponent(p.address))
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ''
    }&travelmode=driving`;
  }, [pins]);

  const showHubs =
    layerFilter === 'ALL' || layerFilter === 'CLEANERS' || layerFilter === 'HUBS_AND_CLEANERS';
  const showScheduleVisits =
    layerFilter === 'ALL' || layerFilter === 'VISITS' || layerFilter === 'HUBS_AND_CLEANERS';
  const showLeadsAndQuotesOnMap = layerFilter === 'LEADS_QUOTES';

  // Approximate pixels per kilometer at Edmonton's latitude (53.54° N)
  const metersPerPx = (156543.03392 * Math.cos((mapCenter.lat * Math.PI) / 180)) / Math.pow(2, zInt);
  const pxPerKm = 1000 / Math.max(0.1, metersPerPx);

  return (
    <div
      className={
        mode === 'FULL_PAGE'
          ? 'flex-1 min-h-0 bg-slate-100 p-3 sm:p-5 lg:p-6 space-y-4 overflow-y-auto'
          : 'rounded-3xl bg-white border-2 border-sky-400 shadow-md overflow-hidden flex flex-col'
      }
    >
      <div
        className={
          mode === 'FULL_PAGE'
            ? 'max-w-[1680px] mx-auto rounded-3xl bg-white border-2 border-sky-400 shadow-xl overflow-hidden flex flex-col'
            : 'flex-1 flex flex-col'
        }
      >
        {/* TOP HEADER BANNER */}
        <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-800 px-4 sm:px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center text-xl shadow-xs shrink-0">
              🗺️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>QUICK MAP &amp; SCHEDULE RADAR</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  {pins.length} Pin{pins.length === 1 ? '' : 's'} Active • Zoom z={zInt}
                </span>
                {mode === 'FULL_PAGE' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                    Dedicated Full Page
                  </span>
                )}
              </div>
              <p className="text-[11px] text-sky-100 mt-0.5">
                Drop 1, 2, or multiple pins anywhere on the street map • Zoom right down into residential streets &amp; house blocks • View Cleaner Hubs &amp; Schedule Radar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Add 2nd Pin / Multi-Pin Button right in Header */}
            <button
              type="button"
              onClick={() => handleAddPin()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              title="Add a second pin or multiple pins to compare addresses and calculate route distances"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{pins.length === 1 ? 'Add 2nd Pin (Pin B)' : `Add Pin #${pins.length + 1}`}</span>
            </button>

            {mode === 'EMBEDDED' && onOpenDedicatedPage && (
              <button
                type="button"
                onClick={onOpenDedicatedPage}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                title="Open Quick Map & Schedule Radar on its own dedicated full page"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open on Its Own Page ↗</span>
              </button>
            )}

            {mode === 'FULL_PAGE' && onNavigateToMasterHub && (
              <button
                type="button"
                onClick={onNavigateToMasterHub}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span>Master Leads &amp; Quotes</span>
              </button>
            )}

            {onNavigateToFullDispatchMap && (
              <button
                type="button"
                onClick={onNavigateToFullDispatchMap}
                className="px-3 py-1.5 rounded-xl bg-white text-sky-950 hover:bg-sky-50 font-black text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Navigation className="w-3.5 h-3.5 text-sky-700" />
                <span>Full Dispatch Map</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
          {/* ───────────────────────────────────────────────────────────────────────
              1. MULTI-PIN / TWO-PIN / DROP-A-PIN MANAGER BAR
             ─────────────────────────────────────────────────────────────────────── */}
          <div className="p-3.5 rounded-2xl bg-sky-50/90 border border-sky-200 space-y-3">
            {/* Top row: Click-to-Drop mode selector + Quick Add Pin input */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-sky-200/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-sky-950 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Map Click Action:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMapClickBehavior('DROP_NEW_PIN')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1 ${
                    mapClickBehavior === 'DROP_NEW_PIN'
                      ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                      : 'bg-white text-slate-700 hover:bg-rose-50 border border-sky-200'
                  }`}
                  title="Clicking anywhere on the street map drops a brand new pin at that street spot"
                >
                  <span>📌 Click Map = Drop New Pin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapClickBehavior('MOVE_ACTIVE_PIN')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1 ${
                    mapClickBehavior === 'MOVE_ACTIVE_PIN'
                      ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300'
                      : 'bg-white text-slate-700 hover:bg-sky-100 border border-sky-200'
                  }`}
                  title="Clicking anywhere on the street map moves the currently selected pin to that spot"
                >
                  <span>🎯 Click Map = Move Pin #{activePinIndex + 1}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPin()}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{pins.length === 1 ? 'Add 2nd Pin (Compare 2)' : `Add Pin #${pins.length + 1}`}</span>
                </button>
                {pins.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handleFitAllPins}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Fit All {pins.length} Pins</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPins([pins[0]]);
                        setActivePinIndex(0);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                    >
                      Keep Only Pin 1
                    </button>
                  </>
                )}
              </div>

              {/* Quick Add Any New Pin by Address Search with Real-Time Autocomplete */}
              <div className="flex items-center gap-1.5 flex-1 max-w-md">
                <div className="flex-1">
                  <AddressAutocompleteInput
                    value={newPinSearchInput}
                    onChange={(val) => setNewPinSearchInput(val)}
                    onSelect={(pred) => {
                      const addr = pred.description || pred.mainText;
                      setNewPinSearchInput(addr);
                      handleAddPin(addr);
                    }}
                    placeholder={`Type an address to drop as Pin #${pins.length + 1}...`}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-sky-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddPin(newPinSearchInput.trim() || undefined)}
                  disabled={isGeocodingPin}
                  className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-black cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Drop Pin</span>
                </button>
              </div>
            </div>

            {/* Active Dropped Pins List (Supports 1, 2, or Multiple Pins!) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pins.map((pin, idx) => {
                const isSelected = idx === activePinIndex;
                const letter = String.fromCharCode(65 + idx);
                return (
                  <div
                    key={pin.id}
                    onClick={() => setActivePinIndex(idx)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-white border-2 border-sky-600 shadow-sm'
                        : 'bg-white/80 hover:bg-white border-sky-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: pin.color }}
                        >
                          📍 PIN {idx + 1} ({letter})
                        </span>
                        <input
                          type="text"
                          value={pin.label}
                          onChange={(e) => {
                            const next = [...pins];
                            next[idx] = { ...next[idx], label: e.target.value };
                            setPins(next);
                          }}
                          className="text-xs font-black text-slate-900 bg-transparent border-b border-transparent focus:border-sky-400 focus:outline-none truncate"
                          title="Edit pin label"
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Quick pick from Day's Scheduled Visits */}
                        {dateJobs.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const found = dateJobs.find((j) => j.id === e.target.value);
                              if (found) {
                                const next = [...pins];
                                next[idx] = {
                                  ...next[idx],
                                  label: `Pin ${idx + 1} (${letter}): ${found.clientName}`,
                                  address: found.serviceAddress,
                                  lat: found.lat,
                                  lng: found.lng,
                                  phone: found.clientPhone,
                                  sourceType: 'VISIT',
                                };
                                setPins(next);
                                setMapCenter({ lat: found.lat, lng: found.lng });
                                setMapZoom(15);
                              }
                            }}
                            className="bg-slate-100 border border-slate-300 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-slate-700 max-w-[115px]"
                          >
                            <option value="">Pick Visit...</option>
                            {dateJobs.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.clientName} — {j.serviceAddress}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePinIndex(idx);
                            setMapCenter({ lat: pin.lat, lng: pin.lng });
                            setMapZoom(16); // Zoom right down to residential street level!
                          }}
                          className="px-2 py-0.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                          title="Zoom in to see the streets around this pin (z=16)"
                        >
                          <ZoomIn className="w-3 h-3" />
                          <span>Zoom Street</span>
                        </button>

                        {pins.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePin(idx);
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="Remove this pin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex-1">
                        <AddressAutocompleteInput
                          value={pin.address}
                          onChange={(val) => {
                            const next = [...pins];
                            next[idx] = { ...next[idx], address: val };
                            setPins(next);
                          }}
                          onSelect={async (pred) => {
                            const fullAddr = pred.description || pred.mainText;
                            const next = [...pins];
                            next[idx] = { ...next[idx], address: fullAddr };
                            setPins(next);
                            setIsGeocodingPin(true);
                            try {
                              const geo = await forwardGeocode(fullAddr);
                              const updated = [...pins];
                              updated[idx] = {
                                ...updated[idx],
                                address: geo.formattedAddress || fullAddr,
                                lat: geo.lat,
                                lng: geo.lng,
                              };
                              setPins(updated);
                              setActivePinIndex(idx);
                              setMapCenter({ lat: geo.lat, lng: geo.lng });
                              setMapZoom((z) => Math.max(z, 15));
                            } catch {
                              // keep
                            } finally {
                              setIsGeocodingPin(false);
                            }
                          }}
                          placeholder={`Enter Edmonton street address for Pin ${idx + 1}...`}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGeocodePinAtIndex(idx);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Search className="w-3 h-3" />
                        <span>Locate</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Multi-Pin Distance & Drive Time Summary Strip (Appears when 2+ pins are dropped) */}
            {pins.length >= 2 && (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 text-white flex flex-wrap items-center justify-between gap-2 border border-emerald-500/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Route className="w-3 h-3" />
                    <span>{pins.length}-Pin Route Distance</span>
                  </span>
                  {pinRouteMetrics.legs.map((leg, i) => (
                    <span
                      key={`leg-pill-${i}`}
                      className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[11px] font-mono font-bold text-sky-200"
                    >
                      Pin {i + 1} &rarr; Pin {i + 2}: <strong className="text-white">{leg.drivingKm} km</strong> (~{leg.driveMins}m)
                    </span>
                  ))}
                  <span className="text-xs font-black text-emerald-300 font-mono pl-1">
                    Total: {pinRouteMetrics.totalDrivingKm} km (~{pinRouteMetrics.totalDriveMins} mins drive)
                  </span>
                </div>

                <a
                  href={googleMapsMultiPinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Directions in Google Maps ↗</span>
                </a>
              </div>
            )}

            {/* Quick Edmonton Neighborhood Presets for Active Pin */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px]">
              <span className="font-black uppercase text-sky-900 shrink-0">
                Quick Set Pin #{activePinIndex + 1}:
              </span>
              {EDMONTON_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const idx = activePinIndex < pins.length ? activePinIndex : 0;
                    const next = [...pins];
                    next[idx] = {
                      ...next[idx],
                      address: p.addr,
                      lat: p.lat,
                      lng: p.lng,
                    };
                    setPins(next);
                    setMapCenter({ lat: p.lat, lng: p.lng });
                    setMapZoom(15);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white hover:bg-sky-100 text-slate-700 border border-sky-200 font-bold shrink-0 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────────────
              2. SCHEDULE DAY-OF-WEEK & ANY-DATE PICKER BAR FOR QUICK MAP
             ─────────────────────────────────────────────────────────────────────── */}
          <div className="p-2.5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-sky-300 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Schedule Day on Map:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(shiftDateStr(selectedDateFilter, -1))}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-black cursor-pointer"
                  title="Previous Day"
                >
                  &larr;
                </button>
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-black text-white cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(shiftDateStr(selectedDateFilter, 1))}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-black cursor-pointer"
                  title="Next Day"
                >
                  &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(getEdmontonToday().dateString)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                    selectedDateFilter === getEdmontonToday().dateString
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(shiftDateStr(getEdmontonToday().dateString, 1))}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                    selectedDateFilter === shiftDateStr(getEdmontonToday().dateString, 1)
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  Tomorrow
                </button>
              </div>

              <span className="text-[11px] font-mono font-bold text-amber-300">
                {dateJobs.length} Visit{dateJobs.length === 1 ? '' : 's'} on {selectedDateFilter || 'All Dates'}
              </span>
            </div>

            {/* 14-Day (This Week + Next Week) Day-of-Week Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {twoWeekDays.map((d, idx) => {
                const isSel = d.iso === selectedDateFilter;
                return (
                  <React.Fragment key={d.iso}>
                    {idx === 0 && (
                      <span className="text-[9px] font-black uppercase text-sky-400 pr-1 shrink-0">This Wk:</span>
                    )}
                    {idx === 7 && (
                      <span className="text-[9px] font-black uppercase text-purple-400 pl-1.5 pr-1 border-l border-white/15 shrink-0">
                        Next Wk:
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedDateFilter(d.iso)}
                      className={`px-2 py-1 rounded-xl text-left shrink-0 cursor-pointer transition-all border flex items-center gap-1 ${
                        isSel
                          ? 'bg-white text-slate-950 border-white font-black shadow-xs'
                          : d.jobCount > 0
                          ? 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 border-transparent'
                      }`}
                    >
                      <div>
                        <div className="text-[9.5px] font-black leading-none">{d.dayShort}</div>
                        <div className="text-[8.5px] font-mono opacity-80">{d.dateLabel}</div>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-mono font-black ${
                          isSel
                            ? 'bg-sky-600 text-white'
                            : d.jobCount > 0
                            ? 'bg-amber-400/25 text-amber-300'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {d.jobCount}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────────────
              3. LAYER FILTER PILLS + STREET / SATELLITE / ZOOM CONTROLS BAR
             ─────────────────────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'ALL', label: `All Layers (${pins.length} Pins + Hubs + ${dateJobs.length} Jobs)` },
                  { id: 'PINS_ONLY', label: `Dropped Pins Only (${pins.length})` },
                  { id: 'CLEANERS', label: `Cleaner Hubs (${technicians.length})` },
                  { id: 'HUBS_AND_CLEANERS', label: 'Hubs + Cleaners' },
                  { id: 'VISITS', label: `Day's Schedule (${dateJobs.length}) & Cleaners` },
                  { id: 'LEADS_QUOTES', label: `Leads & Quotes (${leads.length + quotes.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLayerFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer transition-all ${
                    layerFilter === tab.id
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {/* All 15 Hubs vs Single Hub Selector */}
              <select
                value={selectedSingleHubTechId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSingleHubTechId(val);
                  if (val !== 'ALL' && val !== 'OFF') {
                    const rc = rankedCleaners.find((c) => c.tech.id === val);
                    if (rc) {
                      setMapCenter({ lat: rc.hubLat, lng: rc.hubLng });
                      setMapZoom(14);
                    }
                  }
                }}
                className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 cursor-pointer"
                title="Show All 15 Cleaners' Home Hubs, Just 1 Cleaner's Home Hub, or Hide Home Hubs"
              >
                <option value="ALL">🏠 All {technicians.length} Home Hubs (ON)</option>
                <option value="OFF">🚫 Hide Home Hubs (OFF)</option>
                {rankedCleaners.map((rc) => (
                  <option key={`qmap-hub-${rc.tech.id}`} value={rc.tech.id}>
                    🏠 Just 1 Hub: {rc.tech.name} ({rc.hubDistKm} km)
                  </option>
                ))}
              </select>

              {/* All 15 Live Vans vs Single Live Van Selector */}
              <select
                value={selectedSingleLiveTechId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSingleLiveTechId(val);
                  if (val !== 'ALL' && val !== 'OFF') {
                    const rc = rankedCleaners.find((c) => c.tech.id === val);
                    if (rc) {
                      setMapCenter({ lat: rc.tech.currentLocation.lat, lng: rc.tech.currentLocation.lng });
                      setMapZoom(14);
                    }
                  }
                }}
                className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-pink-100 text-pink-900 border border-pink-300 cursor-pointer"
                title="Show All 15 Live Van Locations, Just 1 Live Van, or Hide Live Vans"
              >
                <option value="ALL">🚐 All {technicians.length} Live Vans (ON)</option>
                <option value="OFF">🚫 Hide Live Vans (OFF)</option>
                {rankedCleaners.map((rc) => {
                  const liveDist = activePin
                    ? Math.round(
                        calculateDriveEstimates(
                          calculateDistanceKm(
                            activePin.lat,
                            activePin.lng,
                            rc.tech.currentLocation.lat,
                            rc.tech.currentLocation.lng
                          )
                        ).drivingDistanceKm * 10
                      ) / 10
                    : 0;
                  return (
                    <option key={`qmap-live-${rc.tech.id}`} value={rc.tech.id}>
                      🚐 Just 1 Live: {rc.tech.name} ({liveDist} km)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Map Tile Style Switcher (Detailed Streets, Voyager Retina, Satellite, Google Embed) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { id: 'OSM_STREETS', label: '🛣️ Detailed Streets' },
                  { id: 'VOYAGER_RETINA', label: '🗺️ Clean Streets' },
                  { id: 'SATELLITE_HYBRID', label: '🛰️ Satellite' },
                  { id: 'GOOGLE_EMBED', label: '🌐 Google Embed' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setTileStyle(st.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                    tileStyle === st.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────────────
              4. INTERACTIVE MULTI-PIN & STREET-LEVEL ZOOM MAP SURFACE (z=10..18)
             ─────────────────────────────────────────────────────────────────────── */}
          <div
            ref={mapViewportRef}
            onMouseDown={(e) => {
              if (e.button !== 0 || tileStyle === 'GOOGLE_EMBED') return;
              setIsDragging(true);
              dragStartRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                startCenterPx: latLngToWorldPx(mapCenter.lat, mapCenter.lng, zInt),
                movedPx: 0,
              };
            }}
            onMouseMove={(e) => {
              if (!isDragging || !dragStartRef.current) return;
              const dx = e.clientX - dragStartRef.current.clientX;
              const dy = e.clientY - dragStartRef.current.clientY;
              dragStartRef.current.movedPx = Math.max(
                dragStartRef.current.movedPx,
                Math.hypot(dx, dy)
              );
              const nextCenter = worldPxToLatLng(
                dragStartRef.current.startCenterPx.x - dx,
                dragStartRef.current.startCenterPx.y - dy,
                zInt
              );
              setMapCenter(nextCenter);
            }}
            onMouseUp={(e) => {
              if (!isDragging) return;
              const moved = dragStartRef.current?.movedPx || 0;
              setIsDragging(false);
              dragStartRef.current = null;
              if (moved < 6) {
                handleMapSurfaceClick(e.clientX, e.clientY);
              }
            }}
            onMouseLeave={() => {
              setIsDragging(false);
              dragStartRef.current = null;
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              setMapZoom((z) => Math.min(18, z + 1));
            }}
            onWheel={(e) => {
              if (!wheelZoomEnabled || tileStyle === 'GOOGLE_EMBED') return;
              e.preventDefault();
              const delta = e.deltaY < 0 ? 1 : -1;
              setMapZoom((z) => Math.max(10, Math.min(18, z + delta)));
            }}
            className={`relative rounded-2xl overflow-hidden border-2 border-sky-400 bg-slate-200 ${
              mode === 'FULL_PAGE' ? 'h-[520px] sm:h-[600px]' : 'h-[400px] sm:h-[440px]'
            } shadow-inner select-none ${
              isDragging
                ? 'cursor-grabbing'
                : mapClickBehavior !== 'PAN_ONLY'
                ? 'cursor-crosshair'
                : 'cursor-grab'
            }`}
          >
            {tileStyle === 'GOOGLE_EMBED' ? (
              <iframe
                title="TidyUps Quick Map Edmonton Street View"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  activePin?.address || 'Edmonton, AB'
                )}&t=&z=${zInt}&ie=UTF8&iwloc=&output=embed`}
              />
            ) : (
              <div className="w-full h-full relative overflow-hidden">
                {/* Real Dynamic Multi-Zoom Web Mercator Street & Satellite Tiles (z = 10 .. 18) */}
                <div className="absolute inset-0 pointer-events-none">
                  {visibleTiles.map(({ tx, ty, left, top }) => {
                    const isSat = tileStyle === 'SATELLITE_HYBRID';
                    const isOsm = tileStyle === 'OSM_STREETS';
                    const primaryTileUrl = isSat
                      ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zInt}/${ty}/${tx}`
                      : isOsm
                      ? `https://tile.openstreetmap.org/${zInt}/${tx}/${ty}.png`
                      : `https://basemaps.cartocdn.com/rastertiles/voyager/${zInt}/${tx}/${ty}@2x.png`;

                    return (
                      <React.Fragment key={`tile-${zInt}-${tx}-${ty}`}>
                        <img
                          src={primaryTileUrl}
                          alt=""
                          draggable={false}
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (!img.dataset.fallback) {
                              img.dataset.fallback = '1';
                              img.src = `https://basemaps.cartocdn.com/rastertiles/voyager/${zInt}/${tx}/${ty}@2x.png`;
                            }
                          }}
                          style={{
                            position: 'absolute',
                            left: `${left}px`,
                            top: `${top}px`,
                            width: '256px',
                            height: '256px',
                            maxWidth: 'none',
                          }}
                          className="select-none pointer-events-none"
                        />
                        {isSat && (
                          <img
                            src={`https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/${zInt}/${tx}/${ty}@2x.png`}
                            alt=""
                            draggable={false}
                            style={{
                              position: 'absolute',
                              left: `${left}px`,
                              top: `${top}px`,
                              width: '256px',
                              height: '256px',
                              maxWidth: 'none',
                            }}
                            className="select-none pointer-events-none"
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* SVG Overlay: Radar Rings, Multi-Pin Chain Lines (Pin 1 -> Pin 2 -> Pin 3...), and Cleaner Route Lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
                >
                  {/* Concentric Radar Rings around Active Pin */}
                  {showRadarRings &&
                    activePin &&
                    [2, 5, 10, 15].map((km) => {
                      const cPx = projectToViewportPx(activePin.lat, activePin.lng);
                      const radiusPx = km * pxPerKm;
                      return (
                        <circle
                          key={`ring-${km}`}
                          cx={cPx.x}
                          cy={cPx.y}
                          r={radiusPx}
                          fill="none"
                          stroke="#0284C7"
                          strokeWidth="1.5"
                          strokeDasharray="6,6"
                          strokeOpacity="0.55"
                        />
                      );
                    })}

                  {/* Multi-Pin Chain Route Lines (Pin 1 -> Pin 2 -> Pin 3...) */}
                  {pins.length >= 2 &&
                    pinRouteMetrics.legs.map((leg, idx) => {
                      const p1 = projectToViewportPx(leg.fromPin.lat, leg.fromPin.lng);
                      const p2 = projectToViewportPx(leg.toPin.lat, leg.toPin.lng);
                      return (
                        <g key={`pin-leg-svg-${idx}`}>
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke="#FFFFFF"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeOpacity="0.9"
                          />
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke={leg.toPin.color || '#0284C7'}
                            strokeWidth="3.5"
                            strokeDasharray="8,5"
                            strokeLinecap="round"
                          />
                        </g>
                      );
                    })}

                  {/* Route Lines from Top 3 Closest Cleaners to Active Pin */}
                  {showCleanerLines &&
                    layerFilter !== 'PINS_ONLY' &&
                    activePin &&
                    rankedCleaners.slice(0, 3).map((rc, idx) => {
                      const originLat = rc.activeJobOnDay ? rc.activeJobOnDay.lat : rc.hubLat;
                      const originLng = rc.activeJobOnDay ? rc.activeJobOnDay.lng : rc.hubLng;
                      const cPos = projectToViewportPx(originLat, originLng);
                      const tPos = projectToViewportPx(activePin.lat, activePin.lng);
                      return (
                        <line
                          key={`cleaner-line-${rc.tech.id}`}
                          x1={cPos.x}
                          y1={cPos.y}
                          x2={tPos.x}
                          y2={tPos.y}
                          stroke={idx === 0 ? '#10B981' : '#7C3AED'}
                          strokeWidth={idx === 0 ? '3' : '2'}
                          strokeDasharray={idx === 0 ? undefined : '6,5'}
                          strokeOpacity="0.85"
                        />
                      );
                    })}
                </svg>

                {/* Midpoint Distance Badges on Multi-Pin Route Legs */}
                {pins.length >= 2 &&
                  pinRouteMetrics.legs.map((leg, idx) => {
                    const midPx = projectToViewportPx(leg.midLat, leg.midLng);
                    return (
                      <div
                        key={`mid-badge-${idx}`}
                        style={{ left: `${midPx.x}px`, top: `${midPx.y}px` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-none px-2 py-0.5 rounded-full bg-slate-950/90 text-emerald-300 border border-emerald-400 text-[9.5px] font-mono font-black shadow-lg whitespace-nowrap"
                      >
                        {leg.drivingKm} km • ~{leg.driveMins}m
                      </div>
                    );
                  })}

                {/* 15 Cleaner Home Hub Pins (Cleaners' Home Addresses) */}
                {showHubs &&
                  selectedSingleHubTechId !== 'OFF' &&
                  rankedCleaners
                    .filter((rc) => selectedSingleHubTechId === 'ALL' || rc.tech.id === selectedSingleHubTechId)
                    .map((rc, idx) => {
                    const pos = projectToViewportPx(rc.hubLat, rc.hubLng);
                    if (
                      pos.x < -80 ||
                      pos.x > viewportSize.width + 80 ||
                      pos.y < -80 ||
                      pos.y > viewportSize.height + 80
                    ) {
                      return null;
                    }
                    return (
                      <div
                        key={`hub-marker-${rc.tech.id}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinDirectoryItem(
                            {
                              title: `${rc.tech.name} Home Hub`,
                              subtitle: `${rc.tech.vanNumber} • ${rc.distKm} km`,
                              address: rc.hubAddr,
                              phone: rc.tech.phone,
                              lat: rc.hubLat,
                              lng: rc.hubLng,
                              type: 'HUB',
                            },
                            e.shiftKey || mapClickBehavior === 'DROP_NEW_PIN'
                          );
                        }}
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-15 flex flex-col items-center cursor-pointer group"
                        title={`${rc.tech.name} Home Hub: ${rc.hubAddr} (${rc.hubDistKm} km) — Click to pin`}
                      >
                        <div
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-black shadow border whitespace-nowrap mb-0.5 flex items-center gap-1 transition-transform group-hover:scale-110 ${
                            idx === 0
                              ? 'bg-emerald-600 text-white border-emerald-300'
                              : 'bg-white/95 text-slate-900 border-slate-300'
                          }`}
                        >
                          <span>🏠 {rc.tech.name.split(' ')[0]}</span>
                          <span className="font-mono text-[8px] px-1 rounded bg-sky-100 text-sky-900">
                            {rc.hubDistKm}km
                          </span>
                        </div>
                        <div
                          className="w-5 h-5 rounded-lg border-2 border-white shadow-md flex items-center justify-center text-white text-[8px] font-black"
                          style={{ backgroundColor: rc.tech.color || '#0284C7' }}
                        >
                          🏠
                        </div>
                      </div>
                    );
                  })}

                {/* 15 Cleaner Live Van Locations */}
                {showHubs &&
                  selectedSingleLiveTechId !== 'OFF' &&
                  rankedCleaners
                    .filter((rc) => selectedSingleLiveTechId === 'ALL' || rc.tech.id === selectedSingleLiveTechId)
                    .map((rc) => {
                      const liveLat = rc.tech.currentLocation.lat;
                      const liveLng = rc.tech.currentLocation.lng;
                      const pos = projectToViewportPx(liveLat, liveLng);
                      if (
                        pos.x < -80 ||
                        pos.x > viewportSize.width + 80 ||
                        pos.y < -80 ||
                        pos.y > viewportSize.height + 80
                      ) {
                        return null;
                      }
                      const liveDistKm = activePin
                        ? Math.round(
                            calculateDriveEstimates(
                              calculateDistanceKm(activePin.lat, activePin.lng, liveLat, liveLng)
                            ).drivingDistanceKm * 10
                          ) / 10
                        : 0;
                      return (
                        <div
                          key={`live-van-marker-${rc.tech.id}`}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinDirectoryItem(
                              {
                                title: `${rc.tech.name} Live Van`,
                                subtitle: `${rc.tech.vanNumber} • ${liveDistKm} km`,
                                address: rc.tech.currentLocation.address || rc.hubAddr,
                                phone: rc.tech.phone,
                                lat: liveLat,
                                lng: liveLng,
                                type: 'HUB',
                              },
                              e.shiftKey || mapClickBehavior === 'DROP_NEW_PIN'
                            );
                          }}
                          style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-15 flex flex-col items-center cursor-pointer group"
                          title={`${rc.tech.name} Live Van: ${rc.tech.currentLocation.address} (${liveDistKm} km) — Click to pin`}
                        >
                          <div className="px-1.5 py-0.5 rounded-full text-[9px] font-black shadow border bg-slate-900/95 text-white border-pink-400 whitespace-nowrap mb-0.5 flex items-center gap-1 transition-transform group-hover:scale-110">
                            <span>🚐 {rc.tech.name.split(' ')[0]}</span>
                            <span className="font-mono text-[8px] px-1 rounded bg-pink-500/30 text-pink-200">
                              {liveDistKm}km
                            </span>
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[9px] font-black"
                            style={{ backgroundColor: rc.tech.color || '#EC4899' }}
                          >
                            🚐
                          </div>
                        </div>
                      );
                    })}

                {/* Scheduled Visits on Selected Date */}
                {showScheduleVisits &&
                  dateJobs.map((job, jIdx) => {
                    const pos = projectToViewportPx(job.lat, job.lng);
                    if (
                      pos.x < -80 ||
                      pos.x > viewportSize.width + 80 ||
                      pos.y < -80 ||
                      pos.y > viewportSize.height + 80
                    ) {
                      return null;
                    }
                    const primaryCleaner = job.assignedCleaners?.[0] || 'Unassigned';
                    const badgeCol = getCleanerColor(primaryCleaner);
                    const tStr = job.startAt
                      ? new Date(job.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                    return (
                      <div
                        key={`visit-marker-${job.id}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinDirectoryItem(
                            {
                              title: job.clientName,
                              subtitle: `${tStr} • ${(job.assignedCleaners || []).join(', ')}`,
                              address: job.serviceAddress,
                              phone: job.clientPhone,
                              lat: job.lat,
                              lng: job.lng,
                              type: 'VISIT',
                            },
                            e.shiftKey || mapClickBehavior === 'DROP_NEW_PIN'
                          );
                        }}
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group"
                        title={`Scheduled Visit (${selectedDateFilter}): ${job.clientName} — ${job.serviceAddress}`}
                      >
                        <div className="px-2 py-0.5 rounded-lg bg-slate-900/95 text-white border border-amber-400 text-[9.5px] font-black shadow-xl whitespace-nowrap mb-0.5 flex items-center gap-1 group-hover:scale-110 transition-transform">
                          <span className="text-amber-300 font-mono">{tStr}</span>
                          <span>{job.clientName.split(' ')[0]}</span>
                          <span className="px-1 rounded text-[8px]" style={{ backgroundColor: badgeCol }}>
                            {primaryCleaner.split(' ')[0]}
                          </span>
                        </div>
                        <div
                          className="w-6 h-6 rounded-lg border-2 border-amber-300 shadow-xl flex items-center justify-center text-white font-black text-[9px]"
                          style={{ backgroundColor: badgeCol }}
                        >
                          #{jIdx + 1}
                        </div>
                      </div>
                    );
                  })}

                {/* Leads & Quotes Layer Pins (if Leads & Quotes filter active) */}
                {showLeadsAndQuotesOnMap &&
                  leads.slice(0, 15).map((l, idx) => {
                    const c = estimateEdmontonCoords(`${l.address || 'Edmonton'}, ${l.city || 'Edmonton'}, AB`);
                    const pos = projectToViewportPx(c.lat, c.lng);
                    return (
                      <div
                        key={`lead-marker-${l.id || idx}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinDirectoryItem(
                            {
                              title: l.customerName,
                              subtitle: l.serviceRequested,
                              address: `${l.address || 'Edmonton'}, ${l.city || 'Edmonton'}, AB`,
                              phone: l.phone,
                              amount: l.quotedAmount,
                              lat: c.lat,
                              lng: c.lng,
                              type: 'LEAD',
                            },
                            true
                          );
                        }}
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer"
                      >
                        <div className="px-2 py-0.5 rounded-lg bg-purple-700 text-white border border-white text-[9px] font-black shadow-md whitespace-nowrap mb-0.5">
                          📌 {l.customerName}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-purple-600 border-2 border-white shadow-md" />
                      </div>
                    );
                  })}

                {/* All User-Dropped / Active Pins (Pin 1 (A), Pin 2 (B), Pin 3 (C)...) */}
                {pins.map((pin, idx) => {
                  const pos = projectToViewportPx(pin.lat, pin.lng);
                  const letter = String.fromCharCode(65 + idx);
                  const isSel = idx === activePinIndex;
                  return (
                    <div
                      key={`user-pin-${pin.id}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePinIndex(idx);
                        setMapCenter({ lat: pin.lat, lng: pin.lng });
                      }}
                      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center cursor-pointer group"
                    >
                      <div
                        style={{ backgroundColor: pin.color }}
                        className={`px-2.5 py-1 rounded-xl text-white border-2 border-white text-[10px] font-black shadow-2xl whitespace-nowrap mb-1 flex items-center gap-1.5 transition-transform group-hover:scale-105 ${
                          isSel ? 'ring-2 ring-amber-300' : ''
                        }`}
                      >
                        <span>
                          📍 PIN {idx + 1} ({letter}): {pin.address.split(',')[0]}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePinIndex(idx);
                            setMapCenter({ lat: pin.lat, lng: pin.lng });
                            setMapZoom(16);
                          }}
                          className="px-1.5 py-0.2 rounded bg-black/25 hover:bg-black/40 text-[9px] font-extrabold cursor-pointer"
                          title="Zoom to street level (z=16)"
                        >
                          🔍 Street
                        </button>
                        {pins.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePin(idx);
                            }}
                            className="px-1 rounded bg-black/25 hover:bg-black/50 text-[9px] font-black cursor-pointer"
                            title="Remove pin"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div
                        style={{ backgroundColor: pin.color }}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white font-black text-xs relative"
                      >
                        <span>{letter}</span>
                        {isSel && (
                          <span
                            style={{ borderColor: pin.color }}
                            className="absolute -inset-1.5 rounded-full border-2 animate-ping opacity-80"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Top Floating Map Status Overlay */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md text-white border border-white/15 text-xs font-bold pointer-events-auto shadow-lg flex items-center gap-2 max-w-lg truncate">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">
                  {activePin
                    ? `Active Pin #${activePinIndex + 1}: ${activePin.address}`
                    : 'Click anywhere on map to drop a pin'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 pointer-events-auto">
                <div className="px-2.5 py-1.5 rounded-xl bg-emerald-600/95 text-white text-[10px] font-black shadow-lg">
                  Closest Cleaner: {rankedCleaners[0]?.tech.name} ({rankedCleaners[0]?.distKm} km)
                </div>
              </div>
            </div>

            {/* Bottom-Left Quick Street Zoom Level Bar */}
            {tileStyle !== 'GOOGLE_EMBED' && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 z-30 flex flex-wrap items-center gap-1 bg-slate-900/90 backdrop-blur-md text-white p-1.5 rounded-xl border border-white/15 shadow-lg text-[10px] font-black"
              >
                <span className="px-1.5 text-sky-300 font-mono">Zoom z={zInt}:</span>
                {[
                  { z: 11, label: 'City (11)' },
                  { z: 13, label: 'District (13)' },
                  { z: 15, label: 'Streets (15)' },
                  { z: 17, label: 'Houses (17)' },
                ].map((preset) => (
                  <button
                    key={preset.z}
                    type="button"
                    onClick={() => setMapZoom(preset.z)}
                    className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                      zInt === preset.z
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setWheelZoomEnabled((w) => !w)}
                  className={`px-2 py-1 rounded-lg cursor-pointer transition-all ml-1 ${
                    wheelZoomEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 hover:bg-white/20 text-slate-300'
                  }`}
                  title="Toggle mouse scroll wheel zoom on map"
                >
                  {wheelZoomEnabled ? '🖱️ Wheel Zoom: ON' : '🖱️ Wheel Zoom: OFF'}
                </button>
              </div>
            )}

            {/* Bottom-Right Zoom In / Zoom Out / Fit Pins Controls */}
            {tileStyle !== 'GOOGLE_EMBED' && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 right-3 z-30 flex flex-col gap-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-300 p-1 shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
                  className="p-2 text-slate-800 hover:bg-sky-50 hover:text-sky-700 rounded-lg cursor-pointer"
                  title="Zoom In (See Street Names & Houses)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom((z) => Math.max(10, z - 1))}
                  className="p-2 text-slate-800 hover:bg-sky-50 hover:text-sky-700 rounded-lg cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFitAllPins}
                  className="p-2 text-indigo-700 hover:bg-indigo-50 rounded-lg border-t border-slate-200 cursor-pointer"
                  title="Fit All Dropped Pins"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activePin) {
                      setMapCenter({ lat: activePin.lat, lng: activePin.lng });
                      setMapZoom(15);
                    } else {
                      setMapCenter({ lat: 53.5412, lng: -113.4988 });
                      setMapZoom(12);
                    }
                  }}
                  className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg border-t border-slate-200 cursor-pointer"
                  title="Center on Active Pin at Street Zoom (z=15)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────────────────────
              5. INTERACTIVE DIRECTORY UNDER QUICK MAP: CLEANER HUBS vs DAY SCHEDULE vs LEADS vs PINS
             ─────────────────────────────────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInspectorTab('CLEANERS_AND_HUBS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    inspectorTab === 'CLEANERS_AND_HUBS'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🏠 Cleaner Hubs &amp; Cleaners ({technicians.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('DAY_SCHEDULE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    inspectorTab === 'DAY_SCHEDULE'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📅 Day&apos;s Schedule Events ({dateJobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('LEADS_QUOTES')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    inspectorTab === 'LEADS_QUOTES'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📌 Leads &amp; Quotes ({leads.length + quotes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('DROPPED_PINS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    inspectorTab === 'DROPPED_PINS'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📍 Dropped Pins ({pins.length})
                </button>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">
                Click <strong>Set Pin 1</strong> or <strong>+ Add Pin</strong> on any card to compare multiple spots on the map
              </span>
            </div>

            {inspectorTab === 'CLEANERS_AND_HUBS' && (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  mode === 'FULL_PAGE' ? 'lg:grid-cols-3 max-h-[340px]' : 'max-h-[250px]'
                } gap-2 overflow-y-auto pr-1`}
              >
                {rankedCleaners.map((rc, idx) => (
                  <div
                    key={`cleaner-card-${rc.tech.id}`}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      idx === 0
                        ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50/80 hover:bg-sky-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-5 h-5 rounded-md text-white text-[9px] font-black flex items-center justify-center shrink-0"
                            style={{ backgroundColor: rc.tech.color || '#0284C7' }}
                          >
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-black text-slate-900 truncate">{rc.tech.name}</span>
                          {rc.jobsOnSelectedDay.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-black">
                              {rc.jobsOnSelectedDay.length} job{rc.jobsOnSelectedDay.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-600 truncate mt-0.5" title={rc.hubAddr}>
                          🏠 <strong>Hub:</strong> {rc.hubAddr}
                        </div>
                        {rc.activeJobOnDay && (
                          <div className="text-[10px] text-purple-700 font-bold truncate">
                            📅 <strong>{selectedDateFilter}:</strong> {rc.activeJobOnDay.clientName} ({rc.activeJobOnDay.serviceAddress})
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-black block">
                          {rc.distKm} km
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">~{rc.estMinutes} min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() =>
                          handlePinDirectoryItem(
                            {
                              title: `${rc.tech.name} (${rc.tech.vanNumber})`,
                              subtitle: rc.activeJobOnDay
                                ? `Scheduled on ${selectedDateFilter}: ${rc.activeJobOnDay.clientName}`
                                : 'Home Hub Address',
                              address: rc.activeJobOnDay ? rc.activeJobOnDay.serviceAddress : rc.hubAddr,
                              phone: rc.tech.phone,
                              lat: rc.activeJobOnDay ? rc.activeJobOnDay.lat : rc.hubLat,
                              lng: rc.activeJobOnDay ? rc.activeJobOnDay.lng : rc.hubLng,
                              type: 'HUB',
                            },
                            false
                          )
                        }
                        className="flex-1 px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black cursor-pointer text-center"
                      >
                        🎯 Focus Street
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePinDirectoryItem(
                            {
                              title: `${rc.tech.name} (${rc.tech.vanNumber})`,
                              subtitle: 'Home Hub Address',
                              address: rc.hubAddr,
                              phone: rc.tech.phone,
                              lat: rc.hubLat,
                              lng: rc.hubLng,
                              type: 'HUB',
                            },
                            true
                          )
                        }
                        className="flex-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black cursor-pointer text-center"
                      >
                        + Add as Pin #{pins.length + 1}
                      </button>
                      {onBookCleaner && activePin && (
                        <button
                          type="button"
                          onClick={() => onBookCleaner(rc.tech, activePin.address, activePin.label, activePin.phone)}
                          className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black cursor-pointer"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inspectorTab === 'DAY_SCHEDULE' && (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {dateJobs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No scheduled visits on <strong>{selectedDateFilter}</strong>. Pick another day of the week above!
                  </div>
                ) : (
                  dateJobs.map((job, jIdx) => {
                    const tStr = job.startAt
                      ? new Date(job.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                    return (
                      <div
                        key={`day-job-${job.id}`}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/50 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono text-[10px] font-black">
                              #{jIdx + 1} • {tStr}
                            </span>
                            <span className="text-xs font-black text-slate-900 truncate">{job.clientName}</span>
                            {(job.assignedCleaners || ['Unassigned']).map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[9px] font-black text-white"
                                style={{ backgroundColor: getCleanerColor(c) }}
                              >
                                {c.split(' ')[0]}
                              </span>
                            ))}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate mt-0.5">{job.serviceAddress}</div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handlePinDirectoryItem(
                                {
                                  title: job.clientName,
                                  subtitle: `${tStr} • ${(job.assignedCleaners || []).join(', ')}`,
                                  address: job.serviceAddress,
                                  phone: job.clientPhone,
                                  lat: job.lat,
                                  lng: job.lng,
                                  type: 'VISIT',
                                },
                                false
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black cursor-pointer"
                          >
                            🎯 Set Pin #{activePinIndex + 1}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handlePinDirectoryItem(
                                {
                                  title: job.clientName,
                                  subtitle: `${tStr} • ${(job.assignedCleaners || []).join(', ')}`,
                                  address: job.serviceAddress,
                                  phone: job.clientPhone,
                                  lat: job.lat,
                                  lng: job.lng,
                                  type: 'VISIT',
                                },
                                true
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                          >
                            + Add Pin #{pins.length + 1}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {inspectorTab === 'LEADS_QUOTES' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {leads.slice(0, 12).map((l, idx) => (
                  <div
                    key={`lead-card-${l.id || idx}`}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-black text-slate-900 truncate">{l.customerName}</div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {l.address || 'Edmonton'}, {l.city || 'Edmonton'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handlePinDirectoryItem(
                            {
                              title: l.customerName,
                              subtitle: l.serviceRequested,
                              address: `${l.address || 'Edmonton'}, ${l.city || 'Edmonton'}, AB`,
                              phone: l.phone,
                              amount: l.quotedAmount,
                              type: 'LEAD',
                            },
                            false
                          )
                        }
                        className="flex-1 px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black cursor-pointer"
                      >
                        🎯 Set Pin #{activePinIndex + 1}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePinDirectoryItem(
                            {
                              title: l.customerName,
                              subtitle: l.serviceRequested,
                              address: `${l.address || 'Edmonton'}, ${l.city || 'Edmonton'}, AB`,
                              phone: l.phone,
                              amount: l.quotedAmount,
                              type: 'LEAD',
                            },
                            true
                          )
                        }
                        className="flex-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                      >
                        + Add Pin #{pins.length + 1}
                      </button>
                    </div>
                  </div>
                ))}
                {quotes.slice(0, 12).map((q, idx) => (
                  <div
                    key={`quote-card-${q.id || q.quoteNumber || idx}`}
                    className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/50 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-black text-slate-900 truncate">
                        {q.quoteNumber} • {q.clientName}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">{q.serviceAddress || 'Edmonton, AB'}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handlePinDirectoryItem(
                            {
                              title: `${q.clientName} (${q.quoteNumber})`,
                              subtitle: q.service,
                              address: q.serviceAddress || 'Edmonton, AB',
                              phone: q.clientPhone,
                              amount: q.total,
                              type: 'QUOTE',
                            },
                            false
                          )
                        }
                        className="flex-1 px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black cursor-pointer"
                      >
                        🎯 Set Pin #{activePinIndex + 1}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePinDirectoryItem(
                            {
                              title: `${q.clientName} (${q.quoteNumber})`,
                              subtitle: q.service,
                              address: q.serviceAddress || 'Edmonton, AB',
                              phone: q.clientPhone,
                              amount: q.total,
                              type: 'QUOTE',
                            },
                            true
                          )
                        }
                        className="flex-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                      >
                        + Add Pin #{pins.length + 1}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inspectorTab === 'DROPPED_PINS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {pins.map((pin, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  return (
                    <div
                      key={`dir-pin-${pin.id}`}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                            style={{ backgroundColor: pin.color }}
                          >
                            PIN {idx + 1} ({letter})
                          </span>
                          <span className="text-xs font-black text-slate-900 truncate">{pin.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate mt-0.5">{pin.address}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActivePinIndex(idx);
                            setMapCenter({ lat: pin.lat, lng: pin.lng });
                            setMapZoom(16);
                          }}
                          className="px-2 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 text-[10px] font-black cursor-pointer"
                        >
                          🔍 Zoom Street
                        </button>
                        {pins.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePin(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
