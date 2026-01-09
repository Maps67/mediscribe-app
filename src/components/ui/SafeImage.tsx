// src/components/ui/SafeImage.tsx
import React, { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const SafeImage = ({ src, alt, className }: SafeImageProps) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 ${className}`}>
        IMG N/A
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={`${className} transition-opacity duration-300`}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
};