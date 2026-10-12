import type { Metadata } from "next";
import { CompareLinks } from "@/components/Hub";
import { Crumbs, DataNote, Shell } from "@/components/SeoPage";
import { loadDataset } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Compare Cloud GPUs: H100 vs A100, H200 vs B200, L40S vs A10 and More" },
  description: "Head-to-head cloud rental price comparisons between popular data-center GPUs, from live provider data.",
  alternates: { canonical: "/compare" },
};

export default async function CompareHub() {
  const ds = await loadDataset();
  return (
    <Shell>
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Compare" }]} />
      <h1 className="text-3xl font-bold text-zinc-50">Compare Cloud GPUs</h1>
      <p className="mb-6 mt-3 text-zinc-400">Price per GPU-hour, side by side.</p>
      <CompareLinks offers={ds.offers} />
      <DataNote generatedAt={ds.generatedAt} />
    </Shell>
  );
}
