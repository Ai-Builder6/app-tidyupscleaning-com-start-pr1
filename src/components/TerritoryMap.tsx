import React, { useEffect, useRef, useState } from 'react';
import { Map, useMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Technician, ServiceTicket, UrgencyLevel, TicketStatus } from '../types/dispatch';
import { HVAC_DEPOTS } from '../data/cleaningData';
import { decodePolyline } from '../services/routesApi';
import { reverseGeocode, GeocodedAddress } from '../services/geocodingService';
import { MapErrorBoundary } from './MapErrorBoundary';
import { 
  Flame, 
  Clock, 
  Wrench, 
  Truck, 
  Building2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Phone, 
  ShieldAlert, 
  ExternalLink, 
  CheckCircle2, 
  Activity, 
  MapPin, 
  Compass, 
  Navigation, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Copy, 
  Check, 
  MessageSquare,
  Calendar,
  CalendarDays,
  PhoneCall,
  UserCheck,
  Edit2,
  Route
} from 'lucide-react';
import { 
  ScheduledJobItem, 
  getCleanerColor, 
  getCleanerInitials, 
  formatDateTime,
  getEdmontonToday
} from '../data/jobberCalendarData';
import { VanHubEditModal } from './VanHubEditModal';

interface TerritoryMapProps {
  technicians: Technician[];
  tickets: ServiceTicket[];
  scheduledJobs?: ScheduledJobItem[];
  selectedScheduledJobId?: string | null;
  onSelectScheduledJob?: (jobId: string | null) => void;
  onToggleJobStatus?: (jobId: string, newStatus: 'SCHEDULED' | 'COMPLETED') => void;
  onNavigateToCalendar?: (date?: string) => void;
  onUpdateTechnician?: (updatedTech: Technician) => void;
  selectedTechId: string | null;
  onSelectTech: (techId: string | null) => void;
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string | null) => void;
  urgencyFilter: 'ALL' | UrgencyLevel;
  onUrgencyFilterChange: (urgency: 'ALL' | UrgencyLevel) => void;
  onAssignTicketToTech?: (ticketId: string, techId: string) => void;
  onMessageTech?: (tech: Technician) => void;
  isMapsAuthError?: boolean;
  refererErrorUrl?: string | null;
  initialInspectDate?: string | null;
}

