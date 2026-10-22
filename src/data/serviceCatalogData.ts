/**
 * Canonical Service Catalog & Price List for Tidyups Cleaning Service Inc.
 * Synchronized with Jobber Products & Services Line Items
 *
 * Formula: Number of Cleaners ( QTY × Unit Price ) = Total (CAD)
 * Example: 1Bed 1Bath Moveout Cleaning 2026:
 * - For 2 Cleaners: 2 Cleaners ( 3 QTY × $105.00 Unit Price ) = $315.00 Total
 * - For 1 Cleaner:  1 Cleaner  ( 6 QTY × $52.50 Unit Price )  = $315.00 Total
 */

import * as XLSX from 'xlsx';

export interface ServiceCatalogItem {
  id: string;
  category:
    | 'MOVE_OUT'
    | 'DEEP_CLEAN'
    | 'STANDARD_CLEAN'
    | 'POST_CONSTRUCTION'
    | 'RECURRING'
    | 'ADD_ON'
    | 'HOURLY';
  categoryLabel: string;
  name: string;
  shortName: string;
  serviceType:
    | 'Move-Out Cleaning'
    | 'Deep Cleaning'
    | 'Standard Cleaning'
    | 'Post-Construction Cleaning'
    | 'Recurring Cleaning'
    | 'Commercial Cleaning'
    | 'Add-on';
  bedrooms?: string;
  bathrooms?: string;
  beds?: string;
  baths?: string;
  quantity: number; // Crew hours / units for the specified cleanersCount (e.g., 3 for 2 cleaners, 6 for 1 cleaner)
  unitPrice: number; // Unit price for the specified cleanersCount (e.g., $105.00 for 2 cleaners, $52.50 for 1 cleaner)
  total: number; // Total (CAD) = QTY * Unit Price (e.g., $315.00)
  basePrice: number; // Backward-compatibility alias = total
  baseHours: number; // Backward-compatibility alias = quantity
  cleanersCount: number; // Number of cleaners (e.g., 2 or 1)
  depositRequired: number;
  taxable: boolean;
  jobberItemName: string;
  description: string;
  isAddon?: boolean;
  status?: string; // 'Active', 'Standard', 'Draft'
  isActive: boolean; // Active?
  sortOrder: number;
}

/**
 * Converts a catalog item's Quantity and Unit Price when switching the Number of Cleaners.
 * Formula: Number of Cleaners ( QTY × Unit Price ) = Total
 * Example: 1Bed 1Bath Moveout for 2 Cleaners has QTY = 3, Unit Price = $105.00 ($52.50/cleaner), Total = $315.00.
 * If switched to 1 Cleaner, QTY becomes 6 (3 * 2) and Unit Price becomes $52.50 ($105 / 2), Total = $315.00.
 */
export function convertItemForCleanersCount(
  item: {
    quantity: number;
    unitPrice: number;
    total?: number;
    cleanersCount: number;
    isAddon?: boolean;
    category?: string;
    name?: string;
    description?: string;
    bedrooms?: string;
    bathrooms?: string;
    beds?: string;
    baths?: string;
  },
  targetCleaners: number
): {
  cleanersCount: number;
  quantity: number;
  unitPrice: number;
  total: number;
  perCleanerRate: number;
  soloEquivalentQty: number;
  soloEquivalentRate: number;
  jobberItemName: string;
  description: string;
} {
  const isHourlyOrAddon = Boolean(
    item.isAddon ||
      item.category === 'ADD_ON' ||
      item.category === 'HOURLY' ||
      /Hourly Rate|Crew Rate/i.test(item.name || '')
  );
  const catUpper = String(item.category || '').toUpperCase();
  const nameLower = String(item.name || '').toLowerCase();
  const isMoveOut = catUpper === 'MOVE_OUT' || nameLower.includes('move out') || nameLower.includes('moveout') || nameLower.includes('move-out');
  const isDeepClean = catUpper === 'DEEP_CLEAN' || (nameLower.includes('deep') && !isHourlyOrAddon);
  const isBasicClean = catUpper === 'STANDARD_CLEAN' || nameLower.includes('initial basic') || nameLower.includes('basic cleaning') || nameLower.includes('standard cleaning');

  const currentCleaners = Math.max(1, Number(item.cleanersCount) || 1);
  let nextCleaners = isHourlyOrAddon ? currentCleaners : Math.max(1, Number(targetCleaners) || 1);

  // Enforce owner crew rules:
  // - Basic Cleaning: 1 cleaner
  // - Deep Cleaning: minimum 2 cleaners
  if (!isHourlyOrAddon) {
    if (isBasicClean && targetCleaners === undefined) {
      nextCleaners = 1;
    } else if (isDeepClean && nextCleaners < 2) {
      nextCleaners = 2;
    }
  }

  const currentQty = Number(item.quantity) || 1;
  const currentUnitPrice = Number(item.unitPrice) || 0;
  const currentTotal =
    item.total !== undefined && !isNaN(Number(item.total))
      ? Number(item.total)
      : Math.round(currentQty * currentUnitPrice * 100) / 100;

  // Per-cleaner rate & solo equivalent
  const perCleanerRate = Math.round((currentUnitPrice / currentCleaners) * 100) / 100 || 52.5;
  const totalPersonHours = Math.round(currentQty * currentCleaners * 100) / 100;

  const stripSuffix = (name: string) =>
    (name || '')
      .replace(/\s*\([123]\s*Cleaners?[^)]*\)\s*$/i, '')
      .replace(/\s*-\s*[123]\s*Cleaners?\s*$/i, '')
      .trim();

  if (isHourlyOrAddon) {
    return {
      cleanersCount: currentCleaners,
      quantity: currentQty,
      unitPrice: currentUnitPrice,
      total: currentTotal,
      perCleanerRate,
      soloEquivalentQty: totalPersonHours,
      soloEquivalentRate: perCleanerRate,
      jobberItemName: item.name || 'Cleaning Service',
      description: item.description || `${item.name || 'Cleaning Service'} - Tidyups Cleaning Service`,
    };
  }

  let newQuantity =
    currentCleaners === nextCleaners
      ? currentQty
      : Math.round((totalPersonHours / nextCleaners) * 100) / 100;

  // Enforce strict minimum hours rules:
  // - Move-Out: minimum 3 hrs with 2 cleaners; if 1 cleaner, starts at 6 hrs minimum
  // - Deep Clean: minimum 2 hrs with 2 cleaners
  if (isMoveOut) {
    if (nextCleaners === 1 && newQuantity < 6) {
      newQuantity = 6;
    } else if (nextCleaners >= 2 && newQuantity < 3) {
      newQuantity = 3;
    }
  } else if (isDeepClean) {
    if (nextCleaners >= 2 && newQuantity < 2) {
      newQuantity = 2;
    }
  }

  const newUnitPrice =
    currentCleaners === nextCleaners
      ? currentUnitPrice
      : Math.round(perCleanerRate * nextCleaners * 100) / 100;
  const computedTotal = Math.round(newQuantity * newUnitPrice * 100) / 100;
  const newTotal = Math.max(currentTotal > 0 ? Math.round(currentTotal * 100) / 100 : 0, computedTotal);

  const baseName = stripSuffix(item.name || 'Cleaning Service');
  const crewLabel = nextCleaners === 1 ? '1 Cleaner' : `${nextCleaners} Cleaners`;
  const jobberFullName = `${baseName} (${crewLabel})`;
  const bedsBaths = [item.bedrooms || item.beds, item.bathrooms || item.baths]
    .filter(Boolean)
    .join(', ');
  const jobberDesc = `${jobberFullName} - ${crewLabel} (${newQuantity} x $${newUnitPrice.toFixed(2)}) = $${newTotal.toFixed(2)} CAD${
    bedsBaths ? ` | ${bedsBaths}` : ''
  }`;

  return {
    cleanersCount: nextCleaners,
    quantity: newQuantity,
    unitPrice: newUnitPrice,
    total: newTotal,
    perCleanerRate,
    soloEquivalentQty: Math.round(newQuantity * nextCleaners * 100) / 100,
    soloEquivalentRate: perCleanerRate,
    jobberItemName: jobberFullName,
    description: jobberDesc,
  };
}

/**
 * Formats the formula display string for any catalog item:
 * e.g. "2 Cleaners (3 × $105.00) = $315.00" and "1 Cleaner: 6 × $52.50 = $315.00"
 */
export function formatCleanersFormulaSummary(item: ServiceCatalogItem): {
  primaryFormula: string;
  soloEquivalentFormula: string;
} {
  const cleaners = Math.max(1, item.cleanersCount || 1);
  const qty = item.quantity ?? item.baseHours ?? 1;
  const unitPrice = item.unitPrice ?? item.basePrice ?? 0;
  const total = item.total ?? Math.round(qty * unitPrice * 100) / 100;

  if (item.isAddon) {
    return {
      primaryFormula: `1 Add-on (${qty} × $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`,
      soloEquivalentFormula: `Qty ${qty} × $${unitPrice.toFixed(2)} = $${total.toFixed(2)}`,
    };
  }

  const soloQty = Math.round(qty * cleaners * 100) / 100;
  const soloRate = Math.round((unitPrice / cleaners) * 100) / 100;

  return {
    primaryFormula: `${cleaners} Cleaner${cleaners > 1 ? 's' : ''} (${qty} × $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`,
    soloEquivalentFormula:
      cleaners > 1
        ? `1 Cleaner: ${soloQty} × $${soloRate.toFixed(2)} = $${total.toFixed(2)}`
        : `2 Cleaners: ${Math.round((qty / 2) * 100) / 100} × $${(unitPrice * 2).toFixed(2)} = $${total.toFixed(2)}`,
  };
}

