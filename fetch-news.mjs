import Parser from "rss-parser";
import { writeFile } from "node:fs/promises";

// Add or remove sources here. "url" must be a valid RSS/XML feed.
const SOURCES = [
  { name: "Ynet", url: "http://www.ynet.co.il/Integration/StoryRss2.xml" },
  { name: "Ynet מבזקים", url: "http://www.ynet.co.il/Integration/StoryRss3092.xml" },
  { name: "וואלה חדשות", url: "https://rss.walla.co.il/feed/1" },
  { name: "וואלה מבזקים", url: "https://rss.walla.co.il/feed/22" },
  { name: "מעריב", url: "https://www.maariv.co.il/Rss/RssChadashot" },
  { name: "מעריב מבזקים", url: "https://www.maariv.co.il/Rss/RssFeedsMivzakiChadashot" },
];

const parser = new Parser({
  headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsAggregatorBot/1.0)" },
  timeout: 15000,
});

// Some Israeli feeds (notably ynet) declare a Windows-1255 XML encoding
// header while the actual bytes are UTF-8. Fetch as a raw buffer, decode as
// UTF-8 ourselves, and normalize the declared encoding before parsing so we
// never get mojibake Hebrew text.
async function fetchFeedText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsAggregatorBot/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  let text = buf.toString("utf8");
  text = text.replace(/encoding="[^"]+"/i, 'encoding="UTF-8"');
  return text;
}

async function fetchSource(source) {
  try {
    const xml = await fetchFeedText(source.url);
    const feed = await parser.parseString(xml);
    return (feed.items || []).map((item) => ({
      title: (item.title || "").trim(),
      link: item.link || item.guid || "",
      source: source.name,
      pubDate: item.isoDate || item.pubDate || null,
    }));
  } catch (err) {
    console.error(`Failed to fetch ${source.name} (${source.url}): ${err.message}`);
    return [];
  }
}

async function main() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  let items = results.flat().filter((item) => item.title && item.link);

  // Dedupe by link (some outlets syndicate the same story across feeds)
  const seen = new Set();
  items = items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // Newest first
  items.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  // Keep a reasonable cap so the JSON file and the page stay light
  items = items.slice(0, 150);

  const output = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };

  await writeFile("data.json", JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${items.length} headlines from ${SOURCES.length} feeds to data.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
