import React from 'react';

export interface TidyUpsBunnyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRibbonText?: boolean;
  className?: string;
}

/**
 * Renders the official TidyUps Bunny Mascot Crest in Black, Hot Pink (#ec4899), and Bright Red (#ef4444)
 * using the owner's uploaded TidyUps Bunny artwork (/assets/aistudio/833Tidyups_logo_no_bg_8d1f90d6.png)
 * while cleanly masking out the bottom legacy phone number ribbon so no phone numbers appear anywhere.
 */
export const TidyUpsBunnyLogo: React.FC<TidyUpsBunnyLogoProps> = ({
  size = 'md',
  showRibbonText = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-11 h-11',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-20 h-20 sm:w-24 sm:h-24',
    xl: 'w-28 h-28 sm:w-32 sm:h-32',
  }[size];

  const badgeFontSize = {
    sm: 'text-[6px] py-0.5 px-1',
    md: 'text-[7px] sm:text-[8px] py-0.5 px-1.5',
    lg: 'text-[9px] sm:text-[10px] py-1 px-2',
    xl: 'text-[10px] sm:text-xs py-1 px-2.5',
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-black border-2 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.45)] overflow-hidden select-none shrink-0 ${sizeClasses} ${className}`}
    >
      {/* Subtle Hot Pink & Bright Red Neon Radial Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-600/25 via-black to-red-600/30 pointer-events-none" />

      {/* TidyUps Bunny Mascot Artwork (Top 82% cropped cleanly so legacy phone number at bottom is never shown) */}
      <div className="relative w-full h-full overflow-hidden flex items-start justify-center">
        <img
          src="/assets/aistudio/833Tidyups_logo_no_bg_8d1f90d6.png"
          alt="TidyUps Cleaning Bunny Mascot"
          className="w-[112%] max-w-none h-[120%] object-cover object-top -mt-0.5 drop-shadow-[0_2px_8px_rgba(236,72,153,0.6)]"
        />
      </div>

      {/* Sleek Black, Hot Pink & Bright Red Bottom Crest Ribbon (Covers legacy bottom strip with zero phone numbers) */}
      {showRibbonText ? (
        <div
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-r from-black via-red-600 to-pink-600 border-t border-pink-400/80 text-white font-black uppercase tracking-wider text-center leading-none shadow-md ${badgeFontSize}`}
        >
          TIDYUPS🐰CLEAN
        </div>
      ) : (
        <div className="absolute bottom-0 inset-x-0 h-[18%] bg-gradient-to-r from-black via-pink-950 to-black border-t border-pink-500/40" />
      )}
    </div>
  );
};
