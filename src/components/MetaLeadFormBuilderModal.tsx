import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Code2,
  Sparkles,
  Smartphone,
  FileJson,
  Layers,
  Send,
  Download,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Home,
  ArrowRight,
  Zap,
  Globe,
  ClipboardList
} from 'lucide-react';

interface MetaLeadFormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CustomQuestionSpec {
  type: 'CUSTOM';
  key: string;
  label: string;
  options: { value: string; key: string }[];
}

interface StandardQuestionSpec {
  type: 'FULL_NAME' | 'PHONE' | 'EMAIL' | 'STREET_ADDRESS' | 'CITY' | 'POST_CODE';
  key: string;
}

type QuestionSpec = CustomQuestionSpec | StandardQuestionSpec;

interface LeadFormPreset {
  id: 'all_in_one' | 'move_out' | 'deep_clean';
  badge: string;
  title: string;
  subtitle: string;
  accentGradient: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  buttonBg: string;
  formName: string;
  contextCard: {
    title: string;
    style: 'LIST_STYLE' | 'PARAGRAPH_STYLE';
    content: string[];
    button_text: string;
  };
  customQuestions: CustomQuestionSpec[];
  standardQuestions: StandardQuestionSpec[];
  privacyPolicy: {
    url: string;
    link_text: string;
  };
  thankYouPage: {
    title: string;
    body: string;
    button_text: string;
    button_type: 'VIEW_WEBSITE';
    website_url: string;
  };
  sampleTestLead: {
    customerName: string;
    phone: string;
    email: string;
    address: string;
    serviceType: string;
    bedrooms: number;
    bathrooms: number;
    preferredDate: string;
    notes: string;
  };
}

