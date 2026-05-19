import { XMLParser } from 'fast-xml-parser';

// Eilmeldungen-Feed wird nicht mehr angeboten; Hauptfeed als Fallback
const RSS_URL = 'https://www.tagesschau.de/index~rss2.xml';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
}

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'PegelBoard/0.1 (Wasserrettung)', Accept: 'application/rss+xml,application/xml,text/xml' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Tagesschau RSS: ${res.status}`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: NewsItem | NewsItem[] } };
  };
  const raw = parsed?.rss?.channel?.item ?? [];
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map((it) => ({
    title: String(it.title ?? ''),
    link: String(it.link ?? ''),
    pubDate: String(it.pubDate ?? ''),
  }));
}
