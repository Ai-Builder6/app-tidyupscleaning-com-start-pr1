import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation, CheckCircle2, Sparkles, X } from 'lucide-react';

export interface AddressPrediction {
  description: string;
  place_id: string;
  placeId?: string;
  main_text: string;
  mainText: string;
  secondary_text: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
  tag?: string;
}

interface Prediction {
  description: string;
  place_id: string;
  main_text: string;
  secondary_text: string;
  lat?: number;
  lng?: number;
  tag?: string;
}

export interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
  onSelect?: (prediction: AddressPrediction) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  onBlur?: () => void;
  theme?: 'light' | 'dark';
  id?: string;
  name?: string;
  showClearButton?: boolean;
}

interface CorridorPreset {
  address: string;
  area: string;
  city: string;
  postal: string;
  lat: number;
  lng: number;
}

// Comprehensive Edmonton & Capital Region corridors with accurate coordinates
const EDMONTON_CORRIDOR_PRESETS: CorridorPreset[] = [
  { address: '10420 Jasper Ave NW', area: 'Downtown Core', city: 'Edmonton, AB', postal: 'T5J 1Z2', lat: 53.5409, lng: -113.4994 },
  { address: '10155 102 St NW', area: 'Financial District', city: 'Edmonton, AB', postal: 'T5J 4G8', lat: 53.5432, lng: -113.4955 },
  { address: '10230 104 St NW', area: 'ICE District / 104 St Promenade', city: 'Edmonton, AB', postal: 'T5J 1B8', lat: 53.5446, lng: -113.4992 },
  { address: '11215 Jasper Ave NW', area: 'Oliver / Wîhkwêntôwin', city: 'Edmonton, AB', postal: 'T5K 0L5', lat: 53.5408, lng: -113.5148 },
  { address: '8215 104 St NW', area: 'Whyte Ave / Old Strathcona', city: 'Edmonton, AB', postal: 'T6E 4E7', lat: 53.5182, lng: -113.4981 },
  { address: '10824 82 Ave NW', area: 'Garneau / University', city: 'Edmonton, AB', postal: 'T6E 2B3', lat: 53.5181, lng: -113.5098 },
  { address: '9620 82 Ave NW', area: 'Ritchie / Mill Creek', city: 'Edmonton, AB', postal: 'T6C 1A1', lat: 53.5180, lng: -113.4785 },
  { address: '12410 102 Ave NW', area: 'Westmount / 124 Street', city: 'Edmonton, AB', postal: 'T5N 0M1', lat: 53.5433, lng: -113.5364 },
  { address: '13815 102 Ave NW', area: 'Glenora', city: 'Edmonton, AB', postal: 'T5N 0P1', lat: 53.5425, lng: -113.5598 },
  { address: '9110 142 St NW', area: 'Parkview / Laurier Heights', city: 'Edmonton, AB', postal: 'T5R 0M7', lat: 53.5256, lng: -113.5665 },
  { address: '14925 87 Ave NW', area: 'Lynnwood / Meadowlark', city: 'Edmonton, AB', postal: 'T5R 4E8', lat: 53.5194, lng: -113.5786 },
  { address: '8882 170 St NW', area: 'West Edmonton / Summerlea', city: 'Edmonton, AB', postal: 'T5T 4J2', lat: 53.5225, lng: -113.6242 },
  { address: '6240 199 St NW', area: 'The Hamptons / West End', city: 'Edmonton, AB', postal: 'T6M 2W5', lat: 53.4985, lng: -113.6642 },
  { address: '21115 92 Ave NW', area: 'Lewis Estates / Secord', city: 'Edmonton, AB', postal: 'T5T 4K8', lat: 53.5271, lng: -113.6845 },
  { address: '1215 Windermere Way SW', area: 'Windermere South', city: 'Edmonton, AB', postal: 'T6W 0T1', lat: 53.4288, lng: -113.6114 },
  { address: '6104 Currents Dr NW', area: 'Currents of Windermere / Ambleside', city: 'Edmonton, AB', postal: 'T6W 0L9', lat: 53.4368, lng: -113.6005 },
  { address: '14220 28 Ave SW', area: 'Chappelle / Jagare Ridge', city: 'Edmonton, AB', postal: 'T6W 3P2', lat: 53.4052, lng: -113.5688 },
  { address: '2310 Rabbit Hill Rd NW', area: 'Terwillegar Towne / South Terwillegar', city: 'Edmonton, AB', postal: 'T6R 3L6', lat: 53.4535, lng: -113.5775 },
  { address: '4215 106 St NW', area: 'Whitemud Crossing / Duggan', city: 'Edmonton, AB', postal: 'T6J 2P9', lat: 53.4792, lng: -113.5035 },
  { address: '1925 105 St NW', area: 'Century Park / Ermineskin', city: 'Edmonton, AB', postal: 'T6J 5C4', lat: 53.4578, lng: -113.5015 },
  { address: '11120 Ellerslie Rd SW', area: 'Rutherford / Heritage Valley', city: 'Edmonton, AB', postal: 'T6W 1A2', lat: 53.4242, lng: -113.5162 },
  { address: '2810 119 St SW', area: 'Macewan / Callaghan', city: 'Edmonton, AB', postal: 'T6W 1B5', lat: 53.4125, lng: -113.5284 },
  { address: '9104 17 Ave SW', area: 'Summerside / Lake Summerside', city: 'Edmonton, AB', postal: 'T6X 0R5', lat: 53.4138, lng: -113.4742 },
  { address: '5215 Ellerslie Rd SW', area: 'The Orchards / Walker Lakes', city: 'Edmonton, AB', postal: 'T6X 0J3', lat: 53.4245, lng: -113.4215 },
  { address: '2331 66 St NW', area: 'Mill Woods Town Centre', city: 'Edmonton, AB', postal: 'T6K 4B5', lat: 53.4562, lng: -113.4351 },
  { address: '3815 34 St NW', area: 'Tamarack / Meadows', city: 'Edmonton, AB', postal: 'T6T 0K9', lat: 53.4712, lng: -113.3924 },
  { address: '1820 17 St NW', area: 'Laurel / Silver Berry', city: 'Edmonton, AB', postal: 'T6T 0P5', lat: 53.4485, lng: -113.3688 },
  { address: '9810 75 St NW', area: 'Capilano / Ottewell', city: 'Edmonton, AB', postal: 'T6A 2Y8', lat: 53.5364, lng: -113.4438 },
  { address: '8310 85 St NW', area: 'Bonnie Doon / Idylwylde', city: 'Edmonton, AB', postal: 'T6C 3B9', lat: 53.5192, lng: -113.4585 },
  { address: '11815 97 St NW', area: 'Alberta Ave / Norwood', city: 'Edmonton, AB', postal: 'T5G 1Y5', lat: 53.5705, lng: -113.4918 },
  { address: '11220 65 St NW', area: 'Highlands / Bellevue', city: 'Edmonton, AB', postal: 'T5W 4K5', lat: 53.5628, lng: -113.4408 },
  { address: '13710 97 St NW', area: 'Northgate / Griesbach', city: 'Edmonton, AB', postal: 'T5E 4E2', lat: 53.5994, lng: -113.4922 },
  { address: '10815 153 Ave NW', area: 'Castle Downs / Beaumaris', city: 'Edmonton, AB', postal: 'T5X 5S1', lat: 53.6152, lng: -113.5085 },
  { address: '16510 59A St NW', area: 'Hollick-Kenyon / McConachie', city: 'Edmonton, AB', postal: 'T5Y 3J8', lat: 53.6268, lng: -113.4325 },
  { address: '15320 37 St NW', area: 'Clareview / Kirkness', city: 'Edmonton, AB', postal: 'T5Y 2W5', lat: 53.6145, lng: -113.3982 },
  { address: '375 St Albert Trail', area: 'St. Albert Central', city: 'St. Albert, AB', postal: 'T8N 3K8', lat: 53.6458, lng: -113.6272 },
  { address: '45 Erin Ridge Rd', area: 'Erin Ridge / North St. Albert', city: 'St. Albert, AB', postal: 'T8N 7E8', lat: 53.6642, lng: -113.6195 },
  { address: '2020 Sherwood Dr', area: 'Broadmoor / Festival Place', city: 'Sherwood Park, AB', postal: 'T8A 3H9', lat: 53.5234, lng: -113.3112 },
  { address: '800 Emerald Dr', area: 'Emerald Hills', city: 'Sherwood Park, AB', postal: 'T8H 0W6', lat: 53.5592, lng: -113.2985 },
  { address: '120 Century Crossing', area: 'Century Crossing', city: 'Spruce Grove, AB', postal: 'T7X 0C8', lat: 53.5412, lng: -113.8965 },
  { address: '5010 50 Ave', area: 'Downtown Leduc', city: 'Leduc, AB', postal: 'T9E 6T2', lat: 53.2594, lng: -113.5491 },
  { address: '5004 50 St', area: 'Centre-Ville Beaumont', city: 'Beaumont, AB', postal: 'T4X 1J9', lat: 53.3572, lng: -113.4148 },
  { address: '9910 104 St', area: 'Downtown Fort Saskatchewan', city: 'Fort Saskatchewan, AB', postal: 'T8L 2P6', lat: 53.7128, lng: -113.2134 }
];

