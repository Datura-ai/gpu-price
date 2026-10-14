import Link from "next/link";
import type { Offer } from "@/lib/pricing";
import { providerName, slugify, usd } from "@/lib/pricing";

export function SiteNav() {
  return (
    <nav
      aria-label="Primary"
      className="border-b border-zinc-800 bg-zinc-950 text-sm text-zinc-300"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold text-zinc-100">
          GPU Cloud Prices
        </Link>
        <Link href="/gpu" className="hover:text-white">All GPUs</Link>
        <Link href="/provider" className="hover:text-white">Providers</Link>
        <Link href="/compare" className="hover:text-white">Compare</Link>
      </div>
    </nav>
  );
}

export function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <p className="mb-4 text-xs text-zinc-500">
      {items.map((it, i) => (
        <span key={it.name}>
          {i > 0 && " / "}
          {it.href ? <Link href={it.href} className="hover:text-zinc-300">{it.name}</Link> : it.name}
        </span>
      ))}
    </p>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-8 text-zinc-300 sm:px-6">{children}</main>
    </>
  );
}

export function OfferTable({
  offers,
  showGpu = true,
  showProvider = true,
  limit,
}: {
  offers: Offer[];
  showGpu?: boolean;
  showProvider?: boolean;
  limit?: number;
}) {
  const rows = [...offers].sort((a, b) => a.price - b.price).slice(0, limit);
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            {showProvider && <th className="px-3 py-2">Provider</th>}
            {showGpu && <th className="px-3 py-2">GPU</th>}
            <th className="px-3 py-2 text-right">GPUs</th>
            <th className="px-3 py-2 text-right">VRAM</th>
            <th className="px-3 py-2 text-right">vCPU</th>
            <th className="px-3 py-2 text-right">RAM (GB)</th>
            <th className="px-3 py-2">Region</th>
            <th className="px-3 py-2">Availability</th>
            <th className="px-3 py-2 text-right">$/GPU-hr</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.map((o, i) => (
            <tr key={`${o.provider}-${o.instance ?? o.gpu}-${o.gpuCount}-${o.region}-${i}`}>
              {showProvider && (
                <td className="px-3 py-2">
                  <Link href={`/provider/${slugify(o.provider)}`} className="text-indigo-400 hover:underline">
                    {providerName(o.provider)}
                  </Link>
                </td>
              )}
              {showGpu && (
                <td className="px-3 py-2">
                  <Link href={`/gpu/${slugify(o.family)}`} className="text-indigo-400 hover:underline">
                    {o.gpu}
                  </Link>
                </td>
              )}
              <td className="px-3 py-2 text-right tabular-nums">{o.gpuCount}</td>
              <td className="px-3 py-2 text-right tabular-nums">{o.vram ? `${o.vram} GB` : "–"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{o.vcpu ?? "–"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{o.ram ?? "–"}</td>
              <td className="px-3 py-2">{o.region ?? "–"}</td>
              <td className="px-3 py-2 text-zinc-400">
                {o.availability === "in_stock" ? "In stock" : o.availability === "out_of_stock" ? "Out of stock" : "–"}
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-100">{usd(o.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function breadcrumbLd(siteUrl: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${siteUrl}${it.path}`,
    })),
  };
}

export function DataNote({ generatedAt }: { generatedAt: string | null }) {
  return (
    <p className="mt-8 text-xs text-zinc-500">
      On-demand USD per GPU-hour. Spot, reserved and fractional-GPU offers are excluded.
      {generatedAt ? ` Data refreshed ${generatedAt.slice(0, 10)}.` : ""} Prices come from provider
      APIs and public catalogs; confirm on the provider&apos;s site before committing spend.
    </p>
  );
}
