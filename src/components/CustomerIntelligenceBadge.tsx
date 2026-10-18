import React from 'react';
import { PhoneCall, Sparkles, Tag, CheckCircle2, UserCheck, ShieldCheck } from 'lucide-react';
import { CustomerIntelligence } from '../services/customerIntelligenceService';

interface CustomerIntelligenceBadgeProps {
  intelligence: CustomerIntelligence;
  compact?: boolean;
  showDiscountPrompt?: boolean;
  onApplyDiscount?: (discountPercent: number) => void;
}

export const CustomerIntelligenceBadge: React.FC<CustomerIntelligenceBadgeProps> = ({
  intelligence,
  compact = false,
  showDiscountPrompt = false,
  onApplyDiscount,
}) => {
  const {
    callCount,
    cleansCount,
    isExistingClient,
    isRepeatCaller,
    loyaltyTier,
    loyaltyDiscountPercent,
    loyaltyDiscountEligible,
  } = intelligence;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {/* Caller Badge */}
        {callCount > 0 ? (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
              callCount > 1
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title={`Customer has called ${callCount} time${callCount === 1 ? '' : 's'}`}
          >
            <PhoneCall className="w-2.5 h-2.5 text-purple-600 shrink-0" />
            <span>{callCount}x call{callCount > 1 ? 's' : ''}</span>
          </span>
        ) : null}

        {/* Cleans / Client Status Badge */}
        {cleansCount > 0 ? (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              loyaltyTier === 'VIP'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}
            title={`${cleansCount} previous cleaning visits logged on account`}
          >
            <Sparkles className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
            <span>{cleansCount} clean{cleansCount === 1 ? '' : 's'}</span>
          </span>
        ) : isExistingClient ? (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
            title="Registered existing client on file"
          >
            <UserCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
            <span>Client</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span>New Lead</span>
          </span>
        )}

        {/* Loyalty Discount Badge if eligible */}
        {loyaltyDiscountEligible && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-pink-100 text-pink-900 border border-pink-300 animate-pulse"
            title={`Eligible for ${loyaltyDiscountPercent}% Repeat Client Loyalty Discount!`}
          >
            <Tag className="w-2.5 h-2.5 text-pink-600 shrink-0" />
            <span>{loyaltyDiscountPercent}% Off Eligible</span>
          </span>
        )}
      </span>
    );
  }

  // Detailed Card / Modal View
  return (
    <div className="p-3 bg-gradient-to-r from-purple-50/90 via-slate-50 to-pink-50/90 rounded-xl border border-purple-200/80 shadow-2xs space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-slate-900 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Caller &amp; Client Intelligence</span>
          </span>

          {/* Call Count */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isRepeatCaller
                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <PhoneCall className="w-3 h-3 text-purple-600" />
            <span>{callCount} Phone Call{callCount === 1 ? '' : 's'} Logged</span>
          </span>

          {/* Cleans Count */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              loyaltyTier === 'VIP'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : cleansCount > 0
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-blue-100 text-blue-900 border border-blue-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>
              {cleansCount > 0
                ? `${cleansCount} Previous Clean${cleansCount === 1 ? '' : 's'} (${loyaltyTier === 'VIP' ? 'VIP Tier' : 'Returning'})`
                : isExistingClient
                ? 'Existing Registered Client'
                : 'New Customer Intake'}
            </span>
          </span>
        </div>

        {/* Loyalty Discount Highlight */}
        {loyaltyDiscountEligible && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xs">
            <Tag className="w-3 h-3" />
            <span>{loyaltyDiscountPercent}% Repeat Discount Eligible</span>
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">
        {intelligence.loyaltyPerkMessage}{' '}
        {isRepeatCaller && `This caller has phoned your lines ${callCount} times.`}
      </p>

      {showDiscountPrompt && loyaltyDiscountEligible && onApplyDiscount && (
        <div className="pt-1.5 flex items-center justify-between border-t border-purple-200/60">
          <span className="text-[11px] text-purple-900 font-bold">
            Apply {loyaltyDiscountPercent}% Repeat Customer Discount to this quote/booking?
          </span>
          <button
            type="button"
            onClick={() => onApplyDiscount(loyaltyDiscountPercent)}
            className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Apply {loyaltyDiscountPercent}% Discount</span>
          </button>
        </div>
      )}
    </div>
  );
};