// Named streets in Edmonton & area for dynamic house-number synthesis
const NAMED_STREETS: { street: string; quadrant: string; city: string; area: string; lat: number; lng: number }[] = [
  { street: 'Jasper Ave', quadrant: 'NW', city: 'Edmonton, AB', area: 'Downtown / Oliver', lat: 53.5409, lng: -113.5050 },
  { street: 'Whyte Ave (82 Ave)', quadrant: 'NW', city: 'Edmonton, AB', area: 'Old Strathcona', lat: 53.5181, lng: -113.4981 },
  { street: 'Windermere Blvd', quadrant: 'SW', city: 'Edmonton, AB', area: 'Windermere', lat: 53.4310, lng: -113.6050 },
  { street: 'Windermere Way', quadrant: 'SW', city: 'Edmonton, AB', area: 'Windermere', lat: 53.4288, lng: -113.6114 },
  { street: 'Ambleside Dr', quadrant: 'SW', city: 'Edmonton, AB', area: 'Ambleside', lat: 53.4325, lng: -113.5960 },
  { street: 'Rabbit Hill Rd', quadrant: 'NW', city: 'Edmonton, AB', area: 'Terwillegar / Magrath', lat: 53.4535, lng: -113.5775 },
  { street: 'Terwillegar Dr', quadrant: 'NW', city: 'Edmonton, AB', area: 'Terwillegar', lat: 53.4585, lng: -113.5820 },
  { street: 'Ellerslie Rd', quadrant: 'SW', city: 'Edmonton, AB', area: 'Heritage Valley / Summerside', lat: 53.4242, lng: -113.5010 },
  { street: 'Summerside Grande Blvd', quadrant: 'SW', city: 'Edmonton, AB', area: 'Summerside', lat: 53.4145, lng: -113.4730 },
  { street: 'Chappelle Way', quadrant: 'SW', city: 'Edmonton, AB', area: 'Chappelle Gardens', lat: 53.4045, lng: -113.5695 },
  { street: 'Rutherford Rd', quadrant: 'SW', city: 'Edmonton, AB', area: 'Rutherford', lat: 53.4180, lng: -113.5240 },
  { street: 'Gateway Blvd', quadrant: 'NW', city: 'Edmonton, AB', area: 'Southgate / Strathcona', lat: 53.4920, lng: -113.4945 },
  { street: 'Calgary Trail', quadrant: 'NW', city: 'Edmonton, AB', area: 'South Corridor', lat: 53.4885, lng: -113.4960 },
  { street: 'Stony Plain Rd', quadrant: 'NW', city: 'Edmonton, AB', area: 'West Edmonton', lat: 53.5418, lng: -113.5780 },
  { street: 'Groat Rd', quadrant: 'NW', city: 'Edmonton, AB', area: 'Westmount / Glenora', lat: 53.5510, lng: -113.5420 },
  { street: 'Lessard Rd', quadrant: 'NW', city: 'Edmonton, AB', area: 'Lessard / Gariepy', lat: 53.4820, lng: -113.6210 },
  { street: 'Callingwood Rd', quadrant: 'NW', city: 'Edmonton, AB', area: 'Callingwood', lat: 53.5025, lng: -113.6150 },
  { street: 'Riverbend Rd', quadrant: 'NW', city: 'Edmonton, AB', area: 'Riverbend / Brookside', lat: 53.4850, lng: -113.5680 },
  { street: 'fort Rd', quadrant: 'NW', city: 'Edmonton, AB', area: 'Belvedere / Northeast', lat: 53.5880, lng: -113.4420 },
  { street: 'Victoria Trail', quadrant: 'NW', city: 'Edmonton, AB', area: 'Hermitage / Clareview', lat: 53.5960, lng: -113.3850 },
  { street: 'Manning Dr', quadrant: 'NW', city: 'Edmonton, AB', area: 'Manning / Ebbers', lat: 53.6120, lng: -113.4180 },
  { street: 'St Albert Trail', quadrant: '', city: 'St. Albert, AB', area: 'St. Albert Corridor', lat: 53.6458, lng: -113.6272 },
  { street: 'Sherwood Dr', quadrant: '', city: 'Sherwood Park, AB', area: 'Sherwood Park Central', lat: 53.5234, lng: -113.3112 },
  { street: 'Baseline Rd', quadrant: '', city: 'Sherwood Park, AB', area: 'Sherwood Park North', lat: 53.5415, lng: -113.3090 },
  { street: 'Wye Rd', quadrant: '', city: 'Sherwood Park, AB', area: 'Sherwood Park South', lat: 53.5080, lng: -113.3150 }
];

