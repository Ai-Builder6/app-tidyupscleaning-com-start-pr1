import JSZip from 'jszip';

export interface StyledWorkbookLead {
  id?: string;
  dateReceived?: string;
  sourceTab?: string;
  source?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  serviceRequested?: string;
  bedrooms?: string;
  bathrooms?: string;
  dateOfServiceRequested?: string;
  quotedAmount?: number | string;
  quoteId?: string;
  quoteNumber?: string;
  jobberClientId?: string;
  verdict?: string;
  status?: string;
  notes?: string;
  campaignName?: string;
  isJobberSynced?: boolean;
}

export interface StyledWorkbookQuote {
  id?: string;
  quoteNumber?: string;
  jobberWebUri?: string;
  jobberClientWebUri?: string;
}

type SourceCategory = 'FACEBOOK' | 'GOOGLE' | 'VOICE' | 'PASTED';

function detectSourceCategory(sourceTab?: string, source?: string): SourceCategory {
  const combined = `${sourceTab || ''} ${source || ''}`.toLowerCase();
  if (combined.includes('fb') || combined.includes('facebook') || combined.includes('meta') || combined.includes('instagram')) {
    return 'FACEBOOK';
  }
  if (combined.includes('google') || combined.includes('lsa') || combined.includes('adwords')) {
    return 'GOOGLE';
  }
  if (combined.includes('paste') || combined.includes('manual') || combined.includes('csv') || combined.includes('import')) {
    return 'PASTED';
  }
  return 'VOICE';
}

