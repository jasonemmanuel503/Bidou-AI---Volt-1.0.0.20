import React, { useState } from 'react';

export interface BidouLogoProps {
  variant?: 'auto' | 'light' | 'dark' | 'light-transparent' | 'dark-transparent' | 'light-bg' | 'dark-bg';
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/**
 * BidouLogo
 * Renders the official brand icon marks:
 * - Light Mode: /brand/Light Mode.png & /brand/Light Mode.jpeg
 * - Dark Mode:  /brand/Dark Mode.png & /brand/Dark Mode.jpeg
 * 
 * Preserves ultra-high 2048x2048 asset fidelity with zero truncation or pixelation across all devices.
 */
export const BidouLogo: React.FC<BidouLogoProps> = ({
  variant = 'auto',
  size = 36,
  showWordmark = false,
  className = '',
}) => {
  // Official uploaded asset paths
  const lightModeJpeg = '/brand/Light%20Mode.jpeg';
  const lightModePng = '/brand/Light%20Mode.png';
  const darkModeJpeg = '/brand/Dark%20Mode.jpeg';
  const darkModePng = '/brand/Dark%20Mode.png';

  const [lightFailed, setLightFailed] = useState(false);
  const [darkFailed, setDarkFailed] = useState(false);

  const renderMark = () => {
    // 1. Explicit Dark Mode variant
    if (variant === 'dark' || variant === 'dark-transparent' || variant === 'dark-bg') {
      const isSolidBg = variant === 'dark-bg';
      return (
        <picture className="flex items-center justify-center">
          {!isSolidBg && !darkFailed && <source type="image/png" srcSet={darkModePng} />}
          <img
            src={isSolidBg ? darkModeJpeg : (darkFailed ? darkModeJpeg : darkModePng)}
            alt="Bidou AI"
            width={size}
            height={size}
            className="object-contain select-none pointer-events-none transition-opacity duration-150"
            style={{
              width: size,
              height: size,
              aspectRatio: '1 / 1',
              imageRendering: '-webkit-optimize-contrast',
            }}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setDarkFailed(true)}
          />
        </picture>
      );
    }

    // 2. Explicit Light Mode variant
    if (variant === 'light' || variant === 'light-transparent' || variant === 'light-bg') {
      const isSolidBg = variant === 'light-bg';
      return (
        <picture className="flex items-center justify-center">
          {!isSolidBg && !lightFailed && <source type="image/png" srcSet={lightModePng} />}
          <img
            src={isSolidBg ? lightModeJpeg : (lightFailed ? lightModeJpeg : lightModePng)}
            alt="Bidou AI"
            width={size}
            height={size}
            className="object-contain select-none pointer-events-none transition-opacity duration-150"
            style={{
              width: size,
              height: size,
              aspectRatio: '1 / 1',
              imageRendering: '-webkit-optimize-contrast',
            }}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setLightFailed(true)}
          />
        </picture>
      );
    }

    // 3. Default 'auto': Responsive swap between light and dark modes via Tailwind classes
    return (
      <>
        {/* Light theme logo: Light Mode asset */}
        <picture className="dark:hidden flex items-center justify-center">
          {!lightFailed && <source type="image/png" srcSet={lightModePng} />}
          <img
            src={lightFailed ? lightModeJpeg : lightModePng}
            alt="Bidou AI"
            width={size}
            height={size}
            className="object-contain select-none pointer-events-none transition-opacity duration-150"
            style={{
              width: size,
              height: size,
              aspectRatio: '1 / 1',
              imageRendering: '-webkit-optimize-contrast',
            }}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setLightFailed(true)}
          />
        </picture>

        {/* Dark theme logo: Dark Mode asset */}
        <picture className="hidden dark:flex items-center justify-center">
          {!darkFailed && <source type="image/png" srcSet={darkModePng} />}
          <img
            src={darkFailed ? darkModeJpeg : darkModePng}
            alt="Bidou AI"
            width={size}
            height={size}
            className="object-contain select-none pointer-events-none transition-opacity duration-150"
            style={{
              width: size,
              height: size,
              aspectRatio: '1 / 1',
              imageRendering: '-webkit-optimize-contrast',
            }}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setDarkFailed(true)}
          />
        </picture>
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


