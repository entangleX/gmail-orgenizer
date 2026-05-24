import styles from './BrandMark.module.css';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export default function BrandMark({ size = 44, className = '' }: BrandMarkProps) {
  return (
    <span
      className={`${styles.brandMark} ${className}`}
      style={{ height: size, width: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" role="img" focusable="false">
        <path
          d="M9 14.5C9 11.5 11.5 9 14.5 9h19C36.5 9 39 11.5 39 14.5v19c0 3-2.5 5.5-5.5 5.5h-19C11.5 39 9 36.5 9 33.5v-19Z"
          fill="#ffffff"
          stroke="#0f766e"
          strokeWidth="3"
        />
        <path
          d="M14 17.5 24 25l10-7.5"
          fill="none"
          stroke="#2563eb"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M16 31.5h9.5"
          fill="none"
          stroke="#0f766e"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="m28.5 30.5 3 3 6-7"
          fill="none"
          stroke="#10b981"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.2"
        />
      </svg>
    </span>
  );
}
