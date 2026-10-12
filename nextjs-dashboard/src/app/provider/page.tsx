import type { Metadata } from "next";
import { ProviderLinks } from "@/components/Hub";
import { Crumbs, DataNote, Shell } from "@/components/SeoPage";
import { loadDataset } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "GPU Cloud Provider Pricing: AWS, Azure, GCP, RunPod, Lambda, Nebius and More" },
  description:
    "GPU rental pricing by cloud provider, compared against the market low for each GPU. AWS, Azure, Google Cloud, Oracle, RunPod, Lambda, Nebius, Crusoe and more.",
  alternates: { canonical: "/provider" },
};

export default async function ProviderHub() {
  const ds = await loadDataset();
  return (
    <Shell>
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Providers" }]} />
      <h1 className="text-3xl font-bold text-zinc-50">GPU Cloud Provider Pricing</h1>
      <p className="mb-6 mt-3 text-zinc-400">
        Each provider page shows its GPU prices next to the market low and median for the same GPU.
      </p>
      <ProviderLinks offers={ds.offers} />
      <DataNote generatedAt={ds.generatedAt} />
    </Shell>
  );
}