/**
 * Estimates accurate Edmonton grid coordinates from numbered street/avenue addresses
 * Edmonton's 100 St = -113.4909, 100 Ave = 53.5385
 */
export function estimateEdmontonGridCoords(addressText: string): { lat: number; lng: number } | undefined {
  const clean = addressText.trim();
  const preset = EDMONTON_CORRIDOR_PRESETS.find(
    p => clean.toLowerCase().includes(p.address.toLowerCase()) || p.address.toLowerCase().includes(clean.toLowerCase())
  );
  if (preset) return { lat: preset.lat, lng: preset.lng };

  for (const ns of NAMED_STREETS) {
    if (clean.toLowerCase().includes(ns.street.toLowerCase())) {
      return { lat: ns.lat, lng: ns.lng };
    }
  }

  const isSW = /\bSW\b/i.test(clean);
  // Pattern 1: "10824 82 Ave NW" -> house 10824 (~108 St), 82 Ave
  const aveMatch = clean.match(/\b(\d{2,5})\s+(\d{1,3})\s*(?:Ave|Avenue)\b/i);
  if (aveMatch) {
    const houseNum = parseInt(aveMatch[1], 10);
    const aveNum = parseInt(aveMatch[2], 10);
    const stNum = houseNum >= 1000 ? Math.floor(houseNum / 100) : 104;
    const lat = isSW
      ? 53.438 - (aveNum - 1) * 0.0022
      : 53.5385 + (aveNum - 100) * 0.0018;
    const lng = -113.4909 - (stNum - 100) * 0.0023;
    return {
      lat: Math.max(53.35, Math.min(53.68, Number(lat.toFixed(5)))),
      lng: Math.max(-113.72, Math.min(-113.28, Number(lng.toFixed(5))))
    };
  }

  // Pattern 2: "8215 104 St NW" -> house 8215 (~82 Ave), 104 St
  const stMatch = clean.match(/\b(\d{2,5})\s+(\d{1,3})\s*(?:St|Street)\b/i);
  if (stMatch) {
    const houseNum = parseInt(stMatch[1], 10);
    const stNum = parseInt(stMatch[2], 10);
    const aveNum = houseNum >= 1000 ? Math.floor(houseNum / 100) : 100;
    const lat = isSW
      ? 53.438 - (aveNum > 50 ? 15 : aveNum) * 0.0022
      : 53.5385 + (aveNum - 100) * 0.0018;
    const lng = -113.4909 - (stNum - 100) * 0.0023;
    return {
      lat: Math.max(53.35, Math.min(53.68, Number(lat.toFixed(5)))),
      lng: Math.max(-113.72, Math.min(-113.28, Number(lng.toFixed(5))))
    };
  }

  return undefined;
}

