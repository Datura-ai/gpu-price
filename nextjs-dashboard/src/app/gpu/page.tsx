import type { Metadata } from "next";
import { GpuIndex } from "@/components/Hub";
import { Crumbs, DataNote, Shell } from "@/components/SeoPage";
import { loadDataset } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Cloud GPU Prices by Model: H100, A100, L40S, H200, B200 and More" },
  description:
    "Hourly cloud rental price for every major data-center GPU, ranked by lowest on-demand $/GPU-hour across 19 providers. Updated nightly.",
  alternates: { canonical: "/gpu" },
};

export default async function GpuHub() {
  const ds = await loadDataset();
  return (
    <Shell>
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "GPUs" }]} />
      <h1 className="text-3xl font-bold text-zinc-50">Cloud GPU Prices by Model</h1>
      <p className="mb-6 mt-3 text-zinc-400">
        Lowest and median on-demand price per GPU-hour for each GPU model, across the providers we track.
        Click a model for every provider&apos;s listing.
      </p>
      <GpuIndex offers={ds.offers} />
      <DataNote generatedAt={ds.generatedAt} />
    </Shell>
  );
}
