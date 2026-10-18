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
  item: { quantity: number; unitPrice: number; total?: number; cleanersCount: number; isAddon?: boolean },
  targetCleaners: number
): {
  cleanersCount: number;
  quantity: number;
  unitPrice: number;
  total: number;
  perCleanerRate: number;
  soloEquivalentQty: number;
  soloEquivalentRate: number;
} {
  const currentCleaners = Math.max(1, Number(item.cleanersCount) || 1);
  const nextCleaners = Math.max(1, Number(targetCleaners) || 1);
  const currentQty = Number(item.quantity) || 1;
  const currentUnitPrice = Number(item.unitPrice) || 0;
  const currentTotal =
    item.total !== undefined && !isNaN(Number(item.total))
      ? Number(item.total)
      : Math.round(currentQty * currentUnitPrice * 100) / 100;

  // Per-cleaner rate & solo equivalent
  const perCleanerRate = Math.round((currentUnitPrice / currentCleaners) * 100) / 100;
  const totalPersonHours = Math.round(currentQty * currentCleaners * 100) / 100;

  if (item.isAddon || currentCleaners === nextCleaners) {
    return {
      cleanersCount: currentCleaners,
      quantity: currentQty,
      unitPrice: currentUnitPrice,
      total: currentTotal,
      perCleanerRate,
      soloEquivalentQty: totalPersonHours,
      soloEquivalentRate: perCleanerRate,
    };
  }

  const newQuantity = Math.round((totalPersonHours / nextCleaners) * 100) / 100;
  const newUnitPrice = Math.round(perCleanerRate * nextCleaners * 100) / 100;
  const newTotal = Math.round(newQuantity * newUnitPrice * 100) / 100;

  return {
    cleanersCount: nextCleaners,
    quantity: newQuantity,
    unitPrice: newUnitPrice,
    total: newTotal,
    perCleanerRate,
    soloEquivalentQty: totalPersonHours,
    soloEquivalentRate: perCleanerRate,
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
    jobberItemName: 'Bi-Weekly Maintenance Clean (4 Bed / 3 Bath)',
    description: 'Regular recurring bi-weekly home detail for 4 Bed / 3 Bath property. Full sanitization and maintenance.',
    isAddon: false,
    status: 'Active',
    isActive: true,
    sortOrder: 300,
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
    jobberItemName: 'Solo Cleaner Hourly Rate ($52.50/hr)',
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
    jobberItemName: 'Tandem Crew Hourly Rate ($105.00/hr)',
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
    jobberItemName: 'Inside Oven Cleaning',
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
    jobberItemName: 'Inside Refrigerator Sanitization',
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
    jobberItemName: 'Inside Cabinets & Drawers Cleaning',
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
    jobberItemName: 'Baseboards Hand-Scrub & Wipe',
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
    jobberItemName: 'Interior Window Panes & Sills Clean',
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
    jobberItemName: 'Basement Living Space Cleaning',
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
    jobberItemName: 'Basement Suite Complete Detail',
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
    jobberItemName: 'Pet Hair & Dander Sanitizer Treatment',
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
    jobberItemName: 'Horizontal / Faux-Wood Blinds Detail',
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
    jobberItemName: 'Balcony / Deck Sweep & Sliding Glass Door',
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
    taxable: false,
    jobberItemName: 'Discount $10 Facebook Ad',
    description: 'Discount $10 Facebook Ad Promo',
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

  return rawItems.map((raw, idx) => {
    const canonicalMatch = CANONICAL_SERVICE_CATALOG.find(
      (c) =>
        c.id === raw.id ||
        (raw.name && c.name.toLowerCase() === String(raw.name).toLowerCase())
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

    return {
      ...(canonicalMatch || {}),
      ...raw,
      id: raw.id || canonicalMatch?.id || `cat-item-${idx + 1}`,
      name: raw.name || canonicalMatch?.name || `Service Item ${idx + 1}`,
      shortName:
        raw.shortName ||
        canonicalMatch?.shortName ||
        (raw.name ? String(raw.name).slice(0, 35) : `Item ${idx + 1}`),
      category: raw.category || canonicalMatch?.category || 'MOVE_OUT',
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
      taxable: raw.taxable !== undefined ? Boolean(raw.taxable) : true,
      jobberItemName: raw.jobberItemName || raw.name || canonicalMatch?.jobberItemName || '',
      description:
        raw.description ||
        canonicalMatch?.description ||
        `${raw.name || 'Cleaning Service'} — ${cleanersCount} Cleaner${cleanersCount > 1 ? 's' : ''} (${quantity} × $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`,
      isAddon,
      status: raw.status || 'Active',
      isActive: raw.isActive !== false,
      sortOrder: raw.sortOrder ?? canonicalMatch?.sortOrder ?? (idx + 1) * 10,
    } as ServiceCatalogItem;
  });
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
    'CATEGORY',
    'BEDS',
    'BATHS',
    'NUMBER OF CLEANERS',
    'QUANTITY',
    'UNIT PRICE (CAD)',
    'TOTAL (CAD)',
    'FORMULA: NUMBER OF CLEANERS (QTY x UNIT PRICE) = TOTAL',
    '1 CLEANER EQUIVALENT (QTY x $52.50)',
    '2 CLEANERS EQUIVALENT (QTY x $105.00)',
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

    const oneCleanerConv = convertItemForCleanersCount(item, 1);
    const twoCleanersConv = convertItemForCleanersCount(item, 2);

    const activeFormulaStr = item.isAddon
      ? `1 Add-on (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`
      : `${cleaners} Cleaner${cleaners > 1 ? 's' : ''} (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`;

    const oneCleanerStr = item.isAddon
      ? `1 (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`
      : `1 Cleaner (${oneCleanerConv.quantity} x $${oneCleanerConv.unitPrice.toFixed(2)}) = $${oneCleanerConv.total.toFixed(2)}`;

    const twoCleanersStr = item.isAddon
      ? `1 (${qty} x $${unitPrice.toFixed(2)}) = $${total.toFixed(2)}`
      : `2 Cleaners (${twoCleanersConv.quantity} x $${twoCleanersConv.unitPrice.toFixed(2)}) = $${twoCleanersConv.total.toFixed(2)}`;

    return [
      item.name,
      item.categoryLabel || item.category,
      item.bedrooms || item.beds || '',
      item.bathrooms || item.baths || '',
      cleaners,
      qty,
      Number(unitPrice.toFixed(2)),
      Number(total.toFixed(2)),
      activeFormulaStr,
      oneCleanerStr,
      twoCleanersStr,
      Number((item.depositRequired || 0).toFixed(2)),
      item.status || (item.isActive !== false ? 'Active' : 'Draft'),
      item.isActive !== false ? 'Yes' : 'No',
    ];
  });

  return { headers, rows };
}

