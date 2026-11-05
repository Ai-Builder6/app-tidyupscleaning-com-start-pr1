import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Code2,
  Smartphone,
  FileJson,
  Layers,
  Send,
  Download,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Zap,
  ClipboardList,
  Plus,
  Trash2,
  Edit3,
  RotateCcw,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface MetaLeadFormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface CustomQuestionSpec {
  type: 'CUSTOM';
  key: string;
  label: string;
  options: { value: string; key: string }[];
}

export interface StandardQuestionSpec {
  type: 'FULL_NAME' | 'PHONE' | 'EMAIL' | 'STREET_ADDRESS' | 'CITY' | 'POST_CODE';
  key: string;
}

export type QuestionSpec = CustomQuestionSpec | StandardQuestionSpec;

export interface LeadFormPreset {
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
  questionPageHeadline: string;
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

const DEFAULT_PRESETS: LeadFormPreset[] = [
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
    questionPageHeadline: 'Tell Us About Your Home for an Instant Exact Price',
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
    questionPageHeadline: 'Tell Us About Your Property for an Instant Move-Out Price',
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
    questionPageHeadline: 'Tell Us About Your Home for an Instant Deep Clean Quote',
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

const ALL_STANDARD_CONTACT_FIELDS: {
  type: StandardQuestionSpec['type'];
  key: string;
  label: string;
}[] = [
  { type: 'FULL_NAME', key: 'full_name', label: 'Full Name' },
  { type: 'PHONE', key: 'phone_number', label: 'Phone Number' },
  { type: 'EMAIL', key: 'email', label: 'Email Address' },
  { type: 'STREET_ADDRESS', key: 'street_address', label: 'Street Address' },
  { type: 'CITY', key: 'city', label: 'City' },
  { type: 'POST_CODE', key: 'post_code', label: 'Postal Code' }
];

const STORAGE_KEY = 'tidyups_editable_meta_lead_presets_v1';

function slugifyKey(input: string, fallback = 'option'): string {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return clean || fallback;
}

export function buildMetaGraphApiPayload(preset: LeadFormPreset) {
  return {
    name: preset.formName,
    locale: 'EN_US',
    block_display_for_non_targeted_viewer: false,
    follow_up_action_url: preset.thankYouPage.website_url || 'https://app.tidyupscleaning.com/booking',
    is_optimized_for_quality: true,
    question_page_custom_headline:
      preset.questionPageHeadline || 'Tell Us About Your Home for an Instant Exact Price',
    context_card: preset.contextCard,
    questions: [...preset.customQuestions, ...preset.standardQuestions] as QuestionSpec[],
    privacy_policy: preset.privacyPolicy,
    thank_you_page: preset.thankYouPage
  };
}

export const MetaLeadFormBuilderModal: React.FC<MetaLeadFormBuilderModalProps> = ({
  isOpen,
  onClose
}) => {
  const [presets, setPresets] = useState<LeadFormPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_PRESETS.length) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PRESETS;
  });

  const [selectedPresetId, setSelectedPresetId] = useState<LeadFormPreset['id']>('all_in_one');
  const [activeTab, setActiveTab] = useState<
    'visual_editor' | 'api_json' | 'quick_copy' | 'webhook_json'
  >('visual_editor');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState<'intro' | 'questions' | 'contact' | 'thankyou'>('questions');
  const [sendingTestLead, setSendingTestLead] = useState(false);
  const [testLeadResult, setTestLeadResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Raw JSON Editor state for two-way editing
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);
  const [rawJsonSavedNotice, setRawJsonSavedNotice] = useState<string | null>(null);

  const preset = presets.find((p) => p.id === selectedPresetId) || presets[0];

  // Save presets to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // ignore
    }
  }, [presets]);

  // Keep rawJsonText synced whenever preset changes or user switches preset
  useEffect(() => {
    const payload = buildMetaGraphApiPayload(preset);
    setRawJsonText(JSON.stringify(payload, null, 2));
    setRawJsonError(null);
  }, [preset]);

  if (!isOpen) return null;

  const updateCurrentPreset = (updater: (current: LeadFormPreset) => LeadFormPreset) => {
    setPresets((prev) =>
      prev.map((item) => (item.id === selectedPresetId ? updater(item) : item))
    );
  };

  const handleResetCurrentPreset = () => {
    const defaultMatch = DEFAULT_PRESETS.find((d) => d.id === selectedPresetId);
    if (!defaultMatch) return;
    setPresets((prev) =>
      prev.map((item) => (item.id === selectedPresetId ? JSON.parse(JSON.stringify(defaultMatch)) : item))
    );
    setRawJsonError(null);
    setRawJsonSavedNotice('Reset to default TidyUps template!');
    setTimeout(() => setRawJsonSavedNotice(null), 2500);
  };

  // Handlers for editing Custom Questions & Answer Options
  const handleQuestionLabelChange = (qIdx: number, newLabel: string) => {
    updateCurrentPreset((curr) => {
      const nextQuestions = [...curr.customQuestions];
      nextQuestions[qIdx] = {
        ...nextQuestions[qIdx],
        label: newLabel
      };
      return { ...curr, customQuestions: nextQuestions };
    });
  };

  const handleQuestionKeyChange = (qIdx: number, newKey: string) => {
    updateCurrentPreset((curr) => {
      const nextQuestions = [...curr.customQuestions];
      nextQuestions[qIdx] = {
        ...nextQuestions[qIdx],
        key: slugifyKey(newKey, `question_${qIdx + 1}`)
      };
      return { ...curr, customQuestions: nextQuestions };
    });
  };

  const handleMoveQuestion = (qIdx: number, direction: 'up' | 'down') => {
    updateCurrentPreset((curr) => {
      const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
      if (targetIdx < 0 || targetIdx >= curr.customQuestions.length) return curr;
      const nextQuestions = [...curr.customQuestions];
      const temp = nextQuestions[qIdx];
      nextQuestions[qIdx] = nextQuestions[targetIdx];
      nextQuestions[targetIdx] = temp;
      return { ...curr, customQuestions: nextQuestions };
    });
  };

  const handleDeleteQuestion = (qIdx: number) => {
    updateCurrentPreset((curr) => ({
      ...curr,
      customQuestions: curr.customQuestions.filter((_, idx) => idx !== qIdx)
    }));
  };

  const handleAddQuestion = () => {
    updateCurrentPreset((curr) => {
      const newIndex = curr.customQuestions.length + 1;
      const newQ: CustomQuestionSpec = {
        type: 'CUSTOM',
        key: `custom_question_${newIndex}`,
        label: 'Any special requests or add-ons for your cleaning?',
        options: [
          { value: 'Inside Fridge & Inside Oven Cleaning', key: 'inside_fridge_oven' },
          { value: 'Interior Windows & Blinds', key: 'interior_windows' },
          { value: 'Pet Hair Removal / Extra Scrub', key: 'pet_hair' },
          { value: 'No Extra Add-Ons Needed', key: 'no_addons' }
        ]
      };
      return {
        ...curr,
        customQuestions: [...curr.customQuestions, newQ]
      };
    });
    setPreviewStep('questions');
  };

  const handleOptionValueChange = (qIdx: number, optIdx: number, newValue: string) => {
    updateCurrentPreset((curr) => {
      const nextQuestions = [...curr.customQuestions];
      const targetQ = nextQuestions[qIdx];
      const nextOptions = [...targetQ.options];
      nextOptions[optIdx] = {
        value: newValue,
        key: slugifyKey(newValue, `opt_${optIdx + 1}`)
      };
      nextQuestions[qIdx] = { ...targetQ, options: nextOptions };
      return { ...curr, customQuestions: nextQuestions };
    });
  };

  const handleAddOption = (qIdx: number) => {
    updateCurrentPreset((curr) => {
      const nextQuestions = [...curr.customQuestions];
      const targetQ = nextQuestions[qIdx];
      const nextOptNum = targetQ.options.length + 1;
      const newOptValue = `New Answer Choice ${nextOptNum}`;
      nextQuestions[qIdx] = {
        ...targetQ,
        options: [
          ...targetQ.options,
          { value: newOptValue, key: `option_${nextOptNum}_${Date.now().toString().slice(-3)}` }
        ]
      };
      return { ...curr, customQuestions: nextQuestions };
    });
  };

  const handleDeleteOption = (qIdx: number, optIdx: number) => {
    updateCurrentPreset((curr) => {
      const nextQuestions = [...curr.customQuestions];
      const targetQ = nextQuestions[qIdx];
      if (targetQ.options.length <= 1) return curr; // keep at least 1 option
      nextQuestions[qIdx] = {
        ...targetQ,
        options: targetQ.options.filter((_, idx) => idx !== optIdx)
      };
      return { ...curr, customQuestions: nextQuestions };
    });
  };

  const handleToggleStandardField = (fieldSpec: {
    type: StandardQuestionSpec['type'];
    key: string;
  }) => {
    updateCurrentPreset((curr) => {
      const exists = curr.standardQuestions.some((s) => s.type === fieldSpec.type);
      const nextStandard = exists
        ? curr.standardQuestions.filter((s) => s.type !== fieldSpec.type)
        : [...curr.standardQuestions, { type: fieldSpec.type, key: fieldSpec.key }];
      return { ...curr, standardQuestions: nextStandard };
    });
  };

  // Apply Raw JSON edits back to the visual state
  const handleRawJsonChange = (newText: string) => {
    setRawJsonText(newText);
    try {
      const parsed = JSON.parse(newText);
      setRawJsonError(null);

      // Sync parsed JSON back into the active preset
      updateCurrentPreset((curr) => {
        const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
        const customQs: CustomQuestionSpec[] = rawQuestions
          .filter((q: any) => q && q.type === 'CUSTOM')
          .map((q: any, idx: number) => ({
            type: 'CUSTOM' as const,
            key: String(q.key || `custom_${idx + 1}`),
            label: String(q.label || 'Custom Question'),
            options: Array.isArray(q.options)
              ? q.options.map((o: any, oIdx: number) => ({
                  value: String(o?.value ?? ''),
                  key: String(o?.key || slugifyKey(String(o?.value || ''), `opt_${oIdx + 1}`))
                }))
              : []
          }));

        const standardQs: StandardQuestionSpec[] = rawQuestions
          .filter((q: any) => q && q.type && q.type !== 'CUSTOM')
          .map((q: any) => ({
            type: q.type as StandardQuestionSpec['type'],
            key: String(q.key || slugifyKey(String(q.type), 'field'))
          }));

        return {
          ...curr,
          formName: typeof parsed.name === 'string' ? parsed.name : curr.formName,
          questionPageHeadline:
            typeof parsed.question_page_custom_headline === 'string'
              ? parsed.question_page_custom_headline
              : curr.questionPageHeadline,
          contextCard: parsed.context_card
            ? {
                title: String(parsed.context_card.title ?? curr.contextCard.title),
                style:
                  parsed.context_card.style === 'PARAGRAPH_STYLE' ? 'PARAGRAPH_STYLE' : 'LIST_STYLE',
                content: Array.isArray(parsed.context_card.content)
                  ? parsed.context_card.content.map((c: any) => String(c))
                  : curr.contextCard.content,
                button_text: String(
                  parsed.context_card.button_text ?? curr.contextCard.button_text
                )
              }
            : curr.contextCard,
          customQuestions: customQs.length > 0 ? customQs : curr.customQuestions,
          standardQuestions: standardQs.length > 0 ? standardQs : curr.standardQuestions,
          privacyPolicy: parsed.privacy_policy
            ? {
                url: String(parsed.privacy_policy.url ?? curr.privacyPolicy.url),
                link_text: String(parsed.privacy_policy.link_text ?? curr.privacyPolicy.link_text)
              }
            : curr.privacyPolicy,
          thankYouPage: parsed.thank_you_page
            ? {
                title: String(parsed.thank_you_page.title ?? curr.thankYouPage.title),
                body: String(parsed.thank_you_page.body ?? curr.thankYouPage.body),
                button_text: String(
                  parsed.thank_you_page.button_text ?? curr.thankYouPage.button_text
                ),
                button_type: 'VIEW_WEBSITE',
                website_url: String(
                  parsed.thank_you_page.website_url ?? curr.thankYouPage.website_url
                )
              }
            : curr.thankYouPage
        };
      });
    } catch (err: any) {
      setRawJsonError(err?.message || 'Invalid JSON syntax');
    }
  };

  const handleFormatRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed, null, 2));
      setRawJsonError(null);
      setRawJsonSavedNotice('JSON Formatted & Validated!');
      setTimeout(() => setRawJsonSavedNotice(null), 2000);
    } catch (err: any) {
      setRawJsonError(err?.message || 'Fix JSON syntax error before formatting.');
    }
  };

  const metaGraphApiPayload = buildMetaGraphApiPayload(preset);
  const metaJsonString = rawJsonError ? rawJsonText : JSON.stringify(metaGraphApiPayload, null, 2);

  // Dynamically build the CRM webhook sample payload including any new custom question keys the user added
  const dynamicCustomKeysObject: Record<string, string> = {};
  for (const q of preset.customQuestions) {
    dynamicCustomKeysObject[q.key] = `{{${q.key}}}`;
  }
  for (const s of preset.standardQuestions) {
    dynamicCustomKeysObject[s.key] = `{{${s.key}}}`;
  }

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
      ...dynamicCustomKeysObject,
      notes: 'Submitted via Meta Instant Lead Form ($10 Off Promo)'
    }
  };

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
          serviceType:
            preset.customQuestions[0]?.options[0]?.value || preset.sampleTestLead.serviceType,
          bedrooms: preset.sampleTestLead.bedrooms,
          bathrooms: preset.sampleTestLead.bathrooms,
          preferredDate: preset.sampleTestLead.preferredDate,
          notes: `${preset.formName} — Custom Questions: ${preset.customQuestions
            .map((q) => `${q.label} [${q.options[0]?.value || 'N/A'}]`)
            .join(' | ')}`
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
                    Editable Meta Lead Form Studio
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-[11px] font-semibold">
                    Add / Update Questions & Answers • Live JSON Sync
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  TidyUps Meta Lead Form Builder &amp; Editable API JSON
                </h2>
                <p className="text-xs sm:text-sm text-white/85 mt-0.5">
                  Add or edit any question or answer choice below — your Meta Graph API{' '}
                  <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-xs">
                    leadgen_forms
                  </code>{' '}
                  JSON and Phone Preview update automatically in real time.
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
                    <span>Copied Updated Meta JSON!</span>
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
                onClick={handleResetCurrentPreset}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-black/30 hover:bg-black/50 border border-white/20 text-white text-xs font-semibold transition cursor-pointer"
                title="Reset this preset back to the original TidyUps questions"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Default</span>
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
              <span>1. Select Campaign Template to Edit:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-4xl">
              {presets.map((item) => {
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

        {/* Main Content Grid: Left = Visual Editor / Editable JSON / Copy Cards, Right = Live Meta Instant Form Mobile Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
          {/* Left 7 Columns */}
          <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col gap-5 overflow-y-auto">
            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('visual_editor')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'visual_editor'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Questions &amp; Answers</span>
                </button>

                <button
                  onClick={() => setActiveTab('api_json')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'api_json'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Editable Meta API JSON</span>
                </button>

                <button
                  onClick={() => setActiveTab('quick_copy')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'quick_copy'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Ads Manager Copy-Paste</span>
                </button>

                <button
                  onClick={() => setActiveTab('webhook_json')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'webhook_json'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>CRM Webhook &amp; Live Test</span>
                </button>
              </div>
            </div>

            {rawJsonSavedNotice && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{rawJsonSavedNotice}</span>
              </div>
            )}

            {/* TAB 0: VISUAL QUESTION & ANSWER EDITOR */}
            {activeTab === 'visual_editor' && (
              <div className="flex flex-col gap-5">
                {/* Form Name & Intro Headline Editor */}
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Form Title &amp; Intro Card (Editable)
                    </span>
                    <span className="text-[11px] text-zinc-400">Auto-saves as you type</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Meta Form Name
                      </label>
                      <input
                        type="text"
                        value={preset.formName}
                        onChange={(e) =>
                          updateCurrentPreset((curr) => ({ ...curr, formName: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-white font-semibold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Intro Headline
                      </label>
                      <input
                        type="text"
                        value={preset.contextCard.title}
                        onChange={(e) =>
                          updateCurrentPreset((curr) => ({
                            ...curr,
                            contextCard: { ...curr.contextCard, title: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-white font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-zinc-400">
                        Intro Bullet Points (Shown on Form Intro Card)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrentPreset((curr) => ({
                            ...curr,
                            contextCard: {
                              ...curr.contextCard,
                              content: [
                                ...curr.contextCard.content,
                                '✅ $10 Off First-Time Promo Applied Automatically'
                              ]
                            }
                          }))
                        }
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet</span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {preset.contextCard.content.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) =>
                              updateCurrentPreset((curr) => {
                                const nextBullets = [...curr.contextCard.content];
                                nextBullets[bIdx] = e.target.value;
                                return {
                                  ...curr,
                                  contextCard: { ...curr.contextCard, content: nextBullets }
                                };
                              })
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-200 outline-none"
                          />
                          {preset.contextCard.content.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateCurrentPreset((curr) => ({
                                  ...curr,
                                  contextCard: {
                                    ...curr.contextCard,
                                    content: curr.contextCard.content.filter((_, i) => i !== bIdx)
                                  }
                                }))
                              }
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                              title="Remove bullet"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Custom Multiple-Choice Questions & Answers Editor */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Custom Questions &amp; Answer Choices ({preset.customQuestions.length})
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Click any question or answer below to edit it, add new answer choices, or add a brand-new question.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add New Question</span>
                    </button>
                  </div>

                  {preset.customQuestions.map((q, qIdx) => (
                    <div
                      key={`${qIdx}_${q.key}`}
                      className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                            Question #{qIdx + 1}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                            <span>Webhook Key:</span>
                            <input
                              type="text"
                              value={q.key}
                              onChange={(e) => handleQuestionKeyChange(qIdx, e.target.value)}
                              className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 focus:border-emerald-500 font-mono text-[11px] text-emerald-300 w-36 outline-none"
                              title="Field key used in Meta Lead Ads JSON & CRM webhook"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(qIdx, 'up')}
                            disabled={qIdx === 0}
                            className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Move question up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(qIdx, 'down')}
                            disabled={qIdx === preset.customQuestions.length - 1}
                            className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Move question down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Delete this question"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Label Input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                          Question Text (Shown to Customer)
                        </label>
                        <input
                          type="text"
                          value={q.label}
                          onChange={(e) => handleQuestionLabelChange(qIdx, e.target.value)}
                          placeholder="Enter your question..."
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-emerald-500 text-xs sm:text-sm font-bold text-white outline-none"
                        />
                      </div>

                      {/* Answer Options List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-zinc-400">
                            Multiple-Choice Answers ({q.options.length})
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Add Answer Choice</span>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="w-6 text-center text-[11px] font-mono text-zinc-500">
                                {optIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={opt.value}
                                onChange={(e) =>
                                  handleOptionValueChange(qIdx, optIdx, e.target.value)
                                }
                                placeholder="Answer option text..."
                                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-100 outline-none"
                              />
                              <span className="hidden sm:inline-block px-2 py-1 rounded bg-zinc-950 border border-zinc-900 font-mono text-[10px] text-zinc-500">
                                {opt.key}
                              </span>
                              {q.options.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOption(qIdx, optIdx)}
                                  className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-500/20 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                                  title="Delete this answer option"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Standard Contact Fields Toggles */}
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                      Auto-Filled Contact Fields (Meta Pre-Fill)
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Toggle which contact fields Meta automatically pre-fills from the customer&apos;s Facebook/Instagram account:
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STANDARD_CONTACT_FIELDS.map((field) => {
                      const isIncluded = preset.standardQuestions.some(
                        (s) => s.type === field.type
                      );
                      return (
                        <button
                          key={field.type}
                          type="button"
                          onClick={() => handleToggleStandardField(field)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            isIncluded
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              isIncluded ? 'text-emerald-400' : 'text-zinc-600'
                            }`}
                          />
                          <span>{field.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Thank-You Screen & Booking Redirect Editor */}
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Completion Screen &amp; Booking Link
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Thank-You Headline
                      </label>
                      <input
                        type="text"
                        value={preset.thankYouPage.title}
                        onChange={(e) =>
                          updateCurrentPreset((curr) => ({
                            ...curr,
                            thankYouPage: { ...curr.thankYouPage, title: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-white font-semibold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Button Text
                      </label>
                      <input
                        type="text"
                        value={preset.thankYouPage.button_text}
                        onChange={(e) =>
                          updateCurrentPreset((curr) => ({
                            ...curr,
                            thankYouPage: { ...curr.thankYouPage, button_text: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-white font-semibold outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Thank-You Message Body
                    </label>
                    <textarea
                      rows={2}
                      value={preset.thankYouPage.body}
                      onChange={(e) =>
                        updateCurrentPreset((curr) => ({
                          ...curr,
                          thankYouPage: { ...curr.thankYouPage, body: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Follow-Up Website / Online Booking URL
                    </label>
                    <input
                      type="text"
                      value={preset.thankYouPage.website_url}
                      onChange={(e) =>
                        updateCurrentPreset((curr) => ({
                          ...curr,
                          thankYouPage: { ...curr.thankYouPage, website_url: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs font-mono text-emerald-300 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: DIRECT EDITABLE META GRAPH API JSON */}
            {activeTab === 'api_json' && (
              <div className="flex flex-col gap-4">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Live Two-Way Editable JSON • Meta Graph API (leadgen_forms)
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        Type directly inside the JSON below or use the &ldquo;Edit Questions &amp; Answers&rdquo; tab
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleFormatRawJson}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                      >
                        Format &amp; Validate JSON
                      </button>
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
                    You can directly edit any question, answer choice, or field key inside the JSON editor below. Valid edits automatically update the Phone Preview on the right and save to your preset.
                  </p>
                </div>

                {rawJsonError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>JSON Syntax Notice: {rawJsonError}</span>
                  </div>
                )}

                {/* Editable JSON Textarea */}
                <div className="relative rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
                    <span>POST https://graph.facebook.com/v21.0/&#123;page-id&#125;/leadgen_forms</span>
                    <span className={rawJsonError ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                      {rawJsonError ? 'Check JSON Syntax' : '✓ Valid Meta v21.0 Schema (Editable)'}
                    </span>
                  </div>
                  <textarea
                    value={rawJsonText}
                    onChange={(e) => handleRawJsonChange(e.target.value)}
                    spellCheck={false}
                    rows={22}
                    className="w-full p-4 bg-zinc-950 text-xs font-mono text-emerald-300 focus:outline-none leading-relaxed resize-y"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: META ADS MANAGER FIELD-BY-FIELD QUICK COPY */}
            {activeTab === 'quick_copy' && (
              <div className="flex flex-col gap-4">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-1">
                    Copy &amp; Paste Your Updated Questions into Meta Ads Manager
                  </h3>
                  <p className="text-xs text-zinc-400">
                    All cards below reflect your latest custom questions and answer choices. Click any <strong>Copy</strong> button to paste directly into Meta Ads Manager.
                  </p>
                </div>

                {/* Form Name + Intro Card */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Step 1 • Form Name &amp; Intro Section
                  </span>

                  <div className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-500 font-semibold">Form Name</div>
                      <div className="text-xs font-bold text-white truncate">{preset.formName}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(preset.formName, 'copy_form_name')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'copy_form_name' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
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
                      {copiedKey === 'copy_intro_headline' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'copy_intro_headline' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-500 font-semibold mb-1">
                        Intro Benefits List
                      </div>
                      <ul className="space-y-1 text-xs text-zinc-200">
                        {preset.contextCard.content.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(preset.contextCard.content.join('\n'), 'copy_intro_bullets')
                      }
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'copy_intro_bullets' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'copy_intro_bullets' ? 'Copied' : 'Copy All'}</span>
                    </button>
                  </div>
                </div>

                {/* Custom Questions Cards */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Step 2 • Custom Multiple-Choice Questions ({preset.customQuestions.length} Questions)
                  </span>

                  {preset.customQuestions.map((q, idx) => {
                    const optionsText = q.options.map((o) => o.value).join('\n');
                    return (
                      <div
                        key={`${idx}_${q.key}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mr-2">
                              Question {idx + 1} • Key: {q.key}
                            </span>
                            <span className="text-xs font-bold text-white">{q.label}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(q.label, `q_label_${idx}`)}
                            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-white shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === `q_label_${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy Question</span>
                          </button>
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-1 border-t border-zinc-900">
                          <div className="flex flex-wrap gap-1.5">
                            {q.options.map((opt, oIdx) => (
                              <span
                                key={`${opt.key}_${oIdx}`}
                                onClick={() => handleCopy(opt.value, `opt_${idx}_${oIdx}`)}
                                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-200 cursor-pointer flex items-center gap-1"
                                title="Click to copy option"
                              >
                                <span>{opt.value}</span>
                                {copiedKey === `opt_${idx}_${oIdx}` && (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                )}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleCopy(optionsText, `q_opts_${idx}`)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === `q_opts_${idx}` ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy Choices</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                        Meta Leads Webhook URL &amp; Dynamic Field Mapping JSON
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
                    Live Phone Preview
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
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight truncate">
                        TidyUps Cleaning Service Inc.
                      </div>
                      <div className="text-[10px] text-white/80 truncate">{preset.formName}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px]">
                    <span className="font-semibold">🎁 $10 Off Promo + 2 Pro Cleaners</span>
                    <span className="px-2 py-0.5 rounded bg-black/25 font-mono text-[10px]">
                      {preset.customQuestions.length} Questions
                    </span>
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
                        <div>• Fuel Surcharge ($20.00) &amp; -$10.00 Ad Promo</div>
                        <div>• Federal Tax &amp; Supplies (12.5%)</div>
                      </div>
                    </div>
                  )}

                  {previewStep === 'questions' && (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {preset.customQuestions.map((q, qIdx) => (
                        <div
                          key={`${qIdx}_${q.key}`}
                          className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2"
                        >
                          <div className="text-xs font-bold text-white">{q.label}</div>
                          <div className="space-y-1.5">
                            {q.options.map((opt, idx) => (
                              <div
                                key={`${opt.key}_${idx}`}
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                                  idx === 0
                                    ? `${preset.accentBg} ${preset.accentBorder} text-white font-semibold`
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                                }`}
                              >
                                <span>{opt.value}</span>
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                                    idx === 0
                                      ? 'border-emerald-400 bg-emerald-500'
                                      : 'border-zinc-600'
                                  }`}
                                >
                                  {idx === 0 && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  )}
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
                        <span>
                          Auto-Filled by Meta ({preset.standardQuestions.length} Contact Fields)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Meta automatically pre-fills these fields from the customer&apos;s profile:
                      </p>
                      <div className="space-y-2">
                        {preset.standardQuestions.map((field) => (
                          <div
                            key={field.type}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between"
                          >
                            <div className="text-xs text-white font-semibold">{field.type}</div>
                            <div className="text-[10px] font-mono text-emerald-400">
                              key: {field.key}
                            </div>
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
                      <div className="text-sm font-bold text-white">
                        {preset.thankYouPage.title}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {preset.thankYouPage.body}
                      </p>
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left text-[11px] text-zinc-300 space-y-1">
                        <div className="font-bold text-emerald-400">
                          Behind the Scenes (Instant):
                        </div>
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
                        href={preset.thankYouPage.website_url}
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
