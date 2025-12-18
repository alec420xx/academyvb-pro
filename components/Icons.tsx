import React from 'react';

export const ClubLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className={className}>
    <g transform="translate(50,60)">
      {[0, 120, 240].map((angle, i) => (
        <path key={i} d="M 0 0 Q -15 -25 0 -48" transform={`rotate(${angle})`}/>
      ))}
    </g>
  </svg>
);

export const CustomArrowIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 5L5 19" />
        <path d="M15 5h4v4" />
    </svg>
);

export const DiagonalLineIcon = ({ size = 18, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
);

export const CourtIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);