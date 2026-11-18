import React from 'react';

export function BrandMark({
  className = '',
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  const discColor = inverted ? '#f0e8e0' : '#1c1a1f';
  const pathColor = inverted ? '#191a1e' : '#f0e8e0';
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="18" fill={discColor} />
      <path
        d="M6.5 23.5L13.5 13L18.5 19.5L23 14L29.5 23.5H6.5Z"
        fill={pathColor}
      />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3.5 9H14.5M10 4.5L14.5 9L10 13.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PauseGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <rect x="2" y="1.5" width="2.2" height="7" rx="1" fill="currentColor" />
      <rect x="5.8" y="1.5" width="2.2" height="7" rx="1" fill="currentColor" />
    </svg>
  );
}

export function PlayGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.8 1.8L8.2 5L2.8 8.2V1.8Z" fill="currentColor" />
    </svg>
  );
}

export function BasketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 7.5H15.5L14.3 15.5H5.7L4.5 7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 7.5V5.8C7.2 4.25 8.45 3 10 3C11.55 3 12.8 4.25 12.8 5.8V7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StepIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path
          d="M20.5 5.5C13 5.5 6.5 9.5 6.5 17C6.5 18.2 6.8 19.2 7.2 20C14.7 20 20.5 14.5 20.5 5.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 20.5C9.5 17 13.5 13.5 17.5 10.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <ellipse
          cx="9.5"
          cy="9.5"
          rx="2.6"
          ry="4.2"
          transform="rotate(-30 9.5 9.5)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <ellipse
          cx="16.5"
          cy="9.5"
          rx="2.6"
          ry="4.2"
          transform="rotate(30 16.5 9.5)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <ellipse
          cx="9.5"
          cy="16.5"
          rx="2.6"
          ry="4.2"
          transform="rotate(-30 9.5 16.5)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <ellipse
          cx="16.5"
          cy="16.5"
          rx="2.6"
          ry="4.2"
          transform="rotate(30 16.5 16.5)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path
          d="M13 21.2C13 21.2 4.5 16 4.5 10C4.5 7.2 6.7 5.2 9.3 5.2C11 5.2 12.3 6.1 13 7.4C13.7 6.1 15 5.2 16.7 5.2C19.3 5.2 21.5 7.2 21.5 10C21.5 16 13 21.2 13 21.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path
        d="M14.5 3.5L6.5 14.5H13L11.5 22.5L19.5 11.5H13L14.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