/**
 * Generates instant smart auto-complete predictions for ANY typed house number,
 * street/avenue, or neighborhood in Edmonton & Capital Region.
 */
function buildInstantLocalPredictions(rawQuery: string): Prediction[] {
  const q = rawQuery.trim();
  const qLower = q.toLowerCase();
  const results: Prediction[] = [];
  const seen = new Set<string>();

  const pushUnique = (pred: Prediction) => {
    const key = pred.description.toLowerCase();
    if (!seen.has(key) && results.length < 7) {
      seen.add(key);
      results.push(pred);
    }
  };

  // Do not pop up preset addresses when the field is empty or has fewer than 2 characters
  if (!q || q.length < 2) {
    return [];
  }

  // 0. If the user typed ONLY a house number (2–5 digits, e.g., "8306" or "10420" or "830"),
  // immediately generate smart Edmonton Grid & Corridor street predictions for that house number!
  const houseOnlyMatch = q.match(/^(\d{2,5}[A-Za-z]?)$/);
  if (houseOnlyMatch) {
    const houseNum = houseOnlyMatch[1];
    const numericVal = parseInt(houseNum, 10) || 8300;
    const gridBlock = numericVal >= 1000 ? Math.max(1, Math.min(215, Math.floor(numericVal / 100))) : 82;

    const smartGridRoads = [
      { road: `${gridBlock} Ave NW`, area: 'Edmonton Grid Avenue' },
      { road: `${gridBlock} St NW`, area: 'Edmonton Grid Street' },
      { road: '104 St NW', area: 'Old Strathcona / Central Edmonton' },
      { road: '82 Ave NW', area: 'Whyte Ave / Strathcona Corridor' },
      { road: '112 St NW', area: 'University / Garneau' },
      { road: 'Jasper Ave NW', area: 'Downtown / Oliver' },
    ];

    for (const gr of smartGridRoads) {
      const mainText = `${houseNum} ${gr.road}`;
      const coords = estimateEdmontonGridCoords(mainText);
      pushUnique({
        description: `${mainText}, Edmonton, AB`,
        place_id: `synth-house-${mainText}`,
        main_text: mainText,
        secondary_text: `Edmonton, AB • ${gr.area}`,
        lat: coords?.lat,
        lng: coords?.lng,
        tag: 'Edmonton Grid'
      });
    }
  }

  // 1. If the user typed a house number AND started typing a street/avenue number or street name
  // (e.g., "8306 104", "10824 82", "4512 118 Ave", "1240 Windermere")
  const leadingNumMatch = q.match(/^(\d{1,5}[A-Za-z]?)\s+(.+)$/);
  if (leadingNumMatch) {
    const houseNum = leadingNumMatch[1];
    const rest = (leadingNumMatch[2] || '').trim();
    const restLower = rest.toLowerCase();

    // Case 1A: User typed house number + numbered street/ave (e.g. "10824 82", "10824 82 ave")
    const numRoadMatch = rest.match(/^(\d{1,3}[A-Za-z]?)\s*(st|street|ave|avenue|rd|road|dr|drive|blvd|way|pl|place|cres|ct|close)?\s*(nw|sw|ne|se)?$/i);
    if (numRoadMatch) {
      const roadNum = numRoadMatch[1];
      const roadTypeRaw = (numRoadMatch[2] || '').toLowerCase();
      const quadRaw = (numRoadMatch[3] || '').toUpperCase();

      const roadTypes = roadTypeRaw.startsWith('av')
        ? ['Ave']
        : roadTypeRaw.startsWith('st')
        ? ['St']
        : ['Ave', 'St'];
      const quads = quadRaw ? [quadRaw] : ['NW', 'SW'];

      for (const rt of roadTypes) {
        for (const qd of quads) {
          const mainText = `${houseNum} ${roadNum} ${rt} ${qd}`;
          const coords = estimateEdmontonGridCoords(mainText);
          const areaHint = qd === 'SW' ? 'Southwest Edmonton' : parseInt(roadNum, 10) < 90 && rt === 'Ave' ? 'South / Strathcona' : 'Edmonton Grid';
          pushUnique({
            description: `${mainText}, Edmonton, AB`,
            place_id: `synth-grid-${mainText}`,
            main_text: mainText,
            secondary_text: `Edmonton, AB • ${areaHint}`,
            lat: coords?.lat,
            lng: coords?.lng,
            tag: 'Edmonton Grid'
          });
        }
      }
    }

    // Case 1B: User typed house number + named street prefix (e.g. "10420 jasper", "1215 wind")
    if (rest.length >= 1) {
      for (const ns of NAMED_STREETS) {
        if (ns.street.toLowerCase().includes(restLower) || ns.area.toLowerCase().includes(restLower)) {
          const mainText = `${houseNum} ${ns.street}${ns.quadrant ? ` ${ns.quadrant}` : ''}`;
          pushUnique({
            description: `${mainText}, ${ns.city}`,
            place_id: `synth-named-${mainText}`,
            main_text: mainText,
            secondary_text: `${ns.city} • ${ns.area}`,
            lat: ns.lat,
            lng: ns.lng,
            tag: ns.area
          });
        }
      }
    }
  }

  // 2. Match against curated presets & named streets
  if (q.length >= 2) {
    for (const item of EDMONTON_CORRIDOR_PRESETS) {
      const haystack = `${item.address} ${item.area} ${item.postal}`.toLowerCase();
      if (haystack.includes(qLower)) {
        pushUnique({
          description: `${item.address}, ${item.city}`,
          place_id: `preset-${item.address}`,
          main_text: item.address,
          secondary_text: `${item.city} • ${item.area}`,
          lat: item.lat,
          lng: item.lng,
          tag: item.area
        });
      }
    }
  }

  return results.slice(0, 6);
}

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing house #, street, or neighborhood (auto-completes)...',
  className = '',
  required = false,
  disabled = false,
  onBlur,
  theme = 'light',
  id,
  name = 'street-address',
  showClearButton = true
}) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [justAutoFilled, setJustAutoFilled] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = async (input: string) => {
    const trimmed = (input || '').trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    const localSmart = buildInstantLocalPredictions(trimmed);
    setPredictions(localSmart);
    setHighlightedIndex(0);
    if (localSmart.length > 0) {
      setIsOpen(true);
    }

    setIsLoading(true);
    try {
      // 1. Try modern Google Maps Places JS SDK (AutocompleteSuggestion or AutocompleteService) if loaded
      const w = window as unknown as { google?: any };
      if (w.google?.maps?.places) {
        if (typeof w.google.maps.places.AutocompleteSuggestion?.fetchAutocompleteSuggestions === 'function') {
          try {
            const { suggestions } = await w.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: trimmed,
              includedRegionCodes: ['ca'],
              locationBias: {
                center: { lat: 53.5461, lng: -113.4938 },
                radius: 50000
              }
            });
            if (Array.isArray(suggestions) && suggestions.length > 0) {
              const gmpPreds: Prediction[] = suggestions
                .map((s: any, idx: number) => {
                  const p = s.placePrediction;
                  if (!p) return null;
                  const fullText = p.text?.toString?.() || '';
                  const mainText = p.mainText?.toString?.() || fullText.split(',')[0] || fullText;
                  const secondaryText = p.secondaryText?.toString?.() || 'Edmonton & Area, AB';
                  const coords = estimateEdmontonGridCoords(fullText);
                  return {
                    description: fullText,
                    place_id: p.placeId || `gmp-sug-${idx}`,
                    main_text: mainText,
                    secondary_text: secondaryText,
                    lat: coords?.lat,
                    lng: coords?.lng,
                    tag: 'Google Maps'
                  } as Prediction;
                })
                .filter(Boolean);
              if (gmpPreds.length > 0) {
                const seenDesc = new Set(gmpPreds.map((g) => g.main_text.toLowerCase()));
                const merged = [
                  ...gmpPreds,
                  ...localSmart.filter((l) => !seenDesc.has(l.main_text.toLowerCase()))
                ].slice(0, 6);
                setPredictions(merged);
                setIsOpen(true);
                setIsLoading(false);
                return;
              }
            }
          } catch {
            // Fall through to AutocompleteService / server proxy
          }
        }

        if (typeof w.google.maps.places.AutocompleteService === 'function') {
          const service = new w.google.maps.places.AutocompleteService();
          const hasEdmontonContext = /edmonton|st\.?\s*albert|sherwood|spruce|leduc|beaumont|\bab\b/i.test(trimmed);
          const searchInput = hasEdmontonContext ? trimmed : `${trimmed}, Edmonton, AB`;

          const googlePreds = await new Promise<Prediction[]>((resolve) => {
            service.getPlacePredictions(
              {
                input: searchInput,
                componentRestrictions: { country: 'ca' }
              },
              (results: any[] | null, status: string) => {
                if (status === 'OK' && results && results.length > 0) {
                  resolve(
                    results.slice(0, 5).map((p: any) => {
                      const coords = estimateEdmontonGridCoords(p.description || '');
                      return {
                        description: p.description,
                        place_id: p.place_id,
                        main_text: p.structured_formatting?.main_text || p.description.split(',')[0],
                        secondary_text: p.structured_formatting?.secondary_text || 'Alberta, Canada',
                        lat: coords?.lat,
                        lng: coords?.lng,
                        tag: 'Google Places'
                      };
                    })
                  );
                } else {
                  resolve([]);
                }
              }
            );
          });

          if (googlePreds.length > 0) {
            const seenDesc = new Set(googlePreds.map(g => g.main_text.toLowerCase()));
            const combined = [
              ...googlePreds,
              ...localSmart.filter(l => !seenDesc.has(l.main_text.toLowerCase()))
            ].slice(0, 6);
            setPredictions(combined);
            setIsOpen(true);
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Try Server Proxy (/api/places/autocomplete)
      const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.predictions) && data.predictions.length > 0) {
          const serverPreds: Prediction[] = data.predictions.slice(0, 6).map((p: any, idx: number) => {
            const desc = p.description || '';
            const main =
              p.main_text ||
              p.mainText ||
              p.structured_formatting?.main_text ||
              desc.split(',')[0] ||
              desc;
            const secondary =
              p.secondary_text ||
              p.secondaryText ||
              p.structured_formatting?.secondary_text ||
              'Edmonton, AB';
            const coords = estimateEdmontonGridCoords(desc);
            return {
              description: desc,
              place_id: p.place_id || p.placeId || `srv-pred-${idx}`,
              main_text: main,
              secondary_text: secondary,
              lat: coords?.lat,
              lng: coords?.lng,
              tag: 'Verified'
            };
          });
          const seenDesc = new Set(serverPreds.map(s => s.main_text.toLowerCase()));
          const finalPreds = [
            ...serverPreds,
            ...localSmart.filter(l => !seenDesc.has(l.main_text.toLowerCase()))
          ].slice(0, 6);
          setPredictions(finalPreds);
          setIsOpen(finalPreds.length > 0);
        }
      }
    } catch {
      // Local smart predictions are already displayed
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    const coords = estimateEdmontonGridCoords(newVal);
    onChange(newVal, coords);
    setJustAutoFilled(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!newVal || newVal.trim().length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    // Immediate local smart predictions + debounced remote enrichment
    const immediateLocal = buildInstantLocalPredictions(newVal);
    setPredictions(immediateLocal);
    setHighlightedIndex(0);
    setIsOpen(immediateLocal.length > 0);

    debounceTimer.current = setTimeout(() => {
      fetchPredictions(newVal);
    }, 150);
  };

  const handleSelect = (prediction: Prediction) => {
    // Format clean street + city for form & dispatch clarity
    const cleanAddress = prediction.description.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const coords =
      prediction.lat !== undefined && prediction.lng !== undefined
        ? { lat: prediction.lat, lng: prediction.lng }
        : estimateEdmontonGridCoords(cleanAddress);
    onChange(cleanAddress, coords);
    if (onSelect) {
      onSelect({
        description: cleanAddress,
        place_id: prediction.place_id,
        placeId: prediction.place_id,
        main_text: prediction.main_text,
        mainText: prediction.main_text,
        secondary_text: prediction.secondary_text,
        secondaryText: prediction.secondary_text,
        lat: coords?.lat,
        lng: coords?.lng,
        tag: prediction.tag
      });
    }
    setIsOpen(false);
    setJustAutoFilled(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % predictions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + predictions.length) % predictions.length);
    } else if ((e.key === 'Enter' || e.key === 'Tab') && predictions[highlightedIndex]) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      handleSelect(predictions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          id={id}
          name={name}
          type="text"
          autoComplete="off"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value && value.trim().length >= 2 && !justAutoFilled) {
              const list = buildInstantLocalPredictions(value);
              if (list.length > 0) {
                setPredictions(list);
                setHighlightedIndex(0);
                setIsOpen(true);
              }
              fetchPredictions(value);
            }
          }}
          onBlur={() => {
            // If user leaves the field with only a bare house number (e.g. "8306") and predictions exist, auto-fill the top prediction
            if (value && /^\d{2,5}[A-Za-z]?$/.test(value.trim()) && predictions.length > 0 && !justAutoFilled) {
              handleSelect(predictions[highlightedIndex] || predictions[0]);
            }
            if (onBlur) onBlur();
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full pr-16 ${className}`}
        />
        <div className="absolute right-3 flex items-center gap-1.5">
          {value && showClearButton && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange('', undefined);
                setPredictions([]);
                setIsOpen(false);
              }}
              title="Clear address"
              className={`p-1 rounded-full transition-colors ${
                isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isLoading ? (
            <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-pink-400' : 'text-pink-500'}`} />
          ) : justAutoFilled || (value && value.trim().length > 6) ? (
            <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-pink-400' : 'text-emerald-500'}`} />
          ) : (
            <MapPin className={`w-4 h-4 pointer-events-none ${isDark ? 'text-pink-500/80' : 'text-slate-400'}`} />
          )}
        </div>
      </div>

      {isOpen && predictions.length > 0 && (
        <div
          className={`absolute z-[120] w-full mt-1.5 rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${
            isDark
              ? 'bg-zinc-950/98 border-pink-500/40 shadow-[0_12px_40px_rgba(236,72,153,0.28)]'
              : 'bg-white border-slate-200 shadow-xl'
          }`}
        >
          <div
            className={`px-3.5 py-2 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-100'
            }`}
          >
            <span
              className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                isDark ? 'text-pink-400' : 'text-slate-500'
              }`}
            >
              <Sparkles className="w-3 h-3 text-pink-500" />
              {value.trim() ? 'Instant Address Auto-Fill (Click or Press Enter)' : 'Popular Edmonton & Area Corridors'}
            </span>
            <span className={`text-[9px] font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              ↑↓ Navigate • Enter
            </span>
          </div>
          <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100/10">
            {predictions.map((prediction, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={prediction.place_id}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    // Use onMouseDown so selection triggers before input onBlur
                    e.preventDefault();
                    handleSelect(prediction);
                  }}
                  className={`px-4 py-2.5 cursor-pointer transition-colors flex items-start gap-3 ${
                    isDark
                      ? isHighlighted
                        ? 'bg-pink-500/20 text-white'
                        : 'hover:bg-zinc-900 text-zinc-200'
                      : isHighlighted
                      ? 'bg-pink-50 text-slate-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Navigation
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isHighlighted ? 'text-pink-500' : isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-black truncate ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {prediction.main_text}
                      </span>
                      {prediction.tag && (
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                            isDark
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {prediction.tag}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs truncate ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      {prediction.secondary_text}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