/**
 * Builds a complete multi-tab XLSX WorkBook ready for Google Sheets / Excel download
 * from the active ServiceCatalogItem[] list.
 */
export function buildPriceListWorkbook(catalog: ServiceCatalogItem[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const colWidths = [
    { wch: 44 }, // SERVICE NAME/JOBBER LINE ITEM
    { wch: 28 }, // CATEGORY
    { wch: 15 }, // BEDS
    { wch: 15 }, // BATHS
    { wch: 20 }, // NUMBER OF CLEANERS
    { wch: 12 }, // QUANTITY
    { wch: 18 }, // UNIT PRICE (CAD)
    { wch: 16 }, // TOTAL (CAD)
    { wch: 42 }, // FORMULA: NUMBER OF CLEANERS (QTY x UNIT PRICE) = TOTAL
    { wch: 38 }, // 1 CLEANER EQUIVALENT (QTY x $52.50)
    { wch: 38 }, // 2 CLEANERS EQUIVALENT (QTY x $105.00)
    { wch: 20 }, // DEPOSIT REQUIRED
    { wch: 12 }, // STATUS
    { wch: 10 }, // ACTIVE?
  ];

  // Sheet 1: Active Price List (as configured by user)
  const { headers: h1, rows: r1 } = generatePriceListSheetRows(catalog);
  const ws1 = XLSX.utils.aoa_to_sheet([h1, ...r1]);
  ws1['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws1, 'Updated Price List (Live)');

  // Sheet 2: 2 Cleaners Rate ($105/hr)
  const { headers: h2, rows: r2 } = generatePriceListSheetRows(catalog, 2);
  const ws2 = XLSX.utils.aoa_to_sheet([h2, ...r2]);
  ws2['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws2, '2 Cleaners (QTY x $105)');

  // Sheet 3: 1 Solo Cleaner Rate ($52.50/hr)
  const { headers: h3, rows: r3 } = generatePriceListSheetRows(catalog, 1);
  const ws3 = XLSX.utils.aoa_to_sheet([h3, ...r3]);
  ws3['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws3, '1 Cleaner (QTY x $52.50)');

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

    for (const line of lines) {
      if (line.includes('\t')) {
        rawRows.push(line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, '')));
      } else if (line.includes(',')) {
        const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (match && match.length > 1) {
          rawRows.push(match.map((c) => c.trim().replace(/^["']|["']$/g, '')));
        } else {
          rawRows.push(line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '')));
        }
      } else {
        rawRows.push([line]);
      }
    }
  }

  if (rawRows.length === 0) return [];

  let headerIndex = -1;
  let colServiceName = 0;
  let colCategory = -1;
  let colBeds = -1;
  let colBaths = -1;
  let colCleaners = -1;
  let colQuantity = -1;
  let colUnitPrice = -1;
  let colTotal = -1;
  let colDeposit = -1;
  let colStatus = -1;
  let colActive = -1;

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r];
    const joined = row.join(' ').toLowerCase();
    if (
      joined.includes('service') ||
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
    let categoryStr = '';
    let bedsStr = '';
    let bathsStr = '';
    let cleanersNum: number | undefined;
    let quantityNum: number | undefined;
    let unitPriceNum: number | undefined;
    let totalNum: number | undefined;
    let depositNum: number | undefined;
    let statusStr = 'Active';
    let isActiveBool = true;

    if (headerIndex !== -1) {
      serviceName = (row[colServiceName] || '').trim();
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
    const lowerName = `${serviceName} ${categoryStr}`.toLowerCase();

    if (lowerName.includes('move out') || lowerName.includes('move-out') || lowerName.includes('moveout')) {
      category = 'MOVE_OUT';
      categoryLabel = 'Move-Out Cleaning 2026';
    } else if (lowerName.includes('deep')) {
      category = 'DEEP_CLEAN';
      categoryLabel = 'Deep Cleaning Services 2026';
    } else if (lowerName.includes('post') || lowerName.includes('construction') || lowerName.includes('movein') || lowerName.includes('move in')) {
      category = 'POST_CONSTRUCTION';
      categoryLabel = 'MoveIn - Post Construction';
    } else if (
      lowerName.includes('fuel') ||
      lowerName.includes('discount') ||
      lowerName.includes('oven') ||
      lowerName.includes('fridge') ||
      lowerName.includes('cabinet') ||
      lowerName.includes('baseboard') ||
      lowerName.includes('window') ||
      lowerName.includes('basement') ||
      lowerName.includes('pet hair') ||
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
    } else if (categoryStr) {
      categoryLabel = categoryStr;
    }

    const isAddon = category === 'ADD_ON';
    const resolvedCleaners =
      cleanersNum || (isAddon ? 1 : finalUnitPrice >= 90 ? 2 : 1);
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

    items.push({
      id: `cat-import-${Date.now()}-${idx}`,
      category,
      categoryLabel,
      name: serviceName,
      shortName: serviceName.length > 35 ? `${serviceName.slice(0, 32)}...` : serviceName,
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
      bedrooms: bedsStr || undefined,
      bathrooms: bathsStr || undefined,
      beds: bedsStr || undefined,
      baths: bathsStr || undefined,
      quantity: finalQuantity,
      unitPrice: finalUnitPrice,
      total: finalTotal,
      basePrice: finalTotal,
      baseHours: finalQuantity,
      cleanersCount: resolvedCleaners,
      depositRequired,
      taxable: true,
      jobberItemName: serviceName,
      description: `${serviceName}${bedsStr ? `\n${bedsStr}, ${bathsStr || ''}` : ''}\n${
        resolvedCleaners > 1 ? `${resolvedCleaners} Pro Cleaners\nIncludes Fuel Surcharge` : 'Tidyups Cleaning Service'
      }`,
      isAddon,
      status: statusStr || 'Active',
      isActive: isActiveBool,
      sortOrder: (idx + 1) * 10,
    });
  });

  return items;
}

/**
 * Helper to match an item in the service catalog based on service type & bed/bath count
 */
export function matchCatalogItem(
  serviceType: string,
  bedrooms?: string,
  bathrooms?: string,
  catalog: ServiceCatalogItem[] = CANONICAL_SERVICE_CATALOG
): ServiceCatalogItem | undefined {
  if (!catalog || catalog.length === 0) return undefined;

  const normService = (serviceType || '').toLowerCase();
  const normBed = (bedrooms || '').toLowerCase();
  const normBath = (bathrooms || '').toLowerCase();

  const bedDigit = normBed.match(/\d+/)?.[0] || normService.match(/(\d+)\s*(?:bed|bedroom)/i)?.[1];
  const bathDigit = normBath.match(/[\d.]+/)?.[0] || normService.match(/(\d+(?:\.5)?)\s*(?:bath|bathroom)/i)?.[1];

  let targetCategory: ServiceCatalogItem['category'] = 'STANDARD_CLEAN';
  if (normService.includes('move out') || normService.includes('move-out') || normService.includes('moveout')) {
    targetCategory = 'MOVE_OUT';
  } else if (normService.includes('deep')) {
    targetCategory = 'DEEP_CLEAN';
  } else if (normService.includes('post') || normService.includes('construction') || normService.includes('move in')) {
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
    if (exact) return exact;
  }

  if (bedDigit) {
    const bedMatch = catalog.find((item) => {
      if (item.category !== targetCategory) return false;
      const itemBed = (item.bedrooms || item.beds || item.name).toLowerCase();
      return itemBed.includes(`${bedDigit} bed`);
    });
    if (bedMatch) return bedMatch;
  }

  const catMatch = catalog.find((item) => item.category === targetCategory);
  if (catMatch) return catMatch;

  return catalog[0];
}
