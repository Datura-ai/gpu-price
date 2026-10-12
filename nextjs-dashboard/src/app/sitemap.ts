import type { MetadataRoute } from "next";
import {
  comparePairs, indexableFamilies, indexableProviders, loadDataset, pairSlug, siteUrl, slugify,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/gpu`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/provider`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/compare`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];
  try {
    const { offers } = await loadDataset();
    for (const f of indexableFamilies(offers))
      entries.push({ url: `${siteUrl}/gpu/${slugify(f)}`, lastModified: now, changeFrequency: "daily", priority: 0.8 });
    for (const p of indexableProviders(offers))
      entries.push({ url: `${siteUrl}/provider/${slugify(p)}`, lastModified: now, changeFrequency: "daily", priority: 0.6 });
    for (const p of comparePairs(offers))
      entries.push({ url: `${siteUrl}/compare/${pairSlug(p)}`, lastModified: now, changeFrequency: "daily", priority: 0.6 });
  } catch {
    // data host unreachable: still serve the static entries
  }
  return entries;
}
