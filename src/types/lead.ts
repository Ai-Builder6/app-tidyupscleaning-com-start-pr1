export type LeadSource = 
  | 'All sources'
  | 'Website form'
  | 'From Jobber'
  | 'From Google Sheet'
  | 'Pasted message'
  | 'Phone call'
  | 'Facebook Ad'
  | 'Google Ad'
  | 'Instagram';

export type LeadStatus = 'New' | 'Converted' | 'Dismissed' | 'All';

export type LeadVerdict = 'Client' | 'Good lead' | 'Bad lead' | 'Spam' | 'Garbage';

export interface AdLeadItem {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode?: string;
  serviceRequested: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  dateOfServiceRequested?: string;
  source: LeadSource;
  sourceTab?: string; // e.g. "FB Leads_V2", "Google Leads_V3", "Tidy FB Leads_V1"
  campaignName?: string;
  formId?: string;
  adId?: string;
  dateReceived: string;
  status: 'New' | 'Converted' | 'Dismissed';
  verdict?: LeadVerdict;
  isJobberSynced?: boolean;
  jobberClientId?: string;
  quoteId?: string;
  quoteNumber?: string;
  notes?: string;
  missingPhone?: boolean;
  quotedAmount?: number;
  convertedJobId?: string;
}

export interface QuickQuoteCalculation {
  hours: number;
  hourlyRate: number;
  crewSize: 1 | 2 | 'custom';
  fuelSurcharge: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  deposit: number;
  laborTotal: number;
  subtotal: number;
  totalQuotedPrice: number;
  hearAboutUs: string;
  quoteNotes: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceAddress?: string;
  serviceType: string;
}