export const CANONICAL_SERVICE_CATALOG: ServiceCatalogItem[] = [
  // ── 1. MOVE-OUT CLEANING 2026 (2 Cleaners @ $105.00/hr | 1 Cleaner @ $52.50/hr) ──
  {
    id: 'cat-mo-1b1b',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: '1Bed 1Bath Moveout Cleaning 2026',
    shortName: '1Bed 1Bath Moveout Cleaning 2026',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '1 Bedroom',
    bathrooms: '1 Bathroom',
    beds: '1 Bedroom',
    baths: '1 Bathroom',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '1Bed 1Bath Moveout Cleaning 2026',
    description: 'Complete move-out sanitization for 1 Bed / 1 Bath apartment/condo. High-touch surfaces, kitchen, bath, and floors.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'cat-mo-2b1b',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: 'Move Out Cleaning Services 2026 (Basement Suite)',
    shortName: 'Move Out Cleaning Services 2026 (Basement Suite)',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '1 Bathroom',
    beds: '2 Bedrooms',
    baths: '1 Bathroom',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: 'Move Out Cleaning Services 2026 (Basement Suite)',
    description: 'Comprehensive move-out turnover clean for 2 Bed / 1 Bath basement suite. Kitchen, bath, fixtures, and full sanitization.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 20,
  },
  {
    id: 'cat-mo-2b2b',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: '2Bed 2Bath Move Out Cleaning 2026',
    shortName: '2Bed 2Bath Move Out Cleaning 2026',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '2 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '2Bed 2Bath Move Out Cleaning 2026',
    description: 'Detailed move-out clean for 2 Bed / 2 Bath residence. Both full baths, kitchen surfaces, baseboards wipe, vacuum & mop.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 30,
  },
  {
    id: 'cat-mo-3b2b-main',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: 'Move Out Cleaning Services 2026 (Main Level)',
    shortName: 'Move Out Cleaning Services 2026 (Main Level)',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: 'Move Out Cleaning Services 2026 (Main Level)',
    description: 'Complete main-level move-out cleaning for 3 Bedrooms & 2 Bathrooms. Kitchen degrease, baths, closets, and floors.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 40,
  },
  {
    id: 'cat-mo-3b2b-std',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: '3Bed 2Bath Moveout Cleaning 2026',
    shortName: '3Bed 2Bath Moveout Cleaning 2026',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '3Bed 2Bath Moveout Cleaning 2026',
    description: 'Full moveout turnover for 3 Bed / 2 Bath home. Hand-wiped surfaces, kitchen exterior cabinets & appliances, full baths.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 50,
  },
  {
    id: 'cat-mo-3b25b',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: 'Move Out Cleaning Services 2026 (3 Bed / 2.5 Bath)',
    shortName: 'Move Out Cleaning Services 2026 (3 Bed / 2.5 Bath)',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2.5 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2.5 Bathrooms',
    quantity: 3.5,
    unitPrice: 105,
    total: 367.5,
    basePrice: 367.5,
    baseHours: 3.5,
    cleanersCount: 2,
    depositRequired: 125,
    taxable: true,
    jobberItemName: 'Move Out Cleaning Services 2026 (3 Bed / 2.5 Bath)',
    description: 'Tandem cleaner move-out for 3 Bed / 2.5 Bath two-storey home. Detailed bathrooms, powder room, kitchen, baseboards.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 60,
  },
  {
    id: 'cat-mo-4b25b',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: '4Bed 2.5Bath Move Out Cleaning 2026',
    shortName: '4Bed 2.5Bath Move Out Cleaning 2026',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '4 Bedrooms',
    bathrooms: '2.5 Bathrooms',
    beds: '4 Bedrooms',
    baths: '2.5 Bathrooms',
    quantity: 4.5,
    unitPrice: 105,
    total: 472.5,
    basePrice: 472.5,
    baseHours: 4.5,
    cleanersCount: 2,
    depositRequired: 125,
    taxable: true,
    jobberItemName: '4Bed 2.5Bath Move Out Cleaning 2026',
    description: 'Move-out turnover for 4 Bedrooms and 2.5 Bathrooms. Full home detail, stairwells, sanitization, and baseboards.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 70,
  },
  {
    id: 'cat-mo-4b3b',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: '4Bed 3Bath Move Out Cleaning 2026',
    shortName: '4Bed 3Bath Move Out Cleaning 2026',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '4 Bedrooms',
    bathrooms: '3 Bathrooms',
    beds: '4 Bedrooms',
    baths: '3 Bathrooms',
    quantity: 4.5,
    unitPrice: 105,
    total: 472.5,
    basePrice: 472.5,
    baseHours: 4.5,
    cleanersCount: 2,
    depositRequired: 150,
    taxable: true,
    jobberItemName: '4Bed 3Bath Move Out Cleaning 2026',
    description: 'Comprehensive 4 Bed / 3 Bath home move-out cleaning with team dispatch. All three bathrooms and kitchen deep cleaned.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 80,
  },
  {
    id: 'cat-mo-5b35b',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: '5Bed 3.5+Bath Executive Estate Move Out Clean',
    shortName: '5Bed 3.5+Bath Executive Estate Move Out Clean',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '5 Bedrooms',
    bathrooms: '3.5 Bathrooms',
    beds: '5 Bedrooms',
    baths: '3.5 Bathrooms',
    quantity: 5,
    unitPrice: 105,
    total: 525,
    basePrice: 525,
    baseHours: 5,
    cleanersCount: 2,
    depositRequired: 150,
    taxable: true,
    jobberItemName: '5Bed 3.5+Bath Executive Estate Move Out Clean',
    description: 'Executive estate move-out turnover clean. Large square footage, master ensuite, bonus room, multiple full bathrooms.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 90,
  },

  // ── 2. DEEP CLEANING SERVICES 2026 ──
  {
    id: 'cat-dc-1b1b',
    category: 'DEEP_CLEAN',
    categoryLabel: 'Deep Cleaning Services 2026',
    name: '1Bed 1Bath Deep Cleaning 2026',
    shortName: '1Bed 1Bath Deep Cleaning 2026',
    serviceType: 'Deep Cleaning',
    bedrooms: '1 Bedroom',
    bathrooms: '1 Bathroom',
    beds: '1 Bedroom',
    baths: '1 Bathroom',
    quantity: 2,
    unitPrice: 105,
    total: 210,
    basePrice: 210,
    baseHours: 2,
    cleanersCount: 2,
    depositRequired: 50,
    taxable: true,
    jobberItemName: '1Bed 1Bath Deep Cleaning 2026',
    description: 'Detailed deep sanitization for 1 Bed / 1 Bath residence. Grout, faucets, stove top, bathroom descaling, high dusting.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 100,
  },
  {
    id: 'cat-dc-2b1b',
    category: 'DEEP_CLEAN',
    categoryLabel: 'Deep Cleaning Services 2026',
    name: '2Bed 1Bath Deep Cleaning 2026',
    shortName: '2Bed 1Bath Deep Cleaning 2026',
    serviceType: 'Deep Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '1 Bathroom',
    beds: '2 Bedrooms',
    baths: '1 Bathroom',
    quantity: 2.5,
    unitPrice: 105,
    total: 262.5,
    basePrice: 262.5,
    baseHours: 2.5,
    cleanersCount: 2,
    depositRequired: 75,
    taxable: true,
    jobberItemName: '2Bed 1Bath Deep Cleaning 2026',
    description: 'Deep residential clean for 2 Bed / 1 Bath home. Scrub showers, kitchen backsplash, edge vacuuming, doors & frames.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 110,
  },
  {
    id: 'cat-dc-2b2b',
    category: 'DEEP_CLEAN',
    categoryLabel: 'Deep Cleaning Services 2026',
    name: '2Bed 2Bath Deep Cleaning 2026',
    shortName: '2Bed 2Bath Deep Cleaning 2026',
    serviceType: 'Deep Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '2 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 75,
    taxable: true,
    jobberItemName: '2Bed 2Bath Deep Cleaning 2026',
    description: 'Intensive deep clean for 2 Bed / 2 Bath home. Deep scrubbing of 2 bathrooms, kitchen degrease, baseboards, floor detail.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 120,
  },
  {
    id: 'cat-dc-3b2b',
    category: 'DEEP_CLEAN',
    categoryLabel: 'Deep Cleaning Services 2026',
    name: '3Bed 2Bath Deep Cleaning 2026',
    shortName: '3Bed 2Bath Deep Cleaning 2026',
    serviceType: 'Deep Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 50,
    taxable: true,
    jobberItemName: '3Bed 2Bath Deep Cleaning 2026',
    description: 'Deep residential rejuvenation for 3 Bed / 2 Bath house or condo. Living areas, bedrooms, kitchen scrub, bathroom descaling.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 130,
  },
  {
    id: 'cat-dc-3b25b',
    category: 'DEEP_CLEAN',
    categoryLabel: 'Deep Cleaning Services 2026',
    name: '3Bed 2.5Bath Deep Cleaning 2026',
    shortName: '3Bed 2.5Bath Deep Cleaning 2026',
    serviceType: 'Deep Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2.5 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2.5 Bathrooms',
    quantity: 3.5,
    unitPrice: 105,
    total: 367.5,
    basePrice: 367.5,
    baseHours: 3.5,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '3Bed 2.5Bath Deep Cleaning 2026',
    description: 'Full residential deep cleaning for 3 Bedrooms and 2.5 Bathrooms (approx. 1800-2200 sq ft). Includes powder room & ensuite.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 140,
  },
  {
    id: 'cat-dc-4b25b',
    category: 'DEEP_CLEAN',
    categoryLabel: 'Deep Cleaning Services 2026',
    name: '4Bed 2.5Bath Deep Cleaning 2026',
    shortName: '4Bed 2.5Bath Deep Cleaning 2026',
    serviceType: 'Deep Cleaning',
    bedrooms: '4 Bedrooms',
    bathrooms: '2.5 Bathrooms',
    beds: '4 Bedrooms',
    baths: '2.5 Bathrooms',
    quantity: 4,
    unitPrice: 105,
    total: 420,
    basePrice: 420,
    baseHours: 4,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '4Bed 2.5Bath Deep Cleaning 2026',
    description: 'Team deep clean for 4 Bed / 2.5 Bath home. Complete kitchen, bathrooms, bedrooms, and high/low detailed dusting.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 150,
  },
  {
    id: 'cat-dc-4b3b',
    category: 'DEEP_CLEAN',
    categoryLabel: 'Deep Cleaning Services 2026',
    name: '4Bed 3Bath Deep Cleaning 2026',
    shortName: '4Bed 3Bath Deep Cleaning 2026',
    serviceType: 'Deep Cleaning',
    bedrooms: '4 Bedrooms',
    bathrooms: '3 Bathrooms',
    beds: '4 Bedrooms',
    baths: '3 Bathrooms',
    quantity: 4.5,
    unitPrice: 105,
    total: 472.5,
    basePrice: 472.5,
    baseHours: 4.5,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '4Bed 3Bath Deep Cleaning 2026',
    description: 'Comprehensive deep cleaning for large 4 Bed / 3 Bath residence. Triple bathroom scrub, kitchen, living spaces, and floors.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 160,
  },
  {
    id: 'cat-dc-5b35b',
    category: 'DEEP_CLEAN',
    categoryLabel: 'Deep Cleaning Services 2026',
    name: '5Bed 3.5+Bath Estate Deep Clean 2026',
    shortName: '5Bed 3.5+Bath Estate Deep Clean 2026',
    serviceType: 'Deep Cleaning',
    bedrooms: '5 Bedrooms',
    bathrooms: '3.5 Bathrooms',
    beds: '5 Bedrooms',
    baths: '3.5 Bathrooms',
    quantity: 5,
    unitPrice: 105,
    total: 525,
    basePrice: 525,
    baseHours: 5,
    cleanersCount: 2,
    depositRequired: 125,
    taxable: true,
    jobberItemName: '5Bed 3.5+Bath Estate Deep Clean 2026',
    description: 'Estate-scale deep cleaning for large family properties. Multi-cleaner crew, bathrooms, chef kitchen, stairs, and living suites.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 170,
  },

  // ── 3. INITIAL BASIC / STANDARD CLEANING 2026 ──
  {
    id: 'cat-sc-1b1b',
    category: 'STANDARD_CLEAN',
    categoryLabel: 'Initial Basic / Standard Cleaning 2026',
    name: '1Bed 1Bath Initial Basic Cleaning',
    shortName: '1Bed 1Bath Initial Basic Cleaning',
    serviceType: 'Standard Cleaning',
    bedrooms: '1 Bedroom',
    bathrooms: '1 Bathroom',
    beds: '1 Bedroom',
    baths: '1 Bathroom',
    quantity: 3,
    unitPrice: 52.5,
    total: 157.5,
    basePrice: 157.5,
    baseHours: 3,
    cleanersCount: 1,
    depositRequired: 50,
    taxable: true,
    jobberItemName: '1Bed 1Bath Initial Basic Cleaning',
    description: 'General residential maintenance clean for 1 Bed / 1 Bath home. Dust surfaces, sanitize bathroom, kitchen counters, vacuum & mop.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 180,
  },
  {
    id: 'cat-sc-2b1b',
    category: 'STANDARD_CLEAN',
    categoryLabel: 'Initial Basic / Standard Cleaning 2026',
    name: '2Bed 1Bath Initial Basic Cleaning',
    shortName: '2Bed 1Bath Initial Basic Cleaning',
    serviceType: 'Standard Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '1 Bathroom',
    beds: '2 Bedrooms',
    baths: '1 Bathroom',
    quantity: 2.5,
    unitPrice: 52.5,
    total: 131.25,
    basePrice: 131.25,
    baseHours: 2.5,
    cleanersCount: 1,
    depositRequired: 50,
    taxable: true,
    jobberItemName: '2Bed 1Bath Initial Basic Cleaning',
    description: 'Standard residential cleaning for 2 Bed / 1 Bath home. Living rooms, kitchen, bathroom sanitization, empty bins, floors.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 190,
  },
  {
    id: 'cat-sc-2b2b',
    category: 'STANDARD_CLEAN',
    categoryLabel: 'Initial Basic / Standard Cleaning 2026',
    name: '2Bed 2Bath Initial Basic Cleaning',
    shortName: '2Bed 2Bath Initial Basic Cleaning',
    serviceType: 'Standard Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '2 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3.5,
    unitPrice: 52.5,
    total: 183.75,
    basePrice: 183.75,
    baseHours: 3.5,
    cleanersCount: 1,
    depositRequired: 50,
    taxable: true,
    jobberItemName: '2Bed 2Bath Initial Basic Cleaning',
    description: 'Standard initial basic cleaning for 2 Bed / 2 Bath home. Surface wipe down, both bathrooms, kitchen sinks, floors vacuumed/mopped.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 200,
  },
  {
    id: 'cat-sc-3b2b',
    category: 'STANDARD_CLEAN',
    categoryLabel: 'Initial Basic / Standard Cleaning 2026',
    name: '3Bed 2Bath Initial Basic Cleaning',
    shortName: '3Bed 2Bath Initial Basic Cleaning',
    serviceType: 'Standard Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '3Bed 2Bath Initial Basic Cleaning',
    description: 'Complete standard clean for 3 Bed / 2 Bath residence. Bedrooms, baths, kitchen counters, appliances exterior, and floors.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 210,
  },
  {
    id: 'cat-sc-3b25b',
    category: 'STANDARD_CLEAN',
    categoryLabel: 'Initial Basic / Standard Cleaning 2026',
    name: '3Bed 2.5Bath Initial Basic Cleaning',
    shortName: '3Bed 2.5Bath Initial Basic Cleaning',
    serviceType: 'Standard Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2.5 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2.5 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '3Bed 2.5Bath Initial Basic Cleaning',
    description: 'Standard residential clean for 3 Bed / 2.5 Bath two-storey home. Kitchen counters & stove, 2.5 baths, dusting, vacuuming and mopping.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 220,
  },
  {
    id: 'cat-sc-4b25b',
    category: 'STANDARD_CLEAN',
    categoryLabel: 'Initial Basic / Standard Cleaning 2026',
    name: '4Bed 2.5Bath Initial Basic Cleaning',
    shortName: '4Bed 2.5Bath Initial Basic Cleaning',
    serviceType: 'Standard Cleaning',
    bedrooms: '4 Bedrooms',
    bathrooms: '2.5 Bathrooms',
    beds: '4 Bedrooms',
    baths: '2.5 Bathrooms',
    quantity: 3.5,
    unitPrice: 105,
    total: 367.5,
    basePrice: 367.5,
    baseHours: 3.5,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '4Bed 2.5Bath Initial Basic Cleaning',
    description: 'Residential standard cleaning for 4 Bed / 2.5 Bath home. Bedrooms, shared bathrooms, ensuite, kitchen, and common areas.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 230,
  },
  {
    id: 'cat-sc-4b3b',
    category: 'STANDARD_CLEAN',
    categoryLabel: 'Initial Basic / Standard Cleaning 2026',
    name: '4Bed 3Bath Initial Basic Cleaning',
    shortName: '4Bed 3Bath Initial Basic Cleaning',
    serviceType: 'Standard Cleaning',
    bedrooms: '4 Bedrooms',
    bathrooms: '3 Bathrooms',
    beds: '4 Bedrooms',
    baths: '3 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '4Bed 3Bath Initial Basic Cleaning',
    description: 'Standard clean for 4 Bed / 3 Bath home. 3 full bathrooms, extensive floor square footage, dusting, kitchen and entrance.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 240,
  },

  // ── 4. MOVE-IN / POST CONSTRUCTION ──
  {
    id: 'cat-pc-2b2b',
    category: 'POST_CONSTRUCTION',
    categoryLabel: 'MoveIn - Post Construction',
    name: '2Bed 2Bath MoveIn - Post Construction Cleaning',
    shortName: '2Bed 2Bath MoveIn - Post Construction',
    serviceType: 'Post-Construction Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '2 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3.5,
    unitPrice: 115,
    total: 402.5,
    basePrice: 402.5,
    baseHours: 3.5,
    cleanersCount: 2,
    depositRequired: 150,
    taxable: true,
    jobberItemName: '2Bed 2Bath MoveIn - Post Construction Cleaning',
    description: 'Fine drywall dust wipe down, inside drawers, sticker removal, vacuuming track crevices, sanitized fixtures for new move-in.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 250,
  },
  {
    id: 'cat-pc-3b25b',
    category: 'POST_CONSTRUCTION',
    categoryLabel: 'MoveIn - Post Construction',
    name: 'MoveIn - Post Construction Cleaning (3 Bed / 2.5 Bath)',
    shortName: 'MoveIn - Post Construction (3 Bed / 2.5 Bath)',
    serviceType: 'Post-Construction Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2.5 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2.5 Bathrooms',
    quantity: 4,
    unitPrice: 115,
    total: 460,
    basePrice: 460,
    baseHours: 4,
    cleanersCount: 2,
    depositRequired: 150,
    taxable: true,
    jobberItemName: 'MoveIn - Post Construction Cleaning (3 Bed / 2.5 Bath)',
    description: 'Comprehensive post-construction detailing. Drywall dust extraction, fixtures polishing, window sill vacuuming, and floor scrub.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 260,
  },
  {
    id: 'cat-pc-4b3b',
    category: 'POST_CONSTRUCTION',
    categoryLabel: 'MoveIn - Post Construction',
    name: '4Bed 3Bath MoveIn - Post Construction Cleaning',
    shortName: '4Bed 3Bath MoveIn - Post Construction',
    serviceType: 'Post-Construction Cleaning',
    bedrooms: '4 Bedrooms',
    bathrooms: '3 Bathrooms',
    beds: '4 Bedrooms',
    baths: '3 Bathrooms',
    quantity: 5,
    unitPrice: 115,
    total: 575,
    basePrice: 575,
    baseHours: 5,
    cleanersCount: 2,
    depositRequired: 150,
    taxable: true,
    jobberItemName: '4Bed 3Bath MoveIn - Post Construction Cleaning',
    description: 'Full new build or renovation detailed turnover. Multiple full bathrooms, kitchen millwork wipe down, baseboards, floor wash.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 270,
  },

  // ── 5. BI-WEEKLY RECURRING RESIDENTIAL CLEAN ──
  {
    id: 'cat-rec-biweekly-2b',
    category: 'RECURRING',
    categoryLabel: 'Bi-Weekly Recurring Residential Clean',
    name: 'Bi-Weekly Maintenance Clean (2 Bed / 2 Bath)',
    shortName: 'Bi-Weekly Maintenance Clean (2 Bed / 2 Bath)',
    serviceType: 'Recurring Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '2 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 2,
    unitPrice: 98,
    total: 196,
    basePrice: 196,
    baseHours: 2,
    cleanersCount: 2,
    depositRequired: 50,
    taxable: true,
    jobberItemName: 'Bi-Weekly Maintenance Clean (2 Bed / 2 Bath)',
    description: 'Recurring bi-weekly maintenance cleaning. Consistent cleaner assigned, high priority rotation, automatic card-on-file billing.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 280,
  },
  {
    id: 'cat-rec-biweekly-3b',
    category: 'RECURRING',
    categoryLabel: 'Bi-Weekly Recurring Residential Clean',
    name: 'Bi-Weekly Maintenance Clean (3 Bed / 2.5 Bath)',
    shortName: 'Bi-Weekly Maintenance Clean (3 Bed / 2.5 Bath)',
    serviceType: 'Recurring Cleaning',
    bedrooms: '3 Bedrooms',
    bathrooms: '2.5 Bathrooms',
    beds: '3 Bedrooms',
    baths: '2.5 Bathrooms',
    quantity: 2.5,
    unitPrice: 98,
    total: 245,
    basePrice: 245,
    baseHours: 2.5,
    cleanersCount: 2,
    depositRequired: 50,
    taxable: true,
    jobberItemName: 'Bi-Weekly Maintenance Clean (3 Bed / 2.5 Bath)',
    description: 'Bi-weekly scheduled home maintenance. 3 bedrooms, 2.5 bathrooms, kitchen scrub, vacuuming, mopping, trash removal.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 290,
  },
  {
    id: 'cat-rec-biweekly-4b',
    category: 'RECURRING',
    categoryLabel: 'Bi-Weekly Recurring Residential Clean',
    name: 'Bi-Weekly Maintenance Clean (4 Bed / 3 Bath)',
    shortName: 'Bi-Weekly Maintenance Clean (4 Bed / 3 Bath)',
    serviceType: 'Recurring Cleaning',
    bedrooms: '4 Bedrooms',
    bathrooms: '3 Bathrooms',
    beds: '4 Bedrooms',
    baths: '3 Bathrooms',
    quantity: 3,
    unitPrice: 98,
    total: 294,
    basePrice: 294,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Bi-Weekly Maintenance Clean (4 Bed / 3 Bath) (2 Cleaners)',
    description: 'Regular recurring bi-weekly home detail for 4 Bed / 3 Bath property. Full sanitization and maintenance.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 300,
  },
  {
    id: 'cat-mo-2b2b-online',
    category: 'MOVE_OUT',
    categoryLabel: 'Move-Out Cleaning 2026',
    name: '2Bed 2Bath Moveout Cleaning - Online Booking',
    shortName: '2Bed 2Bath Moveout - Online Booking',
    serviceType: 'Move-Out Cleaning',
    bedrooms: '2 Bedrooms',
    bathrooms: '2 Bathrooms',
    beds: '2 Bedrooms',
    baths: '2 Bathrooms',
    quantity: 3,
    unitPrice: 105,
    total: 315,
    basePrice: 315,
    baseHours: 3,
    cleanersCount: 2,
    depositRequired: 100,
    taxable: true,
    jobberItemName: '2Bed 2Bath Moveout Cleaning - Online Booking (2 Cleaners)',
    description: '2Bed 2Bath Moveout Cleaning - Online Booking (2 Cleaners) - 2 Cleaners (3 x $105.00) = $315.00 CAD | 2 Bedrooms, 2 Bathrooms',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 305,
  },

  // ── 6. HOURLY CREW RATES ──
  {
    id: 'cat-hr-1cleaner',
    category: 'HOURLY',
    categoryLabel: 'Hourly Crew Rates',
    name: 'Standard Hourly Rate (1 Cleaner @ $52.50/hr)',
    shortName: '1 Cleaner @ $52.50/hr',
    serviceType: 'Standard Cleaning',
    quantity: 1,
    unitPrice: 52.5,
    total: 52.5,
    basePrice: 52.5,
    baseHours: 1,
    cleanersCount: 1,
    depositRequired: 50,
    taxable: true,
    jobberItemName: 'Standard Hourly Rate (1 Cleaner @ $52.50/hr)',
    description: 'Billed per labor hour for 1 professional cleaner with all eco-friendly supplies and commercial vacuum equipment.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 310,
  },
  {
    id: 'cat-hr-2cleaners',
    category: 'HOURLY',
    categoryLabel: 'Hourly Crew Rates',
    name: 'Tandem Crew Rate (2 Cleaners @ $105.00/hr)',
    shortName: '2 Cleaners @ $105.00/hr',
    serviceType: 'Deep Cleaning',
    quantity: 1,
    unitPrice: 105,
    total: 105,
    basePrice: 105,
    baseHours: 1,
    cleanersCount: 2,
    depositRequired: 50,
    taxable: true,
    jobberItemName: 'Tandem Crew Rate (2 Cleaners @ $105.00/hr)',
    description: 'Billed per clock hour for a 2-cleaner tandem crew (provides 2 person-hours per clock hour of service).',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 320,
  },

  // ── 7. ADD-ON SERVICES ──
  {
    id: 'addon-oven',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Inside Oven Deep Cleaning',
    shortName: 'Inside Oven',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 45,
    total: 45,
    basePrice: 45,
    baseHours: 0.75,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Inside Oven Deep Cleaning',
    description: 'Degrease and scrub inside of oven, racks, interior glass door, and bottom heating elements.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 400,
  },
  {
    id: 'addon-fridge',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Inside Refrigerator & Freezer Deep Clean',
    shortName: 'Inside Fridge',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 45,
    total: 45,
    basePrice: 45,
    baseHours: 0.75,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Inside Refrigerator & Freezer Deep Clean',
    description: 'Remove shelves & crispers, wash, sanitize interior walls, wipe seals, and replace items neatly.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 410,
  },
  {
    id: 'addon-cabinets',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Inside Kitchen Cabinets & Drawers Detail',
    shortName: 'Inside Cabinets',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 55,
    total: 55,
    basePrice: 55,
    baseHours: 1,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Inside Kitchen Cabinets & Drawers Detail',
    description: 'Vacuum crumbs and wipe down inside shelves and drawers throughout the kitchen.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 420,
  },
  {
    id: 'addon-baseboards',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Baseboards Hand-Scrub & Detail',
    shortName: 'Baseboards Detail',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 60,
    total: 60,
    basePrice: 60,
    baseHours: 1,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Baseboards Hand-Scrub & Detail',
    description: 'Detailed hand wipe and scrub of baseboards throughout the entire home to remove scuffs and dust.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 430,
  },
  {
    id: 'addon-windows',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Interior Windows & Tracks (Up to 10 Panes)',
    shortName: 'Interior Windows',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 50,
    total: 50,
    basePrice: 50,
    baseHours: 1,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Interior Windows & Tracks (Up to 10 Panes)',
    description: 'Squeegee and polish interior window glass, vacuum and wipe window tracks and sills.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 440,
  },
  {
    id: 'addon-basement-living',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Finished Basement Living Area',
    shortName: 'Basement Area',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 85,
    total: 85,
    basePrice: 85,
    baseHours: 1.5,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Finished Basement Living Area',
    description: 'Clean finished basement family room, rec space, dust surfaces, vacuum carpets, and mop hard floors.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 450,
  },
  {
    id: 'addon-basement-suite',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Full Basement Suite (Kitchenette + Bath)',
    shortName: 'Basement Suite',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 125,
    total: 125,
    basePrice: 125,
    baseHours: 2,
    cleanersCount: 1,
    depositRequired: 25,
    taxable: true,
    jobberItemName: 'Full Basement Suite (Kitchenette + Bath)',
    description: 'Complete clean of basement rental or mother-in-law suite including kitchen/wet bar and full bathroom.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 460,
  },
  {
    id: 'addon-pet-hair',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Pet Hair & Heavy Dander Detail Treatment',
    shortName: 'Pet Hair Detail',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 35,
    total: 35,
    basePrice: 35,
    baseHours: 0.5,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Pet Hair & Heavy Dander Detail Treatment',
    description: 'Specialized rubber squeegee carpet raking and pet-safe botanical enzyme sanitizer application.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 470,
  },
  {
    id: 'addon-blinds',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Blinds Hand-Dusting & Wipe (Per Room)',
    shortName: 'Blinds Detail',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 40,
    total: 40,
    basePrice: 40,
    baseHours: 0.5,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Blinds Hand-Dusting & Wipe (Per Room)',
    description: 'Hand dusting and microfiber wiping of horizontal slats on faux-wood or vinyl window blinds.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 480,
  },
  {
    id: 'addon-balcony',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Balcony / Patio Sweep & Glass Clean',
    shortName: 'Balcony Sweep',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 35,
    total: 35,
    basePrice: 35,
    baseHours: 0.5,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Balcony / Patio Sweep & Glass Clean',
    description: 'Sweep exterior debris, wipe railings, and clean exterior of sliding patio glass doors.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 490,
  },
  {
    id: 'addon-fuel',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Fuel & Greater Edmonton Dispatch Surcharge',
    shortName: 'Fuel Surcharge',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 7.5,
    total: 7.5,
    basePrice: 7.5,
    baseHours: 1,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Fuel & Greater Edmonton Dispatch Surcharge',
    description: 'Standard mobile van deployment, transit insurance, and equipment sanitization fee.',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 500,
  },
  {
    id: 'addon-fuel-2',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Fuel Surcharge 2',
    shortName: 'Fuel Surcharge 2',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: 12.5,
    total: 12.5,
    basePrice: 12.5,
    baseHours: 1,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Fuel Surcharge 2',
    description: 'Fuel Surcharge 2 - Tidyups Cleaning Service',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 505,
  },
  {
    id: 'addon-discount-10',
    category: 'ADD_ON',
    categoryLabel: 'Add-on Services',
    name: 'Discount $10 Facebook Ad',
    shortName: 'Discount $10 Facebook Ad',
    serviceType: 'Add-on',
    quantity: 1,
    unitPrice: -10,
    total: -10,
    basePrice: -10,
    baseHours: 1,
    cleanersCount: 1,
    depositRequired: 0,
    taxable: true,
    jobberItemName: 'Discount $10 Facebook Ad',
    description: 'Discount $10 Facebook Ad - Tidyups Cleaning Service',
    isAddon: true,
    status: 'Active',
    isActive: true,
    sortOrder: 510,
  },
];