const PRESETS: LeadFormPreset[] = [
  {
    id: 'all_in_one',
    badge: 'MOST POPULAR • ALL 3 TIERS',
    title: 'All-in-One Cleaning Instant Quote Form',
    subtitle: 'Lets leads pick Move-Out, Deep Cleaning, or Standard Cleaning + Beds/Baths',
    accentGradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    accentBorder: 'border-emerald-500/40',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-300',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-500',
    formName: 'TidyUps Cleaning - Instant Quote & $10 Off Promo (2025)',
    contextCard: {
      title: 'Get Your Instant Cleaning Quote + $10 Off Today!',
      style: 'LIST_STYLE',
      content: [
        '✅ 2 Professional Cleaners & All Eco-Friendly Supplies Included',
        '✅ 100% Landlord Inspection & Satisfaction Guarantee',
        '✅ Instant Exact Quote Sent via Text & Email in Under 60 Seconds',
        '✅ Move-Out, Deep Cleaning & Recurring Basic Cleaning Available'
      ],
      button_text: 'Calculate My Cleaning Quote'
    },
    customQuestions: [
      {
        type: 'CUSTOM',
        key: 'service_type',
        label: 'What type of cleaning service do you need?',
        options: [
          { value: 'Move-Out / Move-In Cleaning (Includes Inside Appliances)', key: 'move_out_cleaning' },
          { value: 'Deep Cleaning (Top-to-Bottom Home Reset)', key: 'deep_cleaning' },
          { value: 'Standard / Basic Cleaning (Maintenance Clean)', key: 'standard_cleaning' },
          { value: 'Post-Renovation / Commercial Cleaning', key: 'post_reno_cleaning' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'bedrooms',
        label: 'How many bedrooms are in your home?',
        options: [
          { value: '1 Bedroom / Studio', key: 'bed_1' },
          { value: '2 Bedrooms', key: 'bed_2' },
          { value: '3 Bedrooms', key: 'bed_3' },
          { value: '4 Bedrooms', key: 'bed_4' },
          { value: '5+ Bedrooms', key: 'bed_5_plus' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'bathrooms',
        label: 'How many bathrooms need cleaning?',
        options: [
          { value: '1 Bathroom', key: 'bath_1' },
          { value: '1.5 Bathrooms', key: 'bath_1_5' },
          { value: '2 Bathrooms', key: 'bath_2' },
          { value: '2.5 Bathrooms', key: 'bath_2_5' },
          { value: '3+ Bathrooms', key: 'bath_3_plus' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'preferred_date',
        label: 'When would you ideally like your cleaning scheduled?',
        options: [
          { value: 'As Soon As Possible (Within 48 Hours)', key: 'asap_48h' },
          { value: 'This Week', key: 'this_week' },
          { value: 'Next Week', key: 'next_week' },
          { value: 'End of the Month (Move-Out Date)', key: 'end_of_month' },
          { value: 'Flexible / Just Comparing Quotes', key: 'flexible' }
        ]
      }
    ],
    standardQuestions: [
      { type: 'FULL_NAME', key: 'full_name' },
      { type: 'PHONE', key: 'phone_number' },
      { type: 'EMAIL', key: 'email' },
      { type: 'STREET_ADDRESS', key: 'street_address' },
      { type: 'CITY', key: 'city' },
      { type: 'POST_CODE', key: 'post_code' }
    ],
    privacyPolicy: {
      url: 'https://app.tidyupscleaning.com/booking',
      link_text: 'TidyUps Cleaning Service Inc. Privacy Policy & Terms'
    },
    thankYouPage: {
      title: 'Your $10 Off Cleaning Quote Is Being Prepared!',
      body: 'We just received your home details! Check your text messages for your itemized quote, or tap below to pick your exact date & time slot online right now.',
      button_text: 'Pick My Date & View Price Online',
      button_type: 'VIEW_WEBSITE',
      website_url: 'https://app.tidyupscleaning.com/booking'
    },
    sampleTestLead: {
      customerName: 'Megan Thornton (Meta Ad Test)',
      phone: '780-555-0194',
      email: 'megan.thornton.test@example.com',
      address: '10420 Jasper Ave NW, Edmonton, AB',
      serviceType: 'Move-Out Cleaning',
      bedrooms: 3,
      bathrooms: 3,
      preferredDate: 'This Week',
      notes: 'Meta Lead Form Instant Quote ($10 Off Promo) - 3Bed 3Bath Move-Out Cleaning'
    }
  },
  {
    id: 'move_out',
    badge: 'ROSE TIER • MOVE-OUT SPECIAL',
    title: 'Move-Out & Landlord Inspection Lead Form',
    subtitle: 'High-converting form tailored for tenants, landlords, and home sellers',
    accentGradient: 'from-rose-600 via-pink-600 to-fuchsia-600',
    accentBorder: 'border-rose-500/40',
    accentBg: 'bg-rose-500/10',
    accentText: 'text-rose-300',
    buttonBg: 'bg-rose-600 hover:bg-rose-500',
    formName: 'TidyUps Move-Out Cleaning - 100% Deposit Back Guarantee ($10 Off)',
    contextCard: {
      title: 'Pass Your Move-Out Inspection Guaranteed + Get $10 Off!',
      style: 'LIST_STYLE',
      content: [
        '🧹 Inside Fridge, Inside Oven, Cabinets, Drawers & Baseboards Included',
        '🪟 Interior Windows, Tracks, Sills, Doors, Walls & Light Fixtures',
        '👥 2 Pro Cleaners Dispatched — Fast Turnaround for Key Handover',
        '💯 100% Landlord & Property Manager Inspection Checklist Covered'
      ],
      button_text: 'Get My Move-Out Quote'
    },
    customQuestions: [
      {
        type: 'CUSTOM',
        key: 'service_type',
        label: 'Which Move-Out / Move-In package do you need?',
        options: [
          { value: 'Full Move-Out Cleaning (Landlord Checklist + Appliances)', key: 'move_out_cleaning' },
          { value: 'Move-In Cleaning (Sanitize Before Unpacking)', key: 'move_in_cleaning' },
          { value: 'Move-Out + Carpet Steam Cleaning Add-On', key: 'move_out_plus_carpet' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'bedrooms',
        label: 'How many bedrooms is the property?',
        options: [
          { value: '1 Bedroom / Condo', key: 'bed_1' },
          { value: '2 Bedrooms', key: 'bed_2' },
          { value: '3 Bedrooms', key: 'bed_3' },
          { value: '4 Bedrooms', key: 'bed_4' },
          { value: '5+ Bedrooms', key: 'bed_5_plus' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'bathrooms',
        label: 'How many bathrooms are in the property?',
        options: [
          { value: '1 Bathroom', key: 'bath_1' },
          { value: '1.5 Bathrooms', key: 'bath_1_5' },
          { value: '2 Bathrooms', key: 'bath_2' },
          { value: '2.5 Bathrooms', key: 'bath_2_5' },
          { value: '3+ Bathrooms', key: 'bath_3_plus' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'preferred_date',
        label: 'When is your move-out / inspection date?',
        options: [
          { value: 'Urgent (Within 24–48 Hours)', key: 'urgent_48h' },
          { value: 'This Week', key: 'this_week' },
          { value: 'End of This Month', key: 'end_of_month' },
          { value: '1st of Next Month', key: 'first_of_next_month' }
        ]
      }
    ],
    standardQuestions: [
      { type: 'FULL_NAME', key: 'full_name' },
      { type: 'PHONE', key: 'phone_number' },
      { type: 'EMAIL', key: 'email' },
      { type: 'STREET_ADDRESS', key: 'street_address' },
      { type: 'CITY', key: 'city' },
      { type: 'POST_CODE', key: 'post_code' }
    ],
    privacyPolicy: {
      url: 'https://app.tidyupscleaning.com/booking',
      link_text: 'TidyUps Cleaning Service Inc. Privacy Policy'
    },
    thankYouPage: {
      title: 'Your Move-Out Quote Is Ready!',
      body: 'We have locked in your $10 Off Move-Out Promo! Tap below to view your itemized breakdown and reserve your move-out date before slots fill up.',
      button_text: 'Reserve My Move-Out Date',
      button_type: 'VIEW_WEBSITE',
      website_url: 'https://app.tidyupscleaning.com/booking'
    },
    sampleTestLead: {
      customerName: 'Jordan Vance (Move-Out Ad Test)',
      phone: '780-555-0288',
      email: 'jordan.vance.test@example.com',
      address: '8815 112 St NW, Edmonton, AB',
      serviceType: 'Move-Out Cleaning',
      bedrooms: 3,
      bathrooms: 2,
      preferredDate: 'End of This Month',
      notes: 'Meta Move-Out Special Form - Full Landlord Checklist + Inside Fridge & Oven'
    }
  },
  {
    id: 'deep_clean',
    badge: 'PURPLE TIER • DEEP CLEAN RESET',
    title: 'Deep Cleaning & Total Home Reset Form',
    subtitle: 'Designed for busy families & homeowners wanting a top-to-bottom scrub',
    accentGradient: 'from-purple-600 via-violet-600 to-indigo-600',
    accentBorder: 'border-purple-500/40',
    accentBg: 'bg-purple-500/10',
    accentText: 'text-purple-300',
    buttonBg: 'bg-purple-600 hover:bg-purple-500',
    formName: 'TidyUps Deep Cleaning - Top-to-Bottom Home Reset ($10 Off)',
    contextCard: {
      title: 'Give Your Home a Sparkling Top-to-Bottom Deep Clean!',
      style: 'LIST_STYLE',
      content: [
        '✨ Hand-Scrubbed Bathrooms, Tile Grout, Showers, Tubs & Fixtures',
        '✨ Kitchen Degreasing, Countertops, Backsplash & Appliance Exteriors',
        '✨ Baseboards, Door Frames, Window Sills, Ceiling Fans & Blinds Dusted',
        '✨ 2 Vetted, Insured Cleaners + $10 Off First-Time Deep Clean'
      ],
      button_text: 'See My Deep Clean Price'
    },
    customQuestions: [
      {
        type: 'CUSTOM',
        key: 'service_type',
        label: 'Which cleaning package fits your home best?',
        options: [
          { value: 'Full Top-to-Bottom Deep Cleaning', key: 'deep_cleaning' },
          { value: 'Deep Clean + Inside Fridge & Oven Add-On', key: 'deep_clean_appliances' },
          { value: 'Deep Clean First, Then Bi-Weekly Standard Clean', key: 'deep_then_recurring' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'bedrooms',
        label: 'How many bedrooms are in your home?',
        options: [
          { value: '1–2 Bedrooms', key: 'bed_2' },
          { value: '3 Bedrooms', key: 'bed_3' },
          { value: '4 Bedrooms', key: 'bed_4' },
          { value: '5+ Bedrooms', key: 'bed_5_plus' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'bathrooms',
        label: 'How many bathrooms are in your home?',
        options: [
          { value: '1 Bathroom', key: 'bath_1' },
          { value: '2 Bathrooms', key: 'bath_2' },
          { value: '2.5 Bathrooms', key: 'bath_2_5' },
          { value: '3+ Bathrooms', key: 'bath_3_plus' }
        ]
      },
      {
        type: 'CUSTOM',
        key: 'preferred_date',
        label: 'What day or time of week works best for you?',
        options: [
          { value: 'This Week (Morning 9:00 AM)', key: 'this_week_am' },
          { value: 'This Week (Afternoon 1:00 PM)', key: 'this_week_pm' },
          { value: 'Weekend Availability (Saturday / Sunday)', key: 'weekend' },
          { value: 'Next Week', key: 'next_week' }
        ]
      }
    ],
    standardQuestions: [
      { type: 'FULL_NAME', key: 'full_name' },
      { type: 'PHONE', key: 'phone_number' },
      { type: 'EMAIL', key: 'email' },
      { type: 'STREET_ADDRESS', key: 'street_address' },
      { type: 'CITY', key: 'city' },
      { type: 'POST_CODE', key: 'post_code' }
    ],
    privacyPolicy: {
      url: 'https://app.tidyupscleaning.com/booking',
      link_text: 'TidyUps Cleaning Service Inc. Privacy Policy'
    },
    thankYouPage: {
      title: 'Your Deep Cleaning Quote Is On Its Way!',
      body: 'Thank you! We are calculating your exact Deep Cleaning quote with your $10 Off promo applied. Tap below to pick your preferred date online.',
      button_text: 'Book My Deep Clean Online',
      button_type: 'VIEW_WEBSITE',
      website_url: 'https://app.tidyupscleaning.com/booking'
    },
    sampleTestLead: {
      customerName: 'Claire Henderson (Deep Clean Ad Test)',
      phone: '780-555-0341',
      email: 'claire.henderson.test@example.com',
      address: '14210 103 Ave NW, Edmonton, AB',
      serviceType: 'Deep Cleaning',
      bedrooms: 3,
      bathrooms: 2.5,
      preferredDate: 'This Week (Morning 9:00 AM)',
      notes: 'Meta Deep Clean Reset Form ($10 Off Promo) - 3Bed 2.5Bath Deep Cleaning'
    }
  }
];

export const MetaLeadFormBuilderModal: React.FC<MetaLeadFormBuilderModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<LeadFormPreset['id']>('all_in_one');
  const [activeTab, setActiveTab] = useState<'api_json' | 'quick_copy' | 'webhook_json'>('api_json');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState<'intro' | 'questions' | 'contact' | 'thankyou'>('questions');
  const [sendingTestLead, setSendingTestLead] = useState(false);
  const [testLeadResult, setTestLeadResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const preset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  // Official Meta Graph API `POST /{page-id}/leadgen_forms` payload
  const metaGraphApiPayload = {
    name: preset.formName,
    locale: 'EN_US',
    block_display_for_non_targeted_viewer: false,
    follow_up_action_url: 'https://app.tidyupscleaning.com/booking',
    is_optimized_for_quality: true,
    question_page_custom_headline: 'Tell Us About Your Home for an Instant Exact Price',
    context_card: preset.contextCard,
    questions: [...preset.customQuestions, ...preset.standardQuestions] as QuestionSpec[],
    privacy_policy: preset.privacyPolicy,
    thank_you_page: preset.thankYouPage
  };

  // Webhook / CRM Integration Payload (matches `/api/webhooks/leads` automatically)
  const webhookIntegrationSpec = {
    webhook_endpoint: 'https://app.tidyupscleaning.com/api/webhooks/leads',
    facebook_native_webhook: 'https://app.tidyupscleaning.com/api/facebook/webhook',
    verify_token: 'tidyups_verify_token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    auto_actions_triggered: [
      '1. Adds lead directly to 7-Tab Clean Leads Sheet (Facebook Leads 1)',
      '2. Calculates exact TidyUps item price + $20.00 Fuel Surcharge + -$10.00 Promo Discount + 12.5% Federal Tax & Supplies + $100.00 Required Deposit',
      '3. Creates Client & Draft Quote automatically in Jobber CRM'
    ],
    sample_meta_lead_payload: {
      source: 'Facebook Lead Form',
      form_name: preset.formName,
      full_name: '{{full_name}}',
      phone_number: '{{phone_number}}',
      email: '{{email}}',
      street_address: '{{street_address}}',
      city: '{{city}}',
      post_code: '{{post_code}}',
      service_type: '{{service_type}}',
      bedrooms: '{{bedrooms}}',
      bathrooms: '{{bathrooms}}',
      preferred_date: '{{preferred_date}}',
      notes: 'Submitted via Meta Instant Lead Form ($10 Off Promo)'
    }
  };

  const metaJsonString = JSON.stringify(metaGraphApiPayload, null, 2);
  const webhookJsonString = JSON.stringify(webhookIntegrationSpec, null, 2);

  const curlCommandString = `curl -X POST "https://graph.facebook.com/v21.0/YOUR_PAGE_ID/leadgen_forms" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_PAGE_ACCESS_TOKEN" \\
  -d '${JSON.stringify(metaGraphApiPayload)}'`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([metaJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tidyups-meta-lead-form-${preset.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendTestLead = async () => {
    setSendingTestLead(true);
    setTestLeadResult(null);
    try {
      const response = await fetch('/api/webhooks/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Facebook Lead Form',
          customerName: preset.sampleTestLead.customerName,
          phone: preset.sampleTestLead.phone,
          email: preset.sampleTestLead.email,
          address: preset.sampleTestLead.address,
          serviceType: preset.sampleTestLead.serviceType,
          bedrooms: preset.sampleTestLead.bedrooms,
          bathrooms: preset.sampleTestLead.bathrooms,
          preferredDate: preset.sampleTestLead.preferredDate,
          notes: preset.sampleTestLead.notes
        })
      });
      const data = await response.json();
      if (response.ok) {
        setTestLeadResult({
          ok: true,
          message: `Test Meta Lead (${preset.sampleTestLead.customerName}) synced to 7-Tab Clean Leads & Jobber Draft Quotes!`
        });
      } else {
        setTestLeadResult({
          ok: false,
          message: data?.error || 'Could not send test lead.'
        });
      }
    } catch (err: any) {
      setTestLeadResult({
        ok: false,
        message: err?.message || 'Network error while testing Meta Lead webhook.'
      });
    } finally {
      setSendingTestLead(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-7xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Gradient Header */}
        <div className={`bg-gradient-to-r ${preset.accentGradient} p-5 sm:p-6 text-white relative`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0 shadow-lg">
                <FileJson className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-black/30 border border-white/20 text-[11px] font-bold uppercase tracking-wider">
                    Meta Ads Instant Lead Form Studio
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-[11px] font-semibold">
                    Auto-Syncs to 7-Tab Sheet + Jobber Draft Quote
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  TidyUps Meta Lead Form API JSON & Copy-Paste Kit
                </h2>
                <p className="text-xs sm:text-sm text-white/85 mt-0.5">
                  Copy the complete Meta Graph API <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-xs">leadgen_forms</code> JSON or copy individual fields directly into Meta Ads Manager.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleCopy(metaJsonString, 'header_full_json')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer"
              >
                {copiedKey === 'header_full_json' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied Meta API JSON!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full Meta API JSON</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black/30 hover:bg-black/45 border border-white/25 text-white font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .JSON</span>
              </button>

              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-black/30 hover:bg-black/50 border border-white/20 text-white transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Preset Selector Bar (3 Color-Coded Campaign Templates) */}
        <div className="bg-zinc-900/90 border-b border-zinc-800 px-5 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>1. Choose Your Meta Ad Campaign Template:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-4xl">
              {PRESETS.map((item) => {
                const isSelected = item.id === selectedPresetId;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedPresetId(item.id)}
                    className={`text-left px-3.5 py-2.5 rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? `${item.accentBg} ${item.accentBorder} ring-1 ring-white/20 shadow-md`
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSelected ? item.accentText : 'text-zinc-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                      {isSelected && <CheckCircle2 className={`w-3.5 h-3.5 ${item.accentText}`} />}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5 truncate">{item.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Grid: Left = Code / Copy-Paste Cards, Right = Live Meta Instant Form Mobile Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
          {/* Left 7 Columns: JSON & Quick-Copy Studio */}
          <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col gap-5 overflow-y-auto">
            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('api_json')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'api_json'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  <span>Meta API JSON (leadgen_forms)</span>
                </button>

                <button
                  onClick={() => setActiveTab('quick_copy')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'quick_copy'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Ads Manager Copy-Paste Fields</span>
                </button>

                <button
                  onClick={() => setActiveTab('webhook_json')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'webhook_json'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>CRM Webhook JSON & Live Test</span>
                </button>
              </div>
            </div>

            {/* TAB 1: META GRAPH API JSON */}
            {activeTab === 'api_json' && (
              <div className="flex flex-col gap-4">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Meta Graph API • Instant Form Payload
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        Ready to Paste into Meta Graph API Explorer or Ads Automation
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(metaJsonString, 'main_json_box')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        {copiedKey === 'main_json_box' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied JSON!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleCopy(curlCommandString, 'curl_box')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                      >
                        {copiedKey === 'curl_box' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied cURL!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy cURL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Every field key (<code className="text-emerald-300">service_type</code>,{' '}
                    <code className="text-emerald-300">bedrooms</code>,{' '}
                    <code className="text-emerald-300">bathrooms</code>,{' '}
                    <code className="text-emerald-300">preferred_date</code>,{' '}
                    <code className="text-emerald-300">full_name</code>,{' '}
                    <code className="text-emerald-300">phone_number</code>,{' '}
                    <code className="text-emerald-300">email</code>) is pre-mapped to your TidyUps pricing calculator so leads automatically get the $20 Fuel Surcharge, -$10 Promo Discount, 12.5% Tax & Supplies, and $100 Deposit in Jobber.
                  </p>
                </div>

                {/* Code Block */}
                <div className="relative rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
                    <span>POST https://graph.facebook.com/v21.0/&#123;page-id&#125;/leadgen_forms</span>
                    <span className="text-emerald-400 font-semibold">Valid Meta v21.0 Schema</span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[420px] leading-relaxed select-all">
                    {metaJsonString}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 2: META ADS MANAGER FIELD-BY-FIELD QUICK COPY */}
            {activeTab === 'quick_copy' && (
              <div className="flex flex-col gap-4">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-1">
                    Creating the Form Inside Meta Ads Manager UI?
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Click any <strong>Copy</strong> button below and paste directly into the corresponding box in Meta Ads Manager &rarr; <strong>Instant Forms</strong> &rarr; <strong>Create Form</strong>.
                  </p>
                </div>

                {/* Form Name + Intro Card */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Step 1 • Form Name & Intro Section
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-500 font-semibold">Form Name</div>
                      <div className="text-xs font-bold text-white truncate">{preset.formName}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(preset.formName, 'copy_form_name')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'copy_form_name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'copy_form_name' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-500 font-semibold">Intro Headline</div>
                      <div className="text-xs font-bold text-white">{preset.contextCard.title}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(preset.contextCard.title, 'copy_intro_headline')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'copy_intro_headline' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'copy_intro_headline' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-500 font-semibold mb-1">Intro Benefits List</div>
                      <ul className="space-y-1 text-xs text-zinc-200">
                        {preset.contextCard.content.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => handleCopy(preset.contextCard.content.join('\n'), 'copy_intro_bullets')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'copy_intro_bullets' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'copy_intro_bullets' ? 'Copied' : 'Copy All'}</span>
                    </button>
                  </div>
                </div>

                {/* Custom Questions Cards */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Step 2 • Custom Multiple-Choice Questions (4 Questions)
                  </span>

                  {preset.customQuestions.map((q, idx) => {
                    const optionsText = q.options.map((o) => o.value).join('\n');
                    return (
                      <div key={q.key} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mr-2">
                              Question {idx + 1} • Key: {q.key}
                            </span>
                            <span className="text-xs font-bold text-white">{q.label}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(q.label, `q_label_${q.key}`)}
                            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-white shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === `q_label_${q.key}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Copy Question</span>
                          </button>
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-1 border-t border-zinc-900">
                          <div className="flex flex-wrap gap-1.5">
                            {q.options.map((opt) => (
                              <span
                                key={opt.key}
                                onClick={() => handleCopy(opt.value, `opt_${q.key}_${opt.key}`)}
                                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-200 cursor-pointer flex items-center gap-1"
                                title="Click to copy option"
                              >
                                <span>{opt.value}</span>
                                {copiedKey === `opt_${q.key}_${opt.key}` && (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                )}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleCopy(optionsText, `q_opts_${q.key}`)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === `q_opts_${q.key}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>Copy Choices</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Privacy Policy & Completion Screen */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Step 3 • Privacy Policy & Completion Screen Links
                  </span>

                  <div className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-500 font-semibold">Privacy Policy & Website Action URL</div>
                      <div className="text-xs font-mono text-emerald-300 truncate">
                        {preset.thankYouPage.website_url}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(preset.thankYouPage.website_url, 'copy_booking_url')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'copy_booking_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy URL</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-500 font-semibold">Completion Screen Headline & Body</div>
                      <div className="text-xs font-bold text-white">{preset.thankYouPage.title}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{preset.thankYouPage.body}</div>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(`${preset.thankYouPage.title}\n\n${preset.thankYouPage.body}`, 'copy_thankyou')
                      }
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'copy_thankyou' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Text</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: WEBHOOK PAYLOAD & 1-CLICK LIVE TEST */}
            {activeTab === 'webhook_json' && (
              <div className="flex flex-col gap-4">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                        Automatic Lead Routing • 7-Tab Sheet + Jobber Draft Quote
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        Meta Leads Webhook URL & Field Mapping JSON
                      </h3>
                    </div>

                    <button
                      onClick={handleSendTestLead}
                      disabled={sendingTestLead}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {sendingTestLead
                          ? 'Sending Test Lead...'
                          : 'Send Test Meta Lead to App & Jobber'}
                      </span>
                    </button>
                  </div>

                  {testLeadResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                        testLeadResult.ok
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{testLeadResult.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-zinc-500">
                          Direct Lead Intake Webhook URL
                        </div>
                        <div className="text-xs font-mono text-emerald-300 truncate">
                          https://app.tidyupscleaning.com/api/webhooks/leads
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy('https://app.tidyupscleaning.com/api/webhooks/leads', 'copy_webhook_1')
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'copy_webhook_1' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-zinc-500">
                          Meta Graph Native Webhook URL
                        </div>
                        <div className="text-xs font-mono text-purple-300 truncate">
                          https://app.tidyupscleaning.com/api/facebook/webhook
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy('https://app.tidyupscleaning.com/api/facebook/webhook', 'copy_webhook_2')
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'copy_webhook_2' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
                    <span>POST https://app.tidyupscleaning.com/api/webhooks/leads</span>
                    <button
                      onClick={() => handleCopy(webhookJsonString, 'copy_webhook_spec')}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-sans font-bold cursor-pointer"
                    >
                      {copiedKey === 'copy_webhook_spec' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied Webhook JSON</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Webhook JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-purple-300 overflow-x-auto max-h-[360px] leading-relaxed select-all">
                    {webhookJsonString}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Right 5 Columns: Interactive Mobile Preview of the Meta Lead Form */}
          <div className="lg:col-span-5 bg-zinc-900/40 p-5 sm:p-6 flex flex-col items-center justify-start">
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Live Meta Ad Form Preview
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
                  {(['intro', 'questions', 'contact', 'thankyou'] as const).map((step) => (
                    <button
                      key={step}
                      onClick={() => setPreviewStep(step)}
                      className={`px-2 py-1 rounded-md font-semibold capitalize transition cursor-pointer ${
                        previewStep === step
                          ? 'bg-emerald-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {step}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Mockup Container */}
              <div className="rounded-[28px] border-4 border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col">
                {/* Phone Top Bar */}
                <div className={`bg-gradient-to-r ${preset.accentGradient} p-4 text-white`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-extrabold text-sm">
                      TU
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">TidyUps Cleaning Service Inc.</div>
                      <div className="text-[10px] text-white/80 flex items-center gap-1">
                        <span>Sponsored • Instant Quote Form</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px]">
                    <span className="font-semibold">🎁 $10 Off Promo + 2 Pro Cleaners</span>
                    <span className="px-2 py-0.5 rounded bg-black/25 font-mono text-[10px]">60s Quote</span>
                  </div>
                </div>

                {/* Phone Body Step Content */}
                <div className="p-4 space-y-3.5 min-h-[390px] flex flex-col justify-between bg-zinc-950">
                  {previewStep === 'intro' && (
                    <div className="space-y-3">
                      <div className="text-sm font-bold text-white leading-snug">
                        {preset.contextCard.title}
                      </div>
                      <div className="space-y-2 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
                        {preset.contextCard.content.map((item, idx) => (
                          <div key={idx} className="text-xs text-zinc-200 leading-relaxed">
                            {item}
                          </div>
                        ))}
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 space-y-1">
                        <div className="font-bold">Included in Your Instant Quote:</div>
                        <div>• Service Package (2 Pro Cleaners)</div>
                        <div>• Fuel Surcharge ($20.00) & -$10.00 Ad Promo</div>
                        <div>• Federal Tax & Supplies (12.5%)</div>
                      </div>
                    </div>
                  )}

                  {previewStep === 'questions' && (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {preset.customQuestions.map((q) => (
                        <div key={q.key} className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2">
                          <div className="text-xs font-bold text-white">{q.label}</div>
                          <div className="space-y-1.5">
                            {q.options.map((opt, idx) => (
                              <div
                                key={opt.key}
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                                  idx === 0
                                    ? `${preset.accentBg} ${preset.accentBorder} text-white font-semibold`
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                                }`}
                              >
                                <span>{opt.value}</span>
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                    idx === 0 ? 'border-emerald-400 bg-emerald-500' : 'border-zinc-600'
                                  }`}
                                >
                                  {idx === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {previewStep === 'contact' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Auto-Filled by Meta (Contact Info)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Meta automatically pre-fills these fields from the customer&apos;s profile so they can submit in one tap:
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: 'Full Name', sample: preset.sampleTestLead.customerName, key: 'full_name' },
                          { label: 'Phone Number', sample: preset.sampleTestLead.phone, key: 'phone_number' },
                          { label: 'Email Address', sample: preset.sampleTestLead.email, key: 'email' },
                          { label: 'Street Address', sample: preset.sampleTestLead.address, key: 'street_address' }
                        ].map((field) => (
                          <div key={field.key} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                            <div className="text-[10px] text-zinc-500 font-semibold">{field.label}</div>
                            <div className="text-xs text-white font-medium">{field.sample}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewStep === 'thankyou' && (
                    <div className="space-y-3 text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-white">{preset.thankYouPage.title}</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{preset.thankYouPage.body}</p>
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left text-[11px] text-zinc-300 space-y-1">
                        <div className="font-bold text-emerald-400">Behind the Scenes (Instant):</div>
                        <div>✓ Added to 7-Tab Clean Leads Sheet</div>
                        <div>✓ Created Client + Draft Quote in Jobber</div>
                        <div>✓ Redirects to Color-Coded Booking Page</div>
                      </div>
                    </div>
                  )}

                  {/* Bottom CTA inside Phone */}
                  <div className="pt-3 border-t border-zinc-800">
                    {previewStep !== 'thankyou' ? (
                      <button
                        onClick={() => {
                          if (previewStep === 'intro') setPreviewStep('questions');
                          else if (previewStep === 'questions') setPreviewStep('contact');
                          else setPreviewStep('thankyou');
                        }}
                        className={`w-full py-2.5 rounded-xl ${preset.buttonBg} text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer`}
                      >
                        <span>
                          {previewStep === 'intro'
                            ? preset.contextCard.button_text
                            : previewStep === 'questions'
                            ? 'Next: Confirm Contact Info'
                            : 'Submit & View Instant Quote'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <a
                        href="https://app.tidyupscleaning.com/booking"
                        target="_blank"
                        rel="noreferrer"
                        className={`w-full py-2.5 rounded-xl ${preset.buttonBg} text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition`}
                      >
                        <span>{preset.thankYouPage.button_text}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
