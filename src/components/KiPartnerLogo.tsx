// Wortmarke „KI Partner" — als Inline-SVG, damit kein externes Asset nötig ist.
// Textfarbe folgt `currentColor`; die Mark-Fläche nutzt die CSS-Variable --accent.

export function KiPartnerLogo({
  className = "",
  title = "KI Partner",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 150 32"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Mark: abgerundetes Quadrat mit „KI" */}
      <rect x="0" y="3" width="26" height="26" rx="6.5" fill="var(--accent, #1d4ed8)" />
      <text
        x="13"
        y="21"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        fontSize="12"
        fontWeight="700"
        fill="#ffffff"
      >
        KI
      </text>
      {/* Wortmarke */}
      <text
        x="34"
        y="21"
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        fontSize="15"
        fontWeight="600"
        letterSpacing="0.2"
        fill="currentColor"
      >
        KI Partner
      </text>
    </svg>
  );
}