/**
 * Repairs and normalizes any catalog item array so no item ever has missing quantity, unitPrice, total, or cleanersCount.
 */
export function normalizeAndRepairCatalogItems(
  rawItems: any[] | undefined | null
): ServiceCatalogItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return [...CANONICAL_SERVICE_CATALOG];
  }

  const mapped = rawItems.map((raw, idx) => {
    const canonicalMatch = CANONICAL_SERVICE_CATALOG.find(
      (c) =>
        c.id === raw.id ||
        (raw.name && c.name.toLowerCase() === String(raw.name).replace(/\s*\([123]\s*Cleaners?\)\s*$/i, '').trim().toLowerCase())
    );

    const isAddon =
      raw.isAddon !== undefined
        ? Boolean(raw.isAddon)
        : raw.category === 'ADD_ON' || Boolean(canonicalMatch?.isAddon);

    const cleanersCount = Math.max(
      1,
      Number(raw.cleanersCount ?? canonicalMatch?.cleanersCount ?? (isAddon ? 1 : 2)) || 1
    );

    let quantity =
      raw.quantity !== undefined && raw.quantity !== null && !isNaN(Number(raw.quantity))
        ? Number(raw.quantity)
        : canonicalMatch?.quantity !== undefined
        ? canonicalMatch.quantity
        : raw.baseHours !== undefined && !isNaN(Number(raw.baseHours))
        ? Number(raw.baseHours)
        : 1;

    let unitPrice =
      raw.unitPrice !== undefined && raw.unitPrice !== null && !isNaN(Number(raw.unitPrice))
        ? Number(raw.unitPrice)
        : canonicalMatch?.unitPrice !== undefined
        ? canonicalMatch.unitPrice
        : raw.basePrice !== undefined && !isNaN(Number(raw.basePrice))
        ? quantity > 0
          ? Math.round((Number(raw.basePrice) / quantity) * 100) / 100
          : Number(raw.basePrice)
        : 105;

    let total =
      raw.total !== undefined && raw.total !== null && !isNaN(Number(raw.total))
        ? Number(raw.total)
        : Math.round(quantity * unitPrice * 100) / 100;

    const isHourly =
      raw.category === 'HOURLY' ||
      canonicalMatch?.category === 'HOURLY' ||
      /Hourly Rate|Crew Rate/i.test(String(raw.name || ''));

    const stripSuffix = (name: string) =>
      (name || '')
        .replace(/\s*\([123]\s*Cleaners?[^)]*\)\s*$/i, '')
        .replace(/\s*-\s*[123]\s*Cleaners?\s*$/i, '')
        .trim();

    const baseName =
      isAddon || isHourly
        ? String(raw.name || canonicalMatch?.name || `Service Item ${idx + 1}`).trim()
        : stripSuffix(String(raw.name || canonicalMatch?.name || `Service Item ${idx + 1}`));

    const crewLabel = cleanersCount === 1 ? '1 Cleaner' : `${cleanersCount} Cleaners`;
    const exactJobberName =
      isAddon || isHourly ? baseName : `${baseName} (${crewLabel})`;

    return {
      ...(canonicalMatch || {}),
      ...raw,
      id: raw.id || canonicalMatch?.id || `cat-item-${idx + 1}`,
      name: baseName,
      shortName:
        raw.shortName ||
        canonicalMatch?.shortName ||
        (baseName ? String(baseName).slice(0, 35) : `Item ${idx + 1}`),
      category: isHourly
        ? 'HOURLY'
        : isAddon
        ? 'ADD_ON'
        : raw.category || canonicalMatch?.category || 'MOVE_OUT',
      categoryLabel:
        raw.categoryLabel || canonicalMatch?.categoryLabel || raw.category || 'Move-Out Cleaning 2026',
      serviceType: raw.serviceType || canonicalMatch?.serviceType || 'Move-Out Cleaning',
      bedrooms: raw.bedrooms ?? raw.beds ?? canonicalMatch?.bedrooms,
      bathrooms: raw.bathrooms ?? raw.baths ?? canonicalMatch?.bathrooms,
      beds: raw.beds ?? raw.bedrooms ?? canonicalMatch?.beds,
      baths: raw.baths ?? raw.bathrooms ?? canonicalMatch?.baths,
      cleanersCount,
      quantity,
      unitPrice,
      total,
      basePrice: total,
      baseHours: quantity,
      depositRequired:
        raw.depositRequired !== undefined
          ? Number(raw.depositRequired)
          : canonicalMatch?.depositRequired ?? 50,
      taxable: true,
      jobberItemName: exactJobberName,
      description:
        raw.description ||
        canonicalMatch?.description ||
        `${exactJobberName} - ${crewLabel} (${quantity} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)} CAD`,
      isAddon,
      status: raw.status || 'Active',
      isActive: raw.isActive !== false,
      sortOrder: canonicalMatch?.sortOrder ?? raw.sortOrder ?? (idx + 1) * 10,
    } as ServiceCatalogItem;
  });

  // Ensure all 46 canonical base items exist so 1, 2 & 3 Cleaners expansion always matches all 108 Jobber items
  const existingNames = new Set(mapped.map((m) => m.name.toLowerCase()));
  for (const canon of CANONICAL_SERVICE_CATALOG) {
    if (!existingNames.has(canon.name.toLowerCase())) {
      mapped.push({ ...canon, taxable: true });
      existingNames.add(canon.name.toLowerCase());
    }
  }

  return mapped.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
}

