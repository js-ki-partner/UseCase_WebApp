// Logo „KI Partner" — Bilddatei aus public/Logo_png.png (1522×484),
// verlinkt auf ki-partner.tech. Größe über die Höhe steuern (className, z. B. "h-5").

export function KiPartnerLogo({
  className = "h-6 w-auto",
  title = "KI Partner",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <a
      href="https://ki-partner.tech"
      target="_blank"
      rel="noreferrer"
      aria-label={`${title} (ki-partner.tech)`}
      className="inline-flex"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Logo_png.png"
        alt={title}
        width={1522}
        height={484}
        className={className}
      />
    </a>
  );
}
