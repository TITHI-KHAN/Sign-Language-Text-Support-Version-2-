const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORD_MAP_PATH = path.join(ROOT, "data", "word_sign_map.json");
const OUTPUT_JSON_PATH = path.join(ROOT, "data", "sign_video_map.json");
const OUTPUT_CSV_PATH = path.join(ROOT, "data", "sign_video_map.csv");
const OUTPUT_JS_PATH = path.join(ROOT, "data", "sign_video_map.js");
const CONCURRENCY = 6;

function normalizeWordKey(word) {
  return word
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function csvEscape(value) {
  const stringValue = String(value ?? "");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 word-sign-map-generator"
      }
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && redirects < 4) {
        response.resume();
        resolve(fetchText(new URL(response.headers.location, url).href, redirects + 1));
        return;
      }

      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({ statusCode: response.statusCode, body });
      });
    }).on("error", reject);
  });
}

function extractVideoUrl(html) {
  const metaStream = html.match(/<meta\s+name=["']twitter:player:stream["']\s+content=["']([^"']+)["']/i)?.[1];
  const ogVideo = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i)?.[1];
  const source = html.match(/<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/i)?.[1];

  return metaStream || ogVideo || source || "";
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractSignGloss(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']Watch how to sign ['"]([^'"]+)['"]/i)?.[1];

  return stripTags(h1 || title || "");
}

async function mapWord(word) {
  const wordKey = normalizeWordKey(word);
  const lookupUrl = `https://www.signasl.org/sign/${encodeURIComponent(wordKey)}`;

  try {
    const { statusCode, body } = await fetchText(lookupUrl);
    const signGloss = statusCode === 200 ? extractSignGloss(body) : "";
    const glossKey = normalizeWordKey(signGloss);
    const isExactSingleWord = Boolean(signGloss) && !/\s/.test(signGloss.trim()) && glossKey === wordKey;
    const videoUrl = statusCode === 200 && isExactSingleWord ? extractVideoUrl(body) : "";

    return {
      word: wordKey,
      sign_video_url: videoUrl,
      sign_source: videoUrl ? "SignASL" : "",
      sign_lookup_url: lookupUrl,
      status: videoUrl ? "matched-sign-video" : "no-exact-single-word-video-found",
      notes: signGloss && !isExactSingleWord ? `SignASL gloss is "${signGloss}".` : ""
    };
  } catch (error) {
    return {
      word: wordKey,
      sign_video_url: "",
      sign_source: "",
      sign_lookup_url: lookupUrl,
      status: "lookup-error",
      notes: error.message
    };
  }
}

async function runPool(words) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < words.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const result = await mapWord(words[currentIndex]);
      results[currentIndex] = result;
      process.stdout.write(result.sign_video_url ? "." : "-");
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n");
  return results;
}

async function main() {
  const wordMap = JSON.parse(fs.readFileSync(WORD_MAP_PATH, "utf8"));
  const words = wordMap.words
    .filter((row) => row.count === 1)
    .map((row) => row.word);
  const rows = await runPool(words);
  const matchedRows = rows.filter((row) => row.sign_video_url);
  const map = Object.fromEntries(matchedRows.map((row) => [
    row.word,
    {
      video_url: row.sign_video_url,
      source: row.sign_source,
      lookup_url: row.sign_lookup_url
    }
  ]));
  const headers = ["word", "sign_video_url", "sign_source", "sign_lookup_url", "status", "notes"];

  fs.writeFileSync(
    OUTPUT_CSV_PATH,
    `${[
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
    ].join("\n")}\n`
  );
  fs.writeFileSync(
    OUTPUT_JSON_PATH,
    `${JSON.stringify({
      source: "SignASL direct video metadata",
      generated_at: new Date().toISOString(),
      total_words_checked: words.length,
      matched_sign_videos: matchedRows.length,
      words: map,
      rows
    }, null, 2)}\n`
  );
  fs.writeFileSync(
    OUTPUT_JS_PATH,
    `window.SIGN_VIDEO_MAP = ${JSON.stringify(map, null, 2)};\n`
  );

  console.log(`Checked ${words.length} words.`);
  console.log(`Matched ${matchedRows.length} individual sign videos.`);
  console.log(OUTPUT_CSV_PATH);
  console.log(OUTPUT_JSON_PATH);
  console.log(OUTPUT_JS_PATH);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