/**
 * Generates an Excel (.xlsx) or CSV buffer/string from a ServiceCatalogItem[] list
 * formatted specifically for Google Sheets & Jobber import/export.
 * Formula: Number of Cleaners ( QTY × Unit Price ) = Total
 */
export function generatePriceListSheetRows(
  catalog: ServiceCatalogItem[],
  forceCleanersCount?: number
) {
  const normalized = normalizeAndRepairCatalogItems(catalog);
  const headers = [
    'SERVICE NAME/JOBBER LINE ITEM',
    'DESCRIPTION',
    'CATEGORY',
    'BEDS',
    'BATHS',
    'NUMBER OF CLEANERS',
    'QUANTITY',
    'UNIT PRICE (CAD)',
    'TOTAL (CAD)',
    'TAXABLE',
    'FORMULA: NUMBER OF CLEANERS (QTY x UNIT PRICE) = TOTAL',
    '1 CLEANER EQUIVALENT (QTY x $52.50)',
    '2 CLEANERS EQUIVALENT (QTY x $105.00)',
    '3 CLEANERS EQUIVALENT (QTY x $157.50)',
    'DEPOSIT REQUIRED (CAD)',
    'STATUS',
    'ACTIVE?',
  ];

  const rows = normalized.map((rawItem) => {
    const item =
      forceCleanersCount && !rawItem.isAddon
        ? {
            ...rawItem,
            ...convertItemForCleanersCount(rawItem, forceCleanersCount),
          }
        : rawItem;

    const cleaners = Math.max(1, Number(item.cleanersCount) || 1);
    const qty = Number(item.quantity ?? item.baseHours ?? 1);
    const unitPrice = Number(item.unitPrice ?? item.basePrice ?? 0);
    const total = Number(item.total ?? Math.round(qty * unitPrice * 100) / 100);
    const isTaxableStr = item.taxable !== false ? 'true' : 'false';

    const oneCleanerConv = convertItemForCleanersCount(item, 1);
    const twoCleanersConv = convertItemForCleanersCount(item, 2);
    const threeCleanersConv = convertItemForCleanersCount(item, 3);

    const activeFormulaStr = item.isAddon
      ? `1 Add-on (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`
      : `${cleaners} Cleaner${cleaners > 1 ? 's' : ''} (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`;

    const oneCleanerStr = item.isAddon
      ? `1 (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`
      : `1 Cleaner (${oneCleanerConv.quantity} x $${oneCleanerConv.unitPrice.toFixed(2)}) = $${oneCleanerConv.total.toFixed(2)}`;

    const twoCleanersStr = item.isAddon
      ? `1 (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`
      : `2 Cleaners (${twoCleanersConv.quantity} x $${twoCleanersConv.unitPrice.toFixed(2)}) = $${twoCleanersConv.total.toFixed(2)}`;

    const threeCleanersStr = item.isAddon
      ? `1 (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`
      : `3 Cleaners (${threeCleanersConv.quantity} x $${threeCleanersConv.unitPrice.toFixed(2)}) = $${threeCleanersConv.total.toFixed(2)}`;

    return [
      item.name,
      item.description || `${item.name} — ${activeFormulaStr}`,
      item.categoryLabel || item.category,
      item.bedrooms || item.beds || '',
      item.bathrooms || item.baths || '',
      cleaners,
      qty,
      Number(unitPrice.toFixed(2)),
      Number(total.toFixed(2)),
      isTaxableStr,
      activeFormulaStr,
      oneCleanerStr,
      twoCleanersStr,
      threeCleanersStr,
      Number((item.depositRequired || 0).toFixed(2)),
      item.status || (item.isActive !== false ? 'Active' : 'Draft'),
      item.isActive !== false ? 'Yes' : 'No',
    ];
  });

  return { headers, rows };
}

