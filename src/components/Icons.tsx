type IconProps = {
  className?: string;
};

export function StickmanPortrait({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="rgba(242, 195, 100, 0.14)" />
      <circle cx="32" cy="32" r="30" stroke="rgba(242, 195, 100, 0.55)" />
      <g stroke="#050506" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="31" cy="20" r="5.2" fill="#050506" stroke="none" />
        <path d="M31 25.5 L30 40" />
        <path d="M30 40 L24 51" />
        <path d="M30 40 L37 50" />
        <path d="M31 29 L40 31 L49 29" />
        <path d="M31 30 L24 36 L27 43" />
        <path d="M49 29 L56 28" strokeWidth="3" />
        <path d="M49 29 L48 34 L52 34 L53 29" fill="#050506" strokeWidth="2.4" />
      </g>
      <circle cx="31" cy="20" r="1" fill="#f2c364" />
    </svg>
  );
}

export function AntIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeLinecap="round">
        <ellipse cx="40" cy="27" rx="12" ry="8" fill="currentColor" stroke="none" />
        <ellipse cx="27" cy="25" rx="7" ry="5.5" fill="currentColor" stroke="none" />
        <circle cx="17" cy="24" r="5.5" fill="currentColor" stroke="none" />
        <path d="M21 31 L17 40 M27 31 L25 41 M35 33 L35 43" strokeWidth="2.2" />
        <path d="M22 19 L17 11 M27 18 L25 10 M34 18 L37 10" strokeWidth="2.2" />
        <path d="M13 21 C8 17 6 14 4 9 M12 24 C7 24 5 25 3 29" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

export function CrosshairIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="16" cy="16" r="8" />
      <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
      <path d="M16 2 V9 M16 23 V30 M2 16 H9 M23 16 H30" />
    </svg>
  );
}

export function FocusIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="6.5" />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" stroke="none" />
      <path d="M16 1.5 V6 M16 26 V30.5 M1.5 16 H6 M26 16 H30.5" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M16 3 L27 7 V15 C27 22 22 27 16 30 C10 27 5 22 5 15 V7 Z" />
      <path d="M11 16 L15 20 L22 12" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M18 2 L7 18 H15 L13 30 L26 13 H18 Z" fill="currentColor" fillOpacity="0.16" />
    </svg>
  );
}

export function SoundIcon({ muted, className }: IconProps & { muted: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M4 11 H9 L16 5 V23 L9 17 H4 Z" fill="currentColor" fillOpacity="0.12" />
      {muted ? (
        <path d="M20 11 L26 17 M26 11 L20 17" />
      ) : (
        <>
          <path d="M19 10 C22 13 22 16 19 19" />
          <path d="M22 7 C27 12 27 17 22 22" />
        </>
      )}
    </svg>
  );
}

export function CrownIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <path d="M3 20 L2 6 L10 12 L16 3 L22 12 L30 6 L29 20 Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M3 20 H29" />
    </svg>
  );
}
