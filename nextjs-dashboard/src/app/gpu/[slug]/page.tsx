import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs, DataNote, JsonLd, OfferTable, Shell, breadcrumbLd } from "@/components/SeoPage";
import {
  ARCHITECTURE, byFamilySlug, comparePairs, indexableFamilies, loadDataset, pairSlug,
  providerName, siteUrl, slugify, statsFor, usd,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const ds = await loadDataset();
  const offers = byFamilySlug(ds.offers, slug);
  if (offers.length < 3) return null;
  return { ds, offers, family: offers[0].family, stats: statsFor(offers)! };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return {};
  const title = `${d.family} GPU Cloud Pricing: From ${usd(d.stats.min)}/hr Across ${d.stats.providers} Providers`;
  const description = `Compare ${d.family} rental prices per GPU-hour across ${d.stats.providers} cloud providers. Cheapest right now: ${usd(d.stats.min)}/hr on ${providerName(d.stats.cheapest.provider)}. Median ${usd(d.stats.median)}/hr. Updated nightly.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/gpu/${slug}` },
    openGraph: { title, description, url: `/gpu/${slug}`, type: "article" },
  };
}

export default async function GpuPage({ params }: { params: Params }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { ds, offers, family, stats } = d;

  const variants = [...new Set(offers.map((o) => o.gpu))].sort();
  const vrams = [...new Set(offers.map((o) => o.vram).filter(Boolean))].sort((a, b) => a! - b!);
  const arch = ARCHITECTURE[family];

  // Cheapest offer per provider, for the summary table
  const perProvider = new Map<string, (typeof offers)[number]>();
  for (const o of offers) {
    const cur = perProvider.get(o.provider);
    if (!cur || o.price < cur.price) perProvider.set(o.provider, o);
  }
  const providerRows = [...perProvider.values()].sort((a, b) => a.price - b.price);

  const related = indexableFamilies(ds.offers).filter((f) => f !== family).slice(0, 12);
  const pairs = comparePairs(ds.offers).filter(([a, b]) => a === family || b === family);

  return (
    <Shell>
      <JsonLd data={breadcrumbLd(siteUrl, [
        { name: "Home", path: "/" },
        { name: "GPUs", path: "/gpu" },
        { name: family, path: `/gpu/${slug}` },
      ])} />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "GPUs", href: "/gpu" }, { name: family }]} />
      <h1 className="text-3xl font-bold text-zinc-50">{family} GPU Cloud Pricing</h1>
      <p className="mt-3 text-zinc-400">
        {family}
        {arch ? ` (${arch})` : ""} rents from <strong className="text-zinc-100">{usd(stats.min)}</strong> to{" "}
        {usd(stats.max)} per GPU-hour across {stats.count} listings from {stats.providers} providers.
        The median is {usd(stats.median)}/hr. The lowest price today is on{" "}
        <Link className="text-indigo-400 hover:underline" href={`/provider/${slugify(stats.cheapest.provider)}`}>
          {providerName(stats.cheapest.provider)}
        </Link>
        {stats.cheapest.region ? ` (${stats.cheapest.region})` : ""}.
        {variants.length > 1 ? ` Variants tracked: ${variants.join(", ")}.` : ""}
        {vrams.length ? ` VRAM options: ${vrams.map((v) => `${v} GB`).join(", ")}.` : ""}
      </p>

      <h2 className="mb-3 mt-8 text-xl font-semibold text-zinc-100">Cheapest {family} by provider</h2>
      <OfferTable offers={providerRows} showGpu={variants.length > 1} />

      <h2 className="mb-3 mt-8 text-xl font-semibold text-zinc-100">All {family} listings</h2>
      <OfferTable offers={offers} />

      <h2 className="mb-3 mt-8 text-xl font-semibold text-zinc-100">{family} pricing FAQ</h2>
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="font-medium text-zinc-100">How much does a {family} cost per hour?</dt>
          <dd className="mt-1 text-zinc-400">
            On-demand {family} pricing ranges from {usd(stats.min)} to {usd(stats.max)} per GPU-hour
            today, with a median of {usd(stats.median)}. Hyperscalers (AWS, Azure, Google Cloud, Oracle) are
            usually at the upper end; GPU-specialist clouds are usually lower.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-100">Which provider has the cheapest {family}?</dt>
          <dd className="mt-1 text-zinc-400">
            {providerName(stats.cheapest.provider)} at {usd(stats.min)}/GPU-hr as of{" "}
            {ds.generatedAt ? ds.generatedAt.slice(0, 10) : "the last refresh"}. The ranking changes, so
            check the table above.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-100">Are these prices per GPU or per instance?</dt>
          <dd className="mt-1 text-zinc-400">
            Per GPU-hour. Multiply by the GPU count to get the instance price. Spot, reserved and
            fractional-GPU offers are excluded.
          </dd>
        </div>
      </dl>

      {pairs.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-xl font-semibold text-zinc-100">Head-to-head comparisons</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {pairs.map((p) => (
              <li key={pairSlug(p)}>
                <Link className="text-indigo-400 hover:underline" href={`/compare/${pairSlug(p)}`}>
                  {p[0]} vs {p[1]} cloud pricing
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-2 mt-8 text-xl font-semibold text-zinc-100">Other GPUs</h2>
      <p className="flex flex-wrap gap-2 text-sm">
        {related.map((f) => (
          <Link key={f} href={`/gpu/${slugify(f)}`} className="rounded border border-zinc-800 px-2 py-1 text-indigo-400 hover:border-zinc-600">
            {f}
          </Link>
        ))}
      </p>
      <DataNote generatedAt={ds.generatedAt} />
    </Shell>
  );
}