function xmlEscape(val: unknown): string {
  return String(val ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetter(colIndex1Based: number): string {
  let n = colIndex1Based;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Style indices (cellXfs in xl/styles.xml):
 * 0: Default cell
 * 1: Executive Banner Navy (#0F172A), White 13pt Bold, Left/VCenter
 * 2: Executive Banner Facebook Blue (#1877F2), White 13pt Bold, Left/VCenter
 * 3: Executive Banner Google Green (#0F9D58), White 13pt Bold, Left/VCenter
 * 4: Executive Banner Voice Purple (#7C3AED), White 13pt Bold, Left/VCenter
 * 5: Executive Banner Pasted Amber (#D97706), White 13pt Bold, Left/VCenter
 * 6: KPI Block Slate (#1E293B), White 10pt Bold, Center/VCenter
 * 7: KPI Block Facebook Blue (#1877F2), White 10pt Bold, Center/VCenter
 * 8: KPI Block Google Green (#0F9D58), White 10pt Bold, Center/VCenter
 * 9: KPI Block Voice Purple (#7C3AED), White 10pt Bold, Center/VCenter
 * 10: KPI Block Pasted Amber (#D97706), White 10pt Bold, Center/VCenter
 * 11: Frozen Table Column Header (#0F172A), White 10pt Bold, Center/VCenter, Border
 * 12: Source Badge Pill — FACEBOOK (#1877F2 fill, White Bold Center)
 * 13: Source Badge Pill — GOOGLE (#0F9D58 fill, White Bold Center)
 * 14: Source Badge Pill — VOICE (#7C3AED fill, White Bold Center)
 * 15: Source Badge Pill — PASTED (#D97706 fill, White Bold Center)
 * 16: Row Cell — FACEBOOK Odd (#EFF6FF fill, Navy text, Border)
 * 17: Row Cell — FACEBOOK Even (#DBEAFE fill, Navy text, Border)
 * 18: Row Cell — GOOGLE Odd (#ECFDF5 fill, Forest text, Border)
 * 19: Row Cell — GOOGLE Even (#D1FAE5 fill, Forest text, Border)
 * 20: Row Cell — VOICE Odd (#F5F3FF fill, Purple text, Border)
 * 21: Row Cell — VOICE Even (#EDE9FE fill, Purple text, Border)
 * 22: Row Cell — PASTED Odd (#FFFBEB fill, Amber text, Border)
 * 23: Row Cell — PASTED Even (#FEF3C7 fill, Amber text, Border)
 * 24: Client Name Bold — FACEBOOK (#EFF6FF fill, Bold Dark text)
 * 25: Client Name Bold — GOOGLE (#ECFDF5 fill, Bold Dark text)
 * 26: Client Name Bold — VOICE (#F5F3FF fill, Bold Dark text)
 * 27: Client Name Bold — PASTED (#FFFBEB fill, Bold Dark text)
 * 28: Currency Quoted Total ($) — Soft Mint (#D1FAE5 fill, Emerald Bold, $#,##0.00)
 * 29: Hyperlink Cell — Soft Blue/White, Blue Bold Underlined
 * 30: Verdict Badge — GOOD LEAD (#A7F3D0 fill, Dark Green Bold Center)
 * 31: Verdict Badge — SPAM / GARBAGE (#FECDD3 fill, Dark Red Bold Center)
 * 32: Table Totals Footer Bar (#0F172A fill, White 11pt Bold, Double Top Border)
 * 33: Table Totals Footer Currency (#0F172A fill, Bright Emerald 11pt Bold, $#,##0.00, Double Top Border)
 * 34: Section Subheader Bar (#E2E8F0 fill, Dark Slate 10pt Bold)
 * 35: Template Hint Row Cell (Italic muted gray, soft tint)
 */
function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/>
  </numFmts>
  <fonts count="16">
    <font><sz val="10"/><color rgb="FF0F172A"/><name val="Arial"/></font>
    <font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Arial"/></font>
    <font><sz val="10"/><color rgb="FF1E3A8A"/><name val="Arial"/></font>
    <font><sz val="10"/><color rgb="FF064E3B"/><name val="Arial"/></font>
    <font><sz val="10"/><color rgb="FF3B0764"/><name val="Arial"/></font>
    <font><sz val="10"/><color rgb="FF451A03"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FF047857"/><name val="Arial"/></font>
    <font><b/><u/><sz val="10"/><color rgb="FF1D4ED8"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FF065F46"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FF991B1B"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FF34D399"/><name val="Arial"/></font>
    <font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FF1E293B"/><name val="Arial"/></font>
  </fonts>
  <fills count="21">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1877F2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F9D58"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF7C3AED"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD97706"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF5F3FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEDE9FE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFA7F3D0"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFECDD3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE0F2FE"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF334155"/></left>
      <right style="thin"><color rgb="FF334155"/></right>
      <top style="thin"><color rgb="FF334155"/></top>
      <bottom style="medium"><color rgb="FF10B981"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF334155"/></left>
      <right style="thin"><color rgb="FF334155"/></right>
      <top style="double"><color rgb="FF10B981"/></top>
      <bottom style="medium"><color rgb="FF0F172A"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="36">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1..5: Executive Banners (Navy, FB Blue, Google Green, Voice Purple, Pasted Amber) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <!-- 6..10: Row 2 KPI / Color Legend Blocks (Slate, FB Blue, Google Green, Voice Purple, Pasted Amber) -->
    <xf numFmtId="0" fontId="2" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 11: Frozen Table Column Header -->
    <xf numFmtId="0" fontId="2" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <!-- 12..15: Solid Source Badge Pills (FB Blue, Google Green, Voice Purple, Pasted Amber) -->
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 16..23: Source-Colored Data Cells (Odd/Even for FB, Google, Voice, Pasted) -->
    <xf numFmtId="0" fontId="4" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="12" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="13" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="7" fillId="14" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="7" fillId="15" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <!-- 24..27: Bold Client Name Cells per Source -->
    <xf numFmtId="0" fontId="3" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="12" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="14" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <!-- 28: Currency Quoted Total ($) Cell -->
    <xf numFmtId="164" fontId="8" fillId="11" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 29: Clickable Link Cell -->
    <xf numFmtId="0" fontId="9" fillId="20" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 30..31: Verdict Pills (Good Lead Emerald vs Spam Rose) -->
    <xf numFmtId="0" fontId="10" fillId="16" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="11" fillId="17" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 32..33: Totals Footer Row & Footer Currency -->
    <xf numFmtId="0" fontId="12" fillId="2" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="164" fontId="13" fillId="2" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 34: Section Subheader Bar -->
    <xf numFmtId="0" fontId="15" fillId="18" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <!-- 35: Template Hint Cell -->
    <xf numFmtId="0" fontId="14" fillId="19" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

interface CellSpec {
  value: string | number;
  style: number;
  type?: 'str' | 'num' | 'formula';
  formula?: string;
}

function renderCellXml(colIdx1: number, rowIdx1: number, spec: CellSpec): string {
  const ref = `${colLetter(colIdx1)}${rowIdx1}`;
  if (spec.type === 'formula' && spec.formula) {
    const isNum = typeof spec.value === 'number';
    if (isNum) {
      return `<c r="${ref}" s="${spec.style}"><f>${xmlEscape(spec.formula)}</f><v>${spec.value}</v></c>`;
    }
    return `<c r="${ref}" t="str" s="${spec.style}"><f>${xmlEscape(spec.formula)}</f><v>${xmlEscape(spec.value)}</v></c>`;
  }
  if (spec.type === 'num' || typeof spec.value === 'number') {
    const numVal = Number(spec.value) || 0;
    return `<c r="${ref}" s="${spec.style}"><v>${numVal}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr" s="${spec.style}"><is><t xml:space="preserve">${xmlEscape(spec.value)}</t></is></c>`;
}

function getSourceStyles(cat: SourceCategory, isEven: boolean) {
  switch (cat) {
    case 'FACEBOOK':
      return {
        badgeStyle: 12,
        rowStyle: isEven ? 17 : 16,
        nameStyle: 24,
        badgePrefix: '🔵 ',
      };
    case 'GOOGLE':
      return {
        badgeStyle: 13,
        rowStyle: isEven ? 19 : 18,
        nameStyle: 25,
        badgePrefix: '🟢 ',
      };
    case 'PASTED':
      return {
        badgeStyle: 15,
        rowStyle: isEven ? 23 : 22,
        nameStyle: 27,
        badgePrefix: '🟠 ',
      };
    case 'VOICE':
    default:
      return {
        badgeStyle: 14,
        rowStyle: isEven ? 21 : 20,
        nameStyle: 26,
        badgePrefix: '🟣 ',
      };
  }
}

const VISUAL_HEADERS = [
  'Date',
  'Sheet Tab',
  'Lead Source (Color-Coded)',
  'Client Name',
  'Phone Number',
  'Email Address',
  'Street Address',
  'City',
  'Postal Code',
  'Service Requested',
  'Bedrooms',
  'Bathrooms',
  'Date Requested',
  'Quoted Total ($)',
  'Jobber Quote #',
  'Jobber Quote Link',
  'Jobber Client Link',
  'Lead Verdict',
  'Sync Status',
  'Notes & Pricing Breakdown',
];

const VISUAL_COL_WIDTHS = [
  14, // A: Date
  23, // B: Sheet Tab
  25, // C: Lead Source
  24, // D: Client Name
  17, // E: Phone
  24, // F: Email
  30, // G: Street Address
  14, // H: City
  13, // I: Postal Code
  30, // J: Service Requested
  15, // K: Bedrooms
  15, // L: Bathrooms
  15, // M: Date Requested
  18, // N: Quoted Total ($)
  16, // O: Jobber Quote #
  22, // P: Jobber Quote Link
  22, // Q: Jobber Client Link
  16, // R: Verdict
  16, // S: Status
  52, // T: Notes
];

function buildVisualWorksheetXml(options: {
  title: string;
  bannerStyle: number;
  tabColorRgb: string;
  leads: StyledWorkbookLead[];
  allLeadsForSummary: StyledWorkbookLead[];
  quotes: StyledWorkbookQuote[];
  defaultCategory: SourceCategory;
  isMasterSheet?: boolean;
  resolveJobberWebUri: (type: 'quotes' | 'clients', id?: string) => string;
}): string {
  const {
    title,
    bannerStyle,
    tabColorRgb,
    leads,
    allLeadsForSummary,
    quotes,
    defaultCategory,
    isMasterSheet = false,
    resolveJobberWebUri,
  } = options;

  const fbCount = allLeadsForSummary.filter(
    (l) => detectSourceCategory(l.sourceTab, l.source) === 'FACEBOOK'
  ).length;
  const googleCount = allLeadsForSummary.filter(
    (l) => detectSourceCategory(l.sourceTab, l.source) === 'GOOGLE'
  ).length;
  const voiceCount = allLeadsForSummary.filter(
    (l) => detectSourceCategory(l.sourceTab, l.source) === 'VOICE'
  ).length;
  const pastedCount = allLeadsForSummary.filter(
    (l) => detectSourceCategory(l.sourceTab, l.source) === 'PASTED'
  ).length;
  const totalQuoted = leads.reduce((sum, l) => sum + (Number(l.quotedAmount) || 0), 0);

  const rowsXml: string[] = [];
  const mergeRefs: string[] = [];

  // ── ROW 1: EXECUTIVE HEADER BANNER (Merged A1:T1, Frozen) ──
  const row1Cells: string[] = [];
  for (let c = 1; c <= 20; c++) {
    row1Cells.push(
      renderCellXml(c, 1, {
        value: c === 1 ? title : '',
        style: bannerStyle,
      })
    );
  }
  rowsXml.push(`<row r="1" ht="36" customHeight="1">${row1Cells.join('')}</row>`);
  mergeRefs.push('A1:T1');

  // ── ROW 2: 5-COLOR CHANNEL LEGEND & LIVE KPI SUMMARY BAR (Frozen) ──
  const row2Blocks: { start: number; end: number; style: number; text: string }[] = [
    {
      start: 1,
      end: 4,
      style: 6,
      text: `📊 TAB LEADS: ${leads.length}  |  TOTAL: $${totalQuoted.toFixed(2)}`,
    },
    {
      start: 5,
      end: 8,
      style: 7,
      text: `🔵 FACEBOOK LEADS: ${fbCount} ROW(S)`,
    },
    {
      start: 9,
      end: 12,
      style: 8,
      text: `🟢 GOOGLE LEADS: ${googleCount} ROW(S)`,
    },
    {
      start: 13,
      end: 16,
      style: 9,
      text: `🟣 VOICE & QUICK QUOTES: ${voiceCount} ROW(S)`,
    },
    {
      start: 17,
      end: 20,
      style: 10,
      text: `🟠 PASTED & OTHER LEADS: ${pastedCount} ROW(S)`,
    },
  ];
  const row2Cells: string[] = [];
  for (const blk of row2Blocks) {
    for (let c = blk.start; c <= blk.end; c++) {
      row2Cells.push(
        renderCellXml(c, 2, {
          value: c === blk.start ? blk.text : '',
          style: blk.style,
        })
      );
    }
    mergeRefs.push(`${colLetter(blk.start)}2:${colLetter(blk.end)}2`);
  }
  rowsXml.push(`<row r="2" ht="26" customHeight="1">${row2Cells.join('')}</row>`);

  // ── ROW 3: FROZEN TABLE COLUMN HEADERS (A3:T3) ──
  const row3Cells = VISUAL_HEADERS.map((h, i) =>
    renderCellXml(i + 1, 3, { value: h, style: 11 })
  );
  rowsXml.push(`<row r="3" ht="30" customHeight="1">${row3Cells.join('')}</row>`);

  // ── ROWS 4+: COLOR-CODED DATA ROWS ──
  let currentRow = 4;
  const starterTemplates: { cat: SourceCategory; tab: string; src: string; hint: string }[] = [
    {
      cat: 'FACEBOOK',
      tab: 'Facebook Leads',
      src: 'Facebook Lead Ads',
      hint: '[Facebook Lead Row — Auto-Colored in Facebook Blue]',
    },
    {
      cat: 'GOOGLE',
      tab: 'Google Leads',
      src: 'Google Ads / LSA',
      hint: '[Google Lead Row — Auto-Colored in Google Green]',
    },
    {
      cat: 'VOICE',
      tab: 'Voice & Quick Quotes',
      src: 'Voice / Quick Quote',
      hint: '[Voice & Quick Quote Row — Auto-Colored in Royal Purple]',
    },
    {
      cat: 'PASTED',
      tab: 'Pasted Leads',
      src: 'Pasted / Manual Table',
      hint: '[Pasted Lead Row — Auto-Colored in Warm Amber]',
    },
  ];

  const renderStarterTemplateRow = (
    tpl: { cat: SourceCategory; tab: string; src: string; hint: string },
    idx: number
  ) => {
    const s = getSourceStyles(tpl.cat, idx % 2 === 1);
    const cells: string[] = [
      renderCellXml(1, currentRow, { value: new Date().toISOString().slice(0, 10), style: s.rowStyle }),
      renderCellXml(2, currentRow, { value: `${s.badgePrefix}${tpl.tab}`, style: s.badgeStyle }),
      renderCellXml(3, currentRow, { value: `${s.badgePrefix}${tpl.src}`, style: s.badgeStyle }),
      renderCellXml(4, currentRow, { value: tpl.hint, style: s.nameStyle }),
      renderCellXml(5, currentRow, { value: '(780) —', style: s.rowStyle }),
      renderCellXml(6, currentRow, { value: '—', style: s.rowStyle }),
      renderCellXml(7, currentRow, { value: 'Edmonton, AB', style: s.rowStyle }),
      renderCellXml(8, currentRow, { value: 'Edmonton', style: s.rowStyle }),
      renderCellXml(9, currentRow, { value: '—', style: s.rowStyle }),
      renderCellXml(10, currentRow, { value: 'Residential Standard Cleaning', style: s.rowStyle }),
      renderCellXml(11, currentRow, { value: '3 Bedrooms', style: s.rowStyle }),
      renderCellXml(12, currentRow, { value: '2 Bathrooms', style: s.rowStyle }),
      renderCellXml(13, currentRow, { value: '—', style: s.rowStyle }),
      renderCellXml(14, currentRow, { value: 0, type: 'num', style: 28 }),
      renderCellXml(15, currentRow, { value: 'Ready', style: s.rowStyle }),
      renderCellXml(16, currentRow, {
        value: 'Open Jobber Quotes ↗',
        type: 'formula',
        formula: 'HYPERLINK("https://secure.getjobber.com/quotes","Open Jobber Quotes ↗")',
        style: 29,
      }),
      renderCellXml(17, currentRow, {
        value: 'Open Jobber Clients ↗',
        type: 'formula',
        formula: 'HYPERLINK("https://secure.getjobber.com/clients","Open Jobber Clients ↗")',
        style: 29,
      }),
      renderCellXml(18, currentRow, { value: 'Good lead', style: 30 }),
      renderCellXml(19, currentRow, { value: 'READY FOR LEADS', style: s.rowStyle }),
      renderCellXml(20, currentRow, {
        value: `Color-coded ${tpl.tab} table row — new ${tpl.src} leads appear in this color automatically.`,
        style: s.rowStyle,
      }),
    ];
    rowsXml.push(`<row r="${currentRow}" ht="26" customHeight="1">${cells.join('')}</row>`);
    currentRow++;
  };

  if (leads.length === 0) {
    const templatesToShow = isMasterSheet
      ? starterTemplates
      : defaultCategory === 'FACEBOOK'
      ? [starterTemplates[0]]
      : defaultCategory === 'GOOGLE'
      ? [starterTemplates[1]]
      : defaultCategory === 'PASTED'
      ? [starterTemplates[3]]
      : [starterTemplates[2]];

    templatesToShow.forEach((tpl, idx) => renderStarterTemplateRow(tpl, idx));
  } else {
    leads.forEach((l, idx) => {
      const cat = detectSourceCategory(l.sourceTab, l.source);
      const s = getSourceStyles(cat, idx % 2 === 1);
      const matchedQ = quotes.find(
        (q) => q.id === l.quoteId || (l.quoteNumber && q.quoteNumber === l.quoteNumber)
      );
      const quoteUrl =
        matchedQ?.jobberWebUri ||
        (l.quoteId && String(l.quoteId).startsWith('Z2lkOi8v')
          ? resolveJobberWebUri('quotes', l.quoteId)
          : 'https://secure.getjobber.com/quotes');
      const clientUrl =
        matchedQ?.jobberClientWebUri ||
        (l.jobberClientId && String(l.jobberClientId).startsWith('Z2lkOi8v')
          ? resolveJobberWebUri('clients', l.jobberClientId)
          : 'https://secure.getjobber.com/clients');

      const tabLabel = l.sourceTab || 'Voice & Quick Quotes';
      const srcLabel = l.source || 'Voice / Quick Quote';
      const amountNum = Number(l.quotedAmount ?? 221.07) || 0;
      const verdictVal = l.verdict || 'Good lead';
      const isBadVerdict = verdictVal === 'Spam' || verdictVal === 'Garbage';
      const statusText = l.isJobberSynced
        ? `✅ SYNCED (${l.quoteNumber || 'Jobber'})`
        : String(l.status || 'New').toUpperCase();

      const cells: string[] = [
        renderCellXml(1, currentRow, {
          value: (l.dateReceived || new Date().toISOString()).slice(0, 10),
          style: s.rowStyle,
        }),
        renderCellXml(2, currentRow, {
          value: `${s.badgePrefix}${tabLabel}`,
          style: s.badgeStyle,
        }),
        renderCellXml(3, currentRow, {
          value: `${s.badgePrefix}${srcLabel}`,
          style: s.badgeStyle,
        }),
        renderCellXml(4, currentRow, {
          value: l.customerName || 'Client',
          style: s.nameStyle,
        }),
        renderCellXml(5, currentRow, {
          value: l.phone || '',
          style: s.rowStyle,
        }),
        renderCellXml(6, currentRow, {
          value: l.email || '',
          style: s.rowStyle,
        }),
        renderCellXml(7, currentRow, {
          value: l.address || '',
          style: s.rowStyle,
        }),
        renderCellXml(8, currentRow, {
          value: l.city || 'Edmonton',
          style: s.rowStyle,
        }),
        renderCellXml(9, currentRow, {
          value: l.postalCode || '',
          style: s.rowStyle,
        }),
        renderCellXml(10, currentRow, {
          value: l.serviceRequested || 'Residential Standard Cleaning',
          style: s.rowStyle,
        }),
        renderCellXml(11, currentRow, {
          value: l.bedrooms || '3 Bedrooms',
          style: s.rowStyle,
        }),
        renderCellXml(12, currentRow, {
          value: l.bathrooms || '2 Bathrooms',
          style: s.rowStyle,
        }),
        renderCellXml(13, currentRow, {
          value: l.dateOfServiceRequested || '',
          style: s.rowStyle,
        }),
        renderCellXml(14, currentRow, {
          value: Number(amountNum.toFixed(2)),
          type: 'num',
          style: 28,
        }),
        renderCellXml(15, currentRow, {
          value: l.quoteNumber || 'Pending',
          style: s.nameStyle,
        }),
        renderCellXml(16, currentRow, {
          value: l.quoteNumber ? `Open ${l.quoteNumber} ↗` : 'Open Jobber Quotes ↗',
          type: 'formula',
          formula: `HYPERLINK("${quoteUrl.replace(/"/g, '""')}","${
            l.quoteNumber ? `Open ${l.quoteNumber} ↗` : 'Open Jobber Quotes ↗'
          }")`,
          style: 29,
        }),
        renderCellXml(17, currentRow, {
          value: 'Open Jobber Client ↗',
          type: 'formula',
          formula: `HYPERLINK("${clientUrl.replace(/"/g, '""')}","Open Jobber Client ↗")`,
          style: 29,
        }),
        renderCellXml(18, currentRow, {
          value: verdictVal,
          style: isBadVerdict ? 31 : 30,
        }),
        renderCellXml(19, currentRow, {
          value: statusText,
          style: s.rowStyle,
        }),
        renderCellXml(20, currentRow, {
          value: l.notes || '',
          style: s.rowStyle,
        }),
      ];
      rowsXml.push(`<row r="${currentRow}" ht="26" customHeight="1">${cells.join('')}</row>`);
      currentRow++;
    });

    // On the Master "All Clean Leads" tab, if any of the 4 channels has 0 rows yet, include its color-coded template row right in the table so all 4 source colors are visible in the main table!
    if (isMasterSheet) {
      const presentCategories = new Set(
        leads.map((l) => detectSourceCategory(l.sourceTab, l.source))
      );
      starterTemplates.forEach((tpl, idx) => {
        if (!presentCategories.has(tpl.cat)) {
          renderStarterTemplateRow(tpl, idx);
        }
      });
    }
  }

  const lastDataRow = currentRow - 1;

  // ── TABLE TOTALS FOOTER ROW (Dark Slate #0F172A + Live =SUM Formula) ──
  const footerRow = currentRow++;
  const footerCells: string[] = [];
  for (let c = 1; c <= 20; c++) {
    if (c === 1) {
      footerCells.push(
        renderCellXml(c, footerRow, {
          value: '📊 TABLE SUMMARY & TOTALS',
          style: 32,
        })
      );
    } else if (c === 4) {
      footerCells.push(
        renderCellXml(c, footerRow, {
          value: `${leads.length} Active Lead Row(s)`,
          style: 32,
        })
      );
    } else if (c === 7) {
      footerCells.push(
        renderCellXml(c, footerRow, {
          value: `🔵 FB: ${fbCount}  |  🟢 Google: ${googleCount}  |  🟣 Voice: ${voiceCount}  |  🟠 Pasted: ${pastedCount}`,
          style: 32,
        })
      );
    } else if (c === 14) {
      footerCells.push(
        renderCellXml(c, footerRow, {
          value: Number(totalQuoted.toFixed(2)),
          type: 'formula',
          formula: `SUM(N4:N${lastDataRow})`,
          style: 33,
        })
      );
    } else if (c === 15) {
      footerCells.push(
        renderCellXml(c, footerRow, {
          value: 'Jobber Order: 1. Client → 2. Quote',
          style: 32,
        })
      );
    } else {
      footerCells.push(renderCellXml(c, footerRow, { value: '', style: 32 }));
    }
  }
  rowsXml.push(`<row r="${footerRow}" ht="30" customHeight="1">${footerCells.join('')}</row>`);
  mergeRefs.push(`A${footerRow}:C${footerRow}`);
  mergeRefs.push(`D${footerRow}:F${footerRow}`);
  mergeRefs.push(`G${footerRow}:M${footerRow}`);
  mergeRefs.push(`O${footerRow}:T${footerRow}`);

  // ── FOOTER CHANNEL COLOR LEGEND & SUMMARY MINI-TABLE (So all 4 source colors are always visible!) ──
  const legendHeaderRow = currentRow + 1;
  const legendHeaderCells: string[] = [];
  for (let c = 1; c <= 10; c++) {
    legendHeaderCells.push(
      renderCellXml(c, legendHeaderRow, {
        value:
          c === 1
            ? '🎨 LEAD CHANNEL COLOR LEGEND & BREAKDOWN TABLE (Facebook • Google • Voice Quotes • Pasted)'
            : '',
        style: 34,
      })
    );
  }
  rowsXml.push(
    `<row r="${legendHeaderRow}" ht="25" customHeight="1">${legendHeaderCells.join('')}</row>`
  );
  mergeRefs.push(`A${legendHeaderRow}:J${legendHeaderRow}`);

  const channelBreakdownRows: {
    cat: SourceCategory;
    channelLabel: string;
    tabName: string;
    count: number;
    amount: number;
    desc: string;
  }[] = [
    {
      cat: 'FACEBOOK',
      channelLabel: '🔵 Facebook Lead Ads',
      tabName: 'FB Leads / Facebook Leads',
      count: fbCount,
      amount: allLeadsForSummary
        .filter((l) => detectSourceCategory(l.sourceTab, l.source) === 'FACEBOOK')
        .reduce((acc, l) => acc + (Number(l.quotedAmount) || 0), 0),
      desc: 'Royal Blue (#1877F2) badge + Soft Sky-Blue rows — Connected to Meta Lead Ads & Webhook',
    },
    {
      cat: 'GOOGLE',
      channelLabel: '🟢 Google Ads & Local Services',
      tabName: 'Google Leads',
      count: googleCount,
      amount: allLeadsForSummary
        .filter((l) => detectSourceCategory(l.sourceTab, l.source) === 'GOOGLE')
        .reduce((acc, l) => acc + (Number(l.quotedAmount) || 0), 0),
      desc: 'Google Emerald Green (#0F9D58) badge + Soft Mint rows — Connected to Google Ads Lead Form Webhook',
    },
    {
      cat: 'VOICE',
      channelLabel: '🟣 Voice Dictation & Quick Quotes',
      tabName: 'Voice & Quick Quotes',
      count: voiceCount,
      amount: allLeadsForSummary
        .filter((l) => detectSourceCategory(l.sourceTab, l.source) === 'VOICE')
        .reduce((acc, l) => acc + (Number(l.quotedAmount) || 0), 0),
      desc: 'Royal Purple (#7C3AED) badge + Soft Lavender rows — Synced from Voice Dictation & Quick Quote Builder',
    },
    {
      cat: 'PASTED',
      channelLabel: '🟠 Pasted & Manual Table Imports',
      tabName: 'Pasted Leads',
      count: pastedCount,
      amount: allLeadsForSummary
        .filter((l) => detectSourceCategory(l.sourceTab, l.source) === 'PASTED')
        .reduce((acc, l) => acc + (Number(l.quotedAmount) || 0), 0),
      desc: 'Warm Amber (#D97706) badge + Soft Gold rows — Bulk pasted from spreadsheets or manual entry',
    },
  ];

  channelBreakdownRows.forEach((ch, idx) => {
    const r = legendHeaderRow + 1 + idx;
    const st = getSourceStyles(ch.cat, false);
    const cells: string[] = [
      renderCellXml(1, r, { value: ch.channelLabel, style: st.badgeStyle }),
      renderCellXml(2, r, { value: ch.channelLabel, style: st.badgeStyle }),
      renderCellXml(3, r, { value: `Tab: ${ch.tabName}`, style: st.rowStyle }),
      renderCellXml(4, r, { value: `${ch.count} Lead(s)`, style: st.nameStyle }),
      renderCellXml(5, r, { value: Number(ch.amount.toFixed(2)), type: 'num', style: 28 }),
      renderCellXml(6, r, { value: ch.desc, style: st.rowStyle }),
      renderCellXml(7, r, { value: '', style: st.rowStyle }),
      renderCellXml(8, r, { value: '', style: st.rowStyle }),
      renderCellXml(9, r, { value: '', style: st.rowStyle }),
      renderCellXml(10, r, { value: '', style: st.rowStyle }),
    ];
    rowsXml.push(`<row r="${r}" ht="24" customHeight="1">${cells.join('')}</row>`);
    mergeRefs.push(`A${r}:B${r}`);
    mergeRefs.push(`F${r}:J${r}`);
  });

  const colsXml = VISUAL_COL_WIDTHS.map(
    (w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`
  ).join('');

  const mergeCellsXml =
    mergeRefs.length > 0
      ? `<mergeCells count="${mergeRefs.length}">${mergeRefs
          .map((ref) => `<mergeCell ref="${ref}"/>`)
          .join('')}</mergeCells>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr>
    <tabColor rgb="${tabColorRgb}"/>
  </sheetPr>
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="1">
      <pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A4" sqref="A4"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="24" customHeight="1"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml.join('')}</sheetData>
  <autoFilter ref="A3:T${lastDataRow}"/>
  ${mergeCellsXml}
  <headerFooter>
    <oddHeader>&amp;L&amp;B✨ TidyUps Cleaning — Clean Leads &amp; Jobber Hub&amp;R&amp;D</oddHeader>
    <oddFooter>&amp;LJobber Sync Order: 1. Create Client → 2. Create Request / Quote&amp;RPage &amp;P of &amp;N</oddFooter>
  </headerFooter>
</worksheet>`;
}

function buildTwentyColumnWebhookSheetXml(
  headers: readonly string[],
  leads: StyledWorkbookLead[]
): string {
  // Keep Row 1 as the exact 20 headers (frozen via ySplit="1") so Zapier/Make/Facebook Lead Ads/Google Ads read Row 1 directly
  const rowsXml: string[] = [];
  const headerCells = headers.map((h, i) => renderCellXml(i + 1, 1, { value: h, style: 11 }));
  rowsXml.push(`<row r="1" ht="30" customHeight="1">${headerCells.join('')}</row>`);

  leads.forEach((l, idx) => {
    const r = idx + 2;
    const cat = detectSourceCategory(l.sourceTab, l.source);
    const st = getSourceStyles(cat, idx % 2 === 1);
    const nameParts = String(l.customerName || '')
      .trim()
      .split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const values = [
      l.id || '',
      l.dateReceived || new Date().toISOString(),
      l.source || 'facebook_lead_ads',
      l.sourceTab || 'FB Leads',
      firstName,
      lastName,
      l.phone || '',
      l.email || '',
      l.address || '',
      l.city || 'Edmonton',
      'AB',
      l.postalCode || '',
      l.serviceRequested || 'Residential Standard Cleaning',
      l.bedrooms || '3 Bedrooms',
      l.bathrooms || '2 Bathrooms',
      l.dateOfServiceRequested || '',
      l.campaignName || 'FB / Google Ads',
      l.notes || '',
      `https://app.tidyupscleaning.com/?lead=${encodeURIComponent(l.id || '')}`,
      l.isJobberSynced ? 'booked' : 'new',
    ];
    const cells = values.map((val, cIdx) => {
      const col1 = cIdx + 1;
      const cellStyle = col1 === 3 || col1 === 4 ? st.badgeStyle : col1 === 5 || col1 === 6 ? st.nameStyle : st.rowStyle;
      return renderCellXml(col1, r, { value: val, style: cellStyle });
    });
    rowsXml.push(`<row r="${r}" ht="24" customHeight="1">${cells.join('')}</row>`);
  });

  const lastRow = Math.max(1, leads.length + 1);
  const colsXml = headers
    .map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="20" customWidth="1"/>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr>
    <tabColor rgb="FF0D9488"/>
  </sheetPr>
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="1">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="24" customHeight="1"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml.join('')}</sheetData>
  <autoFilter ref="A1:T${lastRow}"/>
  <headerFooter>
    <oddHeader>&amp;L&amp;BTidyUps Cleaning — 20-Column Ad Webhook Schema&amp;R&amp;D</oddHeader>
    <oddFooter>&amp;LFacebook Lead Ads &amp; Google Ads Lead Form Integration&amp;RPage &amp;P of &amp;N</oddFooter>
  </headerFooter>
</worksheet>`;
}

export async function generateStyledLeadsWorkbookBuffer(params: {
  leads: StyledWorkbookLead[];
  quotes: StyledWorkbookQuote[];
  appLeadHeaders: readonly string[];
  resolveJobberWebUri: (type: 'quotes' | 'clients', id?: string) => string;
}): Promise<Buffer> {
  const { leads, quotes, appLeadHeaders, resolveJobberWebUri } = params;

  const fbLeads = leads.filter(
    (l) => detectSourceCategory(l.sourceTab, l.source) === 'FACEBOOK'
  );
  const googleLeads = leads.filter(
    (l) => detectSourceCategory(l.sourceTab, l.source) === 'GOOGLE'
  );
  const voiceLeads = leads.filter(
    (l) => detectSourceCategory(l.sourceTab, l.source) === 'VOICE'
  );
  const pastedLeads = leads.filter(
    (l) => detectSourceCategory(l.sourceTab, l.source) === 'PASTED'
  );

  const sheetsConfig: { name: string; xml: string }[] = [
    {
      name: 'All Clean Leads',
      xml: buildVisualWorksheetXml({
        title:
          '✨ TIDYUPS CLEANING — MASTER LEADS & QUOTES TABLE (ALL CHANNELS: FACEBOOK • GOOGLE • VOICE • PASTED)',
        bannerStyle: 1,
        tabColorRgb: 'FF059669',
        leads,
        allLeadsForSummary: leads,
        quotes,
        defaultCategory: 'VOICE',
        isMasterSheet: true,
        resolveJobberWebUri,
      }),
    },
    {
      name: 'FB Leads',
      xml: buildVisualWorksheetXml({
        title:
          '🔵 TIDYUPS CLEANING — FACEBOOK LEAD ADS TABLE  •  JOBBER ORDER: 1. CREATE CLIENT → 2. CREATE QUOTE',
        bannerStyle: 2,
        tabColorRgb: 'FF1877F2',
        leads: fbLeads,
        allLeadsForSummary: leads,
        quotes,
        defaultCategory: 'FACEBOOK',
        resolveJobberWebUri,
      }),
    },
    {
      name: 'Google Leads',
      xml: buildVisualWorksheetXml({
        title:
          '🟢 TIDYUPS CLEANING — GOOGLE ADS & LOCAL SERVICES LEADS TABLE  •  JOBBER ORDER: 1. CLIENT → 2. QUOTE',
        bannerStyle: 3,
        tabColorRgb: 'FF0F9D58',
        leads: googleLeads,
        allLeadsForSummary: leads,
        quotes,
        defaultCategory: 'GOOGLE',
        resolveJobberWebUri,
      }),
    },
    {
      name: 'Voice & Quick Quotes',
      xml: buildVisualWorksheetXml({
        title:
          '🟣 TIDYUPS CLEANING — VOICE DICTATION & QUICK QUOTES TABLE  •  JOBBER ORDER: 1. CLIENT → 2. QUOTE',
        bannerStyle: 4,
        tabColorRgb: 'FF7C3AED',
        leads: voiceLeads,
        allLeadsForSummary: leads,
        quotes,
        defaultCategory: 'VOICE',
        resolveJobberWebUri,
      }),
    },
    {
      name: 'Pasted Leads',
      xml: buildVisualWorksheetXml({
        title:
          '🟠 TIDYUPS CLEANING — PASTED & MANUAL LEADS TABLE  •  JOBBER ORDER: 1. CLIENT → 2. QUOTE',
        bannerStyle: 5,
        tabColorRgb: 'FFD97706',
        leads: pastedLeads,
        allLeadsForSummary: leads,
        quotes,
        defaultCategory: 'PASTED',
        resolveJobberWebUri,
      }),
    },
    {
      name: 'Facebook Leads',
      xml: buildVisualWorksheetXml({
        title:
          '🔵 TIDYUPS CLEANING — FACEBOOK LEADS (META AD FORMS)  •  JOBBER ORDER: 1. CLIENT → 2. QUOTE',
        bannerStyle: 2,
        tabColorRgb: 'FF1877F2',
        leads: fbLeads,
        allLeadsForSummary: leads,
        quotes,
        defaultCategory: 'FACEBOOK',
        resolveJobberWebUri,
      }),
    },
    {
      name: 'ScrubbyBuilder Leads',
      xml: buildTwentyColumnWebhookSheetXml(appLeadHeaders, leads),
    },
  ];

  const zip = new JSZip();

  const sheetOverrides = sheetsConfig
    .map(
      (_, idx) =>
        `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('\n  ');

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  const wbSheetEntries = sheetsConfig
    .map(
      (s, idx) =>
        `<sheet name="${xmlEscape(s.name)}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`
    )
    .join('\n    ');

  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${wbSheetEntries}
  </sheets>
</workbook>`
  );

  const wbRelsEntries = sheetsConfig
    .map(
      (_, idx) =>
        `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`
    )
    .join('\n  ');

  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRelsEntries}
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  zip.file('xl/styles.xml', buildStylesXml());

  sheetsConfig.forEach((s, idx) => {
    zip.file(`xl/worksheets/sheet${idx + 1}.xml`, s.xml);
  });

  const arrayBuf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return Buffer.from(arrayBuf);
}
