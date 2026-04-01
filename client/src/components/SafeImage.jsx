import React, { useMemo, useState } from 'react';

const sanitizeSrc = (value) => (typeof value === 'string' ? value.trim() : '');

const SafeImage = ({ src, alt, className = '', fallbackClassName = '' }) => {
  const fallbackSrc = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#e8f5f8"/>
            <stop offset="100%" stop-color="#d8eef3"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#g)"/>
        <circle cx="980" cy="120" r="140" fill="#bfe8e4" opacity="0.35"/>
        <circle cx="180" cy="700" r="180" fill="#bfe8e4" opacity="0.35"/>
        <text x="50%" y="47%" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="44" font-weight="700" fill="#325065">
          Digital Heroes
        </text>
        <text x="50%" y="56%" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="28" fill="#4f6479">
          Charity image unavailable
        </text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const [failedSrc, setFailedSrc] = useState('');
  const cleanSrc = sanitizeSrc(src);
  const usingFallback = !cleanSrc || cleanSrc === failedSrc;
  const resolvedSrc = usingFallback ? fallbackSrc : cleanSrc;

  const onError = () => {
    if (cleanSrc) {
      setFailedSrc(cleanSrc);
    }
  };

  const mergedClassName = `${className}${usingFallback && fallbackClassName ? ` ${fallbackClassName}` : ''}`;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={mergedClassName}
      onError={onError}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
};

export default SafeImage;
