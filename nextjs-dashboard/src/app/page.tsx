import Dashboard from "@/components/Dashboard";
import { DATA_BASE_URL } from "@/lib/constants";
import Link from "next/link";
import { CompareLinks, GpuIndex, ProviderLinks } from "@/components/Hub";
import { loadDataset, type Offer } from "@/lib/pricing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gpuprice.becloudready.com";
const dataUrl = `${DATA_BASE_URL}/latest/all.json`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "GPU Cloud Pricing",
      url: siteUrl,
      description:
        "Compare GPU rental prices across neo cloud providers in real-time. Updated nightly.",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "GPU Cloud Pricing Comparison Tool",
      url: siteUrl,
      description:
        "A real-time comparison tool for GPU cloud rental pricing across AWS, Azure, GCP, Oracle, RunPod, Lambda Labs, Nebius, Crusoe and other neo cloud providers.",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Real-time GPU pricing from 10+ cloud providers",
        "Compare H100, A100, L40S, H200, B200 pricing",
        "60-day historical price charts per GPU SKU",
        "Filter by cloud provider, GPU type, and GPU count",
        "Side-by-side GPU spec and price comparison (up to 4 GPUs)",
        "Pricing data updated nightly",
        "Downloadable JSON and CSV datasets",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "Developers, AI engineers, ML researchers, data scientists",
      },
    },
    {
      "@type": "Dataset",
      "@id": `${siteUrl}/#dataset`,
      name: "GPU Cloud Pricing Dataset",
      description:
        "Nightly-updated GPU rental pricing data across neo cloud providers including AWS, Azure, GCP, Oracle, RunPod, Lambda Labs, Nebius, and Crusoe. Includes GPU model, VRAM, vCPU, RAM, storage, and price per hour.",
      url: dataUrl,
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: dataUrl,
        },
        {
          "@type": "DataDownload",
          encodingFormat: "text/csv",
          contentUrl: dataUrl.replace("all.json", "all.csv"),
        },
      ],
      keywords: [
        "GPU pricing", "H100", "A100", "L40S", "cloud computing",
        "AWS", "Azure", "RunPod", "Lambda Labs", "Nebius", "Crusoe",
        "AI training", "machine learning", "LLM", "inference",
      ],
      temporalCoverage: "2024/..",
      spatialCoverage: "Global",
      isAccessibleForFree: true,
      creator: {
        "@type": "Organization",
        name: "GPU Cloud Pricing",
        url: siteUrl,
      },
    },
  ],
};

export const dynamic = "force-dynamic";

export default async function Home() {
  let offers: Offer[] = [];
  try {
    offers = (await loadDataset()).offers;
  } catch {
    // dashboard still works client-side; the crawlable section is just omitted
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Dashboard />
      {offers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 text-zinc-300 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-zinc-100">Cloud GPU prices by model</h2>
          <p className="mb-4 mt-2 text-sm text-zinc-400">
            Lowest and median on-demand price per GPU-hour across {new Set(offers.map((o) => o.provider)).size} providers.
          </p>
          <GpuIndex offers={offers} />
          <h2 className="mb-3 mt-10 text-xl font-semibold text-zinc-100">Pricing by provider</h2>
          <ProviderLinks offers={offers} />
          <h2 className="mb-3 mt-10 text-xl font-semibold text-zinc-100">Compare GPUs</h2>
          <CompareLinks offers={offers} />
          <p className="mt-8 text-xs text-zinc-500">
            <Link href="/gpu" className="hover:text-zinc-300">All GPUs</Link>
          </p>
        </section>
      )}
    </>
  );
}
