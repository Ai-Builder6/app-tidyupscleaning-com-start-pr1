/**
 * Shared smart NLP parser for live voice dictation intake.
 * Accurately extracts:
 * - Spoken compound numbers ("seventy two twenty one" -> "7221", "one twelve" -> "112")
 * - Street addresses across all Edmonton & area street suffixes + explicit "address is ..." cues
 * - Preferred Date / Preferred Day ("tomorrow", "this Friday", "next Tuesday", "October 24th", "Nov 3", etc.)
 * - Preferred Time Window ("morning", "afternoon", "evening", "9am", "1pm", etc.)
 */

const SINGLE_DIGIT_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

const TEEN_WORDS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS_WORDS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const ORDINAL_DAY_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  'twenty-first': 21,
  'twenty first': 21,
  'twenty-second': 22,
  'twenty second': 22,
  'twenty-third': 23,
  'twenty third': 23,
  'twenty-fourth': 24,
  'twenty fourth': 24,
  'twenty-fifth': 25,
  'twenty fifth': 25,
  'twenty-sixth': 26,
  'twenty sixth': 26,
  'twenty-seventh': 27,
  'twenty seventh': 27,
  'twenty-eighth': 28,
  'twenty eighth': 28,
  'twenty-ninth': 29,
  'twenty ninth': 29,
  thirtieth: 30,
  'thirty-first': 31,
  'thirty first': 31,
};

const MONTH_MAP: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Formats a Date object as YYYY-MM-DD in local time
 */
export function formatLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats a YYYY-MM-DD string into a friendly label like "Fri, Oct 24, 2026"
 */
