import Link from "next/link";
import {
  type Offer, comparePairs, indexableFamilies, indexableProviders, pairSlug, providerName,
  slugify, statsFor, usd,
} from "@/lib/pricing";

export function GpuIndex({ offers }: { offers: Offer[] }) {
  const rows = indexableFamilies(offers)
    .map((f) => ({ f, s: statsFor(offers.filter((o) => o.family === f))! }))
    .sort((a, b) => b.s.count - a.s.count);
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2">GPU</th>
            <th className="px-3 py-2 text-right">Lowest $/GPU-hr</th>
            <th className="px-3 py-2 text-right">Median</th>
            <th className="px-3 py-2 text-right">Providers</th>
            <th className="px-3 py-2">Cheapest on</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.map(({ f, s }) => (
            <tr key={f}>
              <td className="px-3 py-2">
                <Link href={`/gpu/${slugify(f)}`} className="text-indigo-400 hover:underline">{f} price</Link>
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-100">{usd(s.min)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{usd(s.median)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{s.providers}</td>
              <td className="px-3 py-2">{providerName(s.cheapest.provider)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProviderLinks({ offers }: { offers: Offer[] }) {
  return (
    <ul className="grid gap-2 text-sm sm:grid-cols-3">
      {indexableProviders(offers).sort().map((p) => (
        <li key={p}>
          <Link href={`/provider/${slugify(p)}`} className="text-indigo-400 hover:underline">
            {providerName(p)} GPU pricing
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CompareLinks({ offers }: { offers: Offer[] }) {
  return (
    <ul className="grid gap-2 text-sm sm:grid-cols-2">
      {comparePairs(offers).map((p) => (
        <li key={pairSlug(p)}>
          <Link href={`/compare/${pairSlug(p)}`} className="text-indigo-400 hover:underline">
            {p[0]} vs {p[1]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
