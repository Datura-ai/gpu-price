// Server-side data layer for the crawlable SEO pages (/gpu, /provider, /compare).
// The interactive dashboard on / still fetches client-side; these pages render the
// same data into HTML so search engines can index real content.
import { DATA_URL, META_URL } from "@/lib/constants";
import { normalizeRow } from "@/lib/utils";
import type { GPURaw, Meta } from "@/types/gpu";

export interface Offer {
  provider: string;
  gpu: string; // e.g. "A100 80GB"
  family: string; // e.g. "A100"
  price: number; // USD per GPU-hour, on-demand
  gpuCount: number;
  vram: number | null;
  vcpu: number | null;
  ram: number | null;
  region: string | null;
  instance: string | null;
  instancePrice: number | null;
  url: string | null;
  availability: "in_stock" | "out_of_stock" | null;
}

export interface Dataset {
  offers: Offer[];
  generatedAt: string | null;
}

const REVALIDATE_SECONDS = 3600;

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gpuprice.becloudready.com";

// "A100 80GB" -> "A100", "H100 NVL" stays separate, everything else unchanged.
export function familyOf(gpu: string): string {
  return gpu.replace(/\s+\d+\s?GB$/i, "").trim();
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const PROVIDER_NAMES: Record<string, string> = {
  aws: "AWS",
  azure: "Microsoft Azure",
  gcp: "Google Cloud",
  oracle: "Oracle Cloud",
  runpod: "RunPod",
  lambdalabs: "Lambda",
  nebius: "Nebius",
  verda: "Verda",
  cloudrift: "CloudRift",
  crusoe: "Crusoe",
  denvr: "Denvr Dataworks",
  massedcompute: "Massed Compute",
  paperspace: "Paperspace",
  hyperstack: "Hyperstack",
  scaleway: "Scaleway",
  linode: "Linode (Akamai)",
  vultr: "Vultr",
  boostrun: "BoostRun",
  excesssupply: "Excess Supply",
};

export function providerName(id: string): string {
  return PROVIDER_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

export const ARCHITECTURE: Record<string, string> = {
  H100: "NVIDIA Hopper",
  "H100 NVL": "NVIDIA Hopper",
  H200: "NVIDIA Hopper",
  A100: "NVIDIA Ampere",
  A10: "NVIDIA Ampere",
  A10G: "NVIDIA Ampere",
  A40: "NVIDIA Ampere",
  A16: "NVIDIA Ampere",
  A6000: "NVIDIA Ampere",
  L40S: "NVIDIA Ada Lovelace",
  L40: "NVIDIA Ada Lovelace",
  L4: "NVIDIA Ada Lovelace",
  "RTX 4090": "NVIDIA Ada Lovelace",
  "RTX 6000 Ada": "NVIDIA Ada Lovelace",
  B200: "NVIDIA Blackwell",
  B300: "NVIDIA Blackwell",
  "RTX 5090": "NVIDIA Blackwell",
  T4: "NVIDIA Turing",
  P100: "NVIDIA Pascal",
  MI350X: "AMD CDNA 4",
};

export async function loadDataset(): Promise<Dataset> {
  const [dataRes, metaRes] = await Promise.all([
    fetch(DATA_URL, { next: { revalidate: REVALIDATE_SECONDS } }),
    fetch(META_URL, { next: { revalidate: REVALIDATE_SECONDS } }).catch(() => null),
  ]);
  if (!dataRes.ok) throw new Error(`pricing data HTTP ${dataRes.status}`);
  const raw = (await dataRes.json()) as (GPURaw & {
    instance_type?: string;
    instance_price_usd_per_hour?: number | null;
  })[];

  const offers: Offer[] = [];
  for (const r of raw) {
    const n = normalizeRow(r);
    if (!n.gpu || n.price_num === null || !n.gpu_count) continue;
    offers.push({
      provider: n.provider,
      gpu: n.gpu,
      family: familyOf(n.gpu),
      price: n.price_num,
      gpuCount: n.gpu_count,
      vram: n.vram,
      vcpu: n.vcpu,
      ram: n.ram,
      region: n.region,
      instance: r.instance_type ?? null,
      instancePrice: r.instance_price_usd_per_hour ?? null,
      url: n.source || null,
      availability: n.availability,
    });
  }

  let generatedAt: string | null = null;
  if (metaRes && metaRes.ok) {
    const meta = (await metaRes.json()) as Meta;
    generatedAt = meta.generated_at_utc ?? meta.generated_at ?? null;
  }
  return { offers, generatedAt };
}

export interface Stats {
  count: number;
  providers: number;
  min: number;
  median: number;
  max: number;
  cheapest: Offer;
}

export function statsFor(offers: Offer[]): Stats | null {
  if (offers.length === 0) return null;
  const sorted = [...offers].sort((a, b) => a.price - b.price);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid].price : (sorted[mid - 1].price + sorted[mid].price) / 2;
  return {
    count: sorted.length,
    providers: new Set(sorted.map((o) => o.provider)).size,
    min: sorted[0].price,
    median,
    max: sorted[sorted.length - 1].price,
    cheapest: sorted[0],
  };
}

export function families(offers: Offer[]): string[] {
  return [...new Set(offers.map((o) => o.family))];
}

export function byFamilySlug(offers: Offer[], slug: string): Offer[] {
  return offers.filter((o) => slugify(o.family) === slug);
}

export function byProviderSlug(offers: Offer[], slug: string): Offer[] {
  return offers.filter((o) => slugify(o.provider) === slug);
}

// Only publish pages that have enough data to be useful (thin pages hurt more than help).
export const MIN_OFFERS_FOR_PAGE = 3;

export function indexableFamilies(offers: Offer[]): string[] {
  return families(offers).filter(
    (f) => offers.filter((o) => o.family === f).length >= MIN_OFFERS_FOR_PAGE
  );
}

export function indexableProviders(offers: Offer[]): string[] {
  return [...new Set(offers.map((o) => o.provider))].filter(
    (p) => offers.filter((o) => o.provider === p).length >= MIN_OFFERS_FOR_PAGE
  );
}

// Head-to-head pages people actually search for. Filtered against live data at render time.
const COMPARE_CANDIDATES: [string, string][] = [
  ["H100", "A100"],
  ["H100", "H200"],
  ["H200", "B200"],
  ["H100", "B200"],
  ["A100", "L40S"],
  ["H100", "L40S"],
  ["A100", "A10"],
  ["L40S", "A10"],
  ["L4", "T4"],
  ["RTX 4090", "A100"],
  ["RTX 4090", "L40S"],
  ["A100", "T4"],
];

export function comparePairs(offers: Offer[]): [string, string][] {
  const ok = new Set(indexableFamilies(offers));
  return COMPARE_CANDIDATES.filter(([a, b]) => ok.has(a) && ok.has(b));
}

export const pairSlug = ([a, b]: [string, string]) => `${slugify(a)}-vs-${slugify(b)}`;

export const usd = (n: number) => `$${n.toFixed(2)}`;