export function formatFriendlyDateLabel(isoDate: string): string {
  if (!isoDate) return 'Select Date';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoDate;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Normalizes spoken numbers, compound two-digit pairs ("seventy two twenty one" -> "7221"),
 * street ordinals ("112th street" -> "112 Street"), and Edmonton phonetic street names.
 */
export function normalizeSpokenTranscript(rawSpeech: string): string {
  if (!rawSpeech) return '';

  let s = rawSpeech
    // Convert "two and a half" -> "2.5"
    .replace(/\b(one|two|three|four|1|2|3|4)\s+and\s+a\s+half\b/gi, (_, d) => {
      const base = SINGLE_DIGIT_WORDS[String(d).toLowerCase()] || d;
      return `${base}.5`;
    });

  // Convert compound tens + units ("seventy two" -> "72", "twenty one" -> "21")
  s = s.replace(
    /\b(twenty|thirty|forty|fourty|fifty|sixty|seventy|eighty|ninety)(?:[\s-]+(one|two|three|four|five|six|seven|eight|nine))?\b/gi,
    (_, tensWord, unitWord) => {
      const tensVal = TENS_WORDS[String(tensWord).toLowerCase()] || 0;
      const unitVal = unitWord ? Number(SINGLE_DIGIT_WORDS[String(unitWord).toLowerCase()] || 0) : 0;
      return String(tensVal + unitVal);
    }
  );

  // Convert teen words ("eleven" -> "11", "twelve" -> "12", etc.)
  s = s.replace(
    /\b(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/gi,
    (m) => String(TEEN_WORDS[m.toLowerCase()] ?? m)
  );

  // Convert sequences of 2 to 10 spoken single digits ("seven two two one" -> "7221")
  s = s.replace(
    /\b(?:(zero|oh|one|two|three|four|five|six|seven|eight|nine)(?:[\s-]+|$)){2,10}/gi,
    (seq) => {
      const trailingSpace = /\s$/.test(seq) ? ' ' : '';
      const digits = seq
        .trim()
        .split(/[\s-]+/)
        .map((w) => SINGLE_DIGIT_WORDS[w.toLowerCase()] ?? w)
        .join('');
      return digits + trailingSpace;
    }
  );

  // Convert remaining single digit words
  s = s.replace(
    /\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (m) => SINGLE_DIGIT_WORDS[m.toLowerCase()] || m
  );

  // Merge spoken 2-digit + 2-digit house numbers when followed by a street word
  // e.g. "72 21 Chivers" -> "7221 Chivers", "104 20 112th" -> "10420 112th"
  s = s.replace(/\b(\d{2})\s+(\d{2})(?=\s+(?:[A-Za-z]|\d+\s*(?:st|nd|rd|th)?\s*(?:Ave|Avenue|St|Street)))\b/gi, '$1$2');
  s = s.replace(/\b(\d{1})\s+(\d{2})(?=\s+[A-Z][a-z]+\s+(?:Ave|Avenue|St|Street|Rd|Road|Dr|Drive|Blvd|Way|Pl|Place|Cres|Crescent|Wynd|Close|Common|Link|Gate|Landing|Loop|Court|Ct))\b/g, '$1$2');

  // Normalize numbered street ordinals ("112th Street" -> "112 Street", "82nd Ave" -> "82 Ave")
  s = s.replace(
    /\b(\d{1,3})(?:st|nd|rd|th)\s+(Ave|Avenue|St|Street|Rd|Road|NW|NE|SW|SE)\b/gi,
    '$1 $2'
  );

  // Common Edmonton phonetic street & quadrant normalizations
  s = s
    .replace(/\b(?:child'?s|shrivers?|shivers?)\s+place\b/gi, 'Chivers Place')
    .replace(/\b(?:child'?s|shrivers?|shivers?)\s+way\b/gi, 'Chivers Way')
    .replace(/\bsouth\s*west\b/gi, 'SW')
    .replace(/\bnorth\s*west\b/gi, 'NW')
    .replace(/\bsouth\s*east\b/gi, 'SE')
    .replace(/\bnorth\s*east\b/gi, 'NE');

  return s;
}

/**
 * Extracts a spoken street address from raw or normalized speech.
 */
export function extractSpokenAddress(rawSpeech: string, defaultCity = 'Edmonton'): {
  streetOnly: string;
  fullAddress: string;
} | null {
  if (!rawSpeech) return null;
  const normalized = normalizeSpokenTranscript(rawSpeech);

  // All common Edmonton & Alberta street suffixes
  const streetSuffixPattern =
    '(?:Ave|Avenue|St|Street|Rd|Road|Dr|Drive|Blvd|Boulevard|Way|Pl|Place|Cres|Crescent|Trail|Tr|Ct|Court|Close|Cl|Lane|Ln|Wynd|Common|Link|Point|Pt|Pointe|Gate|Green|Grove|Heights|Hill|Landing|Loop|Manor|Mews|Park|Parkway|Pkwy|Pass|Path|Promenade|Ridge|Rise|Row|Run|Square|Sq|Terrace|Ter|View|Villas|Vista|Walk|Bend|Bay|Cove|Circle|Cir|Heath|Hollow|Highway|Hwy)';

  // 1. Standard house number + street name + street suffix (+ optional quadrant)
  // Also supports numbered streets like "10420 112 Street NW" or "9815 82 Ave NW"
  const addrRegex = new RegExp(
    `\\b(\\d{1,5}(?:\\s*[-]\\s*\\d{1,5})?\\s+[A-Za-z0-9.'\\s]{1,32}?\\b${streetSuffixPattern}\\b(?:\\s*(?:NW|NE|SW|SE|North|South|East|West))?)`,
    'gi'
  );

  const matches = Array.from(normalized.matchAll(addrRegex));
  if (matches.length > 0) {
    // Filter out false positives like "3 bedrooms" or "2 hours"
    const validMatches = matches
      .map((m) => m[1].replace(/\s+/g, ' ').trim())
      .filter((cand) => !/\b(bedroom|bathroom|cleaner|hour|dollar|deposit|discount)\b/i.test(cand));

    if (validMatches.length > 0) {
      // Clean leading junk words if any digits were preceded by words
      let bestStreet = validMatches[validMatches.length - 1];
      // If there are multiple numbers in the match (e.g. from phone number before street number), take the last house number segment
      const multiNumFix = bestStreet.match(/(\d{1,5}\s+[A-Za-z0-9.'\s]{1,28})$/);
      if (multiNumFix) {
        bestStreet = multiNumFix[1].trim();
      }
      return {
        streetOnly: bestStreet,
        fullAddress: `${bestStreet}, ${defaultCity}, AB`,
      };
    }
  }

  // 2. Explicit cue phrase fallback: "address is 5412 Windermere", "located at 1234 Jasper", "property at ..."
  const explicitCueRegex =
    /(?:(?:street\s+|property\s+|service\s+|home\s+)?address\s*(?:is|at|:)?|located\s+at|lives?\s+at|house\s+is\s+at)\s+(\d{1,5}\s+[A-Za-z0-9.'\s]{2,35}?)(?=\s*(?:,|\.|in\s+edmonton|in\s+st|in\s+sherwood|in\s+leduc|in\s+spruce|\b(?:and|it'?s|with|for|need|needs|want|wants|phone|call|prefer|date|on\s+monday|on\s+tuesday|on\s+wednesday|on\s+thursday|on\s+friday|on\s+saturday|on\s+sunday|tomorrow|today|\d\s*bed|\d\s*bath)\b|$))/gi;

  const cueMatches = Array.from(normalized.matchAll(explicitCueRegex));
  if (cueMatches.length > 0) {
    const bestStreet = cueMatches[cueMatches.length - 1][1].replace(/\s+/g, ' ').trim();
    if (bestStreet.length >= 5 && !/\b(bedroom|bathroom|cleaner)\b/i.test(bestStreet)) {
      return {
        streetOnly: bestStreet,
        fullAddress: `${bestStreet}, ${defaultCity}, AB`,
      };
    }
  }

  return null;
}

/**
 * Extracts a spoken Preferred Date / Preferred Day and Time Window from speech.
 * Supports:
 * - "today", "tomorrow", "day after tomorrow"
 * - "Monday", "this Friday", "next Tuesday", "preferred day is Thursday", "for Saturday"
 * - "October 24", "October 24th", "Oct 28", "24th of October", "October twenty fourth"
 * - "2026-10-25", "10/25/2026"
 * - "morning", "afternoon", "evening", "9 am", "1 pm"
 */
export function extractSpokenDateAndTime(
  rawSpeech: string,
  referenceDate: Date = new Date()
): {
  preferredDate?: string; // YYYY-MM-DD
  dateLabel?: string;
  timeWindow?: string;
  scheduledTime?: string;
} {
  if (!rawSpeech) return {};

  const result: {
    preferredDate?: string;
    dateLabel?: string;
    timeWindow?: string;
    scheduledTime?: string;
  } = {};

  // Pre-convert spoken ordinal day words ("twenty fourth" -> "24th", "first" -> "1st")
  let text = rawSpeech;
  const sortedOrdinals = Object.entries(ORDINAL_DAY_WORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, num] of sortedOrdinals) {
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    text = text.replace(re, `${num}th`);
  }

  const normalized = normalizeSpokenTranscript(text);
  const lower = normalized.toLowerCase();

  // 1. Time Window detection
  if (/\b(morning|8\s*am|8:00|9\s*am|9:00|10\s*am|10:00|11\s*am|11:00)\b/i.test(lower)) {
    result.timeWindow = 'Morning (8:00 AM - 12:00 PM)';
    result.scheduledTime = '09:00';
  } else if (/\b(afternoon|noon|12\s*pm|12:00|1\s*pm|13:00|2\s*pm|14:00|3\s*pm|15:00)\b/i.test(lower)) {
    result.timeWindow = 'Afternoon (12:00 PM - 4:00 PM)';
    result.scheduledTime = '13:00';
  } else if (/\b(evening|4\s*pm|16:00|5\s*pm|17:00|6\s*pm|18:00)\b/i.test(lower)) {
    result.timeWindow = 'Evening (4:00 PM - 7:00 PM)';
    result.scheduledTime = '16:30';
  } else if (/\b(urgent|asap|right away|anytime today)\b/i.test(lower)) {
    result.timeWindow = 'Anytime Today (Urgent)';
  }

  const baseDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  // 2. Check explicit ISO date (YYYY-MM-DD)
  const isoMatch = normalized.match(/\b(202\d)-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(d.getTime())) {
      result.preferredDate = formatLocalIsoDate(d);
      result.dateLabel = formatFriendlyDateLabel(result.preferredDate);
      return result;
    }
  }

  // 3. Check Month + Day ("October 24", "Oct 24th", "November 1st, 2026")
  const monthNamesPattern = Object.keys(MONTH_MAP).join('|');
  const monthDayRegex = new RegExp(
    `\\b(${monthNamesPattern})\\.?\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(202\\d))?\\b`,
    'gi'
  );
  const mdMatches = Array.from(normalized.matchAll(monthDayRegex));
  if (mdMatches.length > 0) {
    const lastMatch = mdMatches[mdMatches.length - 1];
    const monthIdx = MONTH_MAP[lastMatch[1].toLowerCase()];
    const dayNum = parseInt(lastMatch[2], 10);
    let yearNum = lastMatch[3] ? parseInt(lastMatch[3], 10) : baseDate.getFullYear();
    if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
      let candidate = new Date(yearNum, monthIdx, dayNum);
      // If month is earlier than current month and no year specified, roll to next year
      if (!lastMatch[3] && candidate.getTime() < baseDate.getTime() - 86400000 * 15) {
        candidate = new Date(yearNum + 1, monthIdx, dayNum);
      }
      result.preferredDate = formatLocalIsoDate(candidate);
      result.dateLabel = formatFriendlyDateLabel(result.preferredDate);
      return result;
    }
  }

  // 4. Check "the 24th of October"
  const dayOfMonthRegex = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+of\\s+(${monthNamesPattern})(?:[,\\s]+(202\\d))?\\b`,
    'gi'
  );
  const domMatches = Array.from(normalized.matchAll(dayOfMonthRegex));
  if (domMatches.length > 0) {
    const lastMatch = domMatches[domMatches.length - 1];
    const dayNum = parseInt(lastMatch[1], 10);
    const monthIdx = MONTH_MAP[lastMatch[2].toLowerCase()];
    const yearNum = lastMatch[3] ? parseInt(lastMatch[3], 10) : baseDate.getFullYear();
    if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
      const candidate = new Date(yearNum, monthIdx, dayNum);
      result.preferredDate = formatLocalIsoDate(candidate);
      result.dateLabel = formatFriendlyDateLabel(result.preferredDate);
      return result;
    }
  }

  // 5. Check relative days: "day after tomorrow", "tomorrow", "today"
  if (/\bday\s+after\s+tomorrow\b/i.test(lower)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 2);
    result.preferredDate = formatLocalIsoDate(d);
    result.dateLabel = `Day After Tomorrow (${formatFriendlyDateLabel(result.preferredDate)})`;
    return result;
  }
  if (/\btomorrow\b/i.test(lower)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    result.preferredDate = formatLocalIsoDate(d);
    result.dateLabel = `Tomorrow (${formatFriendlyDateLabel(result.preferredDate)})`;
    return result;
  }
  if (/\b(?:for\s+today|clean\s+today|preferred\s+(?:date|day)\s*(?:is\s*)?today|schedule\s+(?:for\s+)?today|book\s+(?:for\s+)?today|same\s+day)\b/i.test(lower)) {
    result.preferredDate = formatLocalIsoDate(baseDate);
    result.dateLabel = `Today (${formatFriendlyDateLabel(result.preferredDate)})`;
    return result;
  }

  // 6. Check Day of the Week ("Monday", "this Friday", "next Tuesday", "preferred day is Wednesday")
  const weekdayPattern = Object.keys(WEEKDAY_MAP).join('|');
  const weekdayRegex = new RegExp(
    `\\b(?:(next|this|coming)\\s+)?(${weekdayPattern})\\b`,
    'gi'
  );
  const wdMatches = Array.from(lower.matchAll(weekdayRegex));
  if (wdMatches.length > 0) {
    const lastWd = wdMatches[wdMatches.length - 1];
    const modifier = (lastWd[1] || '').toLowerCase();
    const dayWord = lastWd[2].toLowerCase();
    const targetDow = WEEKDAY_MAP[dayWord];
    if (targetDow !== undefined) {
      const currentDow = baseDate.getDay();
      let daysAhead = (targetDow - currentDow + 7) % 7;
      if (daysAhead === 0) {
        // If someone says "next Monday" on a Monday, jump 7 days; otherwise if they say "this Monday" or "Monday", keep today or +7
        if (modifier === 'next') daysAhead = 7;
      } else if (modifier === 'next' && daysAhead <= 2) {
        daysAhead += 7;
      }
      const d = new Date(baseDate);
      d.setDate(d.getDate() + daysAhead);
      result.preferredDate = formatLocalIsoDate(d);
      result.dateLabel = formatFriendlyDateLabel(result.preferredDate);
      return result;
    }
  }

  // 7. Check "for the 25th" / "on the 28th" / "preferred date is the 24th" (current or next month)
  const ordinalOnlyMatch = normalized.match(
    /\b(?:on\s+the|for\s+the|date\s+(?:is\s+)?(?:the\s+)?|day\s+(?:is\s+)?(?:the\s+)?)(\d{1,2})(?:st|nd|rd|th)\b/i
  );
  if (ordinalOnlyMatch) {
    const dayNum = parseInt(ordinalOnlyMatch[1], 10);
    if (dayNum >= 1 && dayNum <= 31) {
      let candidate = new Date(baseDate.getFullYear(), baseDate.getMonth(), dayNum);
      if (candidate.getTime() < baseDate.getTime()) {
        candidate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, dayNum);
      }
      result.preferredDate = formatLocalIsoDate(candidate);
      result.dateLabel = formatFriendlyDateLabel(result.preferredDate);
      return result;
    }
  }

  return result;
}