/**
 * Expands the catalog into a single unified list containing:
 * 1) All residential services for 1 Cleaner ($52.50/hr) at the top
 * 2) All residential services for 2 Cleaners ($105.00/hr) lower down
 * 3) All residential services for 3 Cleaners ($157.50/hr) lower down again
 * 4) All Add-on & Hourly items
 * Every item has taxable = true so Jobber and TidyUps share the exact same single-page price list.
 */
export function generateCombinedAllCleanersCatalog(
  catalog: ServiceCatalogItem[]
): ServiceCatalogItem[] {
  const normalized = normalizeAndRepairCatalogItems(catalog);
  const stripCleanerSuffix = (name: string) =>
    (name || '')
      .replace(/\s*\([123]\s*Cleaners?[^)]*\)\s*$/i, '')
      .replace(/\s*-\s*[123]\s*Cleaners?\s*$/i, '')
      .trim();

  const isHourlyOrAddonItem = (item: ServiceCatalogItem) =>
    Boolean(
      item.isAddon ||
        item.category === 'ADD_ON' ||
        item.category === 'HOURLY' ||
        /Hourly Rate|Crew Rate/i.test(item.name || '')
    );

  // Deduplicate residential items by stripped base name so even if an expanded 108-item catalog is passed,
  // we always expand the 31 unique residential packages into 93 items + 15 hourly/add-ons = 108 items.
  const residentialMap = new Map<string, ServiceCatalogItem>();
  for (const item of normalized) {
    if (isHourlyOrAddonItem(item)) continue;
    const baseKey = stripCleanerSuffix(item.name).toLowerCase();
    const existing = residentialMap.get(baseKey);
    if (!existing || item.cleanersCount === 2) {
      residentialMap.set(baseKey, {
        ...item,
        name: stripCleanerSuffix(item.name),
      });
    }
  }
  const residentialItems = Array.from(residentialMap.values());

  const addonMap = new Map<string, ServiceCatalogItem>();
  for (const item of normalized) {
    if (!isHourlyOrAddonItem(item)) continue;
    const key = (item.name || '').trim().toLowerCase();
    if (!addonMap.has(key)) {
      addonMap.set(key, item);
    }
  }
  const addonAndHourlyItems = Array.from(addonMap.values());

  const buildForCrew = (crewCount: 1 | 2 | 3): ServiceCatalogItem[] => {
    return residentialItems.map((baseItem, idx) => {
      const conv = convertItemForCleanersCount(baseItem, crewCount);
      const cleanBaseName = stripCleanerSuffix(baseItem.name);
      const crewLabel = crewCount === 1 ? '1 Cleaner' : `${crewCount} Cleaners`;
      const fullName = `${cleanBaseName} (${crewLabel})`;
      const bedsBaths = [baseItem.bedrooms || baseItem.beds, baseItem.bathrooms || baseItem.baths]
        .filter(Boolean)
        .join(', ');
      const exactDesc = `${fullName} - ${crewLabel} (${conv.quantity} x $${conv.unitPrice.toFixed(2)}) = $${conv.total.toFixed(2)} CAD${
        bedsBaths ? ` | ${bedsBaths}` : ''
      }`;
      return {
        ...baseItem,
        id: `${baseItem.id}-crew-${crewCount}`,
        name: fullName,
        shortName: fullName.length > 42 ? `${fullName.slice(0, 39)}...` : fullName,
        jobberItemName: fullName,
        cleanersCount: crewCount,
        quantity: conv.quantity,
        unitPrice: conv.unitPrice,
        total: conv.total,
        baseHours: conv.quantity,
        basePrice: conv.total,
        taxable: true,
        description: exactDesc,
        sortOrder: crewCount * 1000 + (idx + 1) * 10,
      };
    });
  };

  const oneCleanerSection = buildForCrew(1);
  const twoCleanersSection = buildForCrew(2);
  const threeCleanersSection = buildForCrew(3);
  const addonsSection = addonAndHourlyItems.map((item, idx) => {
    let cleanDesc = item.description || `${item.name} - Tidyups Cleaning Service`;
    cleanDesc = cleanDesc
      .replace(/—/g, '-')
      .replace(/Tidyups Cleaning Service$/, (m, offset, str) => {
        const before = str.slice(0, offset);
        if (before && !before.endsWith(' - ') && !before.endsWith(' ')) {
          return ' - Tidyups Cleaning Service';
        }
        return m;
      });
    return {
      ...item,
      jobberItemName: item.name,
      description: cleanDesc,
      taxable: true,
      sortOrder: 4000 + (idx + 1) * 10,
    };
  });

  return [
    ...oneCleanerSection,
    ...twoCleanersSection,
    ...threeCleanersSection,
    ...addonsSection,
  ];
}