// Subcomponent that renders rich Vehicle details and live Reverse Geocoded address from Geocoding API (only on Google Map surfaces per ToS)
function TechInfoWindowContent({
  tech,
  tickets,
  allowGeocoding = true,
  onEditVanHub,
}: {
  tech: Technician;
  tickets: ServiceTicket[];
  allowGeocoding?: boolean;
  onEditVanHub?: (tech: Technician) => void;
}) {
  const [addressData, setAddressData] = useState<GeocodedAddress | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(allowGeocoding);

  // Active tickets for this technician
  const assignedTickets = tickets
    .filter((t) => tech.assignedTicketIds.includes(t.id))
    .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

  const currentStopTicket = assignedTickets.find((t) => t.status === 'IN_PROGRESS') || assignedTickets[0];

  useEffect(() => {
    if (!allowGeocoding) {
      setIsLoadingAddress(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingAddress(true);

    reverseGeocode(tech.currentLocation.lat, tech.currentLocation.lng)
      .then((res) => {
        if (isCurrent) {
          setAddressData(res);
          setIsLoadingAddress(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setIsLoadingAddress(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [allowGeocoding, tech.currentLocation.lat, tech.currentLocation.lng]);

  return (
    <div className="p-1 max-w-[290px] text-slate-900 font-sans">
      {/* Van Number & Status Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tech.color }} />
          <span className="font-extrabold text-sm text-slate-900">{tech.vanNumber}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            tech.status === 'ON_SITE'
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : tech.status === 'EN_ROUTE'
              ? 'bg-blue-100 text-blue-800 border-blue-300'
              : tech.status === 'RETURNING_DEPOT'
              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}
        >
          {tech.status.replace('_', ' ')}
        </span>
      </div>

      {/* Technician Profile */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-bold text-xs text-slate-800">{tech.name}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" /> {tech.phone}
          </div>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
          {tech.shiftCapacityHours}h Shift
        </span>
      </div>

      {/* Vehicle Location Card: Google Geocoding API on Google Map, Fleet GPS on Fallback */}
      {allowGeocoding ? (
        <div className="p-2 bg-blue-50/80 rounded-lg border border-blue-200 mb-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-blue-900 mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>Current Vehicle Address</span>
            </span>
            <span className="text-[8px] px-1 bg-blue-200/80 text-blue-900 rounded font-bold uppercase">
              Geocoding API
            </span>
          </div>

          {isLoadingAddress ? (
            <div className="animate-pulse py-1 space-y-1">
              <div className="h-3 bg-blue-200/60 rounded w-4/5"></div>
              <div className="h-2 bg-blue-100 rounded w-1/2"></div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                {addressData?.formattedAddress || `${tech.currentLocation.lat.toFixed(4)}, ${tech.currentLocation.lng.toFixed(4)}`}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>{tech.currentLocation.lat.toFixed(4)}° N, {tech.currentLocation.lng.toFixed(4)}° W</span>
                {addressData?.neighborhood && (
                  <span className="text-blue-700 font-sans font-medium">{addressData.neighborhood}</span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mb-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <span>Vehicle GPS Coordinates</span>
            </span>
            <span className="text-[8px] px-1 bg-slate-200 text-slate-700 rounded font-bold uppercase">
              Telematics
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-snug font-mono">
              {tech.currentLocation.lat.toFixed(4)}° N, {Math.abs(tech.currentLocation.lng).toFixed(4)}° W
            </p>
            <div className="text-[10px] text-slate-500 mt-1">
              🏠 Home Hub: <strong className="text-slate-700">{tech.homeAddress || tech.depotLocation.name}</strong>
            </div>
            {tech.email && (
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                ✉️ {tech.email}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Stop / Assignment Status */}
      {currentStopTicket && (
        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 mb-2 text-xs">
          <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            <Navigation className="w-3 h-3 text-amber-600" />
            <span>
              {tech.status === 'ON_SITE' ? 'Servicing Stop' : 'Target Destination'}:
            </span>
          </div>
          <p className="font-bold text-slate-800 text-[11px] truncate">
            {currentStopTicket.ticketNumber} • {currentStopTicket.customerName}
          </p>
        </div>
      )}

      {/* Route & Stop Metrics */}
      <div className="grid grid-cols-2 gap-1.5 text-center p-1.5 bg-slate-50 rounded-lg text-xs mb-2 border border-slate-200">
        <div className="bg-white p-1 rounded border border-slate-200">
          <div className="text-[10px] text-slate-500">Route Stops</div>
          <div className="font-bold text-slate-800">{tech.assignedTicketIds.length} Scheduled</div>
        </div>
        <div className="bg-white p-1 rounded border border-slate-200">
          <div className="text-[10px] text-slate-500">Est Route Time</div>
          <div className="font-bold text-blue-600">{tech.routeMetrics?.totalDriveMinutes || 0}m drive</div>
        </div>
      </div>

      {/* Skills */}
      <div className="text-[10px] text-slate-600 flex flex-wrap gap-1">
        <span className="font-semibold text-slate-700">Skills:</span>
        {tech.skills.slice(0, 3).map((s) => (
          <span key={s} className="px-1 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px]">
            {s}
          </span>
        ))}
      </div>

      {/* Edit Van Name & Hub Button */}
      {onEditVanHub && (
        <button
          type="button"
          onClick={() => onEditVanHub(tech)}
          className="w-full mt-2.5 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
        >
          <Edit2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Edit Van Name &amp; Hub Address</span>
        </button>
      )}
    </div>
  );
}

// Bounding box for Greater Edmonton Area (Lat: 53.28 to 53.68, Lng: -113.72 to -113.26)
const EDMONTON_BOUNDS = {
  minLat: 53.28,
  maxLat: 53.68,
  minLng: -113.72,
  maxLng: -113.26,
};

// Subcomponent to manage polylines and viewport fitting with useMap() for Google Maps API
function MapRouteRenderer({
  selectedTech,
  technicians,
  tickets,
}: {
  selectedTech: Technician | null;
  technicians: Technician[];
  tickets: ServiceTicket[];
}) {
  const map = useMap();
  const polylineRefs = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || !window.google?.maps) return;

    // Clear existing polylines
    polylineRefs.current.forEach((p) => p.setMap(null));
    polylineRefs.current = [];

    // If a tech is selected, draw their active route polyline
    const techsToRender = selectedTech ? [selectedTech] : technicians.filter((t) => t.assignedTicketIds.length > 0);

    techsToRender.forEach((tech) => {
      const isSelected = selectedTech?.id === tech.id;
      const techTickets = tickets
        .filter((t) => tech.assignedTicketIds.includes(t.id))
        .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

      if (techTickets.length === 0) return;

      let pathCoords: google.maps.LatLngLiteral[] = [];

      if (tech.routeMetrics?.encodedPolyline) {
        pathCoords = decodePolyline(tech.routeMetrics.encodedPolyline);
      }

      // Fallback direct path
      if (pathCoords.length === 0) {
        pathCoords = [
          { lat: tech.currentLocation.lat, lng: tech.currentLocation.lng },
          ...techTickets.map((t) => ({ lat: t.location.lat, lng: t.location.lng })),
          { lat: tech.depotLocation.lat, lng: tech.depotLocation.lng },
        ];
      }

      const polyline = new google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: tech.color || '#3B82F6',
        strokeOpacity: isSelected ? 0.95 : 0.45,
        strokeWeight: isSelected ? 5 : 3,
        icons: isSelected
          ? [
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: '#FFFFFF',
                  fillColor: tech.color,
                  fillOpacity: 1,
                  strokeWeight: 1.5,
                },
                offset: '35%',
                repeat: '80px',
              },
            ]
          : undefined,
        map,
      });

      polylineRefs.current.push(polyline);
    });

    return () => {
      polylineRefs.current.forEach((p) => p.setMap(null));
      polylineRefs.current = [];
    };
  }, [map, selectedTech, technicians, tickets]);

  return null;
}

// Custom Zoom and View Reset Controls for Google Maps JS SDK (eliminates default UI collision)
function GoogleMapZoomControls() {
  const map = useMap();
  if (!map) return null;

  return (
    <div className="absolute bottom-18 landscape:bottom-3 md:bottom-4 right-3 md:right-4 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 shadow-md">
      <button
        onClick={() => {
          const currentZoom = map.getZoom() || 10;
          map.setZoom(Math.min(18, currentZoom + 1));
        }}
        className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors flex items-center justify-center cursor-pointer"
        title="Zoom In"
        aria-label="Zoom in on territory map"
      >
        <ZoomIn className="w-5 h-5" aria-hidden="true" />
      </button>
      <button
        onClick={() => {
          const currentZoom = map.getZoom() || 10;
          map.setZoom(Math.max(6, currentZoom - 1));
        }}
        className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors flex items-center justify-center cursor-pointer"
        title="Zoom Out"
        aria-label="Zoom out on territory map"
      >
        <ZoomOut className="w-5 h-5" aria-hidden="true" />
      </button>
      <button
        onClick={() => {
          map.setCenter({ lat: 53.5461, lng: -113.4938 });
          map.setZoom(11);
        }}
        className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors border-t border-slate-100 flex items-center justify-center cursor-pointer"
        title="Reset View"
        aria-label="Reset territory map zoom and center"
      >
        <RotateCcw className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
}

// Subcomponent to smoothly pan and zoom to selected job or ticket
function MapPanController({
  selectedScheduledJob,
  selectedTicket,
}: {
  selectedScheduledJob?: ScheduledJobItem | null;
  selectedTicket?: ServiceTicket | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (selectedScheduledJob) {
      map.panTo({ lat: selectedScheduledJob.lat, lng: selectedScheduledJob.lng });
      map.setZoom(14);
    } else if (selectedTicket) {
      map.panTo({ lat: selectedTicket.location.lat, lng: selectedTicket.location.lng });
      map.setZoom(14);
    }
  }, [map, selectedScheduledJob, selectedTicket]);
  return null;
}

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  technicians,
  tickets,
  scheduledJobs = [],
  selectedScheduledJobId = null,
  onSelectScheduledJob,
  onToggleJobStatus,
  onNavigateToCalendar,
  onUpdateTechnician,
  selectedTechId,
  onSelectTech,
  selectedTicketId,
  onSelectTicket,
  urgencyFilter,
  onUrgencyFilterChange,
  onAssignTicketToTech,
  onMessageTech,
  isMapsAuthError = false,
  refererErrorUrl = null,
  initialInspectDate = null,
}) => {
  const [activeInfoWindow, setActiveInfoWindow] = useState<{
    type: 'TICKET' | 'TECH' | 'DEPOT' | 'JOB';
    id: string;
    position: { lat: number; lng: number };
  } | null>(null);

  const [showDepots, setShowDepots] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showScheduledJobs, setShowScheduledJobs] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid' | 'terrain'>('roadmap');
  const [localMapError, setLocalMapError] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [isFilterBarCollapsed, setIsFilterBarCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [isSummaryMinimized, setIsSummaryMinimized] = useState(true);

  // Van & Hub Editor modal state
  const [editingVanHubTech, setEditingVanHubTech] = useState<Technician | null>(null);
  const [isVanHubModalOpen, setIsVanHubModalOpen] = useState<boolean>(false);

  // Live Edmonton Today tracker (e.g., Wednesday, October 14, 2026) — updates automatically every 60s
  const [liveToday, setLiveToday] = useState(() => getEdmontonToday());
  useEffect(() => {
    const timer = setInterval(() => {
      const next = getEdmontonToday();
      setLiveToday((prev) => (prev.dateString !== next.dateString ? next : prev));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Schedule Horizon Filter & Specific Date / Day-of-Week Inspector
  const [scheduleHorizon, setScheduleHorizon] = useState<
    'TODAY' | 'TOMORROW' | 'SPECIFIC_DATE' | 'WEEK' | 'WEEKS_3_4' | 'MONTH' | 'WEEK_1' | 'WEEK_2' | 'WEEK_3' | 'WEEK_4' | 'ALL'
  >(() => (initialInspectDate ? 'SPECIFIC_DATE' : 'MONTH'));
  const [selectedInspectDate, setSelectedInspectDate] = useState<string>(
    () => initialInspectDate || getEdmontonToday().dateString
  );
  const [showDayOfWeekBar, setShowDayOfWeekBar] = useState<boolean>(true);
  const [showScheduleDrawer, setShowScheduleDrawer] = useState<boolean>(false);

  // Sync if parent passes a new initialInspectDate
  useEffect(() => {
    if (initialInspectDate) {
      setSelectedInspectDate(initialInspectDate);
      setScheduleHorizon('SPECIFIC_DATE');
      setShowScheduledJobs(true);
      setShowScheduleDrawer(true);
    }
  }, [initialInspectDate]);

  // Tomorrow ISO string helper
  const tomorrowInfo = (() => {
    const d = new Date(liveToday.year, liveToday.monthIndex, liveToday.day + 1);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      dateString: ds,
      shortLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  })();

  // Build 14-day Day-of-Week strip (This Week Mon–Sun + Next Week Mon–Sun) so user can pick any day of the week (e.g., Monday or Tuesday of next week)
  const twoWeekDayPills = (() => {
    const baseDate = new Date(liveToday.year, liveToday.monthIndex, liveToday.day);
    const dayOfWeek = baseDate.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayThisWeek = new Date(baseDate);
    mondayThisWeek.setDate(baseDate.getDate() + diffToMonday);

    return Array.from({ length: 14 }, (_, idx) => {
      const d = new Date(mondayThisWeek);
      d.setDate(mondayThisWeek.getDate() + idx);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const jobsOnDay = (scheduledJobs || []).filter((j) => String(j.startAt || '').slice(0, 10) === ds);
      return {
        dateString: ds,
        dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayFull: d.toLocaleDateString('en-US', { weekday: 'long' }),
        monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: ds === liveToday.dateString,
        isTomorrow: ds === tomorrowInfo.dateString,
        isNextWeek: idx >= 7,
        jobsCount: jobsOnDay.length,
      };
    });
  })();

  const stepInspectDate = (deltaDays: number) => {
    const parts = selectedInspectDate.split('-').map(Number);
    const base = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(liveToday.year, liveToday.monthIndex, liveToday.day);
    base.setDate(base.getDate() + deltaDays);
    const nextIso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    setSelectedInspectDate(nextIso);
    setScheduleHorizon('SPECIFIC_DATE');
    setShowScheduledJobs(true);
    setShowScheduleDrawer(true);
  };

  // 2-Address Route & Distance Comparison Tool + Closest Cleaner Distance Finder on Map
  const [showTwoAddressPanel, setShowTwoAddressPanel] = useState<boolean>(false);
  const [showClosestCleanersPanel, setShowClosestCleanersPanel] = useState<boolean>(false);
  const [radarSearchAddress, setRadarSearchAddress] = useState<string>('10405 Jasper Ave NW, Edmonton, AB');
  const [addressAInput, setAddressAInput] = useState<string>('10420 103 Ave NW, Edmonton, AB');
  const [addressBInput, setAddressBInput] = useState<string>('5230 Windermere Blvd SW, Edmonton, AB');

  const resolveEdmontonAddressCoords = (addr: string, fallbackLat: number, fallbackLng: number) => {
    const clean = (addr || '').trim();
    if (!clean) return { lat: fallbackLat, lng: fallbackLng };
    const lower = clean.toLowerCase();
    const matchedJob = scheduledJobs.find(
      (j) =>
        j.serviceAddress.toLowerCase().includes(lower) ||
        lower.includes(j.serviceAddress.toLowerCase().split(',')[0]) ||
        j.clientName.toLowerCase() === lower
    );
    if (matchedJob) return { lat: matchedJob.lat, lng: matchedJob.lng };

    const matchedTicket = tickets.find(
      (t) =>
        t.location.address.toLowerCase().includes(lower) ||
        lower.includes(t.location.address.toLowerCase().split(',')[0])
    );
    if (matchedTicket) return { lat: matchedTicket.location.lat, lng: matchedTicket.location.lng };

    if (lower.includes('windermere') || lower.includes('amblesside')) return { lat: 53.4312, lng: -113.6054 };
    if (lower.includes('summerside')) return { lat: 53.4148, lng: -113.4625 };
    if (lower.includes('st. albert') || lower.includes('st albert')) return { lat: 53.6305, lng: -113.6256 };
    if (lower.includes('sherwood')) return { lat: 53.5168, lng: -113.3187 };
    if (lower.includes('whyte') || lower.includes('82 ave')) return { lat: 53.5181, lng: -113.4982 };
    if (lower.includes('103 ave') || lower.includes('downtown') || lower.includes('jasper')) return { lat: 53.5461, lng: -113.4938 };
    if (lower.includes('glenora') || lower.includes('142 st')) return { lat: 53.5442, lng: -113.5621 };
    if (lower.includes('terwillegar')) return { lat: 53.4581, lng: -113.5812 };

    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash * 31 + clean.charCodeAt(i)) % 10000;
    }
    const latOffset = ((hash % 100) / 100) * 0.14 - 0.07;
    const lngOffset = ((Math.floor(hash / 100) % 100) / 100) * 0.22 - 0.11;
    return {
      lat: Number((53.535 + latOffset).toFixed(5)),
      lng: Number((-113.495 + lngOffset).toFixed(5)),
    };
  };

  const coordsA = resolveEdmontonAddressCoords(addressAInput, 53.5461, -113.4938);
  const coordsB = resolveEdmontonAddressCoords(addressBInput, 53.4312, -113.6054);
  const radarTargetCoords = resolveEdmontonAddressCoords(radarSearchAddress, 53.5412, -113.4988);

  const calcRoadDistKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(0.8, Math.round(R * c * 1.28 * 10) / 10);
  };

  const twoAddrDistanceKm = calcRoadDistKm(coordsA.lat, coordsA.lng, coordsB.lat, coordsB.lng);
  const twoAddrDriveMins = Math.max(4, Math.round(twoAddrDistanceKm * 1.65 + 4));

  // Filter scheduled jobs by Schedule Horizon or Specific Selected Date
  const horizonFilteredScheduledJobs = (() => {
    if (!scheduledJobs || scheduledJobs.length === 0) return [];
    const sortedAll = [...scheduledJobs].sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
    if (scheduleHorizon === 'ALL') return sortedAll;

    const todayIso = liveToday.dateString;
    const currentMonthPrefix = `${liveToday.year}-${String(liveToday.month).padStart(2, '0')}`;
    const anchorMs = new Date(liveToday.year, liveToday.monthIndex, liveToday.day).getTime();

    const filtered = sortedAll.filter((j) => {
      const jobDateStr = j.startAt.slice(0, 10);
      const parts = jobDateStr.split('-').map(Number);
      const jobDay = parts[2] || 1;
      const jobMs = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]).getTime() : anchorMs;
      const diffDays = Math.round((jobMs - anchorMs) / (1000 * 60 * 60 * 24));

      if (scheduleHorizon === 'TODAY') {
        return jobDateStr === todayIso;
      }
      if (scheduleHorizon === 'TOMORROW') {
        return jobDateStr === tomorrowInfo.dateString;
      }
      if (scheduleHorizon === 'SPECIFIC_DATE') {
        return jobDateStr === selectedInspectDate;
      }
      if (scheduleHorizon === 'WEEK') {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (scheduleHorizon === 'WEEKS_3_4') {
        return jobDateStr.startsWith(currentMonthPrefix) && jobDay >= 15;
      }
      if (scheduleHorizon === 'WEEK_1') {
        return jobDateStr.startsWith(currentMonthPrefix) && jobDay >= 1 && jobDay <= 7;
      }
      if (scheduleHorizon === 'WEEK_2') {
        return jobDateStr.startsWith(currentMonthPrefix) && jobDay >= 8 && jobDay <= 14;
      }
      if (scheduleHorizon === 'WEEK_3') {
        return jobDateStr.startsWith(currentMonthPrefix) && jobDay >= 15 && jobDay <= 21;
      }
      if (scheduleHorizon === 'WEEK_4') {
        return jobDateStr.startsWith(currentMonthPrefix) && jobDay >= 22 && jobDay <= 31;
      }
      if (scheduleHorizon === 'MONTH') {
        return jobDateStr.startsWith(currentMonthPrefix) || (diffDays >= 0 && diffDays <= 31);
      }
      return true;
    });

    return filtered;
  })();

  // Active inspected date string (used to check cleaner schedules on that specific day)
  const activeDateForCleaners =
    scheduleHorizon === 'TODAY'
      ? liveToday.dateString
      : scheduleHorizon === 'TOMORROW'
      ? tomorrowInfo.dateString
      : selectedInspectDate;

  const formattedInspectDateLabel = (() => {
    const parts = activeDateForCleaners.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    return activeDateForCleaners;
  })();

  // Ranked cleaners by distance to radarSearchAddress (accounting for both their Home Hub and any Scheduled Job on activeDateForCleaners)
  const rankedCleanersToTarget = (() => {
    return technicians
      .map((tech) => {
        const homeLat = tech.depotLocation?.lat || tech.currentLocation.lat;
        const homeLng = tech.depotLocation?.lng || tech.currentLocation.lng;
        const homeAddress = tech.depotLocation?.address || tech.homeAddress || tech.currentLocation.address;
        const homeDistKm = calcRoadDistKm(radarTargetCoords.lat, radarTargetCoords.lng, homeLat, homeLng);

        const techFirstName = tech.name.split(' ')[0].toLowerCase();
        const jobsForTechOnDay = (scheduledJobs || []).filter((j) => {
          const jDate = String(j.startAt || '').slice(0, 10);
          if (jDate !== activeDateForCleaners) return false;
          return j.assignedCleaners?.some(
            (c) => c.toLowerCase().includes(techFirstName) || c.toLowerCase().includes(tech.name.toLowerCase())
          );
        });

        const firstJobOnDay = jobsForTechOnDay[0];
        const jobDistKm = firstJobOnDay
          ? calcRoadDistKm(radarTargetCoords.lat, radarTargetCoords.lng, firstJobOnDay.lat, firstJobOnDay.lng)
          : null;

        const bestDistKm = jobDistKm !== null ? Math.min(homeDistKm, jobDistKm) : homeDistKm;
        const bestMins = Math.max(4, Math.round(bestDistKm * 1.65 + 4));
        const closestFrom = jobDistKm !== null && jobDistKm < homeDistKm ? `Job (${firstJobOnDay.clientName})` : 'Home Hub';

        return {
          tech,
          homeAddress,
          homeDistKm,
          jobDistKm,
          bestDistKm,
          bestMins,
          closestFrom,
          jobsOnDay: jobsForTechOnDay,
        };
      })
      .sort((a, b) => a.bestDistKm - b.bestDistKm);
  })();

  // Auto-focus and open info window when selectedScheduledJobId is set
  useEffect(() => {
    if (selectedScheduledJobId && scheduledJobs && scheduledJobs.length > 0) {
      const job = scheduledJobs.find((j) => j.id === selectedScheduledJobId);
      if (job) {
        const jobDate = String(job.startAt || '').slice(0, 10);
        if (jobDate) {
          setSelectedInspectDate(jobDate);
        }
        setActiveInfoWindow({
          type: 'JOB',
          id: job.id,
          position: { lat: job.lat, lng: job.lng },
        });
      }
    }
  }, [selectedScheduledJobId, scheduledJobs]);

  const isMapFallbackActive = isMapsAuthError || localMapError;

  // Fallback vector map pan/zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const vectorContainerRef = useRef<HTMLDivElement>(null);

  // Touch handlers for tablet / mobile gesture panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const selectedTech = technicians.find((t) => t.id === selectedTechId) || null;
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  // Filter tickets according to urgency selection
  const filteredTickets = tickets.filter((t) => {
    if (urgencyFilter === 'ALL') return true;
    return t.urgency === urgencyFilter;
  });

  const getTicketBadge = (ticket: ServiceTicket) => {
    if (ticket.status === 'COMPLETED') {
      return {
        bg: 'bg-emerald-600',
        border: 'border-emerald-500',
        text: 'text-emerald-700',
        label: 'Resolved / Completed',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-white" />,
        isCompleted: true,
      };
    }
    if (ticket.status === 'IN_PROGRESS') {
      return {
        bg: 'bg-amber-500',
        border: 'border-amber-400',
        text: 'text-amber-700',
        label: 'In Progress (On-Site Repair)',
        icon: <Wrench className="w-3.5 h-3.5 text-white animate-spin" />,
        isInProgress: true,
      };
    }
    if (ticket.status === 'EN_ROUTE') {
      return {
        bg: 'bg-blue-600',
        border: 'border-blue-500',
        text: 'text-blue-700',
        label: 'Technician En Route',
        icon: <Truck className="w-3.5 h-3.5 text-white animate-pulse" />,
        isEnRoute: true,
      };
    }

    switch (ticket.urgency) {
      case 'EMERGENCY':
        return {
          bg: 'bg-red-600',
          border: 'border-red-500',
          text: 'text-red-700',
          label: 'Emergency SLA <2h',
          icon: <Flame className="w-3.5 h-3.5 text-white animate-pulse" />,
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-600',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'High Urgency SLA <4h',
          icon: <Flame className="w-3.5 h-3.5 text-white" />,
        };
      case 'SAME_DAY':
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'Same-Day SLA <6h',
          icon: <Clock className="w-3.5 h-3.5 text-white" />,
        };
      case 'ROUTINE':
      case 'LOW':
      default:
        return {
          bg: 'bg-blue-600',
          border: 'border-blue-500',
          text: 'text-blue-700',
          label: 'Routine PM',
          icon: <Wrench className="w-3.5 h-3.5 text-white" />,
        };
    }
  };

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'EMERGENCY':
        return {
          bg: 'bg-red-600',
          border: 'border-red-500',
          text: 'text-red-700',
          label: 'Emergency SLA <2h',
          icon: <Flame className="w-3.5 h-3.5 text-white animate-pulse" />,
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-600',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'High Urgency SLA <4h',
          icon: <Flame className="w-3.5 h-3.5 text-white" />,
        };
      case 'SAME_DAY':
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'Same-Day SLA <6h',
          icon: <Clock className="w-3.5 h-3.5 text-white" />,
        };
      case 'ROUTINE':
      case 'LOW':
      default:
        return {
          bg: 'bg-blue-600',
          border: 'border-blue-500',
          text: 'text-blue-700',
          label: 'Routine PM',
          icon: <Wrench className="w-3.5 h-3.5 text-white" />,
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_SITE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'EN_ROUTE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'AVAILABLE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'RETURNING_DEPOT':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Convert lat/lng to SVG percentage coordinates (0% to 100%)
  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - EDMONTON_BOUNDS.minLng) / (EDMONTON_BOUNDS.maxLng - EDMONTON_BOUNDS.minLng)) * 100;
    const y = ((EDMONTON_BOUNDS.maxLat - lat) / (EDMONTON_BOUNDS.maxLat - EDMONTON_BOUNDS.minLat)) * 100;
    return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
  };

  // Pan and drag handlers for vector map
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div id="territory-map-container" className="relative w-full h-full flex flex-col bg-slate-100 overflow-hidden select-none">

      {/* Screen Reader Live Region for Territory Status Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedTech
          ? `Technician ${selectedTech.vanNumber} (${selectedTech.name}) selected, status: ${selectedTech.status}, ${selectedTech.assignedTicketIds.length} scheduled stops.`
          : `Viewing all service territory. Filter: ${urgencyFilter} tickets. Total tickets: ${tickets.length}.`}
      </div>

      {/* Top Floating Map Controls Bar with Collapsible Mode */}
      <div id="map-control-bar" className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {isFilterBarCollapsed ? (
          /* Minimized Filter Pill */
          <div className="flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md pointer-events-auto self-start">
            <button
              onClick={() => setIsFilterBarCollapsed(false)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              title="Expand filter bar"
              aria-label="Expand filter bar"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Filter: {urgencyFilter === 'ALL' ? 'All Tickets' : urgencyFilter} ({filteredTickets.length})</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => setShowScheduledJobs(!showScheduledJobs)}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                showScheduledJobs ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Toggle Scheduled Calendar Jobs"
              aria-label="Toggle scheduled jobs"
            >
              <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Jobs ({scheduledJobs.length})</span>
            </button>

            <button
              onClick={() => setShowVehicles(!showVehicles)}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                showVehicles ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Toggle 15 Cleaning Techs"
              aria-label="Toggle 15 cleaning techs"
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">15 Techs</span>
            </button>

            <button
              onClick={() => setShowDepots(!showDepots)}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                showDepots ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Toggle Depots"
              aria-label="Toggle regional depots"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Hubs</span>
            </button>

            <button
              onClick={() => setMapType((m) => (m === 'roadmap' ? 'hybrid' : m === 'hybrid' ? 'terrain' : 'roadmap'))}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                mapType === 'hybrid'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : mapType === 'terrain'
                  ? 'bg-purple-50 text-purple-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={`Current: ${mapType === 'roadmap' ? 'Streets' : mapType === 'hybrid' ? 'Satellite' : 'Terrain'} (Click to cycle Streets / Satellite / Terrain)`}
              aria-label="Toggle map view between Streets, Satellite, and Terrain"
            >
              <Layers className={`w-3.5 h-3.5 ${mapType === 'hybrid' ? 'text-emerald-600' : mapType === 'terrain' ? 'text-purple-600' : 'text-slate-600'}`} />
              <span className="hidden sm:inline capitalize">{mapType === 'roadmap' ? 'Streets' : mapType}</span>
            </button>
          </div>
        ) : (
          /* Full Expanded Filter Row */
          <div className="flex items-center justify-between gap-2 w-full flex-wrap sm:flex-nowrap">
            {/* Left Pills: Urgency Filters */}
            <div className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md pointer-events-auto overflow-x-auto max-w-full" role="group" aria-label="Ticket Urgency Filter">
              <button
                id="filter-all-tickets"
                onClick={() => onUrgencyFilterChange('ALL')}
                aria-label={`Show all ${tickets.length} tickets`}
                aria-pressed={urgencyFilter === 'ALL'}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  urgencyFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                All
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  urgencyFilter === 'ALL' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700 font-bold'
                }`}>
                  {tickets.length}
                </span>
              </button>

              <button
                id="filter-emergency-tickets"
                onClick={() => onUrgencyFilterChange('EMERGENCY')}
                aria-label={`Filter by Emergency urgency, ${tickets.filter((t) => t.urgency === 'EMERGENCY').length} tickets`}
                aria-pressed={urgencyFilter === 'EMERGENCY'}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  urgencyFilter === 'EMERGENCY'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-700 hover:text-red-800 hover:bg-red-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                <span className="hidden xs:inline">Emergency</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  urgencyFilter === 'EMERGENCY' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'
                }`}>
                  {tickets.filter((t) => t.urgency === 'EMERGENCY').length}
                </span>
              </button>

              <button
                id="filter-sameday-tickets"
                onClick={() => onUrgencyFilterChange('SAME_DAY')}
                aria-label={`Filter by Same-Day urgency, ${tickets.filter((t) => t.urgency === 'SAME_DAY').length} tickets`}
                aria-pressed={urgencyFilter === 'SAME_DAY'}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  urgencyFilter === 'SAME_DAY'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:text-amber-900 hover:bg-amber-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span className="hidden xs:inline">Same-Day</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  urgencyFilter === 'SAME_DAY' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
                }`}>
                  {tickets.filter((t) => t.urgency === 'SAME_DAY').length}
                </span>
              </button>

              <button
                id="filter-routine-tickets"
                onClick={() => onUrgencyFilterChange('ROUTINE')}
                aria-label={`Filter by Routine urgency, ${tickets.filter((t) => t.urgency === 'ROUTINE').length} tickets`}
                aria-pressed={urgencyFilter === 'ROUTINE'}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  urgencyFilter === 'ROUTINE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span className="hidden xs:inline">Routine</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  urgencyFilter === 'ROUTINE' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-900'
                }`}>
                  {tickets.filter((t) => t.urgency === 'ROUTINE').length}
                </span>
              </button>
            </div>

            {/* Right Controls: Layer Toggles + Collapse Button */}
            <div className="flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 shadow-md pointer-events-auto shrink-0 gap-0.5">
              <button
                id="toggle-scheduled-jobs-layer"
                onClick={() => setShowScheduledJobs(!showScheduledJobs)}
                aria-pressed={showScheduledJobs}
                aria-label="Toggle display of scheduled cleaner jobs"
                className={`min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showScheduledJobs
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Scheduled Jobs on Map"
              >
                <CalendarDays className="w-4 h-4 text-purple-600" aria-hidden="true" />
                <span className="hidden sm:inline">Jobs ({scheduledJobs.length})</span>
              </button>

              <button
                id="toggle-vehicles-layer"
                onClick={() => setShowVehicles(!showVehicles)}
                aria-pressed={showVehicles}
                aria-label="Toggle display of 15 cleaning techs on map"
                className={`min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showVehicles ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle 15 Cleaning Techs"
              >
                <Truck className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span className="hidden sm:inline">15 Techs</span>
              </button>

              <button
                id="toggle-depots-layer"
                onClick={() => setShowDepots(!showDepots)}
                aria-pressed={showDepots}
                aria-label="Toggle display of regional logistics hubs"
                className={`min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showDepots ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Regional Depots"
              >
                <Building2 className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                <span className="hidden sm:inline">Hubs</span>
              </button>

              <button
                id="toggle-maptype-layer"
                onClick={() => setMapType((m) => (m === 'roadmap' ? 'hybrid' : m === 'hybrid' ? 'terrain' : 'roadmap'))}
                aria-pressed={mapType !== 'roadmap'}
                aria-label="Toggle map view between Streets, Satellite, and Terrain"
                className={`min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mapType === 'hybrid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                    : mapType === 'terrain'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Current: ${mapType === 'roadmap' ? 'Streets' : mapType === 'hybrid' ? 'Satellite' : 'Terrain'} (Click to cycle Streets / Satellite / Terrain)`}
              >
                <Layers className={`w-4 h-4 ${mapType === 'hybrid' ? 'text-emerald-600' : mapType === 'terrain' ? 'text-purple-600' : 'text-slate-600'}`} aria-hidden="true" />
                <span className="hidden sm:inline capitalize">{mapType === 'roadmap' ? 'Streets' : mapType}</span>
              </button>

              <button
                onClick={() => setIsFilterBarCollapsed(true)}
                className="min-h-[38px] min-w-[34px] px-1.5 py-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                title="Collapse filter bar to see more map"
                aria-label="Collapse filter bar"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Schedule Horizon, Any-Date Picker, Day-of-Week Selector & Closest Cleaner Radar Bar */}
        <div className="pointer-events-auto flex flex-col gap-1.5 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 px-2.5 py-2 shadow-md self-start max-w-full">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 flex-wrap">
              <CalendarDays className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 hidden sm:inline">
                Inspect Date:
              </span>

              {/* Prev Day / Calendar Date Picker / Next Day */}
              <div className="flex items-center bg-purple-50 border border-purple-300 rounded-lg px-1 py-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => stepInspectDate(-1)}
                  className="px-1.5 py-0.5 rounded hover:bg-purple-200 text-purple-900 font-black text-[10px] cursor-pointer"
                  title="Previous Day"
                >
                  ◀
                </button>
                <input
                  type="date"
                  value={selectedInspectDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedInspectDate(e.target.value);
                      setScheduleHorizon('SPECIFIC_DATE');
                      setShowScheduledJobs(true);
                      setShowScheduleDrawer(true);
                    }
                  }}
                  className="bg-transparent text-[10px] font-mono font-black text-purple-950 focus:outline-none cursor-pointer px-1"
                  title="Pick any date to inspect jobs and closest cleaners on the map"
                />
                <button
                  type="button"
                  onClick={() => stepInspectDate(1)}
                  className="px-1.5 py-0.5 rounded hover:bg-purple-200 text-purple-900 font-black text-[10px] cursor-pointer"
                  title="Next Day"
                >
                  ▶
                </button>
              </div>

              {/* Quick Horizon & Tomorrow Buttons */}
              {(
                [
                  { id: 'TODAY', label: `Today (${liveToday.formattedShort})`, date: liveToday.dateString },
                  { id: 'TOMORROW', label: `Tomorrow (${tomorrowInfo.shortLabel})`, date: tomorrowInfo.dateString },
                  { id: 'WEEK', label: '7 Days' },
                  { id: 'MONTH', label: 'Full Month' },
                  { id: 'ALL', label: 'All Dates' },
                ] as const
              ).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    if ('date' in h && h.date) {
                      setSelectedInspectDate(h.date);
                    }
                    setScheduleHorizon(h.id);
                    setShowScheduledJobs(true);
                    setShowScheduleDrawer(true);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    scheduleHorizon === h.id
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {h.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowDayOfWeekBar(!showDayOfWeekBar)}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                  showDayOfWeekBar
                    ? 'bg-fuchsia-600 text-white border-fuchsia-700'
                    : 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200 hover:bg-fuchsia-100'
                }`}
                title="Show/Hide Day of the Week Picker (This Week & Next Week)"
              >
                {showDayOfWeekBar ? 'Hide Days' : 'Pick Day of Week'}
              </button>

              <button
                type="button"
                onClick={() => setShowScheduleDrawer(!showScheduleDrawer)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                  showScheduleDrawer
                    ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                    : 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
                }`}
              >
                <span>
                  {showScheduleDrawer
                    ? 'Hide Inspector'
                    : `Inspect Stops (${horizonFilteredScheduledJobs.length} Jobs)`}
                </span>
                {showScheduleDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Closest Cleaners to Any Address Toggle */}
            <button
              type="button"
              onClick={() => setShowClosestCleanersPanel(!showClosestCleanersPanel)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showClosestCleanersPanel
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                Closest Cleaners to Address (#1: {rankedCleanersToTarget[0]?.tech.name.split(' ')[0]} •{' '}
                {rankedCleanersToTarget[0]?.bestDistKm} km)
              </span>
            </button>

            {/* 2-Address Picker Toggle */}
            <button
              type="button"
              onClick={() => setShowTwoAddressPanel(!showTwoAddressPanel)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showTwoAddressPanel
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Pick 2 Addresses ({twoAddrDistanceKm} km • ~{twoAddrDriveMins}m)</span>
            </button>
          </div>

          {/* Day-of-Week Selector Strip: This Week (Mon–Sun) + Next Week (Mon–Sun) */}
          {showDayOfWeekBar && (
            <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-slate-100 pb-0.5 max-w-full">
              <span className="text-[9px] font-black uppercase text-purple-800 shrink-0 mr-1">
                Pick Day (This Wk / Next Wk):
              </span>
              {twoWeekDayPills.map((dayPill) => {
                const isSelectedDay =
                  (scheduleHorizon === 'SPECIFIC_DATE' && selectedInspectDate === dayPill.dateString) ||
                  (scheduleHorizon === 'TODAY' && dayPill.isToday) ||
                  (scheduleHorizon === 'TOMORROW' && dayPill.isTomorrow);

                return (
                  <button
                    key={dayPill.dateString}
                    type="button"
                    onClick={() => {
                      setSelectedInspectDate(dayPill.dateString);
                      setScheduleHorizon('SPECIFIC_DATE');
                      setShowScheduledJobs(true);
                      setShowScheduleDrawer(true);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold shrink-0 flex items-center gap-1 border transition-all cursor-pointer ${
                      isSelectedDay
                        ? 'bg-purple-700 text-white border-purple-900 shadow-xs ring-2 ring-purple-300'
                        : dayPill.isToday
                        ? 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100'
                        : dayPill.isNextWeek
                        ? 'bg-indigo-50/70 text-indigo-950 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-purple-50'
                    }`}
                    title={`${dayPill.dayFull}, ${dayPill.monthDay} (${dayPill.jobsCount} scheduled jobs)`}
                  >
                    <span>
                      {dayPill.isNextWeek ? `Next ${dayPill.dayShort}` : dayPill.dayShort} {dayPill.monthDay}
                    </span>
                    <span
                      className={`px-1 py-0.2 rounded-full text-[9px] font-mono font-black ${
                        isSelectedDay
                          ? 'bg-white text-purple-900'
                          : dayPill.jobsCount > 0
                          ? 'bg-purple-200 text-purple-900'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {dayPill.jobsCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Expandable Closest Cleaners to Any Address & Date Radar Panel */}
        {showClosestCleanersPanel && (
          <div className="pointer-events-auto bg-white/98 backdrop-blur-md border-2 border-emerald-300 rounded-2xl p-3.5 shadow-2xl max-w-3xl w-full animate-fadeIn space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <Compass className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    Closest Cleaners &amp; Hubs Distance Finder • {formattedInspectDateLabel}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Type any address or pick a scheduled job on {formattedInspectDateLabel} to see which cleaners are closest (from Home Hub or Day&apos;s Job)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClosestCleanersPanel(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xs px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-7">
                <input
                  type="text"
                  value={radarSearchAddress}
                  onChange={(e) => setRadarSearchAddress(e.target.value)}
                  placeholder="Type street address, postal code, or neighborhood..."
                  className="w-full px-3 py-1.5 text-xs bg-emerald-50/50 border border-emerald-400 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-5">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setRadarSearchAddress(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-300 rounded-xl font-bold text-purple-950"
                >
                  <option value="">Or pick a job on {formattedInspectDateLabel} ({horizonFilteredScheduledJobs.length})...</option>
                  {(horizonFilteredScheduledJobs.length > 0 ? horizonFilteredScheduledJobs : scheduledJobs).map((j) => (
                    <option key={`radar-j-${j.id}`} value={j.serviceAddress}>
                      {j.startAt.slice(0, 10)} • {j.clientName} ({j.serviceAddress.split(',')[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-[230px] overflow-y-auto pr-1">
              {rankedCleanersToTarget.map((item, idx) => (
                <div
                  key={item.tech.id}
                  onClick={() => {
                    onSelectTech(item.tech.id);
                    setActiveInfoWindow({
                      type: 'TECH',
                      id: item.tech.id,
                      position: { lat: item.tech.currentLocation.lat, lng: item.tech.currentLocation.lng },
                    });
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    idx === 0
                      ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300 shadow-xs'
                      : 'bg-slate-50 hover:bg-emerald-50/40 border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.tech.color || '#7C3AED' }}
                      >
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-black text-slate-900 truncate">{item.tech.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-600 truncate mt-0.5">
                      🏠 Hub: {item.homeAddress}
                    </div>
                    <div className="text-[9.5px] font-bold text-purple-800 truncate">
                      {item.jobsOnDay.length > 0
                        ? `📅 ${item.jobsOnDay.length} job(s) on ${activeDateForCleaners.slice(5)} (${item.closestFrom})`
                        : `✓ Free on ${activeDateForCleaners.slice(5)} (From Home Hub)`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono text-[10px] font-black block">
                      {item.bestDistKm} km
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-600 font-bold">~{item.bestMins} min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable 2-Address Route & Distance Comparison Panel */}
        {showTwoAddressPanel && (
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-indigo-200 rounded-xl p-3 shadow-xl max-w-2xl w-full animate-fadeIn space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Route className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Compare Two Addresses &amp; Route Distance</h4>
                  <p className="text-[10px] text-slate-500">Type any 2 addresses or select directly from scheduled jobs</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(addressAInput)}&destination=${encodeURIComponent(addressBInput)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Google Directions</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowTwoAddressPanel(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold text-xs px-1.5 py-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-900 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">A</span>
                    Address 1 (Origin)
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) setAddressAInput(e.target.value);
                    }}
                    value=""
                    className="text-[10px] bg-white border border-emerald-300 rounded px-1.5 py-0.5 font-semibold text-emerald-900 max-w-[140px]"
                  >
                    <option value="">Pick Scheduled Job...</option>
                    {scheduledJobs.map((j) => (
                      <option key={`a-${j.id}`} value={j.serviceAddress}>
                        {j.clientName} ({j.serviceAddress.split(',')[0]})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={addressAInput}
                  onChange={(e) => setAddressAInput(e.target.value)}
                  placeholder="Enter first address..."
                  className="w-full px-2 py-1.5 text-xs bg-white border border-emerald-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-rose-900 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px]">B</span>
                    Address 2 (Destination)
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) setAddressBInput(e.target.value);
                    }}
                    value=""
                    className="text-[10px] bg-white border border-rose-300 rounded px-1.5 py-0.5 font-semibold text-rose-900 max-w-[140px]"
                  >
                    <option value="">Pick Scheduled Job...</option>
                    {scheduledJobs.map((j) => (
                      <option key={`b-${j.id}`} value={j.serviceAddress}>
                        {j.clientName} ({j.serviceAddress.split(',')[0]})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={addressBInput}
                  onChange={(e) => setAddressBInput(e.target.value)}
                  placeholder="Enter second address..."
                  className="w-full px-2 py-1.5 text-xs bg-white border border-rose-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-rose-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-black text-indigo-950">
                  Est. Route Distance: <span className="font-mono text-indigo-700">{twoAddrDistanceKm} km</span>
                </span>
                <span className="text-indigo-400">•</span>
                <span className="font-black text-indigo-950">
                  Drive Time: <span className="font-mono text-indigo-700">~{twoAddrDriveMins} mins</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const temp = addressAInput;
                  setAddressAInput(addressBInput);
                  setAddressBInput(temp);
                }}
                className="text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
              >
                Swap A ↔ B
              </button>
            </div>
          </div>
        )}

        {/* Expandable & Fully Scrollable Schedule & Chosen Date Stop Inspector Drawer on Map View */}
        {showScheduleDrawer && (
          <div
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="pointer-events-auto bg-white/98 backdrop-blur-md border-2 border-purple-300 rounded-2xl p-3.5 shadow-2xl max-w-3xl w-full flex flex-col max-h-[68vh] animate-fadeIn space-y-2.5"
          >
            {/* Header + Any Date Picker + Week-by-Week Switcher */}
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <CalendarDays className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-black text-purple-950">
                    {scheduleHorizon === 'SPECIFIC_DATE'
                      ? `Inspecting Date: ${formattedInspectDateLabel}`
                      : scheduleHorizon === 'TOMORROW'
                      ? `Inspecting Tomorrow: ${tomorrowInfo.shortLabel}`
                      : `Live Map Schedule • Today is ${liveToday.formattedFull}`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                    Showing {horizonFilteredScheduledJobs.length} Visits
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={selectedInspectDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedInspectDate(e.target.value);
                        setScheduleHorizon('SPECIFIC_DATE');
                      }
                    }}
                    className="px-2 py-1 rounded-lg border border-purple-300 text-[10px] font-mono font-bold text-purple-950 bg-purple-50"
                  />
                  {onNavigateToCalendar && (
                    <button
                      type="button"
                      onClick={() => onNavigateToCalendar(selectedInspectDate || liveToday.dateString)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-extrabold cursor-pointer"
                    >
                      Open in Schedule →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowScheduleDrawer(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Direct Week 1 / Week 2 / Week 3 / Week 4 / Last 2 Weeks Filter Bar */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase mr-1">Filter Window:</span>
                {([
                  { id: 'TODAY', label: `Today (${liveToday.formattedShort})` },
                  { id: 'TOMORROW', label: `Tomorrow (${tomorrowInfo.shortLabel})` },
                  { id: 'SPECIFIC_DATE', label: `Picked Date (${selectedInspectDate.slice(5)})` },
                  { id: 'WEEK_1', label: 'Week 1 (1st–7th)' },
                  { id: 'WEEK_2', label: 'Week 2 (8th–14th)' },
                  { id: 'WEEK_3', label: 'Week 3 (15th–21st)' },
                  { id: 'WEEK_4', label: 'Week 4 (22nd–31st)' },
                  { id: 'MONTH', label: 'Full Month' },
                  { id: 'ALL', label: 'All Dates' },
                ] as const).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setScheduleHorizon(w.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                      scheduleHorizon === w.id
                        ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                        : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Schedule List across selected date or weeks */}
            <div className="flex-1 overflow-y-auto pr-1.5 space-y-1.5 min-h-[220px] max-h-[52vh]">
              {horizonFilteredScheduledJobs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-600 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                  <div className="font-black text-slate-800">
                    0 Scheduled Jobs on {scheduleHorizon === 'SPECIFIC_DATE' ? formattedInspectDateLabel : 'this filter window'}.
                  </div>
                  <div>
                    All 15 cleaners are free on this date! Click <strong>&ldquo;Closest Cleaners to Address&rdquo;</strong> above to check cleaner distances from their Home Hubs, or click <strong>&ldquo;Full Month&rdquo;</strong> to view all scheduled dates.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {horizonFilteredScheduledJobs.map((job) => {
                    const dt = formatDateTime(job.startAt);
                    const isJobToday = dt.dateString === liveToday.dateString;
                    const cleaner = job.assignedCleaners.join(' & ') || 'Unassigned';
                    const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                    const color = getCleanerColor(primaryCleaner);
                    const closestToThisJob = technicians
                      .map((t) => ({
                        name: t.name.split(' ')[0],
                        km: calcRoadDistKm(
                          job.lat,
                          job.lng,
                          t.depotLocation?.lat || t.currentLocation.lat,
                          t.depotLocation?.lng || t.currentLocation.lng
                        ),
                      }))
                      .sort((a, b) => a.km - b.km)[0];

                    return (
                      <div
                        key={`sched-drawer-${job.id}`}
                        className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 text-[11px] ${
                          isJobToday
                            ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-300 shadow-xs'
                            : 'bg-slate-50/80 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black shrink-0 ${
                                isJobToday
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-purple-100 text-purple-900'
                              }`}
                            >
                              {isJobToday ? `TODAY • ${dt.dateStr}` : dt.dateStr}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectScheduledJob?.(job.id);
                                setActiveInfoWindow({
                                  type: 'JOB',
                                  id: job.id,
                                  position: { lat: job.lat, lng: job.lng },
                                });
                              }}
                              className="font-black text-slate-900 hover:text-purple-700 truncate text-left cursor-pointer"
                            >
                              {job.clientName}
                            </button>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-md text-[9.5px] font-extrabold text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: color }}
                          >
                            {cleaner}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 truncate">
                          📍 {job.serviceAddress} • <span className="font-semibold text-slate-700">{job.serviceType}</span>
                        </div>
                        {closestToThisJob && (
                          <div className="text-[9.5px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 flex items-center justify-between">
                            <span>Closest Hub: {closestToThisJob.name} ({closestToThisJob.km} km)</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRadarSearchAddress(job.serviceAddress);
                                setShowClosestCleanersPanel(true);
                              }}
                              className="underline text-emerald-900 font-black cursor-pointer"
                            >
                              All 15 Cleaners →
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                          <span className="font-mono text-[10px] font-bold text-purple-700">
                            ⏰ {dt.timeStr} ({job.visitNumber})
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectScheduledJob?.(job.id);
                                setActiveInfoWindow({
                                  type: 'JOB',
                                  id: job.id,
                                  position: { lat: job.lat, lng: job.lng },
                                });
                              }}
                              className="px-1.5 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-900 font-black text-[9px] cursor-pointer"
                              title="Inspect stop pin on map"
                            >
                              Inspect Stop
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRadarSearchAddress(job.serviceAddress);
                                setShowClosestCleanersPanel(true);
                              }}
                              className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] cursor-pointer"
                              title="See how far all cleaners are from this stop"
                            >
                              Closest Cleaners
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddressAInput(job.serviceAddress);
                                setShowTwoAddressPanel(true);
                              }}
                              className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black text-[9px] cursor-pointer"
                              title="Set as Address A"
                            >
                              Set A
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddressBInput(job.serviceAddress);
                                setShowTwoAddressPanel(true);
                              }}
                              className="px-1.5 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-black text-[9px] cursor-pointer"
                              title="Set as Address B"
                            >
                              Set B
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Technician Floating Route Status Bar (Shown cleanly below filters when active) */}
        {selectedTech && (
          <div className="pointer-events-auto self-start flex items-center justify-between gap-2 px-3 py-1.5 bg-white/95 border border-blue-200 rounded-xl backdrop-blur-md text-xs text-slate-800 shadow-md max-w-full animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedTech.color }} />
              <span className="font-bold whitespace-nowrap">{selectedTech.vanNumber}</span>
              <span className="text-slate-600 truncate hidden xs:inline">({selectedTech.name})</span>
              <span className="text-blue-600 font-mono font-semibold whitespace-nowrap text-[11px] sm:text-xs">
                {selectedTech.assignedTicketIds.length} stops • {selectedTech.routeMetrics?.totalDistanceKm ?? Math.round((selectedTech.routeMetrics?.totalDistanceMiles || 0) * 1.60934 * 10) / 10} km
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onMessageTech && (
                <button
                  type="button"
                  onClick={() => onMessageTech(selectedTech)}
                  className="px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-pink-200 shadow-2xs"
                  title={`Send Direct Message to ${selectedTech.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                  <span className="hidden xs:inline">Message</span>
                </button>
              )}
              <button
                onClick={() => onSelectTech(null)}
                className="min-h-[30px] min-w-[30px] text-slate-500 hover:text-slate-800 text-xs font-bold p-1 rounded-md flex items-center justify-center cursor-pointer"
                title="Clear route selection"
                aria-label="Clear route selection"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Rendering Container */}
      <div className="w-full h-full relative overflow-hidden">
        {!isMapFallbackActive ? (
          /* Official Google Maps Platform SDK Canvas */
          <MapErrorBoundary
            fallback={
              <div className="w-full h-full relative bg-slate-100 flex items-center justify-center">
                <span className="text-xs text-slate-500 font-semibold">Initializing Edmonton Territory Dispatch Engine...</span>
              </div>
            }
            onError={() => setLocalMapError(true)}
          >
            <Map
              mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
              mapTypeId={mapType}
              defaultCenter={{ lat: 53.5461, lng: -113.4938 }}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI={true}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              zoomControl={false}
              rotateControl={false}
              scaleControl={false}
              className="w-full h-full"
              colorScheme="LIGHT"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            >
              {/* Custom Zoom and View Reset Controls */}
              <GoogleMapZoomControls />
              <MapPanController
                selectedScheduledJob={scheduledJobs?.find((j) => j.id === selectedScheduledJobId) || null}
                selectedTicket={selectedTicket}
              />
            {/* Custom Route Lines Renderer */}
            <MapRouteRenderer
              selectedTech={selectedTech}
              technicians={technicians}
              tickets={tickets}
            />

            {/* Regional Depots Markers */}
            {showDepots &&
              HVAC_DEPOTS.map((depot) => (
                <AdvancedMarker
                  key={depot.id}
                  position={{ lat: depot.lat, lng: depot.lng }}
                  onClick={() => {
                    setActiveInfoWindow({
                      type: 'DEPOT',
                      id: depot.id,
                      position: { lat: depot.lat, lng: depot.lng },
                    });
                  }}
                >
                  <div className="flex flex-col items-center group cursor-pointer">
                    <div className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-[10px] font-bold text-white shadow-lg whitespace-nowrap mb-1">
                      🏢 {depot.name.split(' ')[0]} Hub
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                </AdvancedMarker>
              ))}

            {/* 2 Mobile Cleaning Service Vans */}
            {showVehicles &&
              technicians.map((tech) => {
                const isSelected = selectedTechId === tech.id;
                const isOnSite = tech.status === 'ON_SITE';
                const isEnRoute = tech.status === 'EN_ROUTE';
                const isReturning = tech.status === 'RETURNING_DEPOT';

                return (
                  <AdvancedMarker
                    key={tech.id}
                    position={{ lat: tech.currentLocation.lat, lng: tech.currentLocation.lng }}
                    onClick={() => {
                      onSelectTech(tech.id);
                      setActiveInfoWindow({
                        type: 'TECH',
                        id: tech.id,
                        position: { lat: tech.currentLocation.lat, lng: tech.currentLocation.lng },
                      });
                    }}
                  >
                    <div
                      className={`flex flex-col items-center group cursor-pointer transition-transform duration-200 ${
                        isSelected ? 'scale-125 z-40' : 'hover:scale-110 z-20'
                      }`}
                    >
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg border flex items-center gap-1 whitespace-nowrap mb-1 bg-white text-slate-900"
                        style={{
                          borderColor: tech.color,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tech.color }} />
                        <span className="font-extrabold">{tech.vanNumber}</span>
                        {isOnSite ? (
                          <span className="text-amber-700 text-[9px] font-bold flex items-center gap-0.5">
                            <Wrench className="w-2.5 h-2.5 animate-spin" /> On Site
                          </span>
                        ) : isEnRoute ? (
                          <span className="text-blue-600 text-[9px] font-semibold flex items-center gap-0.5">
                            <Truck className="w-2.5 h-2.5" /> En Route
                          </span>
                        ) : isReturning ? (
                          <span className="text-indigo-600 text-[9px] font-semibold flex items-center gap-0.5">
                            <Building2 className="w-2.5 h-2.5" /> Returning
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[9px] font-normal">({tech.assignedTicketIds.length} stops)</span>
                        )}
                      </div>

                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs relative"
                        style={{ backgroundColor: tech.color }}
                      >
                        {isOnSite ? (
                          <Wrench className="w-4 h-4 text-white animate-bounce" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                        {isOnSite && (
                          <span className="absolute -inset-1.5 rounded-full border-2 border-amber-400 animate-ping opacity-90" />
                        )}
                        {isSelected && !isOnSite && (
                          <span className="absolute -inset-1 rounded-full border-2 border-blue-500 animate-ping opacity-75" />
                        )}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* Service Ticket Markers with Urgency Badges & Matching Van Colors */}
            {filteredTickets.map((ticket) => {
              const isSelected = selectedTicketId === ticket.id;
              const assignedTech = technicians.find((t) => t.id === ticket.assignedTechId);
              const isAssigned = !!assignedTech;
              const badge = getTicketBadge(ticket);
              const isCompleted = ticket.status === 'COMPLETED';
              const isInProgress = ticket.status === 'IN_PROGRESS';
              const vanColor = assignedTech?.color || '#64748B';

              return (
                <AdvancedMarker
                  key={ticket.id}
                  position={{ lat: ticket.location.lat, lng: ticket.location.lng }}
                  onClick={() => {
                    onSelectTicket(ticket.id);
                    setActiveInfoWindow({
                      type: 'TICKET',
                      id: ticket.id,
                      position: { lat: ticket.location.lat, lng: ticket.location.lng },
                    });
                  }}
                >
                  <div
                    className={`flex flex-col items-center group cursor-pointer transition-all duration-200 ${
                      isSelected ? 'scale-130 z-50' : 'hover:scale-115 z-30'
                    } ${isCompleted ? 'opacity-85' : ''}`}
                  >
                    {/* Van Matching Header Pill */}
                    <div
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-lg border flex items-center gap-1.5 whitespace-nowrap mb-0.5 ${
                        isCompleted ? 'border-dashed' : ''
                      }`}
                      style={{
                        backgroundColor: isCompleted ? `${vanColor}25` : (isAssigned ? vanColor : '#334155'),
                        borderColor: isCompleted ? `${vanColor}70` : (isAssigned ? '#FFFFFF' : '#475569'),
                        color: isCompleted ? '#0F172A' : '#FFFFFF',
                      }}
                    >
                      {isAssigned ? (
                        <>
                          <Truck className={`w-2.5 h-2.5 ${isCompleted ? 'text-slate-700' : 'text-white/90'}`} />
                          <span>{assignedTech.vanNumber}</span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isCompleted ? 'bg-black/10 text-slate-800' : 'bg-black/30'}`}>
                            #{ticket.stopSequence || 1}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300 text-[9px]">Unassigned</span>
                          <span className="font-mono text-amber-300">{ticket.ticketNumber}</span>
                        </>
                      )}

                      {isCompleted ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                      ) : isInProgress ? (
                        <Wrench className="w-3 h-3 text-amber-200 animate-spin" />
                      ) : ticket.urgency === 'EMERGENCY' ? (
                        <Flame className="w-3 h-3 text-white animate-pulse" />
                      ) : null}
                    </div>

                    {/* Marker Pin Body in Van's Color */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-xl border-2 shadow-xl flex items-center justify-center font-black text-xs transition-transform ${
                          !isAssigned ? 'border-dashed' : ''
                        }`}
                        style={{
                          backgroundColor: isCompleted ? `${vanColor}30` : (isAssigned ? vanColor : '#475569'),
                          borderColor: isCompleted ? `${vanColor}90` : '#FFFFFF',
                          color: isCompleted ? '#0F172A' : '#FFFFFF',
                          boxShadow: isSelected ? `0 0 16px ${vanColor}` : isCompleted ? '0 2px 6px rgba(0,0,0,0.06)' : `0 4px 12px ${vanColor}80`,
                        }}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                        ) : isInProgress ? (
                          <Wrench className="w-4 h-4 text-white animate-spin" />
                        ) : isAssigned ? (
                          <span className="text-xs font-mono font-black">#{ticket.stopSequence || 1}</span>
                        ) : (
                          badge.icon
                        )}
                      </div>

                      {/* Bottom Pin Pointer Tip */}
                      <div
                        className="w-2 h-2 rotate-45 border-r-2 border-b-2 shadow-xs -mt-1"
                        style={{
                          backgroundColor: isCompleted ? `${vanColor}30` : (isAssigned ? vanColor : '#475569'),
                          borderColor: isCompleted ? `${vanColor}90` : '#FFFFFF',
                        }}
                      />

                      {/* Urgency Overlay Badges */}
                      {ticket.urgency === 'EMERGENCY' && !isCompleted && !isInProgress && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 border border-white rounded-full flex items-center justify-center shadow-md animate-pulse">
                          <Flame className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {ticket.urgency === 'SAME_DAY' && !isCompleted && !isInProgress && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 border border-white rounded-full flex items-center justify-center shadow-md">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {isInProgress && (
                        <div className="absolute -inset-1 rounded-xl border-2 border-amber-400 animate-ping opacity-90 pointer-events-none" />
                      )}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Scheduled Calendar Cleaner Jobs with Individual Cleaner Colors & Done Lighter Shading */}
            {showScheduledJobs &&
              horizonFilteredScheduledJobs.map((job) => {
                const isSelected = selectedScheduledJobId === job.id;
                const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                const cleanerColor = getCleanerColor(primaryCleaner);
                const initials = getCleanerInitials(primaryCleaner);
                const isCompleted = job.status === 'COMPLETED';
                const isInProgress = job.status === 'IN_PROGRESS';

                return (
                  <AdvancedMarker
                    key={`job-${job.id}`}
                    position={{ lat: job.lat, lng: job.lng }}
                    onClick={() => {
                      onSelectScheduledJob?.(job.id);
                      setActiveInfoWindow({
                        type: 'JOB',
                        id: job.id,
                        position: { lat: job.lat, lng: job.lng },
                      });
                    }}
                  >
                    <div
                      className={`flex flex-col items-center group cursor-pointer transition-all duration-200 ${
                        isSelected ? 'scale-130 z-50' : 'hover:scale-115 z-35'
                      }`}
                    >
                      {/* Cleaner Header Pill */}
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-md border flex items-center gap-1.5 whitespace-nowrap mb-0.5 transition-all"
                        style={
                          isCompleted
                            ? {
                                backgroundColor: `${cleanerColor}25`,
                                borderColor: `${cleanerColor}70`,
                                color: '#0F172A',
                              }
                            : {
                                backgroundColor: cleanerColor,
                                borderColor: '#FFFFFF',
                                color: '#FFFFFF',
                                boxShadow: `0 2px 8px ${cleanerColor}60`,
                              }
                        }
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center shrink-0 border border-white/70 bg-black/25 text-white">
                            {initials}
                          </span>
                        )}
                        <span className="font-black truncate max-w-[95px]">{primaryCleaner}</span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                            isCompleted ? 'bg-black/10 text-slate-800' : 'bg-black/25 text-white'
                          }`}
                        >
                          {job.visitNumber}
                        </span>
                      </div>

                      {/* Marker Pin Body */}
                      <div className="relative flex flex-col items-center">
                        <div
                          className="w-8 h-8 rounded-xl border-2 shadow-xl flex items-center justify-center text-xs font-black transition-all"
                          style={
                            isCompleted
                              ? {
                                  // Done jobs: shaded lighter color with dark text
                                  backgroundColor: `${cleanerColor}30`,
                                  borderColor: `${cleanerColor}90`,
                                  color: '#0F172A',
                                  boxShadow: isSelected ? `0 0 16px ${cleanerColor}` : '0 2px 6px rgba(0,0,0,0.08)',
                                }
                              : {
                                  // Open jobs: bright vibrant solid color
                                  backgroundColor: cleanerColor,
                                  borderColor: '#FFFFFF',
                                  color: '#FFFFFF',
                                  boxShadow: isSelected ? `0 0 18px ${cleanerColor}` : `0 4px 14px ${cleanerColor}80`,
                                }
                          }
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                          ) : (
                            <span className="font-mono text-[11px] font-black">{initials}</span>
                          )}
                        </div>

                        {/* Pointer Tip */}
                        <div
                          className="w-2 h-2 rotate-45 border-r-2 border-b-2 shadow-xs -mt-1"
                          style={{
                            backgroundColor: isCompleted ? `${cleanerColor}30` : cleanerColor,
                            borderColor: isCompleted ? `${cleanerColor}90` : '#FFFFFF',
                          }}
                        />

                        {isInProgress && (
                          <div className="absolute -inset-1 rounded-xl border-2 border-amber-400 animate-ping opacity-90 pointer-events-none" />
                        )}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* Dynamic Interactive Info Windows */}
            {activeInfoWindow && activeInfoWindow.type === 'JOB' && (
              (() => {
                const job = scheduledJobs?.find((j) => j.id === activeInfoWindow.id);
                if (!job) return null;
                const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                const cleanerColor = getCleanerColor(primaryCleaner);
                const isCompleted = job.status === 'COMPLETED';

                return (
                  <InfoWindow
                    position={activeInfoWindow.position}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-1 max-w-[290px] text-slate-900 font-sans space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cleanerColor }}
                          />
                          <span className="font-mono font-bold text-xs text-slate-800">{job.visitNumber}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-purple-50 text-purple-800 border-purple-300'
                          }`}
                        >
                          {isCompleted ? '✓ Done (Light Shaded)' : '● Open (Vibrant)'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-slate-900 leading-tight">
                          {job.clientName}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {job.serviceType} • {formatDateTime(job.startAt).timeStr}
                        </div>
                      </div>

                      {/* Clickable Phone Number */}
                      <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200">
                        <div className="text-[9px] font-extrabold uppercase text-emerald-800 tracking-wider mb-0.5">
                          Client Phone (Click to Call)
                        </div>
                        <a
                          href={`tel:${job.clientPhone}`}
                          className="flex items-center justify-between text-xs font-mono font-bold text-emerald-950 hover:text-emerald-700 transition-colors"
                          title="Click to dial phone"
                        >
                          <div className="flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{job.clientPhone}</span>
                          </div>
                          <span className="text-[10px] bg-emerald-600 text-white font-sans font-bold px-2 py-0.5 rounded-md shadow-2xs">
                            Call
                          </span>
                        </a>
                      </div>

                      {/* Secondary / Alternate Phone if present */}
                      {job.secondaryPhone && (
                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                          <div className="text-[9px] font-extrabold uppercase text-slate-600 tracking-wider mb-0.5">
                            Alt Phone (Click to Call)
                          </div>
                          <a
                            href={`tel:${job.secondaryPhone}`}
                            className="flex items-center justify-between text-xs font-mono font-bold text-slate-900 hover:text-pink-600 transition-colors"
                            title="Click to dial alternate phone"
                          >
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{job.secondaryPhone}</span>
                            </div>
                            <span className="text-[10px] bg-slate-800 text-white font-sans font-bold px-2 py-0.5 rounded-md shadow-2xs">
                              Call Alt
                            </span>
                          </a>
                        </div>
                      )}

                      {/* Clickable Address */}
                      <div className="bg-purple-50 rounded-xl p-2 border border-purple-200">
                        <div className="text-[9px] font-extrabold uppercase text-purple-800 tracking-wider mb-0.5">
                          Service Address (Click to Open Directions)
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.serviceAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-1 text-xs font-semibold text-purple-950 hover:text-purple-700 transition-colors"
                          title="Click to open directions in Google Maps"
                        >
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{job.serviceAddress}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        </a>
                      </div>

                      {/* Assigned Cleaner & Quick Toggle */}
                      <div className="pt-1.5 border-t border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium text-[11px]">Assigned:</span>
                          <div className="flex items-center gap-1 font-bold">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: cleanerColor }}
                            />
                            <span style={{ color: cleanerColor }}>{primaryCleaner}</span>
                          </div>
                        </div>

                        {/* One-click Toggle Status */}
                        {onToggleJobStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleJobStatus(job.id, isCompleted ? 'SCHEDULED' : 'COMPLETED')}
                            className={`w-full py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                              isCompleted
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Re-open Job (Switch to Vibrant)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark as Done (Switch to Shaded)</span>
                              </>
                            )}
                          </button>
                        )}

                        {onNavigateToCalendar && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCalendar(job.startAt.split('T')[0])}
                            className="w-full py-1 px-2 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3 text-purple-600" />
                            <span>View in Jobber Calendar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                );
              })()
            )}

            {/* Dynamic Interactive Info Windows */}
            {activeInfoWindow && activeInfoWindow.type === 'TICKET' && (
              (() => {
                const ticket = tickets.find((t) => t.id === activeInfoWindow.id);
                if (!ticket) return null;
                const assignedTech = technicians.find((t) => t.id === ticket.assignedTechId);
                const badge = getUrgencyBadge(ticket.urgency);

                return (
                  <InfoWindow
                    position={activeInfoWindow.position}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-1 max-w-[280px] text-slate-900 font-sans">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${badge.bg}`}>
                            {ticket.urgency}
                          </span>
                          <span className="font-mono font-bold text-xs">{ticket.ticketNumber}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold">{ticket.slaDeadline}</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 leading-tight mb-1">
                        {ticket.customerName}
                      </h4>

                      <p className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                        📍 {ticket.location.address}
                      </p>

                      <div className="p-1.5 bg-slate-50 rounded-lg text-xs mb-2 border border-slate-200">
                        <div className="font-semibold text-slate-800 text-[11px] mb-0.5">
                          ❄️ {ticket.equipmentType}
                        </div>
                        <p className="text-slate-600 text-[10px] line-clamp-2 leading-relaxed">
                          {ticket.issueDescription}
                        </p>
                        {ticket.faultCode && (
                          <div className="mt-1 font-mono text-[10px] font-bold text-red-600">
                            Fault: {ticket.faultCode}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                        {assignedTech ? (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: assignedTech.color }} />
                              <span style={{ color: assignedTech.color }}>{assignedTech.vanNumber}</span>
                              <span className="text-slate-600 font-normal text-[11px]">({assignedTech.name})</span>
                            </div>
                            {ticket.stopSequence && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] text-white font-mono font-bold"
                                style={{ backgroundColor: assignedTech.color }}
                              >
                                Stop #{ticket.stopSequence}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 font-bold text-xs">Unassigned in Queue</span>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                );
              })()
            )}

            {activeInfoWindow && activeInfoWindow.type === 'TECH' && (
              (() => {
                const tech = technicians.find((t) => t.id === activeInfoWindow.id);
                if (!tech) return null;

                return (
                  <InfoWindow
                    position={{ lat: tech.currentLocation.lat, lng: tech.currentLocation.lng }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <TechInfoWindowContent 
                      tech={tech} 
                      tickets={tickets} 
                      allowGeocoding={true} 
                      onEditVanHub={(t) => {
                        setEditingVanHubTech(t);
                        setIsVanHubModalOpen(true);
                      }}
                    />
                  </InfoWindow>
                );
              })()
            )}

            {activeInfoWindow && activeInfoWindow.type === 'DEPOT' && (
              (() => {
                const depot = HVAC_DEPOTS.find((d) => d.id === activeInfoWindow.id);
                if (!depot) return null;

                return (
                  <InfoWindow
                    position={{ lat: depot.lat, lng: depot.lng }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-3 max-w-[260px] text-slate-800">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base">🏢</span>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">{depot.name}</h4>
                      </div>
                      <p className="text-slate-600 text-xs mb-2">📍 {depot.address}</p>
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-[11px] mb-2.5">
                        Central Logistics, Cleaning Supplies &amp; Fleet Staging Hub.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (technicians.length > 0) {
                            setEditingVanHubTech(technicians[0]);
                            setIsVanHubModalOpen(true);
                          }
                        }}
                        className="w-full py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Edit Hub &amp; Fleet Names</span>
                      </button>
                    </div>
                  </InfoWindow>
                );
              })()
            )}
          </Map>
          </MapErrorBoundary>
        ) : (
          /* Interactive High-Resolution Edmonton Street & Satellite Map */
          <div
            ref={vectorContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={(e) => {
              const delta = e.deltaY < 0 ? 0.2 : -0.2;
              setZoomLevel((prev) => Math.max(0.8, Math.min(3.5, Number((prev + delta).toFixed(2)))));
            }}
            className={`w-full h-full relative bg-slate-200 overflow-hidden cursor-${isDragging ? 'grabbing' : 'grab'}`}
          >
            {/* Real Web Mercator Street & Satellite Tile Layer + Live Route Polylines */}
            <div
              className="absolute inset-0 transition-transform duration-75 origin-center"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                width: '100%',
                height: '100%',
              }}
            >
              {/* High-Resolution Georeferenced Edmonton Street & Satellite Tiles (z=11 Retina @2x) */}
              <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                {[665, 666, 667, 668, 669, 670].map((ty) =>
                  [376, 377, 378, 379, 380].map((tx) => {
                    const z = 11;
                    const nTiles = Math.pow(2, z);
                    const tileMinLng = (tx / nTiles) * 360 - 180;
                    const tileMaxLng = ((tx + 1) / nTiles) * 360 - 180;
                    const tileMaxLat = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / nTiles)));
                    const tileMinLat = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + 1)) / nTiles)));

                    const leftPct = ((tileMinLng - EDMONTON_BOUNDS.minLng) / (EDMONTON_BOUNDS.maxLng - EDMONTON_BOUNDS.minLng)) * 100;
                    const rightPct = ((tileMaxLng - EDMONTON_BOUNDS.minLng) / (EDMONTON_BOUNDS.maxLng - EDMONTON_BOUNDS.minLng)) * 100;
                    const topPct = ((EDMONTON_BOUNDS.maxLat - tileMaxLat) / (EDMONTON_BOUNDS.maxLat - EDMONTON_BOUNDS.minLat)) * 100;
                    const bottomPct = ((EDMONTON_BOUNDS.maxLat - tileMinLat) / (EDMONTON_BOUNDS.maxLat - EDMONTON_BOUNDS.minLat)) * 100;

                    const isSatellite = mapType === 'hybrid';
                    const baseTileUrl = isSatellite
                      ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`
                      : `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}@2x.png`;

                    return (
                      <React.Fragment key={`tile-${z}-${tx}-${ty}`}>
                        <img
                          src={baseTileUrl}
                          alt=""
                          draggable={false}
                          onError={(e) => {
                            if (!isSatellite) {
                              (e.currentTarget as HTMLImageElement).src = `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`;
                            }
                          }}
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${rightPct - leftPct + 0.08}%`,
                            height: `${bottomPct - topPct + 0.08}%`,
                            maxWidth: 'none',
                          }}
                          className="select-none pointer-events-none object-fill"
                        />
                        {isSatellite && (
                          <img
                            src={`https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/${z}/${tx}/${ty}@2x.png`}
                            alt=""
                            draggable={false}
                            style={{
                              position: 'absolute',
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${rightPct - leftPct + 0.08}%`,
                              height: `${bottomPct - topPct + 0.08}%`,
                              maxWidth: 'none',
                            }}
                            className="select-none pointer-events-none object-fill"
                          />
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* Live Route Polylines Between Techs and Assigned Tickets */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {showRoutes &&
                  technicians.map((tech) => {
                    const isSelected = selectedTechId === tech.id;
                    const techTickets = tickets
                      .filter((t) => tech.assignedTicketIds.includes(t.id))
                      .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

                    if (techTickets.length === 0) return null;
                    if (selectedTechId && !isSelected) return null;

                    const techPos = projectCoords(tech.currentLocation.lat, tech.currentLocation.lng);
                    const depotPos = projectCoords(tech.depotLocation.lat, tech.depotLocation.lng);

                    let pathD = `M ${techPos.x} ${techPos.y}`;
                    techTickets.forEach((t) => {
                      const tPos = projectCoords(t.location.lat, t.location.lng);
                      pathD += ` L ${tPos.x} ${tPos.y}`;
                    });
                    pathD += ` L ${depotPos.x} ${depotPos.y}`;

                    return (
                      <g key={`route-${tech.id}`}>
                        <path
                          d={pathD}
                          stroke={tech.color || '#2563EB'}
                          strokeWidth={isSelected ? '0.9' : '0.5'}
                          strokeOpacity={isSelected ? 0.95 : 0.7}
                          strokeDasharray={isSelected ? '1.5,0.8' : '1,1'}
                          fill="none"
                        />
                      </g>
                    );
                  })}
              </svg>

              {/* Regional Depots */}
              {showDepots &&
                HVAC_DEPOTS.map((depot) => {
                  const pos = projectCoords(depot.lat, depot.lng);
                  return (
                    <div
                      key={depot.id}
                      onClick={() =>
                        setActiveInfoWindow({
                          type: 'DEPOT',
                          id: depot.id,
                          position: { lat: depot.lat, lng: depot.lng },
                        })
                      }
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group"
                    >
                      <div className="px-2 py-0.5 bg-slate-900 text-white rounded text-[9px] font-bold shadow-md whitespace-nowrap mb-1">
                        🏢 {depot.name.split(' ')[0]}
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}

              {/* 2 Mobile Cleaning Service Vans */}
              {showVehicles &&
                technicians.map((tech) => {
                  const pos = projectCoords(tech.currentLocation.lat, tech.currentLocation.lng);
                  const isSelected = selectedTechId === tech.id;
                  const isOnSite = tech.status === 'ON_SITE';
                  const isEnRoute = tech.status === 'EN_ROUTE';
                  const isReturning = tech.status === 'RETURNING_DEPOT';

                  return (
                    <div
                      key={tech.id}
                      onClick={() => {
                        onSelectTech(tech.id);
                        setActiveInfoWindow({
                          type: 'TECH',
                          id: tech.id,
                          position: { lat: tech.currentLocation.lat, lng: tech.currentLocation.lng },
                        });
                      }}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-30 ${
                        isSelected ? 'scale-125 z-40' : 'hover:scale-115'
                      }`}
                    >
                      <div
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md border flex items-center gap-1 whitespace-nowrap mb-1 bg-white text-slate-900"
                        style={{ borderColor: tech.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tech.color }} />
                        <span>{tech.vanNumber}</span>
                        {isOnSite ? (
                          <span className="text-amber-600 font-bold text-[8px] flex items-center gap-0.5">
                            <Wrench className="w-2 h-2 animate-spin" /> On Site
                          </span>
                        ) : isEnRoute ? (
                          <span className="text-blue-600 font-semibold text-[8px]">En Route</span>
                        ) : isReturning ? (
                          <span className="text-indigo-600 font-semibold text-[8px]">Returning</span>
                        ) : (
                          <span className="text-slate-400 font-normal">({tech.assignedTicketIds.length})</span>
                        )}
                      </div>

                      <div
                        className="w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs relative"
                        style={{ backgroundColor: tech.color }}
                      >
                        {isOnSite ? (
                          <Wrench className="w-3.5 h-3.5 text-white animate-bounce" />
                        ) : (
                          <Truck className="w-3.5 h-3.5" />
                        )}
                        {isOnSite && (
                          <span className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-ping opacity-90" />
                        )}
                        {isSelected && !isOnSite && (
                          <span className="absolute -inset-1 rounded-full border-2 border-blue-500 animate-ping opacity-75" />
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Service Tickets with Matching Van Colors */}
              {filteredTickets.map((ticket) => {
                const pos = projectCoords(ticket.location.lat, ticket.location.lng);
                const isSelected = selectedTicketId === ticket.id;
                const assignedTech = technicians.find((t) => t.id === ticket.assignedTechId);
                const isAssigned = !!assignedTech;
                const badge = getTicketBadge(ticket);
                const isCompleted = ticket.status === 'COMPLETED';
                const isInProgress = ticket.status === 'IN_PROGRESS';
                const vanColor = assignedTech?.color || '#64748B';

                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      onSelectTicket(ticket.id);
                      setActiveInfoWindow({
                        type: 'TICKET',
                        id: ticket.id,
                        position: { lat: ticket.location.lat, lng: ticket.location.lng },
                      });
                    }}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all z-20 flex flex-col items-center group ${
                      isSelected ? 'scale-130 z-40' : 'hover:scale-115'
                    } ${isCompleted ? 'opacity-85' : ''}`}
                  >
                    {/* Van Header Pill */}
                    <div
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold shadow-md border flex items-center gap-1 whitespace-nowrap mb-0.5 ${
                        isCompleted ? 'border-dashed' : ''
                      }`}
                      style={{
                        backgroundColor: isCompleted ? `${vanColor}25` : (isAssigned ? vanColor : '#334155'),
                        borderColor: isCompleted ? `${vanColor}70` : (isAssigned ? '#FFFFFF' : '#475569'),
                        color: isCompleted ? '#0F172A' : '#FFFFFF',
                      }}
                    >
                      {isAssigned ? (
                        <>
                          <Truck className={`w-2.5 h-2.5 ${isCompleted ? 'text-slate-700' : 'text-white/90'}`} />
                          <span>{assignedTech.vanNumber}</span>
                          <span className={`px-1 py-0.2 rounded text-[8px] font-mono ${isCompleted ? 'bg-black/10 text-slate-800' : 'bg-black/30'}`}>
                            #{ticket.stopSequence || 1}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300 text-[8px]">Unassigned</span>
                          <span className="font-mono text-amber-300">{ticket.ticketNumber}</span>
                        </>
                      )}

                      {isCompleted ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                      ) : isInProgress ? (
                        <Wrench className="w-2.5 h-2.5 text-amber-200 animate-spin" />
                      ) : ticket.urgency === 'EMERGENCY' ? (
                        <Flame className="w-2.5 h-2.5 text-white animate-pulse" />
                      ) : null}
                    </div>

                    {/* Marker Pin Body in Van's Color */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-xl border-2 shadow-lg flex items-center justify-center font-black text-[11px] ${
                          !isAssigned ? 'border-dashed' : ''
                        }`}
                        style={{
                          backgroundColor: isCompleted ? `${vanColor}30` : (isAssigned ? vanColor : '#475569'),
                          borderColor: isCompleted ? `${vanColor}90` : '#FFFFFF',
                          color: isCompleted ? '#0F172A' : '#FFFFFF',
                          boxShadow: isSelected ? `0 0 14px ${vanColor}` : isCompleted ? '0 2px 6px rgba(0,0,0,0.06)' : undefined,
                        }}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                        ) : isInProgress ? (
                          <Wrench className="w-3.5 h-3.5 text-white animate-spin" />
                        ) : isAssigned ? (
                          <span className="font-mono font-black">#{ticket.stopSequence || 1}</span>
                        ) : (
                          badge.icon
                        )}
                      </div>

                      {/* Pin Pointer Tip */}
                      <div
                        className="w-1.5 h-1.5 rotate-45 border-r-2 border-b-2 shadow-xs -mt-1"
                        style={{
                          backgroundColor: isCompleted ? `${vanColor}30` : (isAssigned ? vanColor : '#475569'),
                          borderColor: isCompleted ? `${vanColor}90` : '#FFFFFF',
                        }}
                      />

                      {/* Urgency Overlay */}
                      {ticket.urgency === 'EMERGENCY' && !isCompleted && !isInProgress && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 border border-white rounded-full flex items-center justify-center shadow-md animate-pulse">
                          <Flame className="w-2 h-2 text-white" />
                        </div>
                      )}
                      {ticket.urgency === 'SAME_DAY' && !isCompleted && !isInProgress && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 border border-white rounded-full flex items-center justify-center shadow-md">
                          <Clock className="w-2 h-2 text-white" />
                        </div>
                      )}
                      {isInProgress && (
                        <div className="absolute -inset-1 rounded-xl border-2 border-amber-400 animate-ping opacity-90 pointer-events-none" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Two-Address Comparison Route Line & Pins on Vector Map */}
              {showTwoAddressPanel && (() => {
                const posA = projectCoords(coordsA.lat, coordsA.lng);
                const posB = projectCoords(coordsB.lat, coordsB.lng);
                return (
                  <>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line
                        x1={posA.x}
                        y1={posA.y}
                        x2={posB.x}
                        y2={posB.y}
                        stroke="#4F46E5"
                        strokeWidth="0.9"
                        strokeDasharray="1.5,0.8"
                      />
                    </svg>
                    <div
                      style={{ left: `${posA.x}%`, top: `${posA.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-45 flex flex-col items-center pointer-events-none"
                    >
                      <div className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black shadow-md border border-white whitespace-nowrap mb-0.5">
                        Address A • {addressAInput.split(',')[0]}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white text-white font-black text-xs flex items-center justify-center shadow-xl">
                        A
                      </div>
                    </div>
                    <div
                      style={{ left: `${posB.x}%`, top: `${posB.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-45 flex flex-col items-center pointer-events-none"
                    >
                      <div className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black shadow-md border border-white whitespace-nowrap mb-0.5">
                        Address B • {addressBInput.split(',')[0]} ({twoAddrDistanceKm} km)
                      </div>
                      <div className="w-7 h-7 rounded-full bg-rose-600 border-2 border-white text-white font-black text-xs flex items-center justify-center shadow-xl">
                        B
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Scheduled Calendar Cleaner Jobs on Vector Map */}
              {showScheduledJobs &&
                horizonFilteredScheduledJobs.map((job) => {
                  const pos = projectCoords(job.lat, job.lng);
                  const isSelected = selectedScheduledJobId === job.id;
                  const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                  const cleanerColor = getCleanerColor(primaryCleaner);
                  const initials = getCleanerInitials(primaryCleaner);
                  const isCompleted = job.status === 'COMPLETED';

                  return (
                    <div
                      key={`vec-job-${job.id}`}
                      onClick={() => {
                        onSelectScheduledJob?.(job.id);
                        setActiveInfoWindow({
                          type: 'JOB',
                          id: job.id,
                          position: { lat: job.lat, lng: job.lng },
                        });
                      }}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all z-25 flex flex-col items-center group ${
                        isSelected ? 'scale-130 z-45' : 'hover:scale-115'
                      }`}
                    >
                      {/* Cleaner Header Pill */}
                      <div
                        className="px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold shadow-md border flex items-center gap-1 whitespace-nowrap mb-0.5 transition-all"
                        style={
                          isCompleted
                            ? {
                                backgroundColor: `${cleanerColor}25`,
                                borderColor: `${cleanerColor}70`,
                                color: '#0F172A',
                              }
                            : {
                                backgroundColor: cleanerColor,
                                borderColor: '#FFFFFF',
                                color: '#FFFFFF',
                                boxShadow: `0 2px 6px ${cleanerColor}60`,
                              }
                        }
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <span className="w-3 h-3 rounded-full text-[7.5px] font-black flex items-center justify-center shrink-0 border border-white/70 bg-black/25 text-white">
                            {initials}
                          </span>
                        )}
                        <span className="font-black truncate max-w-[85px]">{primaryCleaner}</span>
                        <span className={`px-1 rounded text-[8px] font-mono ${isCompleted ? 'bg-black/10 text-slate-800' : 'bg-black/25 text-white'}`}>
                          {job.visitNumber}
                        </span>
                      </div>

                      {/* Marker Pin Body */}
                      <div className="relative flex flex-col items-center">
                        <div
                          className="w-7 h-7 rounded-xl border-2 shadow-lg flex items-center justify-center font-black text-[11px] transition-all"
                          style={
                            isCompleted
                              ? {
                                  // Done jobs: shaded lighter color
                                  backgroundColor: `${cleanerColor}30`,
                                  borderColor: `${cleanerColor}90`,
                                  color: '#0F172A',
                                  boxShadow: isSelected ? `0 0 14px ${cleanerColor}` : '0 2px 6px rgba(0,0,0,0.06)',
                                }
                              : {
                                  // Open jobs: bright vibrant color
                                  backgroundColor: cleanerColor,
                                  borderColor: '#FFFFFF',
                                  color: '#FFFFFF',
                                  boxShadow: isSelected ? `0 0 16px ${cleanerColor}` : `0 3px 12px ${cleanerColor}80`,
                                }
                          }
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                          ) : (
                            <span className="font-mono text-[10px] font-black">{initials}</span>
                          )}
                        </div>

                        {/* Pointer Tip */}
                        <div
                          className="w-1.5 h-1.5 rotate-45 border-r-2 border-b-2 shadow-xs -mt-1"
                          style={{
                            backgroundColor: isCompleted ? `${cleanerColor}30` : cleanerColor,
                            borderColor: isCompleted ? `${cleanerColor}90` : '#FFFFFF',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Interactive Vector Overlay Info Card Modal */}
            {activeInfoWindow && (
              <div className="absolute top-16 right-4 z-40 bg-white border border-slate-200 rounded-xl shadow-2xl p-3.5 max-w-[310px] animate-fadeIn text-xs text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    {activeInfoWindow.type === 'TICKET'
                      ? 'Service Ticket Details'
                      : activeInfoWindow.type === 'JOB'
                      ? 'Scheduled Cleaner Job'
                      : activeInfoWindow.type === 'TECH'
                      ? 'Technician Profile'
                      : 'Regional Hub'}
                  </div>
                  <button
                    onClick={() => setActiveInfoWindow(null)}
                    className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {activeInfoWindow.type === 'JOB' && (() => {
                  const job = scheduledJobs?.find((j) => j.id === activeInfoWindow.id);
                  if (!job) return null;
                  const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                  const cleanerColor = getCleanerColor(primaryCleaner);
                  const isCompleted = job.status === 'COMPLETED';

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cleanerColor }} />
                          <span className="font-mono font-bold text-xs text-slate-900">{job.visitNumber}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCompleted ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-purple-50 text-purple-800 border-purple-300'
                          }`}
                        >
                          {isCompleted ? '✓ Done (Light Shaded)' : '● Open (Vibrant)'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-slate-900 leading-tight">{job.clientName}</h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {job.serviceType} • {formatDateTime(job.startAt).timeStr}
                        </div>
                      </div>

                      {/* Clickable Phone */}
                      <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200">
                        <div className="text-[9px] font-extrabold uppercase text-emerald-800 tracking-wider mb-0.5">
                          Client Phone (Clickable)
                        </div>
                        <a
                          href={`tel:${job.clientPhone}`}
                          className="flex items-center justify-between text-xs font-mono font-bold text-emerald-950 hover:text-emerald-700 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{job.clientPhone}</span>
                          </div>
                          <span className="text-[10px] bg-emerald-600 text-white font-sans font-bold px-2 py-0.5 rounded shadow-2xs">
                            Call
                          </span>
                        </a>
                      </div>

                      {/* Clickable Address */}
                      <div className="bg-purple-50 rounded-xl p-2 border border-purple-200">
                        <div className="text-[9px] font-extrabold uppercase text-purple-800 tracking-wider mb-0.5">
                          Service Address (Clickable)
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.serviceAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-1 text-xs font-semibold text-purple-950 hover:text-purple-700 transition-colors"
                        >
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{job.serviceAddress}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        </a>
                      </div>

                      {/* Cleaner & Quick Status Toggle */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium text-[11px]">Cleaner:</span>
                          <div className="flex items-center gap-1 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cleanerColor }} />
                            <span style={{ color: cleanerColor }}>{primaryCleaner}</span>
                          </div>
                        </div>

                        {onToggleJobStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleJobStatus(job.id, isCompleted ? 'SCHEDULED' : 'COMPLETED')}
                            className={`w-full py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                              isCompleted
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Re-open Job (Switch to Vibrant)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark as Done (Switch to Shaded)</span>
                              </>
                            )}
                          </button>
                        )}

                        {onNavigateToCalendar && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCalendar(job.startAt.split('T')[0])}
                            className="w-full py-1 px-2 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3 text-purple-600" />
                            <span>View in Jobber Calendar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {activeInfoWindow.type === 'TICKET' && (() => {
                  const ticket = tickets.find((t) => t.id === activeInfoWindow.id);
                  if (!ticket) return null;
                  const assignedTech = technicians.find((t) => t.id === ticket.assignedTechId);
                  const badge = getUrgencyBadge(ticket.urgency);

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${badge.bg}`}>
                          {ticket.urgency}
                        </span>
                        <span className="font-mono font-bold text-slate-800">{ticket.ticketNumber}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">{ticket.customerName}</h4>
                      <p className="text-slate-600 text-xs mb-2">📍 {ticket.location.address}</p>

                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                        <div className="font-bold text-slate-800 text-[11px]">❄️ {ticket.equipmentType}</div>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{ticket.issueDescription}</p>
                        {ticket.faultCode && (
                          <div className="mt-1 font-mono text-[10px] font-bold text-red-600">
                            Fault Code: {ticket.faultCode}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {assignedTech ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: assignedTech.color }} />
                            <span style={{ color: assignedTech.color }}>{assignedTech.vanNumber}</span>
                            <span className="text-slate-600 font-normal text-[11px]">({assignedTech.name})</span>
                            {ticket.stopSequence && (
                              <span
                                className="ml-1 px-1.5 py-0.5 rounded text-[9px] text-white font-mono font-bold"
                                style={{ backgroundColor: assignedTech.color }}
                              >
                                Stop #{ticket.stopSequence}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-700 font-bold">Unassigned in Queue</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">SLA: {ticket.slaDeadline}</span>
                      </div>
                    </div>
                  );
                })()}

                {activeInfoWindow.type === 'TECH' && (() => {
                  const tech = technicians.find((t) => t.id === activeInfoWindow.id);
                  if (!tech) return null;

                  return (
                    <TechInfoWindowContent 
                      tech={tech} 
                      tickets={tickets} 
                      allowGeocoding={false} 
                      onEditVanHub={(t) => {
                        setEditingVanHubTech(t);
                        setIsVanHubModalOpen(true);
                      }}
                    />
                  );
                })()}

                {activeInfoWindow.type === 'DEPOT' && (() => {
                  const depot = HVAC_DEPOTS.find((d) => d.id === activeInfoWindow.id);
                  if (!depot) return null;

                  return (
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">🏢 {depot.name}</h4>
                      <p className="text-slate-600 text-xs mb-2">📍 {depot.address}</p>
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-[11px] mb-2.5">
                        Central Logistics, Cleaning Supplies &amp; Fleet Staging Hub.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (technicians.length > 0) {
                            setEditingVanHubTech(technicians[0]);
                            setIsVanHubModalOpen(true);
                          }
                        }}
                        className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Edit Hub &amp; Fleet Names</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bottom-Right Zoom Controls */}
            <div className="absolute bottom-18 landscape:bottom-3 md:bottom-4 right-3 md:right-4 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 shadow-md">
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors flex items-center justify-center cursor-pointer"
                title="Zoom In"
                aria-label="Zoom in on territory map"
              >
                <ZoomIn className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors flex items-center justify-center cursor-pointer"
                title="Zoom Out"
                aria-label="Zoom out on territory map"
              >
                <ZoomOut className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                onClick={resetView}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors border-t border-slate-100 flex items-center justify-center cursor-pointer"
                title="Reset View"
                aria-label="Reset territory map zoom and center"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Universal Floating Live Fleet Summary Pill & Card (Desktop, Tablet, Mobile) */}
      <div className="absolute bottom-18 landscape:bottom-3 md:bottom-4 left-3 md:left-4 z-20 pointer-events-auto">
        {isSummaryMinimized ? (
          <button
            onClick={() => setIsSummaryMinimized(false)}
            className="min-h-[42px] px-3.5 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-all active:scale-95"
            aria-label="Open Live Fleet Summary"
            title="Open Live Fleet Summary"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fleet: 15 Techs</span>
            <span className="text-slate-500 text-[10px] font-normal">(Stats ↗)</span>
          </button>
        ) : (
          <div className="bg-white p-3.5 rounded-xl shadow-xl border border-slate-200 w-64 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Fleet Summary</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <button
                  onClick={() => setIsSummaryMinimized(true)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close summary card"
                  title="Minimize Summary"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Technicians Active</span>
                <span className="font-bold text-slate-900">15 / 15 Fleet</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-xs text-red-600 font-bold">{tickets.filter((t) => t.urgency === 'EMERGENCY').length}</p>
                  <p className="text-[10px] uppercase font-semibold text-slate-600">Emerg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-amber-700 font-bold">{tickets.filter((t) => t.urgency === 'SAME_DAY').length}</p>
                  <p className="text-[10px] uppercase font-semibold text-slate-600">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-blue-700 font-bold">{tickets.filter((t) => t.urgency === 'ROUTINE').length}</p>
                  <p className="text-[10px] uppercase font-semibold text-slate-600">Routine</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Van & Hub Editor Modal */}
      <VanHubEditModal
        isOpen={isVanHubModalOpen}
        onClose={() => {
          setIsVanHubModalOpen(false);
          setEditingVanHubTech(null);
        }}
        technician={editingVanHubTech}
        onSave={(updatedTech) => {
          onUpdateTechnician?.(updatedTech);
          setIsVanHubModalOpen(false);
          setEditingVanHubTech(null);
        }}
      />
    </div>
  );
};
