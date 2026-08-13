const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APP_PATH = path.join(ROOT, "app.js");
const OUTPUT_DIR = path.join(ROOT, "data");
const CSV_PATH = path.join(OUTPUT_DIR, "word_sign_map.csv");
const JSON_PATH = path.join(OUTPUT_DIR, "word_sign_map.json");
const TIMINGS_CSV_PATH = path.join(OUTPUT_DIR, "word_timing_map.csv");
const TIMINGS_JSON_PATH = path.join(OUTPUT_DIR, "word_timing_map.json");
const NON_REPEATED_WORDS_JS_PATH = path.join(OUTPUT_DIR, "non_repeated_words.js");

function extractLiteral(source, pattern, label) {
  const match = source.match(pattern);

  if (!match) {
    throw new Error(`Could not find ${label} in app.js`);
  }

  return match[1];
}

function normalizeText(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/d\/deaf/gi, "deaf")
    .toLowerCase();
}

function tokenize(text) {
  return normalizeText(text)
    .replace(/([a-z])'s\b/g, "$1")
    .replace(/\b(can)'t\b/g, "$1 not")
    .replace(/\b(don)'t\b/g, "$1 not")
    .replace(/\b([a-z]+)'([a-z]+)\b/g, "$1$2")
    .split(/[^a-z]+/)
    .filter((word) => word && (word.length > 1 || word === "a" || word === "i"));
}

function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getWordOccurrences(text) {
  const normalized = normalizeText(text)
    .replace(/([a-z])'s\b/g, "$1")
    .replace(/\b(can)'t\b/g, "$1 not")
    .replace(/\b(don)'t\b/g, "$1 not")
    .replace(/\b([a-z]+)'([a-z]+)\b/g, "$1$2");

  return Array.from(normalized.matchAll(/[a-z]+/g))
    .map((match) => match[0])
    .filter((word) => word && (word.length > 1 || word === "a" || word === "i"));
}

function csvEscape(value) {
  const stringValue = String(value ?? "");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function roundTimestamp(value) {
  return Number(value.toFixed(4));
}

const source = fs.readFileSync(APP_PATH, "utf8");
const title = extractLiteral(source, /const TITLE_TEXT = "([^"]+)";/, "TITLE_TEXT");
const cuesLiteral = extractLiteral(source, /const CUES = ([\s\S]*?\n\];)/, "CUES");
const cues = Function(`return ${cuesLiteral}`)();
const complexWordVideos = {};
const textParts = [title];

cues.forEach((cue) => {
  if (cue.text) {
    textParts.push(cue.text);
  }

  if (cue.items) {
    textParts.push(...cue.items);
  }
});

const tokens = tokenize(textParts.join(" "));
const counts = new Map();
const timingRows = [];
let sentenceClipIndex = 0;
let globalWordIndex = 0;

tokens.forEach((word) => {
  counts.set(word, (counts.get(word) || 0) + 1);
});

function addTimingRows({
  text,
  sourceType,
  cueIndex,
  paragraphClipIndex,
  paragraphStart,
  paragraphEnd
}) {
  const sentences = splitIntoSentences(text);
  const paragraphDuration = Math.max(paragraphEnd - paragraphStart, 0);
  const perSentenceDuration = sentences.length > 0 ? paragraphDuration / sentences.length : 0;

  sentences.forEach((sentenceText, sentenceIndexInParagraph) => {
    const currentSentenceClipIndex = sentenceClipIndex++;
    const sentenceStartMain = paragraphStart + (sentenceIndexInParagraph * perSentenceDuration);
    const sentenceEndMain = sentenceIndexInParagraph === sentences.length - 1
      ? paragraphEnd
      : paragraphStart + ((sentenceIndexInParagraph + 1) * perSentenceDuration);
    const sentenceDuration = Math.max(sentenceEndMain - sentenceStartMain, 0);
    const words = getWordOccurrences(sentenceText);
    const perWordDuration = words.length > 0 ? sentenceDuration / words.length : 0;

    words.forEach((word, wordIndexInSentence) => {
      const wordStartMain = sentenceStartMain + (wordIndexInSentence * perWordDuration);
      const wordEndMain = wordIndexInSentence === words.length - 1
        ? sentenceEndMain
        : sentenceStartMain + ((wordIndexInSentence + 1) * perWordDuration);
      const roundedSentenceStartMain = roundTimestamp(sentenceStartMain);
      const roundedSentenceEndMain = roundTimestamp(sentenceEndMain);
      const roundedParagraphStart = roundTimestamp(paragraphStart);
      const roundedParagraphEnd = roundTimestamp(paragraphEnd);
      const roundedWordStartMain = roundTimestamp(wordStartMain);
      const roundedWordEndMain = roundTimestamp(wordEndMain);
      const relativeSentenceClipStart = roundedWordStartMain - roundedSentenceStartMain;
      const relativeSentenceClipEnd = roundedWordEndMain - roundedSentenceStartMain;
      const relativeParagraphClipStart = roundedWordStartMain - roundedParagraphStart;
      const relativeParagraphClipEnd = roundedWordEndMain - roundedParagraphStart;

      timingRows.push({
        occurrence_id: globalWordIndex++,
        word,
        source_type: sourceType,
        cue_index: cueIndex,
        paragraph_clip_index: paragraphClipIndex,
        sentence_clip_index: currentSentenceClipIndex,
        word_index_in_sentence: wordIndexInSentence,
        sentence_text: sentenceText,
        paragraph_text: text,
        sentence_segment_start_main: roundedSentenceStartMain,
        sentence_segment_end_main: roundedSentenceEndMain,
        paragraph_segment_start_main: roundedParagraphStart,
        paragraph_segment_end_main: roundedParagraphEnd,
        main_video_start: roundedWordStartMain,
        main_video_end: roundedWordEndMain,
        relative_sentence_clip_start: roundTimestamp(relativeSentenceClipStart),
        relative_sentence_clip_end: roundTimestamp(relativeSentenceClipEnd),
        relative_paragraph_clip_start: roundTimestamp(relativeParagraphClipStart),
        relative_paragraph_clip_end: roundTimestamp(relativeParagraphClipEnd),
        timing_status: "estimated-needs-review",
        notes: "Relative clip timestamp = main video word timestamp - segment start timestamp. Estimates are evenly divided and must be replaced with reviewed sign-level annotation timestamps."
      });
    });
  });
}

addTimingRows({
  text: title,
  sourceType: "title",
  cueIndex: "title",
  paragraphClipIndex: 0,
  paragraphStart: 0,
  paragraphEnd: 16.6667
});

cues.forEach((cue, cueIndex) => {
  if (cue.items) {
    cue.items.forEach((itemText, itemIndex) => {
      addTimingRows({
        text: itemText,
        sourceType: `bullet-${itemIndex}`,
        cueIndex,
        paragraphClipIndex: cueIndex,
        paragraphStart: cue.start,
        paragraphEnd: cue.end
      });
    });
    return;
  }

  addTimingRows({
    text: cue.text,
    sourceType: "paragraph",
    cueIndex,
    paragraphClipIndex: cueIndex,
    paragraphStart: cue.start,
    paragraphEnd: cue.end
  });
});

const rows = Array.from(counts.entries())
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([word, count]) => {
    const localVideo = complexWordVideos[word] || "";

    return {
      word,
      count,
      local_video: localVideo,
      signbank_search_url: `https://aslsignbank.haskins.yale.edu/signs/search/?translation=${encodeURIComponent(word)}`,
      signasl_lookup_url: `https://www.signasl.org/sign/${encodeURIComponent(word)}`,
      status: localVideo ? "local-video-exists" : "needs-review",
      notes: localVideo ? "Already mapped to a local word video." : ""
    };
  });

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const headers = [
  "word",
  "count",
  "local_video",
  "signbank_search_url",
  "signasl_lookup_url",
  "status",
  "notes"
];

const csv = [
  headers.join(","),
  ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
].join("\n");

fs.writeFileSync(CSV_PATH, `${csv}\n`);
fs.writeFileSync(
  JSON_PATH,
  `${JSON.stringify({
    source: "app.js TITLE_TEXT and CUES",
    generated_at: new Date().toISOString(),
    total_tokens: tokens.length,
    unique_words: rows.length,
    sign_sources: {
      asl_signbank: "https://aslsignbank.haskins.yale.edu/",
      signasl: "https://www.signasl.org/"
    },
    words: rows
  }, null, 2)}\n`
);

const timingHeaders = [
  "occurrence_id",
  "word",
  "source_type",
  "cue_index",
  "paragraph_clip_index",
  "sentence_clip_index",
  "word_index_in_sentence",
  "sentence_segment_start_main",
  "sentence_segment_end_main",
  "paragraph_segment_start_main",
  "paragraph_segment_end_main",
  "main_video_start",
  "main_video_end",
  "relative_sentence_clip_start",
  "relative_sentence_clip_end",
  "relative_paragraph_clip_start",
  "relative_paragraph_clip_end",
  "timing_status",
  "sentence_text",
  "paragraph_text",
  "notes"
];

const timingCsv = [
  timingHeaders.join(","),
  ...timingRows.map((row) => timingHeaders.map((header) => csvEscape(row[header])).join(","))
].join("\n");

fs.writeFileSync(TIMINGS_CSV_PATH, `${timingCsv}\n`);
fs.writeFileSync(
  TIMINGS_JSON_PATH,
  `${JSON.stringify({
    source: "app.js TITLE_TEXT and CUES",
    generated_at: new Date().toISOString(),
    total_word_occurrences: timingRows.length,
    unique_words: rows.length,
    timing_note: "Relative clip timestamps use: relative timestamp = main video word timestamp - segment start timestamp. Current word timestamps are estimates from cue durations and must be reviewed against actual sign starts/ends before production use.",
    timings: timingRows
  }, null, 2)}\n`
);

const nonRepeatedWords = rows
  .filter((row) => row.count === 1)
  .map((row) => row.word);

fs.writeFileSync(
  NON_REPEATED_WORDS_JS_PATH,
  `window.NON_REPEATED_WORDS = new Set(${JSON.stringify(nonRepeatedWords, null, 2)});\n`
);

console.log(`Wrote ${rows.length} unique words from ${tokens.length} total tokens.`);
console.log(CSV_PATH);
console.log(JSON_PATH);
console.log(`Wrote ${timingRows.length} word timing rows.`);
console.log(TIMINGS_CSV_PATH);
console.log(TIMINGS_JSON_PATH);
console.log(`Wrote ${nonRepeatedWords.length} non-repeated unique words.`);
console.log(NON_REPEATED_WORDS_JS_PATH);