/**
 * Generates the exact 6-column Jobber Products & Services import structure
 * matching jobber-products-services-import.csv (all 108 items):
 * Columns: Name, Description, Unit Price, Taxable, Category, Active
 * - Unit Price: plain number with 2 decimals (e.g. "52.50", "105.00", "-10.00")
 * - Taxable: "TRUE" or "FALSE"
 * - Category: "Service" or "Product"
 * - Active: "TRUE" or "FALSE"
 */
export function generateJobberMasterSinglePageSheetRows(
  catalog: ServiceCatalogItem[]
) {
  const combinedItems = generateCombinedAllCleanersCatalog(catalog);
  const headers = ['Name', 'Description', 'Unit Price', 'Taxable', 'Category', 'Active'];
  const rows = combinedItems.map((item) => [
    item.name,
    item.description || `${item.name} - Tidyups Cleaning Service`,
    Number(item.unitPrice ?? 0).toFixed(2),
    item.taxable !== false ? 'TRUE' : 'FALSE',
    'Service',
    item.isActive !== false ? 'TRUE' : 'FALSE',
  ]);
  return { headers, rows };
}

/**
 * Generates the exact quoted CSV string for Jobber Products & Services import (108 items)
 */
export function generateExactJobberImportCsvString(
  catalog: ServiceCatalogItem[]
): string {
  const { headers, rows } = generateJobberMasterSinglePageSheetRows(catalog);
  const escapeCsvCell = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');
}

/**
 * Builds a single-sheet XLSX WorkBook with the exact 6 Jobber columns
 * (Name, Description, Unit Price, Taxable, Category, Active) for all 108 items.
 */
export function buildPriceListWorkbook(catalog: ServiceCatalogItem[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const colWidths = [
    { wch: 56 }, // Name
    { wch: 96 }, // Description
    { wch: 14 }, // Unit Price
    { wch: 12 }, // Taxable
    { wch: 14 }, // Category
    { wch: 12 }, // Active
  ];

  const { headers, rows } = generateJobberMasterSinglePageSheetRows(catalog);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, 'Jobber Products & Services');

  return wb;
}

/**
 * Parses spreadsheet array buffer (Excel .xlsx, .xls, .csv, .tsv) using SheetJS XLSX
 */
export function parseSpreadsheetBuffer(buffer: ArrayBuffer | Uint8Array): {
  headers: string[];
  rows: any[][];
  rawText: string;
} {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const rawText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
  const headers = rows.length > 0 ? rows[0].map((h) => String(h || '').trim()) : [];
  return { headers, rows, rawText };
}

/**
 * Parses user price list text, CSV, TSV, or spreadsheet rows.
 * Supports:
 * SERVICE NAME/JOBBER LINE ITEM | CATEGORY | BEDS | BATHS | [NUMBER OF CLEANERS] | QUANTITY | UNIT PRICE (CAD) | TOTAL (CAD) | STATUS | ACTIVE?
 */
