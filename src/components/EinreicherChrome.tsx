import type { CSSProperties, ReactNode } from "react";
import type { TenantContext } from "@/lib/tenant";
import { KiPartnerLogo } from "./KiPartnerLogo";

/**
 * Rahmen für alle Einreicher-Seiten:
 *  - oben das Branding des Kunden (Logo, sonst Name) plus Akzentfarbe
 *  - unten der Hinweis „bereitgestellt von KI Partner" mit Wortmarke
 */
export function EinreicherChrome({
  tenant,
  children,
}: {
  tenant: TenantContext;
  children: ReactNode;
}) {
  const style = tenant.brandingAccentColor
    ? ({ ["--accent"]: tenant.brandingAccentColor } as CSSProperties)
    : undefined;

  return (
    <div style={style} className="flex min-h-screen flex-col">
      <header className="accent-border border-b-2 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          {tenant.brandingLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.brandingLogoUrl}
              alt={tenant.name}
              className="h-9 w-auto"
            />
          ) : (
            <span className="text-lg font-semibold">{tenant.name}</span>
          )}
          {tenant.brandingLogoUrl && (
            <span className="sr-only">{tenant.name}</span>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">{children}</div>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-4 text-xs text-gray-500">
          <span>Use-Case-Erfassung — bereitgestellt von</span>
          <KiPartnerLogo className="h-6 w-auto" />
        </div>
      </footer>
    </div>
  );
}
