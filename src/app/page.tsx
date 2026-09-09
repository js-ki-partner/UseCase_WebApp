import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">UC-Radar</h1>
      <p className="mt-4 text-gray-700">
        Diese Anwendung erfasst KI-Anwendungsfälle für Kundenorganisationen von
        KI&nbsp;Partner. Der Zugang läuft über einen kundenspezifischen Link.
      </p>
      <p className="mt-4 text-gray-700">
        Sie haben einen Einladungslink erhalten? Dann öffnen Sie ihn direkt. Für
        den internen Bereich geht es zum{" "}
        <Link href="/admin/login" className="accent-text underline">
          Adminbereich
        </Link>
        .
      </p>
    </main>
  );
}
