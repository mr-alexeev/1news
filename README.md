# כותרות עכשיו — News aggregator starter

A minimal Hebrew news aggregator: pulls headlines from a few Israeli RSS
feeds every 10 minutes, shows them in one page, opens the original article
in a new tab on click, and offers a Google Translate widget to switch the
page to Russian.

Everything here runs on free tiers.

## How it works

- `fetch-news.mjs` — a Node script that fetches the RSS feeds listed at the
  top of the file, normalizes them into `{ title, link, source, pubDate }`,
  dedupes, sorts by newest first, and writes `data.json`.
- `.github/workflows/update-news.yml` — a GitHub Actions workflow that runs
  the script every 10 minutes (cron) and commits the updated `data.json`
  back to the repo. This is your free "server."
- `index.html` — a static page that fetches `data.json` and renders the
  list. It also polls `data.json` again every 5 minutes in the browser so
  visitors see fresh headlines without reloading.

No database, no paid API, no server to maintain.

## Setup (free, ~10 minutes)

1. **Create a GitHub repo** and push this folder to it.
2. **Enable GitHub Actions**: it's on by default for public repos. Go to the
   repo's "Actions" tab once to confirm the workflow is visible.
3. **Run it once manually** so `data.json` gets real content immediately:
   Actions tab → "Update news" workflow → "Run workflow".
4. **Enable GitHub Pages**: repo Settings → Pages → set source to the
   branch you pushed (e.g. `main`) and root folder. GitHub will give you a
   URL like `https://yourname.github.io/your-repo/`.
5. That's it — the page is now live, and the Action keeps `data.json` fresh
   every 10 minutes automatically, even while your computer is off.

## Local testing

```bash
npm install
node fetch-news.mjs   # writes data.json
python3 -m http.server 8000   # or any static file server
# open http://localhost:8000
```

## Customizing sources

Edit the `SOURCES` array at the top of `fetch-news.mjs`. Any valid RSS/XML
feed URL works — most Israeli news sites publish one. Keep an eye on each
site's terms of use for RSS/republishing.

## Notes and known limitations

- **Encoding fix**: Ynet's RSS feed declares Windows-1255 encoding in its
  XML header even though the actual bytes are UTF-8. The fetch script
  works around this — if you add a feed with genuinely non-UTF-8 encoding,
  you'll need to adjust that part.
- **Translation**: the Google Translate widget translates the whole
  rendered page client-side. It's free and requires no API key, but the
  styling is controlled by Google (not very customizable) and it can be
  slow to load. If you want a cleaner look later, the upgrade path is
  calling a translation API (Google Cloud Translation or DeepL) at fetch
  time and storing a `title_ru` field per headline — but that needs an API
  key and has a small per-character cost beyond the free quota.
- **Polling interval**: GitHub Actions' free minimum practical cron
  interval is about 5 minutes (GitHub may delay slightly under load); 10
  minutes is safely within free-tier limits for any repo.
- **Rate limits / blocking**: some sites may rate-limit frequent scraping.
  RSS endpoints are generally fine since they're built for polling, but if
  a feed starts failing, add delay or reduce frequency for that source.
