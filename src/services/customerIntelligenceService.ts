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
  quotesCount: number;
  calledBefore: boolean;
  lastQuoteNumber?: string;
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
  const quotes = options?.quotes || [];

  // 1. Calculate Call Count
  const matchedCalls = calls.filter((c: any) => {
    const cPhoneDigits = normalizePhone(c.callerPhone || c.phone || c.from || c.callerNumber);
    if (
      targetDigits &&
      targetDigits.length >= 7 &&
      cPhoneDigits &&
      (cPhoneDigits === targetDigits || cPhoneDigits.endsWith(targetDigits) || targetDigits.endsWith(cPhoneDigits))
    ) {
      return true;
    }
    if (targetName && targetName.length > 2 && !/^\d+$/.test(targetName)) {
      const cName = (c.callerName || c.clientName || '').toLowerCase().trim();
      if (cName && cName !== 'inbound caller' && (cName.includes(targetName) || targetName.includes(cName))) {
        return true;
      }
    }
    return false;
  });

  // 2. Calculate Quotes Count
  const matchedQuotes = quotes.filter((q: any) => {
    const qPhoneDigits = normalizePhone(q.clientPhone || q.phone);
    if (
      targetDigits &&
      targetDigits.length >= 7 &&
      qPhoneDigits &&
      (qPhoneDigits === targetDigits || qPhoneDigits.endsWith(targetDigits) || targetDigits.endsWith(qPhoneDigits))
    ) {
      return true;
    }
    if (targetName && targetName.length > 2 && !/^\d+$/.test(targetName)) {
      const qName = (q.clientName || '').toLowerCase().trim();
      if (qName && (qName.includes(targetName) || targetName.includes(qName))) {
        return true;
      }
    }
    return false;
  });

  // 3. Calculate Past / Scheduled Cleans Count
  const matchedVisits = visits.filter((v: any) => {
    const vPhoneDigits = normalizePhone(v.clientPhone);
    if (
      targetDigits &&
      targetDigits.length >= 7 &&
      vPhoneDigits &&
      (vPhoneDigits === targetDigits || vPhoneDigits.endsWith(targetDigits) || targetDigits.endsWith(vPhoneDigits))
    ) {
      return true;
    }
    if (targetName && targetName.length > 2 && !/^\d+$/.test(targetName)) {
      const vName = (v.clientName || v.title || '').toLowerCase().trim();
      if (vName && (vName.includes(targetName) || targetName.includes(vName))) {
        return true;
      }
    }
    return false;
  });

  // 4. Find matching Client record
  const matchedClient = clients.find((cli: any) => {
    const cliPhoneDigits = normalizePhone(cli.phone || cli.secondaryPhone);
    if (
      targetDigits &&
      targetDigits.length >= 7 &&
      cliPhoneDigits &&
      (cliPhoneDigits === targetDigits || cliPhoneDigits.endsWith(targetDigits) || targetDigits.endsWith(cliPhoneDigits))
    ) {
      return true;
    }
    if (targetName && targetName.length > 2 && !/^\d+$/.test(targetName)) {
      const cliName = (cli.name || '').toLowerCase().trim();
      if (cliName && (cliName.includes(targetName) || targetName.includes(cliName))) {
        return true;
      }
    }
    return false;
  });

  const quotesCount = matchedQuotes.length;
  const lastQuoteNumber = matchedQuotes[0]?.quoteNumber ? String(matchedQuotes[0].quoteNumber) : undefined;
  const rawCallsLen = matchedCalls.length;
  const callCount = Math.max(rawCallsLen, quotesCount > 0 || matchedClient ? 1 : 0);
  const calledBefore = Boolean(rawCallsLen >= 1 || quotesCount >= 1 || matchedVisits.length >= 1 || matchedClient);
  const isRepeatCaller = rawCallsLen > 1 || (rawCallsLen >= 1 && (quotesCount >= 1 || Boolean(matchedClient)));

  const cleansFromClientRecord = Number(matchedClient?.totalJobs) || 0;
  const cleansCount = Math.max(matchedVisits.length, cleansFromClientRecord);

  const isExistingClient =
    cleansCount > 0 ||
    quotesCount > 0 ||
    matchedClient?.verdict === 'Client' ||
    Boolean(matchedClient?.isJobberLinked) ||
    Boolean(matchedClient?.jobberId);

  // 5. Determine Loyalty Tier & Discount
  let loyaltyTier: 'NEW' | 'REPEAT' | 'VIP' = 'NEW';
  let loyaltyDiscountPercent = 0;
  let loyaltyBadgeText = 'First-Time Caller';
  let loyaltyPerkMessage = 'New customer intake rate.';

  if (cleansCount >= 3 || callCount >= 4) {
    loyaltyTier = 'VIP';
    loyaltyDiscountPercent = 15;
    loyaltyBadgeText = `VIP Client (${cleansCount} cleans)`;
    loyaltyPerkMessage = `VIP Customer: 15% Multi-Clean Discount Eligible ($${Math.round(280 * 0.15)} savings on standard clean)!`;
  } else if (cleansCount >= 1 || isRepeatCaller || isExistingClient || calledBefore) {
    loyaltyTier = 'REPEAT';
    loyaltyDiscountPercent = 10;
    loyaltyBadgeText =
      cleansCount > 0
        ? `Called Before • Returning (${cleansCount} cleans)`
        : lastQuoteNumber
        ? `Called Before • Quote #${lastQuoteNumber}`
        : `Called Before (${callCount}x)`;
    loyaltyPerkMessage = `Called Before: 10% Loyalty Discount Eligible ($${Math.round(280 * 0.1)} savings on next clean)!`;
  }

  const loyaltyDiscountEligible = loyaltyDiscountPercent > 0;

  const lastCallDate = matchedCalls[0]?.timestamp || matchedQuotes[0]?.createdAt;
  const lastCleanDate = matchedVisits[0]?.startAt || matchedClient?.latestServiceDate;

  return {
    name: customerName || matchedClient?.name || matchedQuotes[0]?.clientName || matchedCalls[0]?.callerName || phoneOrName,
    phone: phoneOrName,
    normalizedPhone: targetDigits,
    callCount,
    cleansCount,
    quotesCount,
    calledBefore,
    lastQuoteNumber,
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
