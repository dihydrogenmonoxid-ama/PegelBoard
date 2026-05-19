import { XMLParser } from 'fast-xml-parser';
import { db } from '../db/database.js';

// MDR hat seine RSS-Feeds eingestellt. Fallback auf Tagesschau.
// Kann über config-Schlüssel 'news_feed_url' überschrieben werden.
const DEFAULT_FEED_URL = 'https://www.tagesschau.de/index~rss2.xml';
const parser = new XMLParser({ ignoreAttributes: false });

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
}

export async function fetchMdrNews(): Promise<NewsItem[]> {
  const urlRow = db.prepare("SELECT value FROM config WHERE key='news_feed_url'").get() as { value: string } | undefined;
  const FEED_URL = urlRow?.value || DEFAULT_FEED_URL;
  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error(`MDR RSS: ${res.status}`);
  const xml = await res.text();
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown[] | Record<string, unknown> } };
  };
  const items = parsed?.rss?.channel?.item;
  if (!items) return [];
  const arr = Array.isArray(items) ? items : [items];
  return (arr as Array<Record<string, unknown>>).slice(0, 10).map((i) => ({
    title: String(i['title'] ?? ''),
    link: String(i['link'] ?? ''),
    pubDate: String(i['pubDate'] ?? ''),
  }));
}