export function parsePastedPriceList(
  input: string | any[][],
  _existingCatalog: ServiceCatalogItem[] = CANONICAL_SERVICE_CATALOG
): ServiceCatalogItem[] {
  let rawRows: string[][] = [];

  if (Array.isArray(input)) {
    rawRows = input
      .filter((r) => Array.isArray(r) && r.some((c) => String(c || '').trim().length > 0))
      .map((r) => r.map((c) => String(c ?? '').trim()));
  } else if (typeof input === 'string') {
    const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const splitCsvLine = (lineStr: string): string[] => {
      const cells: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < lineStr.length; i++) {
        const ch = lineStr[i];
        if (inQuotes) {
          if (ch === '"' && lineStr[i + 1] === '"') {
            cur += '"';
            i++;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            cur += ch;
          }
        } else {
          if (ch === '"') {
            inQuotes = true;
          } else if (ch === ',') {
            cells.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
      }
      cells.push(cur.trim());
      return cells;
    };

    for (const line of lines) {
      if (line.includes('\t')) {
        rawRows.push(line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, '')));
      } else if (line.includes(',')) {
        rawRows.push(splitCsvLine(line));
      } else {
        rawRows.push([line]);
      }
    }
  }

  if (rawRows.length === 0) return [];

  let headerIndex = -1;
  let colServiceName = 0;
  let colDescription = -1;
  let colCategory = -1;
  let colBeds = -1;
  let colBaths = -1;
  let colCleaners = -1;
  let colQuantity = -1;
  let colUnitPrice = -1;
  let colTotal = -1;
  let colTaxable = -1;
  let colDeposit = -1;
  let colStatus = -1;
  let colActive = -1;

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r];
    const joined = row.join(' ').toLowerCase();
    if (
      joined.includes('service') ||
      joined.includes('name') ||
      joined.includes('item') ||
      joined.includes('unit price') ||
      joined.includes('quantity') ||
      joined.includes('total') ||
      joined.includes('category')
    ) {
      headerIndex = r;
      row.forEach((col, idx) => {
        const c = col.toLowerCase().trim();
        if (/service\s*name|jobber\s*line\s*item|line\s*item|^service$|^name$/i.test(c)) {
          colServiceName = idx;
        } else if (/^description$|^desc$/i.test(c)) {
          colDescription = idx;
        } else if (/category|cat|^type$/i.test(c)) {
          colCategory = idx;
        } else if (/^beds?$|bedroom/i.test(c)) {
          colBeds = idx;
        } else if (/^baths?$|bathroom/i.test(c)) {
          colBaths = idx;
        } else if (/cleaner|crew/i.test(c) && !c.includes('equivalent') && !c.includes('formula')) {
          colCleaners = idx;
        } else if (/^quantity$|^qty$|^units$|^hours$/i.test(c)) {
          colQuantity = idx;
        } else if (/unit\s*price|rate|price\/hr|unit_price/i.test(c)) {
          colUnitPrice = idx;
        } else if (/^total|total\s*\(cad\)|total_price/i.test(c)) {
          colTotal = idx;
        } else if (/^taxable$/i.test(c)) {
          colTaxable = idx;
        } else if (/deposit/i.test(c)) {
          colDeposit = idx;
        } else if (/^status$/i.test(c)) {
          colStatus = idx;
        } else if (/active|active\?|is_active/i.test(c)) {
          colActive = idx;
        }
      });
      break;
    }
  }

  const dataRows = headerIndex !== -1 ? rawRows.slice(headerIndex + 1) : rawRows;
  const items: ServiceCatalogItem[] = [];

  let currentCategory: ServiceCatalogItem['category'] = 'MOVE_OUT';
  let currentCategoryLabel = 'Move-Out Cleaning 2026';

  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    const firstCell = String(row[0] || '').trim();
    if (!firstCell) return;

    if (row.length === 1 && (firstCell.startsWith('#') || firstCell.endsWith(':') || firstCell.toUpperCase() === firstCell)) {
      const cleanHeader = firstCell.toLowerCase();
      if (cleanHeader.includes('move') || cleanHeader.includes('turnover')) {
        currentCategory = 'MOVE_OUT';
        currentCategoryLabel = 'Move-Out Cleaning 2026';
      } else if (cleanHeader.includes('deep')) {
        currentCategory = 'DEEP_CLEAN';
        currentCategoryLabel = 'Deep Cleaning Services 2026';
      } else if (cleanHeader.includes('post') || cleanHeader.includes('construction')) {
        currentCategory = 'POST_CONSTRUCTION';
        currentCategoryLabel = 'MoveIn - Post Construction';
      } else if (cleanHeader.includes('add') || cleanHeader.includes('surcharge')) {
        currentCategory = 'ADD_ON';
        currentCategoryLabel = 'Add-on Services';
      } else if (cleanHeader.includes('hour') || cleanHeader.includes('rate')) {
        currentCategory = 'HOURLY';
        currentCategoryLabel = 'Hourly Crew Rates';
      } else if (cleanHeader.includes('recur') || cleanHeader.includes('bi-weekly')) {
        currentCategory = 'RECURRING';
        currentCategoryLabel = 'Bi-Weekly Recurring Residential Clean';
      }
      return;
    }

    let serviceName = '';
    let descriptionStr = '';
    let categoryStr = '';
    let bedsStr = '';
    let bathsStr = '';
    let cleanersNum: number | undefined;
    let quantityNum: number | undefined;
    let unitPriceNum: number | undefined;
    let totalNum: number | undefined;
    let taxableBool = true;
    let depositNum: number | undefined;
    let statusStr = 'Active';
    let isActiveBool = true;

    if (headerIndex !== -1) {
      serviceName = (row[colServiceName] || '').trim();
      if (colDescription !== -1 && row[colDescription]) descriptionStr = row[colDescription].trim();
      if (colCategory !== -1 && row[colCategory]) categoryStr = row[colCategory].trim();
      if (colBeds !== -1 && row[colBeds]) bedsStr = row[colBeds].trim();
      if (colBaths !== -1 && row[colBaths]) bathsStr = row[colBaths].trim();
      if (colCleaners !== -1 && row[colCleaners]) {
        const cParsed = parseInt(String(row[colCleaners]).replace(/[^\d]/g, ''), 10);
        if (!isNaN(cParsed) && cParsed > 0) cleanersNum = cParsed;
      }
      if (colQuantity !== -1 && row[colQuantity]) {
        const qParsed = parseFloat(String(row[colQuantity]).replace(/[^\d.-]/g, ''));
        if (!isNaN(qParsed)) quantityNum = qParsed;
      }
      if (colUnitPrice !== -1 && row[colUnitPrice]) {
        const upParsed = parseFloat(String(row[colUnitPrice]).replace(/[^\d.-]/g, ''));
        if (!isNaN(upParsed)) unitPriceNum = upParsed;
      }
      if (colTotal !== -1 && row[colTotal]) {
        const tParsed = parseFloat(String(row[colTotal]).replace(/[^\d.-]/g, ''));
        if (!isNaN(tParsed)) totalNum = tParsed;
      }
      if (colTaxable !== -1 && row[colTaxable]) {
        const txVal = row[colTaxable].toLowerCase().trim();
        taxableBool = txVal !== 'false' && txVal !== 'no' && txVal !== '0';
      }
      if (colDeposit !== -1 && row[colDeposit]) {
        const dParsed = parseFloat(String(row[colDeposit]).replace(/[^\d.-]/g, ''));
        if (!isNaN(dParsed)) depositNum = dParsed;
      }
      if (colStatus !== -1 && row[colStatus]) statusStr = row[colStatus].trim();
      if (colActive !== -1 && row[colActive]) {
        const aVal = row[colActive].toLowerCase().trim();
        isActiveBool = aVal === 'yes' || aVal === 'true' || aVal === '1' || aVal === 'y';
      }
    } else if (row.length >= 4) {
      serviceName = row[0].trim();
      categoryStr = row[1]?.trim() || '';
      bedsStr = row[2]?.trim() || '';
      bathsStr = row[3]?.trim() || '';
      if (row[4]) {
        const qp = parseFloat(String(row[4]).replace(/[^\d.-]/g, ''));
        if (!isNaN(qp)) quantityNum = qp;
      }
      if (row[5]) {
        const upp = parseFloat(String(row[5]).replace(/[^\d.-]/g, ''));
        if (!isNaN(upp)) unitPriceNum = upp;
      }
      if (row[6]) {
        const tp = parseFloat(String(row[6]).replace(/[^\d.-]/g, ''));
        if (!isNaN(tp)) totalNum = tp;
      }
    } else {
      serviceName = row[0].trim();
      if (row[1]) {
        const p1 = parseFloat(String(row[1]).replace(/[^\d.-]/g, ''));
        if (!isNaN(p1)) totalNum = p1;
      }
      if (row[2]) {
        const p2 = parseFloat(String(row[2]).replace(/[^\d.-]/g, ''));
        if (!isNaN(p2)) quantityNum = p2;
      }
    }

    // Extract formula & crew count from Jobber 6-column CSV Description if present:
    // e.g. "1Bed 1Bath Moveout Cleaning 2026 (1 Cleaner) - 1 Cleaner (6 x $52.50) = $315.00 CAD | 1 Bedroom, 1 Bathroom"
    const nameCrewMatch = serviceName.match(/\((\d+)\s*Cleaners?\)\s*$/i);
    if (nameCrewMatch && cleanersNum === undefined) {
      cleanersNum = parseInt(nameCrewMatch[1], 10);
    }
    if (descriptionStr) {
      const formulaMatch = descriptionStr.match(
        /(\d+)\s*Cleaners?\s*\(\s*(\d+(?:\.\d+)?)\s*[x×]\s*\$(-?\d+(?:\.\d+)?)\s*\)\s*=\s*\$(-?\d+(?:\.\d+)?)/i
      );
      if (formulaMatch) {
        if (cleanersNum === undefined) cleanersNum = parseInt(formulaMatch[1], 10);
        if (quantityNum === undefined) quantityNum = parseFloat(formulaMatch[2]);
        if (unitPriceNum === undefined) unitPriceNum = parseFloat(formulaMatch[3]);
        if (totalNum === undefined) totalNum = parseFloat(formulaMatch[4]);
      }
      const pipeMatch = descriptionStr.split('|')[1];
      if (pipeMatch) {
        const parts = pipeMatch.split(',').map((s) => s.trim());
        if (!bedsStr && parts[0]) bedsStr = parts[0];
        if (!bathsStr && parts[1]) bathsStr = parts[1];
      }
    }

    if (!serviceName && row.length === 1) {
      serviceName = row[0].replace(/\s*[-:—]\s*\$?\s*\d+(\.\d{1,2})?.*$/i, '').trim();
    }
    if (unitPriceNum === undefined && totalNum === undefined) {
      const fullLine = row.join(' ');
      const priceMatch = fullLine.match(/\$\s*(-?\d+(?:\.\d{1,2})?)/);
      if (priceMatch) {
        totalNum = parseFloat(priceMatch[1]);
      }
    }

    if (!bedsStr) {
      const bm = serviceName.match(/(\d+)\s*(?:bed|bedroom)/i);
      if (bm) bedsStr = `${bm[1]} Bedroom${bm[1] === '1' ? '' : 's'}`;
    }
    if (!bathsStr) {
      const btm = serviceName.match(/(\d+(?:\.5)?)\s*(?:bath|bathroom)/i);
      if (btm) bathsStr = `${btm[1]} Bathroom${btm[1] === '1' ? '' : 's'}`;
    }

    let finalQuantity = quantityNum !== undefined && quantityNum > 0 ? quantityNum : 1.0;
    let finalUnitPrice = unitPriceNum !== undefined ? unitPriceNum : 0;
    let finalTotal = totalNum !== undefined ? totalNum : 0;

    if (unitPriceNum !== undefined && totalNum !== undefined && (quantityNum === undefined || quantityNum <= 0)) {
      finalQuantity = unitPriceNum !== 0 ? Math.round((totalNum / unitPriceNum) * 100) / 100 : 1.0;
    } else if (quantityNum !== undefined && unitPriceNum !== undefined && totalNum === undefined) {
      finalTotal = Math.round(quantityNum * unitPriceNum * 100) / 100;
    } else if (quantityNum !== undefined && totalNum !== undefined && (unitPriceNum === undefined || unitPriceNum === 0)) {
      finalUnitPrice = quantityNum !== 0 ? Math.round((totalNum / quantityNum) * 100) / 100 : totalNum;
    } else if (totalNum !== undefined && unitPriceNum === undefined && quantityNum === undefined) {
      finalQuantity = 1.0;
      finalUnitPrice = totalNum;
      finalTotal = totalNum;
    } else if (unitPriceNum !== undefined && totalNum === undefined && quantityNum === undefined) {
      finalQuantity = 1.0;
      finalUnitPrice = unitPriceNum;
      finalTotal = unitPriceNum;
    }

    if (!serviceName || (finalUnitPrice === 0 && finalTotal === 0 && finalQuantity === 0)) {
      return;
    }

    let category = currentCategory;
    let categoryLabel = currentCategoryLabel;
    // Ignore generic Jobber category "Service" or "Product" when inferring our internal category
    const effectiveCatStr = /^service$|^product$/i.test(categoryStr) ? '' : categoryStr;
    const lowerName = `${serviceName} ${effectiveCatStr}`.toLowerCase();

    if (lowerName.includes('move out') || lowerName.includes('move-out') || lowerName.includes('moveout')) {
      category = 'MOVE_OUT';
      categoryLabel = 'Move-Out Cleaning 2026';
    } else if (lowerName.includes('deep') && !lowerName.includes('oven') && !lowerName.includes('refrigerator')) {
      category = 'DEEP_CLEAN';
      categoryLabel = 'Deep Cleaning Services 2026';
    } else if (lowerName.includes('post') || lowerName.includes('construction') || lowerName.includes('movein') || lowerName.includes('move in')) {
      category = 'POST_CONSTRUCTION';
      categoryLabel = 'MoveIn - Post Construction';
    } else if (lowerName.includes('initial basic') || lowerName.includes('standard cleaning')) {
      category = 'STANDARD_CLEAN';
      categoryLabel = 'Initial Basic / Standard Cleaning 2026';
    } else if (
      lowerName.includes('fuel') ||
      lowerName.includes('discount') ||
      lowerName.includes('oven') ||
      lowerName.includes('fridge') ||
      lowerName.includes('refrigerator') ||
      lowerName.includes('cabinet') ||
      lowerName.includes('baseboard') ||
      lowerName.includes('window') ||
      lowerName.includes('basement living') ||
      lowerName.includes('full basement suite') ||
      lowerName.includes('pet hair') ||
      lowerName.includes('blinds') ||
      lowerName.includes('balcony') ||
      lowerName.includes('surcharge') ||
      lowerName.includes('add-on') ||
      lowerName.includes('addon')
    ) {
      category = 'ADD_ON';
      categoryLabel = 'Add-on Services';
    } else if (lowerName.includes('hour') || lowerName.includes('/hr') || lowerName.includes('crew rate')) {
      category = 'HOURLY';
      categoryLabel = 'Hourly Crew Rates';
    } else if (lowerName.includes('recur') || lowerName.includes('bi-weekly')) {
      category = 'RECURRING';
      categoryLabel = 'Bi-Weekly Recurring Residential Clean';
    } else if (effectiveCatStr) {
      categoryLabel = effectiveCatStr;
    }

    const isAddon = category === 'ADD_ON';
    const resolvedCleaners =
      cleanersNum || (isAddon ? 1 : finalUnitPrice >= 140 ? 3 : finalUnitPrice >= 90 ? 2 : 1);
    const depositRequired =
      depositNum !== undefined
        ? depositNum
        : finalTotal >= 400
        ? 125
        : finalTotal >= 300
        ? 100
        : finalTotal >= 180
        ? 50
        : 0;

    const cleanBaseName = isAddon || category === 'HOURLY'
      ? serviceName
      : serviceName.replace(/\s*\([123]\s*Cleaners?\)\s*$/i, '').trim();

    const canonicalMatch = CANONICAL_SERVICE_CATALOG.find(
      (c) => c.name.toLowerCase() === cleanBaseName.toLowerCase()
    );

    items.push({
      id: canonicalMatch?.id || `cat-import-${Date.now()}-${idx}`,
      category,
      categoryLabel,
      name: cleanBaseName,
      shortName: cleanBaseName.length > 35 ? `${cleanBaseName.slice(0, 32)}...` : cleanBaseName,
      serviceType:
        category === 'MOVE_OUT'
          ? 'Move-Out Cleaning'
          : category === 'DEEP_CLEAN'
          ? 'Deep Cleaning'
          : category === 'POST_CONSTRUCTION'
          ? 'Post-Construction Cleaning'
          : category === 'ADD_ON'
          ? 'Add-on'
          : category === 'HOURLY'
          ? ('Hourly Crew Rates' as any)
          : 'Standard Cleaning',
      bedrooms: bedsStr || canonicalMatch?.bedrooms || undefined,
      bathrooms: bathsStr || canonicalMatch?.bathrooms || undefined,
      beds: bedsStr || canonicalMatch?.beds || undefined,
      baths: bathsStr || canonicalMatch?.baths || undefined,
      quantity: finalQuantity,
      unitPrice: finalUnitPrice,
      total: finalTotal,
      basePrice: finalTotal,
      baseHours: finalQuantity,
      cleanersCount: resolvedCleaners,
      depositRequired: canonicalMatch?.depositRequired ?? depositRequired,
      taxable: taxableBool,
      jobberItemName: serviceName,
      description:
        descriptionStr ||
        canonicalMatch?.description ||
        `${serviceName} - Tidyups Cleaning Service`,
      isAddon,
      status: statusStr || 'Active',
      isActive: isActiveBool,
      sortOrder: canonicalMatch?.sortOrder ?? (idx + 1) * 10,
    });
  });

  // If the imported file was an expanded 108-item Jobber CSV containing (1 Cleaner), (2 Cleaners), (3 Cleaners)
  // variants of the same residential base packages, deduplicate by base name (preferring the canonical default crew size)
  // so the base catalog stays clean (46 base items -> 108 combined Jobber items).
  const deduped = new Map<string, ServiceCatalogItem>();
  for (const item of items) {
    const key = item.name.toLowerCase();
    const existing = deduped.get(key);
    const canonicalDefaultCleaners =
      CANONICAL_SERVICE_CATALOG.find((c) => c.name.toLowerCase() === key)?.cleanersCount ?? 2;
    if (!existing || item.cleanersCount === canonicalDefaultCleaners) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values());
}

