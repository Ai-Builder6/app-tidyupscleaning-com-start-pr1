/**
 * Customer Caller Intelligence & Loyalty Tier Service
 * Analyzes call logs, scheduled visits, and client records to determine:
 * - Call frequency (e.g. 1st time caller vs 3x repeat caller)
 * - Service history (e.g. number of completed/scheduled cleans)
 * - Existing client status vs new lead
 * - Loyalty discount eligibility (10% repeat customer, 15% VIP multi-clean)
 */

export interface CustomerIntelligence {
  name: string;
  phone: string;
  normalizedPhone: string;
  callCount: number;
  cleansCount: number;
  isExistingClient: boolean;
  isRepeatCaller: boolean;
  loyaltyTier: 'NEW' | 'REPEAT' | 'VIP';
  loyaltyDiscountPercent: number; // 0, 10, or 15
  loyaltyDiscountEligible: boolean;
  loyaltyBadgeText: string;
  loyaltyPerkMessage: string;
  suggestedDiscountAmount: (basePrice: number) => number;
  suggestedDiscountedPrice: (basePrice: number) => number;
  clientVerdict?: string;
  clientTags?: string[];
  lastCallDate?: string;
  lastCleanDate?: string;
}

export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  return digits;
}

export function getCustomerIntelligence(
  phoneOrName: string,
  customerName?: string,
  options?: {
    calls?: any[];
    visits?: any[];
    clients?: any[];
    quotes?: any[];
  }
): CustomerIntelligence {
  const targetDigits = normalizePhone(phoneOrName);
  const targetName = (customerName || phoneOrName || '').toLowerCase().trim();

  const calls = options?.calls || [];
  const visits = options?.visits || [];
  const clients = options?.clients || [];

  // 1. Calculate Call Count
  let matchedCalls = calls.filter((c: any) => {
    const cPhoneDigits = normalizePhone(c.callerPhone || c.phone || c.from);
    if (targetDigits && cPhoneDigits && (cPhoneDigits === targetDigits || cPhoneDigits.endsWith(targetDigits) || targetDigits.endsWith(cPhoneDigits))) {
      return true;
    }
    if (targetName && targetName.length > 2) {
      const cName = (c.callerName || c.clientName || '').toLowerCase().trim();
      if (cName && (cName.includes(targetName) || targetName.includes(cName))) {
        return true;
      }
    }
    return false;
  });

  const callCount = Math.max(matchedCalls.length, 0);
  const isRepeatCaller = callCount > 1;

  // 2. Calculate Past / Scheduled Cleans Count
  let matchedVisits = visits.filter((v: any) => {
    const vPhoneDigits = normalizePhone(v.clientPhone);
    if (targetDigits && vPhoneDigits && (vPhoneDigits === targetDigits || vPhoneDigits.endsWith(targetDigits) || targetDigits.endsWith(vPhoneDigits))) {
      return true;
    }
    if (targetName && targetName.length > 2) {
      const vName = (v.clientName || v.title || '').toLowerCase().trim();
      if (vName && (vName.includes(targetName) || targetName.includes(vName))) {
        return true;
      }
    }
    return false;
  });

  // 3. Find matching Client record
  const matchedClient = clients.find((cli: any) => {
    const cliPhoneDigits = normalizePhone(cli.phone || cli.secondaryPhone);
    if (targetDigits && cliPhoneDigits && (cliPhoneDigits === targetDigits || cliPhoneDigits.endsWith(targetDigits) || targetDigits.endsWith(cliPhoneDigits))) {
      return true;
    }
    if (targetName && targetName.length > 2) {
      const cliName = (cli.name || '').toLowerCase().trim();
      if (cliName && (cliName.includes(targetName) || targetName.includes(cliName))) {
        return true;
      }
    }
    return false;
  });

  const cleansFromClientRecord = Number(matchedClient?.totalJobs) || 0;
  const cleansCount = Math.max(matchedVisits.length, cleansFromClientRecord);

  const isExistingClient =
    cleansCount > 0 ||
    matchedClient?.verdict === 'Client' ||
    Boolean(matchedClient?.isJobberLinked) ||
    Boolean(matchedClient?.jobberId);

  // 4. Determine Loyalty Tier & Discount
  let loyaltyTier: 'NEW' | 'REPEAT' | 'VIP' = 'NEW';
  let loyaltyDiscountPercent = 0;
  let loyaltyBadgeText = 'First-Time Caller';
  let loyaltyPerkMessage = 'New customer intake rate.';

  if (cleansCount >= 3 || callCount >= 4) {
    loyaltyTier = 'VIP';
    loyaltyDiscountPercent = 15;
    loyaltyBadgeText = `VIP Client (${cleansCount} cleans)`;
    loyaltyPerkMessage = `VIP Customer: 15% Multi-Clean Discount Eligible ($${Math.round(280 * 0.15)} savings on standard clean)!`;
  } else if (cleansCount >= 1 || isRepeatCaller || isExistingClient) {
    loyaltyTier = 'REPEAT';
    loyaltyDiscountPercent = 10;
    loyaltyBadgeText = cleansCount > 0 ? `Returning Client (${cleansCount} cleans)` : `Repeat Caller (${callCount}x)`;
    loyaltyPerkMessage = `Repeat Client: 10% Loyalty Discount Eligible ($${Math.round(280 * 0.1)} savings on next clean)!`;
  }

  const loyaltyDiscountEligible = loyaltyDiscountPercent > 0;

  const lastCallDate = matchedCalls[0]?.timestamp;
  const lastCleanDate = matchedVisits[0]?.startAt || matchedClient?.latestServiceDate;

  return {
    name: customerName || matchedClient?.name || (matchedCalls[0]?.callerName) || phoneOrName,
    phone: phoneOrName,
    normalizedPhone: targetDigits,
    callCount,
    cleansCount,
    isExistingClient,
    isRepeatCaller,
    loyaltyTier,
    loyaltyDiscountPercent,
    loyaltyDiscountEligible,
    loyaltyBadgeText,
    loyaltyPerkMessage,
    suggestedDiscountAmount: (basePrice: number) => Math.round((basePrice * loyaltyDiscountPercent) / 100),
    suggestedDiscountedPrice: (basePrice: number) =>
      Math.max(0, Math.round(basePrice - (basePrice * loyaltyDiscountPercent) / 100)),
    clientVerdict: matchedClient?.verdict,
    clientTags: matchedClient?.tags,
    lastCallDate,
    lastCleanDate,
  };
}
