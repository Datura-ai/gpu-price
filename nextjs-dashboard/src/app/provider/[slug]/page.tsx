import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs, DataNote, JsonLd, OfferTable, Shell, breadcrumbLd } from "@/components/SeoPage";
import { byProviderSlug, loadDataset, providerName, siteUrl, slugify, statsFor, usd } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const ds = await loadDataset();
  const offers = byProviderSlug(ds.offers, slug);
  if (offers.length < 3) return null;
  return { ds, offers, id: offers[0].provider, stats: statsFor(offers)! };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return {};
  const name = providerName(d.id);
  const fams = [...new Set(d.offers.map((o) => o.family))];
  const title = `${name} GPU Pricing: ${fams.length} GPU Types from ${usd(d.stats.min)}/hr`;
  const description = `${name} GPU rental prices per hour: ${d.stats.count} on-demand listings across ${fams.length} GPU types, from ${usd(d.stats.min)} to ${usd(d.stats.max)} per GPU-hour. Compared against other cloud providers, updated nightly.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/provider/${slug}` },
    openGraph: { title, description, url: `/provider/${slug}`, type: "article" },
  };
}

export default async function ProviderPage({ params }: { params: Params }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { ds, offers, id, stats } = d;
  const name = providerName(id);

  // Cheapest per GPU family for this provider, with market min for context
  const fams = [...new Set(offers.map((o) => o.family))];
  const rows = fams
    .map((f) => {
      const mine = offers.filter((o) => o.family === f);
      const market = ds.offers.filter((o) => o.family === f);
      const my = statsFor(mine)!;
      const mk = statsFor(market)!;
      return { f, my, mk };
    })
    .sort((a, b) => a.my.min - b.my.min);

  return (
    <Shell>
      <JsonLd data={breadcrumbLd(siteUrl, [
        { name: "Home", path: "/" },
        { name: "Providers", path: "/provider" },
        { name: name, path: `/provider/${slug}` },
      ])} />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Providers", href: "/provider" }, { name }]} />
      <h1 className="text-3xl font-bold text-zinc-50">{name} GPU Pricing</h1>
      <p className="mt-3 text-zinc-400">
        {name} lists {stats.count} on-demand GPU configurations across {fams.length} GPU types, from{" "}
        <strong className="text-zinc-100">{usd(stats.min)}</strong> to {usd(stats.max)} per GPU-hour.
        The table shows how each {name} price compares with the cheapest price for the same GPU
        across all tracked providers.
      </p>

      <h2 className="mb-3 mt-8 text-xl font-semibold text-zinc-100">{name} vs the market, by GPU</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">GPU</th>
              <th className="px-3 py-2 text-right">{name} from</th>
              <th className="px-3 py-2 text-right">Market low</th>
              <th className="px-3 py-2 text-right">Market median</th>
              <th className="px-3 py-2">Market low provider</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map(({ f, my, mk }) => (
              <tr key={f}>
                <td className="px-3 py-2">
                  <Link href={`/gpu/${slugify(f)}`} className="text-indigo-400 hover:underline">{f}</Link>
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-100">{usd(my.min)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{usd(mk.min)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{usd(mk.median)}</td>
                <td className="px-3 py-2">{providerName(mk.cheapest.provider)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 text-xl font-semibold text-zinc-100">All {name} GPU listings</h2>
      <OfferTable offers={offers} showProvider={false} />
      <DataNote generatedAt={ds.generatedAt} />
    </Shell>
  );
}