/**
 * Helper to match an item in the service catalog based on service type & bed/bath count,
 * and format its jobberItemName to match the exact 108-item Jobber catalog.
 */
export function matchCatalogItem(
  serviceType: string,
  bedrooms?: string,
  bathrooms?: string,
  catalog: ServiceCatalogItem[] = CANONICAL_SERVICE_CATALOG,
  cleanersCountOverride?: number
): ServiceCatalogItem | undefined {
  if (!catalog || catalog.length === 0) return undefined;

  const normService = (serviceType || '').trim().toLowerCase();
  const normBed = (bedrooms || '').toLowerCase();
  const normBath = (bathrooms || '').toLowerCase();

  // Check if serviceType explicitly specifies (1 Cleaner), (2 Cleaners), or (3 Cleaners)
  const explicitCrewMatch = normService.match(/\((\d+)\s*cleaners?\)/i);
  const requestedCrew =
    cleanersCountOverride ||
    (explicitCrewMatch ? parseInt(explicitCrewMatch[1], 10) : undefined);

  const finalizeMatchedItem = (matched: ServiceCatalogItem): ServiceCatalogItem => {
    let defaultCrew = matched.cleanersCount || 2;
    if (matched.category === 'STANDARD_CLEAN') {
      defaultCrew = 1;
    } else if (matched.category === 'DEEP_CLEAN') {
      defaultCrew = Math.max(2, defaultCrew);
    } else if (matched.category === 'MOVE_OUT') {
      defaultCrew = 2;
    }
    let targetCrew = requestedCrew || defaultCrew;
    if (matched.category === 'STANDARD_CLEAN') {
      targetCrew = 1;
    } else if (matched.category === 'DEEP_CLEAN' && targetCrew < 2) {
      targetCrew = 2;
    }
    const conv = convertItemForCleanersCount(matched, targetCrew);
    return {
      ...matched,
      cleanersCount: conv.cleanersCount,
      quantity: conv.quantity,
      unitPrice: conv.unitPrice,
      total: conv.total,
      baseHours: conv.quantity,
      basePrice: conv.total,
      jobberItemName: conv.jobberItemName,
      description: conv.description,
    };
  };

  // 1. Check exact name match first (with or without cleaner suffix)
  const strippedQuery = normService.replace(/\s*\([123]\s*cleaners?\)\s*$/i, '').trim();
  const exactByName = catalog.find((item) => {
    const itemStripped = item.name.replace(/\s*\([123]\s*cleaners?\)\s*$/i, '').trim().toLowerCase();
    return item.name.toLowerCase() === normService || itemStripped === strippedQuery;
  });
  if (exactByName) {
    return finalizeMatchedItem(exactByName);
  }

  const bedDigit = normBed.match(/\d+/)?.[0] || normService.match(/(\d+)\s*(?:bed|bedroom)/i)?.[1];
  const bathDigit = normBath.match(/[\d.]+/)?.[0] || normService.match(/(\d+(?:\.5)?)\s*(?:bath|bathroom)/i)?.[1];

  let targetCategory: ServiceCatalogItem['category'] = 'STANDARD_CLEAN';
  if (normService.includes('move out') || normService.includes('move-out') || normService.includes('moveout')) {
    targetCategory = 'MOVE_OUT';
  } else if (normService.includes('deep')) {
    targetCategory = 'DEEP_CLEAN';
  } else if (normService.includes('post') || normService.includes('construction') || normService.includes('move in') || normService.includes('movein')) {
    targetCategory = 'POST_CONSTRUCTION';
  } else if (normService.includes('recur') || normService.includes('bi-weekly')) {
    targetCategory = 'RECURRING';
  } else if (normService.includes('hour') || normService.includes('/hr')) {
    targetCategory = 'HOURLY';
  }

  if (bedDigit && bathDigit) {
    const exact = catalog.find((item) => {
      if (item.category !== targetCategory) return false;
      const itemBed = (item.bedrooms || item.beds || item.name).toLowerCase();
      const itemBath = (item.bathrooms || item.baths || item.name).toLowerCase();
      return (
        itemBed.includes(`${bedDigit} bed`) &&
        (itemBath.includes(`${bathDigit} bath`) || itemBath.includes(`${bathDigit}bath`))
      );
    });
    if (exact) return finalizeMatchedItem(exact);
  }

  if (bedDigit) {
    const bedMatch = catalog.find((item) => {
      if (item.category !== targetCategory) return false;
      const itemBed = (item.bedrooms || item.beds || item.name).toLowerCase();
      return itemBed.includes(`${bedDigit} bed`);
    });
    if (bedMatch) return finalizeMatchedItem(bedMatch);
  }

  const catMatch = catalog.find((item) => item.category === targetCategory);
  if (catMatch) return finalizeMatchedItem(catMatch);

  return finalizeMatchedItem(catalog[0]);
}
