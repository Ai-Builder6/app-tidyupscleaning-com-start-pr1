import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { ClientRecord } from '../types/client';
import { ScheduledJobItem, UnscheduledJobItem } from '../data/jobberCalendarData';
import { JobberQuote, JobberInvoice } from './jobberSyncModules';
import { Technician } from '../types/dispatch';
import { JobberStaffMember } from './staffRosterService';

// Target Firestore Database ID
export const FIRESTORE_DATABASE_ID = 'ai-studio-cleaningserviced-8a2493ab-cb9d-4c28-a60b-c28e7d08d30e';

/**
 * Sanitizes an ID to conform to Firestore security rules regex: ^[a-zA-Z0-9_\-]+$
 */
export function sanitizeDocId(id: string, fallbackPrefix = 'id'): string {
  if (!id) return `${fallbackPrefix}-${Date.now()}`;
  const cleaned = id.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

/**
 * Removes any keys with undefined values so Firestore setDoc() never throws
 * "Unsupported field value: undefined"
 */
export function stripUndefinedFields<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = stripUndefinedFields(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreClient(client: ClientRecord): Record<string, unknown> {
  const cleanId = sanitizeDocId(client.id, 'cli');
  const validStatus = ['Client', 'Good lead', 'Bad lead', 'Spam', 'Lead', 'Archived'].includes(client.verdict || '') 
    ? (client.verdict as string) 
    : 'Client';

  const email = (client.email || '').trim().substring(0, 200);
  const secondaryPhone = (client.secondaryPhone || '').trim().substring(0, 30);
  const notes = (client.notes || '').trim().substring(0, 1000);

  const payload: Record<string, unknown> = {
    id: cleanId,
    name: (client.name || 'Anonymous Client').substring(0, 150),
    phone: (client.phone || '(780) 555-0100').substring(0, 30),
    address: (client.address || 'Edmonton, AB').substring(0, 300),
    status: validStatus,
    tags: Array.isArray(client.tags) ? client.tags.slice(0, 20).map((t) => String(t).substring(0, 50)) : [],
    createdAt: client.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (email) payload.email = email;
  if (secondaryPhone) payload.secondaryPhone = secondaryPhone;
  if (notes) payload.notes = notes;

  return stripUndefinedFields(payload);
}

export async function saveClientToFirestore(client: ClientRecord): Promise<void> {
  const docId = sanitizeDocId(client.id, 'cli');
  const payload = toFirestoreClient(client);
  const path = `clients/${docId}`;
  try {
    const docRef = doc(db, 'clients', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on ${path}:`, error);
  }
}

export async function deleteClientFromFirestore(clientId: string): Promise<void> {
  const docId = sanitizeDocId(clientId, 'cli');
  const path = `clients/${docId}`;
  try {
    const docRef = doc(db, 'clients', docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Firestore delete error on ${path}:`, error);
  }
}

export async function fetchClientsFromFirestore(): Promise<ClientRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'clients'));
    const list: ClientRecord[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      const verdict = (['Client', 'Good lead', 'Bad lead', 'Spam'].includes(data.status) ? data.status : 'Client') as any;
      list.push({
        id: data.id || d.id,
        name: data.name || '',
        email: data.email,
        phone: data.phone || '',
        secondaryPhone: data.secondaryPhone,
        address: data.address || '',
        verdict,
        tags: data.tags || [],
        isJobberLinked: data.tags?.includes('jobber-client') || false,
        notes: data.notes,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return list;
  } catch (err) {
    console.warn('Could not read clients from Firestore:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED VISITS SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreScheduledVisit(visit: ScheduledJobItem): Record<string, unknown> {
  const cleanId = sanitizeDocId(visit.id, 'visit');
  const cleaner = (visit.assignedCleaners && visit.assignedCleaners[0]) || 'Team Van';
  const rawStatus = visit.status || 'SCHEDULED';
  const statusMap: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
  };
  const status = statusMap[rawStatus] || 'Scheduled';
  const secondaryPhone = (visit.secondaryPhone || '').trim().substring(0, 30);
  const notes = (visit.notes || '').trim().substring(0, 1000);

  const payload: Record<string, unknown> = {
    id: cleanId,
    clientName: (visit.clientName || 'Jobber Client').substring(0, 150),
    phone: (visit.clientPhone || '(780) 555-0100').substring(0, 30),
    address: (visit.serviceAddress || 'Edmonton, AB').substring(0, 300),
    vanId: sanitizeDocId(cleaner, 'van').substring(0, 50),
    cleanerName: cleaner.substring(0, 100),
    scheduledTime: (visit.startAt || new Date().toISOString()).substring(0, 100),
    durationMinutes: 120,
    status,
    serviceType: (visit.serviceType || 'Standard Cleaning').substring(0, 100),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (secondaryPhone) payload.secondaryPhone = secondaryPhone;
  if (notes) payload.notes = notes;

  return stripUndefinedFields(payload);
}

export async function saveScheduledVisitToFirestore(visit: ScheduledJobItem): Promise<void> {
  const docId = sanitizeDocId(visit.id, 'visit');
  const payload = toFirestoreScheduledVisit(visit);
  try {
    const docRef = doc(db, 'scheduledVisits', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on scheduledVisits/${docId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNSCHEDULED JOBS SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreUnscheduledJob(job: UnscheduledJobItem): Record<string, unknown> {
  const cleanId = sanitizeDocId(job.id, 'ujob');
  return stripUndefinedFields({
    id: cleanId,
    clientName: (job.clientName || 'Jobber Client').substring(0, 150),
    phone: (job.clientPhone || '(780) 555-0100').substring(0, 30),
    address: (job.serviceAddress || 'Edmonton, AB').substring(0, 300),
    serviceType: (job.serviceType || 'Standard Cleaning').substring(0, 100),
    priority: 'Normal',
    estimatedHours: 2,
    createdAt: job.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function saveUnscheduledJobToFirestore(job: UnscheduledJobItem): Promise<void> {
  const docId = sanitizeDocId(job.id, 'ujob');
  const payload = toFirestoreUnscheduledJob(job);
  try {
    const docRef = doc(db, 'unscheduledJobs', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on unscheduledJobs/${docId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES & INVOICES SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreQuote(quote: JobberQuote): Record<string, unknown> {
  const cleanId = sanitizeDocId(quote.id, 'quote');
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    AWAITING_RESPONSE: 'Sent',
    APPROVED: 'Approved',
    CONVERTED: 'Converted',
    CHANGES_REQUESTED: 'Declined',
  };
  const status = statusMap[quote.quoteStatus] || 'Sent';

  return stripUndefinedFields({
    id: cleanId,
    quoteNumber: (quote.quoteNumber || 'Q-100').substring(0, 50),
    clientName: (quote.clientName || 'Client').substring(0, 150),
    totalAmount: typeof quote.total === 'number' ? quote.total : 0,
    status,
    issueDate: quote.createdAt || new Date().toISOString(),
    createdAt: quote.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function saveQuoteToFirestore(quote: JobberQuote): Promise<void> {
  const docId = sanitizeDocId(quote.id, 'quote');
  const payload = toFirestoreQuote(quote);
  try {
    const docRef = doc(db, 'quotes', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on quotes/${docId}:`, error);
  }
}

export function toFirestoreInvoice(invoice: JobberInvoice): Record<string, unknown> {
  const cleanId = sanitizeDocId(invoice.id, 'inv');
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    AWAITING_PAYMENT: 'Awaiting Payment',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    BAD_DEBT: 'Bad Debt',
    PAST_DUE: 'Overdue',
  };
  const status = statusMap[invoice.invoiceStatus] || 'Awaiting Payment';

  return stripUndefinedFields({
    id: cleanId,
    invoiceNumber: (invoice.invoiceNumber || 'INV-100').substring(0, 50),
    clientName: (invoice.clientName || 'Client').substring(0, 150),
    totalAmount: typeof invoice.total === 'number' ? invoice.total : 0,
    status,
    issueDate: invoice.issuedDate || new Date().toISOString(),
    dueDate: invoice.dueDate || new Date().toISOString(),
    createdAt: invoice.issuedDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function saveInvoiceToFirestore(invoice: JobberInvoice): Promise<void> {
  const docId = sanitizeDocId(invoice.id, 'inv');
  const payload = toFirestoreInvoice(invoice);
  try {
    const docRef = doc(db, 'invoices', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on invoices/${docId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VAN & HUB OVERRIDES SYNC
// ─────────────────────────────────────────────────────────────────────────────

export interface VanOverrideRecord {
  vanId: string;
  customVanName: string;
  cleanerName: string;
  phone: string;
  hubId: string;
  customHubName: string;
  homeAddress?: string;
  lat?: number;
  lng?: number;
  color: string;
  updatedAt: string;
}

export function toFirestoreVanOverride(tech: Technician): Record<string, unknown> {
  const vanId = sanitizeDocId(tech.id, 'van').substring(0, 50);
  const homeAddr = (tech.homeAddress || tech.depotLocation?.address || '').trim().substring(0, 300);
  const lat = typeof tech.depotLocation?.lat === 'number' ? tech.depotLocation.lat : tech.currentLocation?.lat;
  const lng = typeof tech.depotLocation?.lng === 'number' ? tech.depotLocation.lng : tech.currentLocation?.lng;

  const payload: Record<string, unknown> = {
    vanId,
    customVanName: (tech.vanNumber || tech.name).substring(0, 100),
    cleanerName: (tech.name || '').substring(0, 100),
    phone: (tech.phone || '').substring(0, 30),
    hubId: sanitizeDocId(tech.depotLocation?.name || 'hub_default', 'hub').substring(0, 50),
    customHubName: (tech.depotLocation?.name || `${tech.name} Hub`).substring(0, 100),
    color: (tech.color || '#2563EB').substring(0, 20),
    updatedAt: new Date().toISOString(),
  };
  if (homeAddr) payload.homeAddress = homeAddr;
  if (typeof lat === 'number' && !isNaN(lat)) payload.lat = lat;
  if (typeof lng === 'number' && !isNaN(lng)) payload.lng = lng;
  return stripUndefinedFields(payload);
}

export async function saveVanOverrideToFirestore(tech: Technician): Promise<void> {
  const vanId = sanitizeDocId(tech.id, 'van').substring(0, 50);
  const payload = toFirestoreVanOverride(tech);
  try {
    const docRef = doc(db, 'vanOverrides', vanId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on vanOverrides/${vanId}:`, error);
  }
}

export async function fetchVanOverridesFromFirestore(): Promise<Record<string, VanOverrideRecord>> {
  try {
    const snap = await getDocs(collection(db, 'vanOverrides'));
    const map: Record<string, VanOverrideRecord> = {};
    snap.forEach((d) => {
      const data = d.data() as any;
      if (data && (data.vanId || d.id)) {
        const key = String(data.vanId || d.id);
        map[key] = {
          vanId: key,
          customVanName: data.customVanName || '',
          cleanerName: data.cleanerName || '',
          phone: data.phone || '',
          hubId: data.hubId || '',
          customHubName: data.customHubName || '',
          homeAddress: data.homeAddress,
          lat: typeof data.lat === 'number' ? data.lat : undefined,
          lng: typeof data.lng === 'number' ? data.lng : undefined,
          color: data.color || '#2563EB',
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    });
    return map;
  } catch (err) {
    console.warn('Could not read vanOverrides from Firestore:', err);
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CATALOG & PRICE LIST SYNC (Number of Cleaners x QTY x Unit Price = Total)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveServiceCatalogItemToFirestore(item: any): Promise<void> {
  const docId = sanitizeDocId(item.id || item.name, 'cat');
  const cleanersCount = Math.max(1, Number(item.cleanersCount) || 2);
  const quantity = Number(item.quantity ?? item.baseHours ?? 1);
  const unitPrice = Number(item.unitPrice ?? item.basePrice ?? 105);
  const total = Number(item.total ?? Math.round(quantity * unitPrice * 100) / 100);

  const payload = {
    id: docId,
    name: String(item.name || 'Cleaning Service').substring(0, 200),
    shortName: String(item.shortName || item.name || '').substring(0, 100),
    category: String(item.category || 'MOVE_OUT').substring(0, 50),
    categoryLabel: String(item.categoryLabel || 'Move-Out Cleaning 2026').substring(0, 100),
    serviceType: String(item.serviceType || 'Move-Out Cleaning').substring(0, 100),
    bedrooms: item.bedrooms ? String(item.bedrooms).substring(0, 50) : '',
    bathrooms: item.bathrooms ? String(item.bathrooms).substring(0, 50) : '',
    cleanersCount,
    quantity,
    unitPrice,
    total,
    basePrice: total,
    baseHours: quantity,
    depositRequired: Number(item.depositRequired || 0),
    jobberItemName: String(item.jobberItemName || item.name || '').substring(0, 200),
    description: String(item.description || '').substring(0, 1000),
    isAddon: Boolean(item.isAddon),
    status: String(item.status || 'Active').substring(0, 30),
    isActive: item.isActive !== false,
    sortOrder: Number(item.sortOrder || 10),
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'serviceCatalog', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on serviceCatalog/${docId}:`, error);
  }
}

export async function saveServiceCatalogToFirestore(items: any[]): Promise<number> {
  let saved = 0;
  for (const item of items) {
    try {
      await saveServiceCatalogItemToFirestore(item);
      saved++;
    } catch {
      // continue
    }
  }
  return saved;
}

export async function fetchServiceCatalogFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'serviceCatalog'));
    const list: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data && data.name) {
        list.push({
          ...data,
          id: data.id || d.id,
        });
      }
    });
    return list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (err) {
    console.warn('Could not read serviceCatalog from Firestore:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKED NUMBERS & SCREENED CALL LIST SYNC (SPAM SHIELD + QUO CALLS)
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockedNumberRuleRecord {
  id: string;
  pattern: string;
  ruleType: 'number' | 'prefix' | 'areacode' | 'country';
  reason?: string;
  callerName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt: string;
}

export async function saveBlockedNumberRuleToFirestore(
  pattern: string,
  ruleType: 'number' | 'prefix' | 'areacode' | 'country' = 'number',
  reason?: string,
  callerName?: string
): Promise<void> {
  if (!pattern || !pattern.trim()) return;
  const docId = sanitizeDocId(`blk_${ruleType}_${pattern.trim()}`, 'blk');
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: docId,
    pattern: String(pattern.trim()).substring(0, 60),
    ruleType,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  if (reason) payload.reason = String(reason).substring(0, 300);
  if (callerName) payload.callerName = String(callerName).substring(0, 150);

  try {
    const docRef = doc(db, 'blockedNumbers', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on blockedNumbers/${docId}:`, error);
  }
}

export async function deleteBlockedNumberRuleFromFirestore(
  pattern: string,
  ruleType: 'number' | 'prefix' | 'areacode' | 'country' = 'number'
): Promise<void> {
  if (!pattern || !pattern.trim()) return;
  const docId = sanitizeDocId(`blk_${ruleType}_${pattern.trim()}`, 'blk');
  try {
    const docRef = doc(db, 'blockedNumbers', docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Firestore delete error on blockedNumbers/${docId}:`, error);
  }
}

export async function syncSpamShieldConfigToFirestore(config: {
  blockedNumbers?: string[];
  blockedPrefixes?: string[];
  blockedCountryCodes?: string[];
}): Promise<number> {
  let count = 0;
  for (const num of config.blockedNumbers || []) {
    try {
      await saveBlockedNumberRuleToFirestore(num, 'number', 'Saved in Twilio & Quo Spam Shield');
      count++;
    } catch {
      // continue
    }
  }
  for (const prefix of config.blockedPrefixes || []) {
    try {
      await saveBlockedNumberRuleToFirestore(prefix, 'prefix', 'Rotating prefix / area code block rule');
      count++;
    } catch {
      // continue
    }
  }
  for (const cc of config.blockedCountryCodes || []) {
    try {
      await saveBlockedNumberRuleToFirestore(cc, 'country', 'Blocked international country code');
      count++;
    } catch {
      // continue
    }
  }
  return count;
}

export async function fetchBlockedNumberRulesFromFirestore(): Promise<BlockedNumberRuleRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'blockedNumbers'));
    const list: BlockedNumberRuleRecord[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (data && data.pattern && data.isActive !== false) {
        list.push({
          id: data.id || d.id,
          pattern: data.pattern,
          ruleType: data.ruleType || 'number',
          reason: data.reason,
          callerName: data.callerName,
          isActive: data.isActive !== false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    });
    return list;
  } catch (err) {
    console.warn('Could not read blockedNumbers from Firestore:', err);
    return [];
  }
}

export async function saveScreenedCallToFirestore(call: any): Promise<void> {
  if (!call) return;
  const rawId = call.id || call.callId || `call_${(call.callerNumber || '').replace(/\D/g, '')}`;
  const docId = sanitizeDocId(rawId, 'scr');
  const rawStatus = String(call.status || '');
  const isBlocked =
    Boolean(call.isBlocked) ||
    Boolean(call.manuallyBlocked) ||
    rawStatus === 'SOLICITOR_BLOCKED' ||
    rawStatus === 'BLOCKED' ||
    String(call.verdict || '').toLowerCase().includes('block') ||
    String(call.verdict || '').toLowerCase().includes('solicitor') ||
    String(call.verdict || '').toLowerCase().includes('spam');

  const validStatus: 'SCREENED_LEAD' | 'SOLICITOR_BLOCKED' | 'MISSED_VOICEMAIL' | 'BLOCKED' = isBlocked
    ? 'SOLICITOR_BLOCKED'
    : rawStatus === 'MISSED_VOICEMAIL'
    ? 'MISSED_VOICEMAIL'
    : 'SCREENED_LEAD';

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: docId,
    callerNumber: String(call.callerNumber || call.phone || 'Unknown').substring(0, 40),
    callerName: String(call.callerName || call.customerName || 'Caller').substring(0, 150),
    status: validStatus,
    isBlocked,
    manuallyBlocked: Boolean(call.manuallyBlocked || isBlocked),
    updatedAt: now,
    createdAt: String(call.createdAt || call.timestamp || now).substring(0, 60),
  };

  if (call.reason || call.verdict) {
    payload.reason = String(call.reason || call.verdict).substring(0, 500);
  }
  if (call.aiSummary) {
    payload.aiSummary = String(call.aiSummary).substring(0, 1500);
  }
  if (call.transcript) {
    payload.transcript = String(call.transcript).substring(0, 3000);
  }
  if (call.serviceType) {
    payload.serviceType = String(call.serviceType).substring(0, 150);
  }
  if (call.address) {
    payload.address = String(call.address).substring(0, 300);
  }
  if (typeof call.quotedAmount === 'number' && call.quotedAmount >= 0) {
    payload.quotedAmount = call.quotedAmount;
  }

  try {
    const docRef = doc(db, 'screenedCalls', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on screenedCalls/${docId}:`, error);
  }
}

export async function fetchScreenedCallsFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'screenedCalls'));
    const list: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data && data.callerNumber) {
        list.push({
          ...data,
          id: data.id || d.id,
        });
      }
    });
    return list;
  } catch (err) {
    console.warn('Could not read screenedCalls from Firestore:', err);
    return [];
  }
}

export async function saveBlockedNumberToFirestore(params: {
  number: string;
  type?: 'number' | 'prefix' | 'areacode' | 'country';
  reason?: string;
  callerName?: string;
  source?: string;
}): Promise<void> {
  if (!params || !params.number) return;
  return saveBlockedNumberRuleToFirestore(
    params.number,
    params.type || 'number',
    params.reason,
    params.callerName
  );
}

export async function deleteBlockedNumberFromFirestore(
  number: string,
  type: 'number' | 'prefix' | 'areacode' | 'country' = 'number'
): Promise<void> {
  return deleteBlockedNumberRuleFromFirestore(number, type);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADS SYNC (Master Leads & Quotes Hub / Clean Google Sheet)
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreLead(lead: any): Record<string, unknown> {
  const cleanId = sanitizeDocId(lead.id || `lead_${lead.phone || Date.now()}`, 'lead');
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: cleanId,
    customerName: String(lead.customerName || lead.clientName || 'Cleaning Lead').substring(0, 150),
    updatedAt: now,
  };

  if (lead.phone) payload.phone = String(lead.phone).substring(0, 40);
  if (lead.email) payload.email = String(lead.email).substring(0, 200);
  if (lead.address) payload.address = String(lead.address).substring(0, 300);
  if (lead.city) payload.city = String(lead.city).substring(0, 100);
  if (lead.postalCode) payload.postalCode = String(lead.postalCode).substring(0, 30);
  if (lead.serviceRequested) payload.serviceRequested = String(lead.serviceRequested).substring(0, 200);
  if (lead.bedrooms) payload.bedrooms = String(lead.bedrooms).substring(0, 60);
  if (lead.bathrooms) payload.bathrooms = String(lead.bathrooms).substring(0, 60);
  if (lead.source) payload.source = String(lead.source).substring(0, 100);
  if (lead.sourceTab) payload.sourceTab = String(lead.sourceTab).substring(0, 100);
  if (lead.verdict) payload.verdict = String(lead.verdict).substring(0, 50);
  if (lead.status) payload.status = String(lead.status).substring(0, 50);
  if (lead.quoteId) payload.quoteId = String(lead.quoteId).substring(0, 128);
  if (lead.quoteNumber) payload.quoteNumber = String(lead.quoteNumber).substring(0, 50);
  if (typeof lead.quotedAmount === 'number' && !isNaN(lead.quotedAmount) && lead.quotedAmount >= 0) {
    payload.quotedAmount = Math.min(100000, lead.quotedAmount);
  }
  if (lead.notes) payload.notes = String(lead.notes).substring(0, 2500);
  if (lead.dateReceived) payload.dateReceived = String(lead.dateReceived).substring(0, 60);

  return stripUndefinedFields(payload);
}

export async function saveLeadToFirestore(lead: any): Promise<void> {
  if (!lead) return;
  const docId = sanitizeDocId(lead.id || `lead_${lead.phone || Date.now()}`, 'lead');
  const payload = toFirestoreLead(lead);
  try {
    const docRef = doc(db, 'leads', docId);
    await setDoc(docRef, payload, { merge: true });
    markRecordSynced(`lead:${docId}`, computeRecordFingerprint(lead));
  } catch (error) {
    console.warn(`Firestore save error on leads/${docId}:`, error);
  }
}

export async function deleteLeadFromFirestore(leadId: string): Promise<void> {
  if (!leadId) return;
  const docId = sanitizeDocId(leadId, 'lead');
  try {
    const docRef = doc(db, 'leads', docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Firestore delete error on leads/${docId}:`, error);
  }
}

export async function fetchLeadsFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'leads'));
    const list: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data && data.customerName) {
        list.push({
          ...data,
          id: data.id || d.id,
        });
      }
    });
    return list;
  } catch (err) {
    console.warn('Could not read leads from Firestore:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE STATE SYNC ("Resume Exactly Where You Left Off")
// ─────────────────────────────────────────────────────────────────────────────

export interface PersistedWorkspaceState {
  id: string;
  activeTopView: string;
  masterHubFocusBlock?: string;
  scheduledJobsSubTab?: string;
  mapInspectDate?: string;
  lastSyncedAt?: string;
  updatedAt: string;
}

export async function saveWorkspaceStateToFirestore(state: Partial<PersistedWorkspaceState>): Promise<void> {
  const docId = sanitizeDocId(state.id || 'owner_default', 'ws');
  const now = new Date().toISOString();
  const payload = stripUndefinedFields({
    id: docId,
    activeTopView: String(state.activeTopView || 'MASTER_HUB').substring(0, 60),
    masterHubFocusBlock: state.masterHubFocusBlock ? String(state.masterHubFocusBlock).substring(0, 60) : undefined,
    scheduledJobsSubTab: state.scheduledJobsSubTab ? String(state.scheduledJobsSubTab).substring(0, 60) : undefined,
    mapInspectDate: state.mapInspectDate ? String(state.mapInspectDate).substring(0, 40) : undefined,
    lastSyncedAt: state.lastSyncedAt ? String(state.lastSyncedAt).substring(0, 60) : now,
    updatedAt: now,
  });
  try {
    const docRef = doc(db, 'workspaceState', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('Could not save workspaceState to Firestore:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INCREMENTAL DELTA SYNC ENGINE (Only writes new or modified records!)
// ─────────────────────────────────────────────────────────────────────────────

const DELTA_HASH_STORAGE_KEY = 'tidyups_firestore_delta_hashes_v1';
let memoryDeltaHashes: Record<string, string> | null = null;

function getDeltaHashMap(): Record<string, string> {
  if (memoryDeltaHashes) return memoryDeltaHashes;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(DELTA_HASH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryDeltaHashes = parsed;
          return memoryDeltaHashes;
        }
      }
    } catch {
      // ignore
    }
  }
  memoryDeltaHashes = {};
  return memoryDeltaHashes;
}

function persistDeltaHashMap(): void {
  if (typeof window !== 'undefined' && memoryDeltaHashes) {
    try {
      localStorage.setItem(DELTA_HASH_STORAGE_KEY, JSON.stringify(memoryDeltaHashes));
    } catch {
      // ignore quota
    }
  }
}

export function computeRecordFingerprint(record: any): string {
  if (!record || typeof record !== 'object') return String(record);
  const clone: Record<string, any> = {};
  for (const k of Object.keys(record).sort()) {
    if (k === 'updatedAt' || k === 'syncedAt' || k === 'lastSavedAt') continue;
    clone[k] = record[k];
  }
  const str = JSON.stringify(clone);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return `${str.length}:${hash}`;
}

function shouldSyncRecordDelta(key: string, record: any, forceFull = false): boolean {
  if (forceFull) return true;
  const map = getDeltaHashMap();
  const fp = computeRecordFingerprint(record);
  return map[key] !== fp;
}

function markRecordSynced(key: string, fingerprint: string): void {
  const map = getDeltaHashMap();
  map[key] = fingerprint;
}

export interface FullSyncResult {
  clientsCount: number;
  scheduledVisitsCount: number;
  unscheduledJobsCount: number;
  quotesCount: number;
  invoicesCount: number;
  leadsCount?: number;
  vanOverridesCount: number;
  serviceCatalogCount?: number;
  blockedNumbersCount?: number;
  screenedCallsCount?: number;
  deltaWritesCount?: number;
  unchangedSkippedCount?: number;
  errors: string[];
}

/**
 * Syncs operational state to Firestore using Incremental Delta Sync by default:
 * Only new or modified records are written to Firestore, avoiding re-uploading unchanged records on every sync.
 */
export async function syncAllToFirestore({
  clients,
  scheduledVisits,
  unscheduledJobs,
  quotes,
  invoices,
  leads = [],
  technicians,
  serviceCatalog = [],
  spamShieldConfig,
  screenedCalls = [],
  quoCallLogs = [],
  blockedCallsHistory = [],
  forceFullSync = false,
}: {
  clients: ClientRecord[];
  scheduledVisits: ScheduledJobItem[];
  unscheduledJobs: UnscheduledJobItem[];
  quotes: JobberQuote[];
  invoices: JobberInvoice[];
  leads?: any[];
  technicians: Technician[];
  serviceCatalog?: any[];
  spamShieldConfig?: {
    blockedNumbers?: string[];
    blockedPrefixes?: string[];
    blockedCountryCodes?: string[];
  };
  screenedCalls?: any[];
  quoCallLogs?: any[];
  blockedCallsHistory?: any[];
  forceFullSync?: boolean;
}): Promise<FullSyncResult> {
  const result: FullSyncResult = {
    clientsCount: 0,
    scheduledVisitsCount: 0,
    unscheduledJobsCount: 0,
    quotesCount: 0,
    invoicesCount: 0,
    leadsCount: 0,
    vanOverridesCount: 0,
    serviceCatalogCount: 0,
    blockedNumbersCount: 0,
    screenedCallsCount: 0,
    deltaWritesCount: 0,
    unchangedSkippedCount: 0,
    errors: [],
  };

  for (const lead of leads) {
    const docId = sanitizeDocId(lead?.id || `lead_${lead?.phone || ''}`, 'lead');
    const key = `lead:${docId}`;
    const fp = computeRecordFingerprint(lead);
    if (!shouldSyncRecordDelta(key, lead, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveLeadToFirestore(lead);
      markRecordSynced(key, fp);
      result.leadsCount = (result.leadsCount || 0) + 1;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`Lead ${lead?.id}: ${e?.message || e}`);
    }
  }

  for (const client of clients) {
    const docId = sanitizeDocId(client.id, 'cli');
    const key = `cli:${docId}`;
    const fp = computeRecordFingerprint(client);
    if (!shouldSyncRecordDelta(key, client, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveClientToFirestore(client);
      markRecordSynced(key, fp);
      result.clientsCount++;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`Client ${client.id}: ${e?.message || e}`);
    }
  }

  for (const visit of scheduledVisits) {
    const docId = sanitizeDocId(visit.id, 'visit');
    const key = `visit:${docId}`;
    const fp = computeRecordFingerprint(visit);
    if (!shouldSyncRecordDelta(key, visit, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveScheduledVisitToFirestore(visit);
      markRecordSynced(key, fp);
      result.scheduledVisitsCount++;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`Visit ${visit.id}: ${e?.message || e}`);
    }
  }

  for (const job of unscheduledJobs) {
    const docId = sanitizeDocId(job.id, 'ujob');
    const key = `ujob:${docId}`;
    const fp = computeRecordFingerprint(job);
    if (!shouldSyncRecordDelta(key, job, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveUnscheduledJobToFirestore(job);
      markRecordSynced(key, fp);
      result.unscheduledJobsCount++;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`Unscheduled Job ${job.id}: ${e?.message || e}`);
    }
  }

  for (const quote of quotes) {
    const docId = sanitizeDocId(quote.id, 'quote');
    const key = `quote:${docId}`;
    const fp = computeRecordFingerprint(quote);
    if (!shouldSyncRecordDelta(key, quote, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveQuoteToFirestore(quote);
      markRecordSynced(key, fp);
      result.quotesCount++;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`Quote ${quote.id}: ${e?.message || e}`);
    }
  }

  for (const invoice of invoices) {
    const docId = sanitizeDocId(invoice.id, 'inv');
    const key = `inv:${docId}`;
    const fp = computeRecordFingerprint(invoice);
    if (!shouldSyncRecordDelta(key, invoice, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveInvoiceToFirestore(invoice);
      markRecordSynced(key, fp);
      result.invoicesCount++;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`Invoice ${invoice.id}: ${e?.message || e}`);
    }
  }

  for (const tech of technicians) {
    const docId = sanitizeDocId(tech.id, 'van').substring(0, 50);
    const key = `van:${docId}`;
    const fp = computeRecordFingerprint(tech);
    if (!shouldSyncRecordDelta(key, tech, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveVanOverrideToFirestore(tech);
      markRecordSynced(key, fp);
      result.vanOverridesCount++;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`Van ${tech.id}: ${e?.message || e}`);
    }
  }

  for (const catItem of serviceCatalog) {
    const docId = sanitizeDocId(catItem.id || catItem.name, 'cat');
    const key = `cat:${docId}`;
    const fp = computeRecordFingerprint(catItem);
    if (!shouldSyncRecordDelta(key, catItem, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveServiceCatalogItemToFirestore(catItem);
      markRecordSynced(key, fp);
      result.serviceCatalogCount = (result.serviceCatalogCount || 0) + 1;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`Catalog ${catItem.id}: ${e?.message || e}`);
    }
  }

  if (spamShieldConfig) {
    const key = 'spamShieldConfig';
    const fp = computeRecordFingerprint(spamShieldConfig);
    if (shouldSyncRecordDelta(key, spamShieldConfig, forceFullSync)) {
      try {
        result.blockedNumbersCount = await syncSpamShieldConfigToFirestore(spamShieldConfig);
        markRecordSynced(key, fp);
        result.deltaWritesCount = (result.deltaWritesCount || 0) + (result.blockedNumbersCount || 0);
      } catch (e: any) {
        result.errors.push(`SpamShield: ${e?.message || e}`);
      }
    }
  }

  const allScreenedRecords = [...screenedCalls, ...quoCallLogs, ...blockedCallsHistory];
  for (const callItem of allScreenedRecords) {
    const rawId = callItem?.id || callItem?.callId || `call_${(callItem?.callerNumber || callItem?.callerPhone || '').replace(/\D/g, '')}`;
    const docId = sanitizeDocId(rawId, 'scr');
    const key = `scr:${docId}`;
    const fp = computeRecordFingerprint(callItem);
    if (!shouldSyncRecordDelta(key, callItem, forceFullSync)) {
      result.unchangedSkippedCount = (result.unchangedSkippedCount || 0) + 1;
      continue;
    }
    try {
      await saveScreenedCallToFirestore(callItem);
      markRecordSynced(key, fp);
      result.screenedCallsCount = (result.screenedCallsCount || 0) + 1;
      result.deltaWritesCount = (result.deltaWritesCount || 0) + 1;
    } catch (e: any) {
      result.errors.push(`ScreenedCall ${callItem?.id}: ${e?.message || e}`);
    }
  }

  persistDeltaHashMap();
  return result;
}



