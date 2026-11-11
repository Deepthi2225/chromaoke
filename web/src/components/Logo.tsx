/**
 * The C of Chromaoke as the cradle of a studio microphone, with the mic head sitting in its mouth.
 * Brass at rest; the cradle takes the playing song's colours once it starts (see App.css).
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" fill="none" strokeLinecap="round" aria-hidden>
      <defs>
        <linearGradient id="logo-cradle" gradientUnits="userSpaceOnUse" x1="12" y1="10" x2="44" y2="56">
          <stop className="from" offset="0" />
          <stop className="to" offset="1" />
        </linearGradient>
      </defs>
      <g stroke="url(#logo-cradle)">
        <path strokeWidth="9" d="M42.2 17.45A19 19 0 1 0 42.2 46.55" />
        <path strokeWidth="5.5" d="M5 26V38M5 32H11" />
      </g>
      <rect className="head" x="27" y="24" width="31" height="16" rx="8" />
      <path className="grille" strokeWidth="2.6" d="M45.5 28.5V35.5M50.5 28.5V35.5" />
    </svg>
  )
}
