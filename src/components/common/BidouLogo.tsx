import React from 'react';

export interface BidouLogoProps {
  variant?: 'auto' | 'light' | 'dark' | 'light-transparent' | 'dark-transparent' | 'light-bg' | 'dark-bg';
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/**
 * BidouLogo
 * Renders the official brand icon marks:
 * - Light Mode: /brand/Favicon.png (brand gradient on transparent/light)
 * - Dark Mode:  /brand/Bidou AI - Dark Mode Transparent.png (pure white mark on transparent)
 * 
 * Preserves ultra-high 2048x2048 asset fidelity with zero truncation or pixelation.
 * The text "Bidou AI" has been removed from the logo section per user instructions.
 */
export const BidouLogo: React.FC<BidouLogoProps> = ({
  variant = 'auto',
  size = 36,
  showWordmark = false,
  className = '',
}) => {
  // Official uploaded asset paths
  const lightModeLogoSrc = '/brand/Favicon.png';
  const darkModeLogoSrc = '/brand/Bidou%20AI%20-%20Dark%20Mode%20Transparent.png';

  const renderMark = () => {
    if (variant === 'dark' || variant === 'dark-transparent' || variant === 'dark-bg') {
      return (
        <img
          src={darkModeLogoSrc}
          alt="Bidou"
          width={size}
          height={size}
          className="object-contain select-none pointer-events-none transition-opacity"
          style={{ width: size, height: size, aspectRatio: '1 / 1' }}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      );
    }

    if (variant === 'light' || variant === 'light-transparent' || variant === 'light-bg') {
      return (
        <img
          src={lightModeLogoSrc}
          alt="Bidou"
          width={size}
          height={size}
          className="object-contain select-none pointer-events-none transition-opacity"
          style={{ width: size, height: size, aspectRatio: '1 / 1' }}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      );
    }

    // Default 'auto': Responsive swap between light and dark modes
    return (
      <>
        {/* Light theme logo: Favicon.png */}
        <img
          src={lightModeLogoSrc}
          alt="Bidou"
          width={size}
          height={size}
          className="dark:hidden object-contain select-none pointer-events-none transition-opacity"
          style={{ width: size, height: size, aspectRatio: '1 / 1' }}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        {/* Dark theme logo: Bidou AI - Dark Mode Transparent.png */}
        <img
          src={darkModeLogoSrc}
          alt="Bidou"
          width={size}
          height={size}
          className="hidden dark:block object-contain select-none pointer-events-none transition-opacity"
          style={{ width: size, height: size, aspectRatio: '1 / 1' }}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </>
    );
  };

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        {renderMark()}
      </div>
      {showWordmark && null}
    </div>
  );
};


