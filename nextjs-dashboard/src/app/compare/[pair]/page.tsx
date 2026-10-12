import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs, DataNote, JsonLd, OfferTable, Shell, breadcrumbLd } from "@/components/SeoPage";
import {
  ARCHITECTURE, byFamilySlug, comparePairs, loadDataset, pairSlug, providerName, siteUrl,
  slugify, statsFor, usd,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

type Params = Promise<{ pair: string }>;

async function load(pair: string) {
  const ds = await loadDataset();
  const match = comparePairs(ds.offers).find((p) => pairSlug(p) === pair);
  if (!match) return null;
  const [a, b] = match;
  const oa = byFamilySlug(ds.offers, slugify(a));
  const ob = byFamilySlug(ds.offers, slugify(b));
  return { ds, a, b, oa, ob, sa: statsFor(oa)!, sb: statsFor(ob)! };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pair } = await params;
  const d = await load(pair);
  if (!d) return {};
  const title = `${d.a} vs ${d.b} Cloud GPU Pricing: ${usd(d.sa.min)} vs ${usd(d.sb.min)} per Hour`;
  const description = `${d.a} vs ${d.b} rental price comparison. ${d.a} starts at ${usd(d.sa.min)}/GPU-hr (median ${usd(d.sa.median)}), ${d.b} at ${usd(d.sb.min)} (median ${usd(d.sb.median)}). Live prices across cloud providers.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/compare/${pair}` },
    openGraph: { title, description, url: `/compare/${pair}`, type: "article" },
  };
}

export default async function ComparePage({ params }: { params: Params }) {
  const { pair } = await params;
  const d = await load(pair);
  if (!d) notFound();
  const { ds, a, b, oa, ob, sa, sb } = d;
  const ratio = sa.median / sb.median;
  const cheaper = sa.median <= sb.median ? a : b;
  const pct = Math.abs(1 - (ratio < 1 ? ratio : 1 / ratio)) * 100;

  const Col = ({ name, s, arch }: { name: string; s: NonNullable<ReturnType<typeof statsFor>>; arch?: string }) => (
    <div className="rounded-lg border border-zinc-800 p-4">
      <h3 className="text-lg font-semibold text-zinc-100">
        <Link href={`/gpu/${slugify(name)}`} className="hover:underline">{name}</Link>
      </h3>
      {arch && <p className="text-xs text-zinc-500">{arch}</p>}
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Lowest</dt><dd className="tabular-nums text-zinc-100">{usd(s.min)}/hr</dd></div>
        <div className="flex justify-between"><dt>Median</dt><dd className="tabular-nums">{usd(s.median)}/hr</dd></div>
        <div className="flex justify-between"><dt>Highest</dt><dd className="tabular-nums">{usd(s.max)}/hr</dd></div>
        <div className="flex justify-between"><dt>Listings</dt><dd className="tabular-nums">{s.count}</dd></div>
        <div className="flex justify-between"><dt>Providers</dt><dd className="tabular-nums">{s.providers}</dd></div>
        <div className="flex justify-between"><dt>Cheapest on</dt><dd>{providerName(s.cheapest.provider)}</dd></div>
      </dl>
    </div>
  );

  return (
    <Shell>
      <JsonLd data={breadcrumbLd(siteUrl, [
        { name: "Home", path: "/" },
        { name: "Compare", path: "/compare" },
        { name: `${a} vs ${b}`, path: `/compare/${pair}` },
      ])} />
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Compare", href: "/compare" }, { name: `${a} vs ${b}` }]} />
      <h1 className="text-3xl font-bold text-zinc-50">{a} vs {b}: Cloud GPU Pricing</h1>
      <p className="mt-3 text-zinc-400">
        By median on-demand price, {cheaper} is about {pct.toFixed(0)}% cheaper per GPU-hour today
        ({a} {usd(sa.median)} vs {b} {usd(sb.median)}). Price per hour is not price per result: a faster
        GPU can finish a job in fewer hours, so compare cost per job on your own workload.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Col name={a} s={sa} arch={ARCHITECTURE[a]} />
        <Col name={b} s={sb} arch={ARCHITECTURE[b]} />
      </div>
      <h2 className="mb-3 mt-8 text-xl font-semibold text-zinc-100">Cheapest {a} listings</h2>
      <OfferTable offers={oa} limit={8} showGpu={false} />
      <h2 className="mb-3 mt-8 text-xl font-semibold text-zinc-100">Cheapest {b} listings</h2>
      <OfferTable offers={ob} limit={8} showGpu={false} />
      <DataNote generatedAt={ds.generatedAt} />
    </Shell>
  );
}
