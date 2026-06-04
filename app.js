let currentMode = 'full';
let currentLocation = 'popup';
let currentLinkingGranularity = 'word';
let currentNavigation = 'none';
let lastEnabledNavigation = 'both';
let hasNavigationChoice = false;
const choiceMadeByFeature = {
  location: false,
  segmentation: false,
  "linking-granularity": false,
  navigation: false
};
let stopTime = null;
let lastActiveEl = null;
let currentVideoTarget = null;
let currentVideoTimelineStart = 0;
let currentVideoHasTimeline = true;
let isProgrammaticTextScroll = false;
let textScrollFrame = null;
let textScrollSyncTimer = null;
let sentenceClipCounter = 0;
let isInitializingVideoStart = false;
let isTextDrivenVideoSeek = false;
let lastUserScrollTime = 0;
let navigationPanelRevealToken = 0;
const TITLE_TEXT = "Access Suggestions for Mobilizations";
const TITLE_CUE = { start: 0, end: 16.6667, text: TITLE_TEXT };
const textPanel = document.getElementById("textPanel");
const blogTitle = document.getElementById("blogTitle");
const video = document.getElementById("video");
const videoPanel = document.getElementById("videoPanel");
const videoCloseBtn = document.getElementById("videoCloseBtn");
const container = document.querySelector(".sins-container");
const textSide = document.querySelector(".text-side");
const sidebarContent = document.getElementById("sidebarContent");
const videoSidebar = document.getElementById("videoSidebar");
const panelResizer = document.getElementById("panelResizer");
const sidebarMenuBtn = document.getElementById("sidebarMenuBtn");
const featureOptionButtons = document.querySelectorAll("[data-feature-option]");
const segmentationOptionButtons = document.querySelectorAll('[data-feature-option="segmentation"]');
const linkingGranularityOptionButtons = document.querySelectorAll('[data-feature-option="linking-granularity"]');
const navigationOptionButtons = document.querySelectorAll('[data-feature-option="navigation"]');
const navigationDropdown = navigationOptionButtons[0]?.closest(".support-dropdown");
const navigationUnavailableMessage = document.getElementById("navigationUnavailableMessage");
const MAIN_VIDEO_PATH = "video.mp4";
const MOBILE_LAYOUT_BREAKPOINT = 700;
const GRANULARITY_ORDER = ["word", "sentence", "paragraph", "full"];

const popupVideoLayer = document.createElement("div");
popupVideoLayer.className = "video-popup-layer";
popupVideoLayer.hidden = true;
document.body.appendChild(popupVideoLayer);


/**
 * WORD ASSET MAP
 * For every "Complex Word" you have a video for, add it here.
 * Format: "word": "path/to/video.mp4"
 */
const complexWordVideos = {
  "accessibility": "assets/words/accessibility.mp4",
  "mobilizations": "assets/words/mobilizations.mp4",
  "recommendations": "assets/words/recommendations.mp4",
  "ableism": "assets/words/ableism.mp4",
  "autonomy": "assets/words/autonomy.mp4",
  "justice": "assets/words/justice.mp4"
};

function normalizeWordKey(word) {
  return word
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function getAvailableWordVideo(word) {
  return complexWordVideos[normalizeWordKey(word)] || "";
}

function getIndividualSignVideo(word) {
  return window.SIGN_VIDEO_MAP?.[normalizeWordKey(word)]?.video_url || "";
}

function shouldUseIndividualWordVideos() {
  return currentMode === "word" && currentLinkingGranularity === "word";
}

function setWordLinkAffordance(element, word) {
  if (currentLinkingGranularity !== "word") {
    return;
  }

  const wordKey = normalizeWordKey(word);
  const individualSignVideo = getIndividualSignVideo(wordKey);

  if (!wordKey) {
    return;
  }

  element.dataset.wordKey = wordKey;

  if (individualSignVideo) {
    element.dataset.hasWordVideo = "true";
    element.dataset.signVideoUrl = individualSignVideo;
  }
}

// FULL TRANSCRIPT CUES 
const CUES = [
  { start: 16.6667, end: 40, text: "These recommendations are to be used in addition to/in conjunction with the Access Suggestions for Public Events. This work is ideally done from a deeper political commitment to disability justice, or at least a critique of ableism and an understanding of disabled people’s autonomy and right to consent." },
  { start: 40, end: 64, type: 'bullet-group', items: 
    [
      "Know the difference between useful access support and patronizing ableist abuse!",
      "Always have at least one Accessibility Point Person.",
      "Announce them from the mic; have them wear armbands for visibility."
    ]},
  { start: 64, end: 103, text: "Their skills should include a disability justice framework, problem solving, and good listening. Create a clearly marked scent-free area. Have volunteers who can help explain what it is and why it is important. Create large-print and Braille versions of written materials." },
  { start: 103, end: 136, text: "Include important information, such as messaging/chants, route, destinations, National Lawyers Guild phone number, and additional instructions. Use a “sans serif” font for readability. These are fonts without the little “tails” at the edges of the letters." },
  { start: 136, end: 166, text: "OpenDyslexic and Comic Sans are fonts that are more accessible for people who are dyslexic and/or neurodiverse. Use microphones for all instructions or announcements. Provide ASL interpreters stationed at the mic, as well as throughout the crowd if possible." },
  { start: 166, end: 208, text: "Organize and announce from the mic: Availability of manual wheelchairs for people who need them. Low stimulation spaces near the main gathering space such as a room or a tent. Childcare and changing stations, and languages available at the event and how to access them." },
  { start: 208, end: 281, text: "Have people who know what’s happening clearly marked. Have them spread out throughout the mobilization - at the front, middle and back of the march, throughout the four quadrants of the rally, etc. More communication = more information = better access. Provide seating such as folding chairs, mobile bleachers, etc." },
  { start: 281, end: 304, text: "Rent walkie-talkies. Be mindful that police escalation will need to be communicated with participants in a calm manner, and will impact some more than others, particularly Black and brown people, under-documented people, and people with disabilities. Provide seating for rallies/gatherings where people can expect to be standing for any length of time. Announce their location from the mic and explain that they are for people with disabilities, elders, and others who cannot stand for a length of time." },
  { start: 304, end: 359, text: "It is also useful to create an area for D/deaf people to sit together near the interpreter. At a march, do a run-through of the route with mobility in mind ahead of time. Keep an eye out for metal grates, grassy areas, hills, holes, cracks or curbs that will be hard for wheelchairs or scooters. Invite people with disabilities to set the pace of the march by leading it. Let people know that this is happening." },
  { start: 359, end: 477, text: "Station people at the back of the march who are responsible for making sure that nobody gets left behind. Give a verbal description of the march route beforehand. Announce the destination and distance of the route. This lets folks choose to meet the march at its destination. DO NOT “direct” folks with mobility impairments to where you think they should be. Offer respectful suggestions; no one should be hurried along; no one should touch people or their mobility devices without their consent. Organize cars or vans to drive elders and people with disabilities along the route. Include these vehicles as part of the march, if possible. Provide seating at the destination. Have a team whose sole focus is the safety of the participants. Involve police liaisons." },
  { start: 477, end: 527, text: "Police liaisons should communicate to police that there are participants with disabilities such as elders, pregnant folks, etc. and that the march intends to respect their pace. Be aware that cops will often target folks with disabilities. Cops may perceive folks with disabilities as “weak links”; cops target folks at the end of actions as energy dissipates." },
  { start: 527, end: 555, text: "A note: Since we originally created these suggestions, the landscape in which we exist has shifted. It feels like we have an ever-increasing cascade of horrors facing us on the daily. We have a presidential administration that has proven time and again to be hostile to marginalized communities." },
  { start: 555, end: 585, text: "Furthermore, our planet is experiencing climate chaos and is on the brink of collapse. In these trying times, life is precarious. Dire circumstances require creative strategies and responsive agendas. Much action is needed, and everyone has a role." },
  { start: 585, end: 644, text: "Developing relationships with people with disabilities and asking us what we need is key. Inquire about where your body can be most useful in interrupting fascism, protecting immigrants, closing concentration camps, ending police brutality, honoring Indigenous sovereignty, and safeguarding the future of the planet and all its inhabitants. Invite us, strategize with us, bring all your skills and strengths. Don’t forget us. We are central to this movement and the future we are creating together." }
];


/**
 * PHYSICAL CLIP PLAYER
 * index: The number of the sentence/paragraph (0, 1, 2...)
 * type: 'sent' or 'para'
 */

/**
 * SMART PLAYER
 * Handles Word files, Sentence files, and seek-jumps in Full Mode
 */
function playSegment(startTime, endTime, isWordFile = false, wordUrl = null, element = null) {
  if (isWordFile && wordUrl && element) {
    playClipForTarget(wordUrl, element);
  } else {
    playClipForTarget(MAIN_VIDEO_PATH, element, { stopAt: endTime, seekTo: startTime });
  }
}

function getClipPlaybackForTarget(element, fallback = {}) {
  if (!element) {
    return fallback;
  }

  const start = parseFloat(element.dataset.start);
  const end = parseFloat(element.dataset.end);
  const segmentStart = parseFloat(element.dataset.segmentStart);
  const segmentEnd = parseFloat(element.dataset.segmentEnd);
  const sentenceClipIndex = Number.parseInt(element.dataset.sentenceClipIndex, 10);
  const paragraphClipIndex = Number.parseInt(element.dataset.paragraphClipIndex, 10);

  if (currentMode === "paragraph" && Number.isFinite(paragraphClipIndex)) {
    const timelineStart = Number.isFinite(segmentStart) ? segmentStart : start;
    return {
      src: `segments/paragraphs/para_${paragraphClipIndex}.mp4`,
      timelineStart,
      seekTo: Number.isFinite(start) && Number.isFinite(timelineStart) ? Math.max(start - timelineStart, 0) : null,
      stopAt: Number.isFinite(end) && Number.isFinite(timelineStart) ? Math.max(end - timelineStart, 0) : null
    };
  }

  if (currentMode === "sentence" && Number.isFinite(sentenceClipIndex)) {
    const timelineStart = Number.isFinite(segmentStart) ? segmentStart : start;
    return {
      src: `segments/sentences/sent_${sentenceClipIndex}.mp4`,
      timelineStart,
      seekTo: Number.isFinite(start) && Number.isFinite(timelineStart) ? Math.max(start - timelineStart, 0) : 0,
      stopAt: null
    };
  }

  return {
    src: MAIN_VIDEO_PATH,
    seekTo: Number.isFinite(start) ? start : fallback.seekTo,
    stopAt: Number.isFinite(end) ? end : fallback.stopAt,
    timelineStart: 0
  };
}

function updateChoiceVisuals(feature, selectedValue, { markChoice = choiceMadeByFeature[feature] } = {}) {
  choiceMadeByFeature[feature] = markChoice;

  document.querySelectorAll(`[data-feature-option="${feature}"]`).forEach((button) => {
    const isSelected = button.dataset.value === selectedValue;
    button.classList.toggle("selected", markChoice && isSelected);
    button.classList.toggle("current-selection", markChoice && isSelected);
    button.classList.remove("is-disabled");
    button.disabled = false;
    button.setAttribute("aria-disabled", "false");
  });
}

function clearChoiceVisual(feature) {
  choiceMadeByFeature[feature] = false;
  document.querySelectorAll(`[data-feature-option="${feature}"]`).forEach((button) => {
    button.classList.remove("current-selection");
  });
}

function getGranularityRank(granularity) {
  return GRANULARITY_ORDER.indexOf(granularity);
}

function isSupportedGranularity(granularity) {
  return getGranularityRank(granularity) !== -1;
}

function getStateMachineState(mode = currentMode, linkingGranularity = currentLinkingGranularity) {
  const modeRank = getGranularityRank(mode);
  const linkingRank = getGranularityRank(linkingGranularity);
  const valid = modeRank !== -1 && linkingRank !== -1 && linkingRank <= modeRank;
  const navigationAvailable = valid && linkingRank < modeRank;

  return {
    modeRank,
    linkingRank,
    valid,
    navigationAvailable,
    sameGranularity: valid && linkingRank === modeRank
  };
}

function getValidLinkingGranularity(mode, requestedGranularity) {
  if (!isSupportedGranularity(requestedGranularity)) {
    return mode;
  }

  const modeRank = getGranularityRank(mode);
  const requestedRank = getGranularityRank(requestedGranularity);
  return requestedRank <= modeRank ? requestedGranularity : mode;
}

function updateLinkingGranularityAvailability() {
  const modeRank = getGranularityRank(currentMode);

  linkingGranularityOptionButtons.forEach((button) => {
    const optionRank = getGranularityRank(button.dataset.value);
    const optionAvailable = optionRank !== -1 && optionRank <= modeRank;
    const isSelected = button.dataset.value === currentLinkingGranularity;

    button.disabled = !optionAvailable;
    button.setAttribute("aria-disabled", String(!optionAvailable));
    button.classList.toggle("is-disabled", !optionAvailable);
    button.classList.toggle("selected", optionAvailable && choiceMadeByFeature["linking-granularity"] && isSelected);
    button.classList.toggle("current-selection", optionAvailable && choiceMadeByFeature["linking-granularity"] && isSelected);
  });
}


function setMode(mode, revealVideo = true, { syncLinkingGranularity = false } = {}) {
  currentMode = mode;
  stopTime = null;
  document.body.dataset.mode = mode;

  updateChoiceVisuals("segmentation", mode);

  if (syncLinkingGranularity) {
    currentLinkingGranularity = mode;
    updateChoiceVisuals("linking-granularity", currentLinkingGranularity, { markChoice: false });
  } else {
    const nextLinkingGranularity = getValidLinkingGranularity(mode, currentLinkingGranularity);

    if (nextLinkingGranularity !== currentLinkingGranularity) {
      currentLinkingGranularity = nextLinkingGranularity;
      choiceMadeByFeature["linking-granularity"] = false;
    }
  }

  if (revealVideo) {
    setVideoVisible(true);
  }

  // RESET LOGIC: 
  // Always point back to the main video when switching modes
  video.src = MAIN_VIDEO_PATH; 
  currentVideoTimelineStart = 0;
  currentVideoHasTimeline = true;
  video.currentTime = 0; // Go to the very start
  video.pause();

  document.querySelectorAll('.seg-controls button').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  const segmentStatus = document.getElementById("segment-status");
  if (segmentStatus) {
    segmentStatus.innerText = `MODE: ${mode.toUpperCase()}`;
  }

  renderContent();
  updateLinkingGranularityAvailability();
  updateTextLinkStates();
  updateNavigationAvailability();
  scheduleTextScrollSync();
}

function setNavigationInteraction(navigationMode, { markChoice = true, deferPanelReveal = false } = {}) {
  const availability = getNavigationAvailability();

  if (!availability.available || !availability.allowedModes.includes(navigationMode)) {
    return;
  }

  currentNavigation = navigationMode;
  lastEnabledNavigation = navigationMode;
  hasNavigationChoice = markChoice;

  navigationOptionButtons.forEach((button) => {
    const optionAvailable = availability.allowedModes.includes(button.dataset.value);
    button.disabled = !optionAvailable;
    button.classList.toggle("selected", markChoice && button.dataset.value === navigationMode);
    button.classList.toggle("current-selection", hasNavigationChoice && button.dataset.value === navigationMode);
    button.classList.toggle("is-disabled", !optionAvailable);
    button.setAttribute("aria-disabled", String(!optionAvailable));
  });

  const revealNavigationPanel = () => {
    if (navigationMode === "video-centric" || navigationMode === "both") {
      prepareVideoCentricPanel();
      return;
    }

    if (navigationMode === "text-centric") {
      setVideoVisible(currentLocation !== "popup");
    }
  };

  if (!markChoice) {
    updateTextLinkStates();
    return;
  }

  if (deferPanelReveal) {
    const revealToken = ++navigationPanelRevealToken;
    setVideoVisible(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (revealToken === navigationPanelRevealToken && hasNavigationChoice) {
          revealNavigationPanel();
        }
      });
    });
  } else {
    revealNavigationPanel();
  }

  updateTextLinkStates();
}

function setLinkingGranularity(granularity) {
  if (getValidLinkingGranularity(currentMode, granularity) !== granularity) {
    updateLinkingGranularityAvailability();
    return;
  }

  currentLinkingGranularity = granularity;

  updateChoiceVisuals("linking-granularity", granularity);

  renderContent();
  updateLinkingGranularityAvailability();
  updateTextLinkStates();
  updateNavigationAvailability();
}

function getNavigationAvailability() {
  const { navigationAvailable } = getStateMachineState();
  return {
    available: navigationAvailable,
    allowedModes: ["text-centric", "video-centric", "both"]
  };
}

function updateNavigationAvailability() {
  const { available, allowedModes } = getNavigationAvailability();

  navigationDropdown?.classList.toggle("is-unavailable", !available);

  if (navigationUnavailableMessage) {
    navigationUnavailableMessage.hidden = available;
  }

  if (available && currentNavigation !== "none" && !allowedModes.includes(currentNavigation)) {
    currentNavigation = "both";
  }

  navigationOptionButtons.forEach((button) => {
    const optionAvailable = available && allowedModes.includes(button.dataset.value);
    button.disabled = !optionAvailable;
    button.setAttribute("aria-disabled", String(!optionAvailable));

    if (!optionAvailable) {
      button.classList.remove("selected");
      button.classList.remove("current-selection");
      button.classList.add("is-disabled");
      return;
    }

    button.classList.toggle("selected", hasNavigationChoice && button.dataset.value === currentNavigation);
    button.classList.toggle("current-selection", hasNavigationChoice && button.dataset.value === currentNavigation);
    button.classList.remove("is-disabled");
  });

  if (!available) {
    currentNavigation = "none";
    return;
  }

  if (currentNavigation === "none" && hasNavigationChoice) {
    currentNavigation = lastEnabledNavigation;
  }

  if (currentNavigation !== "none") {
    setNavigationInteraction(currentNavigation, { markChoice: hasNavigationChoice });
  }
}

function canTextControlVideo() {
  const state = getStateMachineState();

  if (!state.valid) {
    return false;
  }

  if (state.sameGranularity) {
    return true;
  }

  return hasNavigationChoice && (currentNavigation === "text-centric" || currentNavigation === "both");
}

function canVideoControlText() {
  const state = getStateMachineState();
  return state.navigationAvailable
    && hasNavigationChoice
    && (currentNavigation === "video-centric" || currentNavigation === "both");
}

function isSameDisplayedSegment(chunk, target) {
  if (!chunk || !target) {
    return false;
  }

  const chunkIsTitle = Boolean(chunk.closest(".blog-header"));
  const targetIsTitle = Boolean(target.closest(".blog-header"));

  if (currentMode !== "full" && chunkIsTitle !== targetIsTitle) {
    return false;
  }

  const chunkSegmentStart = chunk.dataset.segmentStart;
  const chunkSegmentEnd = chunk.dataset.segmentEnd;
  const targetSegmentStart = target.dataset.segmentStart;
  const targetSegmentEnd = target.dataset.segmentEnd;

  return Boolean(chunkSegmentStart && chunkSegmentEnd)
    && chunkSegmentStart === targetSegmentStart
    && chunkSegmentEnd === targetSegmentEnd;
}

function updateTextLinkStates() {
  const textCanControlVideo = canTextControlVideo();

  document.querySelectorAll(".cueChunk").forEach((chunk) => {
    const shouldShowLink = textCanControlVideo
      && (!shouldUseIndividualWordVideos() || chunk.dataset.hasWordVideo === "true");

    chunk.classList.toggle("is-linked", shouldShowLink);
    chunk.setAttribute("aria-disabled", String(!textCanControlVideo));
  });
}

function renderContent() {
  // 1. Clear the panel
  textPanel.innerHTML = "";
  sentenceClipCounter = 0;
  renderTitle();

  // 2. Iterate through CUES to build the HTML structure
  CUES.forEach((cue, index) => {
    let container;
    
    // Create the base structure (ul for bullets, p for sentences)
    if (cue.type === 'bullet-group') {
      container = document.createElement("ul");
      const paraIndex = index;
      const bulletGroupClass = `paragraph-group-${paraIndex}`;

      cue.items.forEach((itemText, itemIndex) => {
        const li = document.createElement("li");
        li.className = "cue-container";

        if (currentLinkingGranularity === 'paragraph') {
          // Keep bullet markup, but make the whole bullet group act as one paragraph.
          const span = document.createElement("span");
          span.className = `cueChunk ${bulletGroupClass}`;
          setFormattedText(span, itemText);
          span.dataset.start = cue.start;
          span.dataset.end = cue.end;
          setDisplayedSegmentRange(span, cue);
          setClipIndexes(span, { paragraphClipIndex: paraIndex });
          span.onclick = () => {
            const playback = getClipPlaybackForTarget(span);
            playClipForTarget(playback.src, span, playback);
          };
          li.appendChild(span);
        } else {
          // Call helper to fill the <li> with interactive spans
          appendProcessedText(li, itemText, getBulletItemCue(cue, itemIndex), index);
        }
        container.appendChild(li);
      });
    } else {
      container = document.createElement("p");
      container.className = "cue-container";
      // Call helper to fill the <p> with interactive spans
      appendProcessedText(container, cue.text, cue, index);
    }

    textPanel.appendChild(container);
  });
}

function renderTitle() {
  if (!blogTitle) {
    return;
  }

  blogTitle.innerHTML = "";

  if (currentLinkingGranularity === 'paragraph') {
    const span = document.createElement("span");
    span.className = "cueChunk paragraph-group-0";
    setFormattedText(span, TITLE_TEXT);
    span.dataset.start = TITLE_CUE.start;
    span.dataset.end = CUES[0].end;
    setDisplayedSegmentRange(span, { ...TITLE_CUE, end: CUES[0].end });
    setClipIndexes(span, { paragraphClipIndex: 0 });
    span.onclick = () => {
      const playback = getClipPlaybackForTarget(span);
      playClipForTarget(playback.src, span, playback);
    };
    blogTitle.appendChild(span);
    return;
  }

  appendProcessedText(blogTitle, TITLE_TEXT, TITLE_CUE, 0);
}

function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function setFormattedText(element, text, trailingSpace = false) {
  element.textContent = "";

  if (text.startsWith("A note")) {
    const strong = document.createElement("strong");
    strong.textContent = "A note";
    element.appendChild(strong);
    element.appendChild(document.createTextNode(text.slice("A note".length)));
  } else {
    element.appendChild(document.createTextNode(text));
  }

  if (trailingSpace) {
    element.appendChild(document.createTextNode(" "));
  }
}

function setSegmentRange(element, start, end) {
  element.dataset.segmentStart = start;
  element.dataset.segmentEnd = end;
}

function setClipIndexes(element, { sentenceClipIndex = null, paragraphClipIndex = null } = {}) {
  if (sentenceClipIndex !== null) {
    element.dataset.sentenceClipIndex = sentenceClipIndex;
  }

  if (paragraphClipIndex !== null) {
    element.dataset.paragraphClipIndex = paragraphClipIndex;
  }
}

function getFullTextEnd() {
  return CUES[CUES.length - 1]?.end ?? TITLE_CUE.end;
}

function setDisplayedSegmentRange(element, cue, ranges = {}) {
  const {
    wordStart = cue.start,
    wordEnd = cue.end,
    sentenceStart = cue.start,
    sentenceEnd = cue.end
  } = ranges;

  if (currentMode === "word") {
    setSegmentRange(element, wordStart, wordEnd);
    return;
  }

  if (currentMode === "sentence") {
    setSegmentRange(element, sentenceStart, sentenceEnd);
    return;
  }

  if (currentMode === "full") {
    setSegmentRange(element, TITLE_CUE.start, getFullTextEnd());
    return;
  }

  setSegmentRange(element, cue.start, cue.end);
}

function getBulletItemCue(cue, itemIndex) {
  const itemCount = cue.items?.length || 1;
  const cueDuration = Math.max(cue.end - cue.start, 0);
  const itemDuration = cueDuration / itemCount;
  const start = cue.start + (itemIndex * itemDuration);
  const end = itemIndex === itemCount - 1
    ? cue.end
    : cue.start + ((itemIndex + 1) * itemDuration);

  return { ...cue, start, end };
}

/**
 * Logic to fill a container with text based on the active mode
 * This ensures structure remains consistent (Bullets/Paragraphs) regardless of Mode
 */
function appendProcessedText(container, rawText, cue, cueIndex) {
  if (currentMode === 'word' || currentLinkingGranularity === 'word') {
    const sentences = splitIntoSentences(rawText);
    const cueDuration = Math.max(cue.end - cue.start, 0);
    const perSentenceDuration = sentences.length > 0 ? cueDuration / sentences.length : 0;

    sentences.forEach((sentenceText, sentenceIdx) => {
      const sentenceClipIndex = sentenceClipCounter++;
      const sentenceStart = cue.start + (sentenceIdx * perSentenceDuration);
      const sentenceEnd = sentenceIdx === sentences.length - 1
        ? cue.end
        : cue.start + ((sentenceIdx + 1) * perSentenceDuration);
      const words = sentenceText.split(" ");
      const sentenceDuration = Math.max(sentenceEnd - sentenceStart, 0);
      const perWordDuration = words.length > 0 ? sentenceDuration / words.length : 0;

      words.forEach((word, wordIndex) => {
        const clean = normalizeWordKey(word);
        const span = document.createElement("span");
        const wordStart = sentenceStart + (wordIndex * perWordDuration);
        const wordEnd = wordIndex === words.length - 1
          ? sentenceEnd
          : sentenceStart + ((wordIndex + 1) * perWordDuration);
        span.textContent = word + " ";
        span.className = "cueChunk inline-text";
        span.dataset.start = wordStart;
        span.dataset.end = wordEnd;
        setDisplayedSegmentRange(span, cue, { wordStart, wordEnd, sentenceStart, sentenceEnd });
        setClipIndexes(span, { sentenceClipIndex, paragraphClipIndex: cueIndex });

        setWordLinkAffordance(span, word);

        if (currentLinkingGranularity === "word") {
          const availableWordVideo = span.dataset.signVideoUrl || getIndividualSignVideo(clean);
          span.onclick = (e) => {
            e.stopPropagation();

            if (shouldUseIndividualWordVideos()) {
              if (availableWordVideo) {
                playSegment(null, null, true, availableWordVideo, span);
              }
              return;
            }

            const playback = getClipPlaybackForTarget(span, { seekTo: wordStart, stopAt: wordEnd });
            playClipForTarget(playback.src, span, playback);
          };
        }
        container.appendChild(span);
      });
    });
  } 
  else if (currentLinkingGranularity === 'sentence') {
    const sentences = splitIntoSentences(rawText);
    const cueDuration = Math.max(cue.end - cue.start, 0);
    const perSentenceDuration = sentences.length > 0 ? cueDuration / sentences.length : 0;

    sentences.forEach((sentenceText, sentenceIdx) => {
      const span = document.createElement("span");
      const sentenceClipIndex = sentenceClipCounter++;
      const sentenceStart = cue.start + (sentenceIdx * perSentenceDuration);
      const sentenceEnd = sentenceIdx === sentences.length - 1
        ? cue.end
        : cue.start + ((sentenceIdx + 1) * perSentenceDuration);
      span.className = "cueChunk sentence-chunk";
      setFormattedText(span, sentenceText, true);
      span.dataset.start = sentenceStart;
      span.dataset.end = sentenceEnd;
      setDisplayedSegmentRange(span, cue, { sentenceStart, sentenceEnd });
      setClipIndexes(span, { sentenceClipIndex, paragraphClipIndex: cueIndex });

      span.onclick = () => {
        const playback = getClipPlaybackForTarget(span, { seekTo: sentenceStart, stopAt: sentenceEnd });
        playClipForTarget(playback.src, span, playback);
      };
      container.appendChild(span);
    });
  }
  else if (currentLinkingGranularity === 'paragraph') {
    const span = document.createElement("span");
    const paraIndex = cueIndex;
    const paragraphGroupClass = `paragraph-group-${paraIndex}`;
    span.className = `cueChunk ${paragraphGroupClass}`;
    setFormattedText(span, rawText);
    span.dataset.start = paraIndex === 0 ? TITLE_CUE.start : cue.start;
    span.dataset.end = cue.end;
    setDisplayedSegmentRange(span, { ...cue, start: Number(span.dataset.start) });
    setClipIndexes(span, { paragraphClipIndex: paraIndex });

    span.onclick = () => {
      const playback = getClipPlaybackForTarget(span);
      playClipForTarget(playback.src, span, playback);
    };
    container.appendChild(span);
  }
  else if (currentLinkingGranularity === 'full') {
    const sentences = splitIntoSentences(rawText);
    const cueDuration = Math.max(cue.end - cue.start, 0);
    const perSentenceDuration = sentences.length > 0 ? cueDuration / sentences.length : 0;

    sentences.forEach((sentenceText, sentenceIdx) => {
      const sentenceStart = cue.start + (sentenceIdx * perSentenceDuration);
      const sentenceEnd = sentenceIdx === sentences.length - 1
        ? cue.end
        : cue.start + ((sentenceIdx + 1) * perSentenceDuration);

      const span = document.createElement("span");
      span.className = "cueChunk inline-text sentence-chunk";
      span.dataset.start = sentenceStart;
      span.dataset.end = sentenceEnd;
      setDisplayedSegmentRange(span, cue, { sentenceStart, sentenceEnd });
      setClipIndexes(span, { sentenceClipIndex: sentenceClipCounter++, paragraphClipIndex: cueIndex });
      setFormattedText(span, sentenceText, true);
      span.onclick = () => {
        const playback = getClipPlaybackForTarget(span, { seekTo: sentenceStart });
        playClipForTarget(playback.src, span, playback);
      };
      container.appendChild(span);
    });
  }
}

function getChunkMidpointDistance(element, viewportCenter) {
  const rect = element.getBoundingClientRect();
  return Math.abs((rect.top + rect.height / 2) - viewportCenter);
}

function getCenteredTextChunk() {
  const isWindowAtTop = window.scrollY <= 8;
  const isTextPanelAtTop = textSide ? textSide.scrollTop <= 8 : true;

  if (isWindowAtTop && isTextPanelAtTop) {
    return getStartingTextChunk();
  }

  const chunks = Array.from(document.querySelectorAll(".cueChunk"));
  const textRect = textSide?.getBoundingClientRect();
  const visibleTop = Math.max(textRect?.top ?? 0, 0);
  const visibleBottom = Math.min(textRect?.bottom ?? window.innerHeight, window.innerHeight);
  const readingLine = visibleTop + ((visibleBottom - visibleTop) * 0.24);
  const visibleLines = chunks
    .flatMap((chunk) => Array.from(chunk.getClientRects()).map((rect) => ({ chunk, rect })))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0 && rect.bottom >= visibleTop && rect.top <= visibleBottom)
    .sort((a, b) => {
      if (Math.abs(a.rect.top - b.rect.top) > 2) {
        return a.rect.top - b.rect.top;
      }

      return a.rect.left - b.rect.left;
    });

  return visibleLines.find(({ rect }) => rect.top <= readingLine && rect.bottom >= readingLine)?.chunk
    || visibleLines.find(({ rect }) => rect.top > readingLine)?.chunk
    || visibleLines[visibleLines.length - 1]?.chunk
    || null;
}

function getFirstTextChunk() {
  return document.querySelector(".cueChunk");
}

function getStartingTextChunk() {
  return blogTitle?.querySelector(".cueChunk") || getFirstTextChunk();
}

function highlightChunk(element) {
  document.querySelectorAll(".cueChunk").forEach((chunk) => {
    chunk.classList.remove("activeHighlight", "activeSegmentHighlight");
  });

  if (!element) {
    updateTextLinkStates();
    return;
  }

  const segmentStart = element.dataset.segmentStart;
  const segmentEnd = element.dataset.segmentEnd;

  if (segmentStart && segmentEnd) {
    document.querySelectorAll(".cueChunk").forEach((chunk) => {
      if (isSameDisplayedSegment(chunk, element)) {
        chunk.classList.add("activeSegmentHighlight");
      }
    });
  }

  element.classList.add("activeHighlight");

  updateTextLinkStates();
}

let hoverSegmentTarget = null;

function clearHoverSegmentHighlight() {
  hoverSegmentTarget = null;
  document.querySelectorAll(".cueChunk.hoverSegmentHighlight").forEach((chunk) => {
    chunk.classList.remove("hoverSegmentHighlight");
  });
}

function highlightHoverSegment(element) {
  if (!element || !canTextControlVideo() || !element.classList.contains("is-linked")) {
    clearHoverSegmentHighlight();
    return;
  }

  hoverSegmentTarget = element;
  document.querySelectorAll(".cueChunk").forEach((chunk) => {
    chunk.classList.toggle("hoverSegmentHighlight", isSameDisplayedSegment(chunk, element));
  });
}

function isTextChunkInArticle(element) {
  return Boolean(element && (textPanel?.contains(element) || blogTitle?.contains(element)));
}

document.addEventListener("mouseover", (event) => {
  const chunk = event.target.closest?.(".cueChunk");

  if (!isTextChunkInArticle(chunk) || chunk === hoverSegmentTarget) {
    return;
  }

  highlightHoverSegment(chunk);
});

document.addEventListener("mouseout", (event) => {
  if (!hoverSegmentTarget) {
    return;
  }

  const nextChunk = event.relatedTarget?.closest?.(".cueChunk");

  if (isTextChunkInArticle(nextChunk) && isSameDisplayedSegment(nextChunk, hoverSegmentTarget)) {
    return;
  }

  clearHoverSegmentHighlight();
});

function scrollChunkIntoViewFromVideo(element, force = false) {
  if (!element || !canVideoControlText()) {
    return;
  }

  if (lastActiveEl === element) {
    return;
  }

  const rect = element.getBoundingClientRect();
  const textRect = textSide?.getBoundingClientRect();
  const visibleTop = Math.max(textRect?.top ?? 0, 0);
  const visibleBottom = Math.min(textRect?.bottom ?? window.innerHeight, window.innerHeight);
  const comfortableTop = visibleTop + ((visibleBottom - visibleTop) * 0.12);
  const comfortableBottom = visibleTop + ((visibleBottom - visibleTop) * 0.88);
  const isComfortablyVisible = rect.top >= comfortableTop && rect.bottom <= comfortableBottom;

  if (!force && isComfortablyVisible) {
    lastActiveEl = element;
    return;
  }

  isProgrammaticTextScroll = true;
  element.scrollIntoView({
    behavior: video.seeking ? "auto" : "smooth",
    block: force ? "start" : "center"
  });
  lastActiveEl = element;
  window.setTimeout(() => {
    isProgrammaticTextScroll = false;
  }, 600);
}

function activateVideoTarget(element, options = {}) {
  if (!element) {
    return;
  }

  const shouldScroll = options.scroll !== false;
  const forceScroll = options.forceScroll === true;

  currentVideoTarget = element;
  highlightChunk(element);

  if (shouldScroll) {
    scrollChunkIntoViewFromVideo(element, forceScroll);
  }

  if (currentLocation === "in-place" && videoPanel.style.display !== "none") {
    positionInPlaceVideoPanel(element);
  }
}

function isMainVideoSource() {
  return video.src.includes(MAIN_VIDEO_PATH);
}

function getChunkForMainVideoTime(time) {
  if (time < TITLE_CUE.start) {
    return getStartingTextChunk();
  }

  return Array.from(document.querySelectorAll(".cueChunk")).find((element) => {
    const start = parseFloat(element.dataset.start);
    const end = parseFloat(element.dataset.end);

    return Number.isFinite(start) && Number.isFinite(end) && time >= start && time < end;
  }) || null;
}

function syncHighlightFromVideoTime(options = {}) {
  if (isInitializingVideoStart || isTextDrivenVideoSeek) {
    return;
  }

  if (!canVideoControlText()) {
    return;
  }

  const shouldAutoScrollText = options.forceScroll === true || currentNavigation === "video-centric";

  if (!isMainVideoSource() && !currentVideoHasTimeline) {
    if (currentVideoTarget) {
      activateVideoTarget(currentVideoTarget, {
        scroll: shouldAutoScrollText,
        forceScroll: options.forceScroll === true
      });
    }
    return;
  }

  const activeChunk = getChunkForMainVideoTime(currentVideoTimelineStart + video.currentTime);

  if (activeChunk) {
    activateVideoTarget(activeChunk, {
      scroll: shouldAutoScrollText,
      forceScroll: options.forceScroll === true
    });
  } else {
    highlightChunk(null);
    currentVideoTarget = null;
  }
}

function prepareVideoCentricPanel() {
  const firstChunk = getStartingTextChunk();

  if (!firstChunk) {
    setVideoVisible(true);
    return;
  }

  stopTime = null;
  isInitializingVideoStart = true;
  window.clearTimeout(textScrollSyncTimer);
  textScrollSyncTimer = null;

  if (textScrollFrame !== null) {
    cancelAnimationFrame(textScrollFrame);
    textScrollFrame = null;
  }

  video.pause();
  video.src = MAIN_VIDEO_PATH;
  currentVideoTimelineStart = 0;
  currentVideoHasTimeline = true;
  video.load();
  video.pause();
  video.currentTime = 0;

  setVideoVisible(true, firstChunk);
  currentVideoTarget = firstChunk;
  highlightChunk(firstChunk);
  scrollChunkIntoViewFromVideo(firstChunk, true);

  const applyStartTime = () => {
    video.currentTime = 0;
    video.pause();
    currentVideoTarget = firstChunk;
    highlightChunk(firstChunk);
  };

  if (video.readyState >= 1) {
    applyStartTime();
  } else {
    video.addEventListener("loadedmetadata", applyStartTime, { once: true });
  }

  video.addEventListener("canplay", applyStartTime, { once: true });
  requestAnimationFrame(() => {
    applyStartTime();
    window.setTimeout(() => {
      isInitializingVideoStart = false;
    }, 250);
  });
}

function scheduleFloatingPanelPosition() {
  if (currentLocation === "in-place" && videoPanel.style.display !== "none") {
    requestAnimationFrame(() => positionInPlaceVideoPanel(currentVideoTarget));
  }
}

function setVideoSource(src, shouldLoad = true) {
  const nextSrc = new URL(src, window.location.href).href;

  if (video.currentSrc === nextSrc || video.src === nextSrc) {
    return false;
  }

  video.src = src;

  if (shouldLoad) {
    video.load();
  }

  return true;
}

function seekMainVideoFromText(element, { play = false, stopAt = null, position = true } = {}) {
  if (!element) {
    return;
  }

  const start = parseFloat(element.dataset.start);

  if (!Number.isFinite(start)) {
    return;
  }

  setVideoVisible(true, element, { position });
  currentVideoTarget = element;
  lastActiveEl = element;
  highlightChunk(element);
  setVideoSource(MAIN_VIDEO_PATH);
  currentVideoTimelineStart = 0;
  currentVideoHasTimeline = true;
  stopTime = stopAt;
  isTextDrivenVideoSeek = true;
  video.currentTime = start;

  if (play) {
    video.play().catch(() => {});
  } else {
    video.pause();
  }

  window.setTimeout(() => {
    isTextDrivenVideoSeek = false;
  }, 180);
}

function playClipForTarget(src, element, { stopAt = null, seekTo = null, timelineStart = null } = {}) {
  if (!canTextControlVideo()) {
    return;
  }

  if (currentNavigation === "text-centric" && element && src === MAIN_VIDEO_PATH) {
    seekMainVideoFromText(element, { play: true, stopAt });
    return;
  }

  if (videoPanel.style.display !== "none" && currentVideoTarget !== element) {
    setVideoVisible(false);
  }

  setVideoVisible(true, element);
  activateVideoTarget(element);
  stopTime = stopAt;
  const sourceChanged = setVideoSource(src);
  currentVideoTimelineStart = Number.isFinite(timelineStart) ? timelineStart : 0;
  currentVideoHasTimeline = src === MAIN_VIDEO_PATH || Number.isFinite(timelineStart);

  if (Number.isFinite(seekTo)) {
    video.currentTime = seekTo;
  } else if (!sourceChanged) {
    video.currentTime = 0;
  }

  video.play().catch(() => {});
}

function syncVideoToTextScroll() {
  if (isProgrammaticTextScroll || !hasNavigationChoice || currentNavigation !== "both") {
    return;
  }

  const activeChunk = getCenteredTextChunk();

  if (!activeChunk) {
    return;
  }

  const targetChanged = activeChunk !== currentVideoTarget;

  currentVideoTarget = activeChunk;
  lastActiveEl = activeChunk;
  highlightChunk(activeChunk);

  if (currentLocation === "popup" && currentMode === "full" && currentNavigation === "both") {
    setVideoVisible(true, activeChunk, { position: false });
  }

  if (currentLinkingGranularity === "word") {
    if (shouldUseIndividualWordVideos() && activeChunk.dataset.hasWordVideo === "true") {
      setVideoVisible(true, activeChunk, { position: currentLocation !== "popup" });
      setVideoSource(activeChunk.dataset.signVideoUrl || getIndividualSignVideo(activeChunk.dataset.wordKey || activeChunk.textContent));
      currentVideoTimelineStart = 0;
      currentVideoHasTimeline = false;
      video.pause();
    } else {
      const playback = getClipPlaybackForTarget(activeChunk);
      const shouldKeepPlaying = !video.paused;
      setVideoVisible(true, activeChunk, { position: currentLocation !== "popup" });
      activateVideoTarget(activeChunk, { scroll: false });
      stopTime = playback.stopAt;
      setVideoSource(playback.src);
      currentVideoTimelineStart = Number.isFinite(playback.timelineStart) ? playback.timelineStart : 0;
      currentVideoHasTimeline = playback.src === MAIN_VIDEO_PATH || Number.isFinite(playback.timelineStart);

      if (Number.isFinite(playback.seekTo)) {
        video.currentTime = playback.seekTo;
      }

      if (shouldKeepPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
    return;
  }

  const start = parseFloat(activeChunk.dataset.start);
  if (Number.isFinite(start) && (targetChanged || currentNavigation === "text-centric")) {
    seekMainVideoFromText(activeChunk, { play: !video.paused, position: currentLocation !== "popup" });
  }

  if (currentLocation === "in-place" && videoPanel.style.display !== "none") {
    positionInPlaceVideoPanel(activeChunk);
  }
}

function scheduleTextScrollSync() {
  if (isProgrammaticTextScroll) {
    return;
  }

  lastUserScrollTime = Date.now();

  if (currentLinkingGranularity === "word") {
    window.clearTimeout(textScrollSyncTimer);
    textScrollSyncTimer = window.setTimeout(syncVideoToTextScroll, 40);
    return;
  }

  if (textScrollFrame === null) {
    textScrollFrame = requestAnimationFrame(() => {
      textScrollFrame = null;
      syncVideoToTextScroll();
    });
  }
}


// THE "VIRTUAL CUT" & HIGHLIGHT ENGINE
video.addEventListener("timeupdate", () => {
  if (stopTime !== null && video.currentTime >= stopTime) {
    video.pause();
    stopTime = null;
  }

  syncHighlightFromVideoTime();
});

video.addEventListener("seeking", () => syncHighlightFromVideoTime({ forceScroll: true }));
video.addEventListener("seeked", () => syncHighlightFromVideoTime({ forceScroll: true }));
video.addEventListener("play", syncHighlightFromVideoTime);

videoPanel?.addEventListener("wheel", (event) => {
  if (currentLocation !== "popup" && currentLocation !== "in-place") {
    return;
  }

  event.preventDefault();
  window.scrollBy({
    top: event.deltaY,
    left: event.deltaX,
    behavior: "auto"
  });
}, { passive: false });

function getPanelConstraints() {
  const styles = getComputedStyle(document.documentElement);
  return {
    minVideoWidth: parseFloat(styles.getPropertyValue("--video-panel-min-width")) || 180,
    maxVideoWidth: parseFloat(styles.getPropertyValue("--video-panel-max-width")) || 640,
    minTextWidth: parseFloat(styles.getPropertyValue("--text-panel-min-width")) || 260,
    minSidebarWidth: parseFloat(styles.getPropertyValue("--sidebar-expanded-min-width")) || 360,
    resizerWidth: parseFloat(styles.getPropertyValue("--resizer-width")) || 34
  };
}

function setVideoPanelWidth(nextWidthPx) {
  if (!container || !videoSidebar || window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT) {
    return;
  }

  const { minVideoWidth, maxVideoWidth, minTextWidth, minSidebarWidth, resizerWidth } = getPanelConstraints();
  const containerWidth = container.getBoundingClientRect().width;
  const effectiveMinWidth = Math.max(minVideoWidth, minSidebarWidth);
  const maxAllowedByText = Math.max(effectiveMinWidth, containerWidth - minTextWidth - resizerWidth);
  const clampedWidth = Math.min(
    Math.max(nextWidthPx, effectiveMinWidth),
    Math.min(maxVideoWidth, maxAllowedByText)
  );

  document.documentElement.style.setProperty("--video-panel-width", `${clampedWidth}px`);
}

function getPopupAnchor(targetElement) {
  return targetElement || currentVideoTarget || blogTitle || textPanel;
}

function getSideVideoWidth() {
  const sidebarWidth = sidebarContent?.getBoundingClientRect().width || videoSidebar?.getBoundingClientRect().width;
  return Math.max(sidebarWidth || 360, 180);
}

function getInDocumentVideoWidth() {
  const sideWidth = getSideVideoWidth();
  const availableTextWidth = textSide?.getBoundingClientRect().width || sideWidth;
  return Math.min(sideWidth, availableTextWidth, 420);
}

function positionPopupVideoPanel(targetElement = null) {
  const anchor = getPopupAnchor(targetElement);
  const anchorRect = anchor.getBoundingClientRect();
  const textRect = textSide?.getBoundingClientRect() || document.body.getBoundingClientRect();
  const panelRect = videoPanel.getBoundingClientRect();
  const margin = 10;
  const viewportPadding = 12;
  const panelWidth = getSideVideoWidth();
  const minLeft = Math.max(textRect.left + viewportPadding, viewportPadding);
  const maxLeft = Math.min(textRect.right - panelWidth - viewportPadding, window.innerWidth - panelWidth - viewportPadding);

  videoPanel.style.width = `${panelWidth}px`;

  const nextPanelRect = videoPanel.getBoundingClientRect();
  const effectivePanelWidth = nextPanelRect.width || panelWidth;
  const effectivePanelHeight = nextPanelRect.height || panelRect.height;
  const needsMoreSpaceAbove = anchorRect.top < effectivePanelHeight + margin + viewportPadding;

  const centeredLeft = anchorRect.left + (anchorRect.width / 2) - (effectivePanelWidth / 2);
  const aboveTop = anchorRect.top - effectivePanelHeight - margin;
  const belowTop = anchorRect.bottom + margin;
  const preferredTop = needsMoreSpaceAbove && window.scrollY <= 0 ? belowTop : aboveTop;
  const left = Math.min(Math.max(centeredLeft, minLeft), Math.max(maxLeft, minLeft));
  const top = Math.min(
    Math.max(preferredTop, viewportPadding),
    Math.max(window.innerHeight - effectivePanelHeight - viewportPadding, viewportPadding)
  );

  videoPanel.style.left = `${left}px`;
  videoPanel.style.top = `${top}px`;
}

function positionInPlaceVideoPanel(targetElement = null) {
  if (currentNavigation === "text-centric") {
    return;
  }

  const anchor = getPopupAnchor(targetElement);
  const anchorRect = anchor.getBoundingClientRect();
  const textRect = textSide?.getBoundingClientRect() || document.body.getBoundingClientRect();
  const panelWidth = getSideVideoWidth();
  const margin = 8;
  const minLeft = textRect.left + margin;
  const maxLeft = textRect.right - panelWidth - margin;

  videoPanel.style.width = `${panelWidth}px`;

  const panelRect = videoPanel.getBoundingClientRect();
  const effectivePanelHeight = panelRect.height;
  const rightSideLeft = anchorRect.right + margin;
  const leftSideLeft = anchorRect.left - panelWidth - margin;
  const preferredLeft = rightSideLeft <= maxLeft ? rightSideLeft : leftSideLeft;
  const left = Math.min(Math.max(preferredLeft, minLeft), Math.max(maxLeft, minLeft));
  const top = Math.min(
    Math.max(anchorRect.top, margin),
    window.innerHeight - effectivePanelHeight - margin
  );

  videoPanel.style.left = `${left}px`;
  videoPanel.style.top = `${top}px`;
}

function resetVideoPanelPlacementStyles() {
  videoPanel.style.removeProperty("left");
  videoPanel.style.removeProperty("top");
  videoPanel.style.removeProperty("width");
}

function getInPlaceBlockTarget(targetElement = null) {
  return targetElement?.closest(".cue-container, .blog-header") || blogTitle?.closest(".blog-header") || textPanel;
}

function placeVideoPanel(targetElement = null) {
  const isVideoVisible = videoPanel.style.display !== "none";
  const isFloatingLocation = currentLocation === "popup" || (currentLocation === "in-place" && currentNavigation !== "text-centric");
  popupVideoLayer.hidden = !isFloatingLocation || !isVideoVisible;
  videoPanel.classList.toggle("video-popup-panel", currentLocation === "popup");
  videoPanel.classList.toggle("video-inline-panel", currentLocation === "in-place" && currentNavigation !== "text-centric");
  videoPanel.classList.toggle("video-in-document-panel", currentLocation === "in-place" && currentNavigation === "text-centric");

  if (currentLocation === "popup") {
    popupVideoLayer.appendChild(videoPanel);
    requestAnimationFrame(() => positionPopupVideoPanel(targetElement));
    return;
  }

  if (currentLocation === "in-place") {
    if (currentNavigation === "text-centric") {
      resetVideoPanelPlacementStyles();
      videoPanel.style.width = `${getInDocumentVideoWidth()}px`;
      const blockTarget = getInPlaceBlockTarget(targetElement);
      blockTarget?.insertAdjacentElement("afterend", videoPanel);
      return;
    }

    popupVideoLayer.appendChild(videoPanel);
    requestAnimationFrame(() => positionInPlaceVideoPanel(targetElement));
    return;
  }

  resetVideoPanelPlacementStyles();
  videoPanel.classList.remove("video-in-document-panel");
  const supportDropdowns = sidebarContent?.querySelector(".support-dropdowns");

  if (supportDropdowns?.nextSibling) {
    sidebarContent.insertBefore(videoPanel, supportDropdowns.nextSibling);
  } else {
    sidebarContent?.appendChild(videoPanel);
  }
}

function setLocation(location) {
  currentLocation = location;
  updateChoiceVisuals("location", location);
  placeVideoPanel(currentVideoTarget);
  updateNavigationAvailability();
  updateTextLinkStates();

  if (videoPanel.style.display !== "none" && currentLocation === "side") {
    setSidebarCollapsed(false);
  }
}

function resetInteractionState() {
  navigationPanelRevealToken += 1;
  stopTime = null;
  lastActiveEl = null;
  currentVideoTarget = null;
  currentNavigation = "none";
  document.querySelectorAll(".cueChunk").forEach((element) => {
    element.classList.remove("activeHighlight", "activeSegmentHighlight");
  });

  video.pause();
  video.src = MAIN_VIDEO_PATH;
  video.currentTime = 0;
  setVideoVisible(false);
}

function setVideoVisible(visible, targetElement = null, { position = true } = {}) {
  if (!videoPanel) {
    return;
  }

  if (visible) {
    currentVideoTarget = targetElement || currentVideoTarget;
    if (position || videoPanel.style.display === "none") {
      placeVideoPanel(currentVideoTarget);
    }
  } else {
    popupVideoLayer.hidden = true;
  }

  videoPanel.style.display = visible ? "block" : "none";
  popupVideoLayer.hidden = !(currentLocation === "popup" || (currentLocation === "in-place" && currentNavigation !== "text-centric")) || !visible;

  if (visible && currentLocation === "popup" && position) {
    positionPopupVideoPanel(currentVideoTarget);
  }

  if (visible && currentLocation === "in-place" && position) {
    positionInPlaceVideoPanel(currentVideoTarget);
  }

  if (visible && currentLocation === "side") {
    setSidebarCollapsed(false);
  }

  if (!visible) {
    video.pause();
    video.currentTime = 0;
  }
}

function setSidebarCollapsed(collapsed) {
  if (!videoSidebar || !sidebarMenuBtn || !container) {
    return;
  }

  container.classList.toggle("sidebar-collapsed", collapsed);
  videoSidebar.classList.toggle("collapsed", collapsed);
  sidebarMenuBtn.setAttribute("aria-expanded", String(!collapsed));
  sidebarMenuBtn.setAttribute("aria-label", collapsed ? "Open ASL support tool" : "Close ASL support tool");
  panelResizer?.classList.toggle("hidden", collapsed);

  if (!collapsed && document.documentElement.style.getPropertyValue("--video-panel-width")) {
    const currentWidth = videoSidebar.getBoundingClientRect().width;
    setVideoPanelWidth(currentWidth);
  }
}

function setupSidebarControls() {
  setVideoVisible(false);
  setSidebarCollapsed(true);

  sidebarMenuBtn?.addEventListener("click", () => {
    const collapsed = videoSidebar.classList.contains("collapsed");
    setSidebarCollapsed(!collapsed);
  });

  videoCloseBtn?.addEventListener("click", () => {
    setVideoVisible(false);
  });

  featureOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const feature = button.dataset.featureOption;

      if (button.disabled) {
        return;
      }

      resetInteractionState();

      if (feature === "segmentation") {
        hasNavigationChoice = false;
        choiceMadeByFeature.segmentation = true;
        clearChoiceVisual("navigation");
        setMode(button.dataset.value, false);
        if (currentNavigation === "video-centric") {
          prepareVideoCentricPanel();
        } else {
          scheduleTextScrollSync();
        }
      }

      if (feature === "navigation") {
        choiceMadeByFeature.navigation = true;
        setNavigationInteraction(button.dataset.value, { markChoice: true, deferPanelReveal: true });
      }

      if (feature === "linking-granularity") {
        hasNavigationChoice = false;
        choiceMadeByFeature["linking-granularity"] = true;
        clearChoiceVisual("navigation");
        setLinkingGranularity(button.dataset.value);
        scheduleTextScrollSync();
      }

      if (feature === "location") {
        hasNavigationChoice = false;
        choiceMadeByFeature.location = true;
        clearChoiceVisual("navigation");
        setLocation(button.dataset.value);

        if (currentNavigation === "video-centric") {
          prepareVideoCentricPanel();
        } else {
          scheduleTextScrollSync();
        }
      }
    });
  });
}

function setupPanelResize() {
  if (!panelResizer || !container || !videoSidebar) {
    return;
  }

  let isDragging = false;

  const updateResize = (clientX) => {
    const containerRect = container.getBoundingClientRect();
    const nextWidth = containerRect.right - clientX;
    setVideoPanelWidth(nextWidth);
  };

  const startResize = (event) => {
    if (window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT || panelResizer.classList.contains("hidden")) {
      return;
    }

    isDragging = true;
    event.preventDefault();
    document.body.classList.add("is-resizing");
    const clientX = "touches" in event ? event.touches[0]?.clientX : event.clientX;

    if (typeof clientX === "number") {
      updateResize(clientX);
    }
  };

  const handleMouseMove = (event) => {
    if (!isDragging) {
      return;
    }

    updateResize(event.clientX);
  };

  const handleTouchMove = (event) => {
    if (!isDragging || event.touches.length === 0) {
      return;
    }

    event.preventDefault();
    updateResize(event.touches[0].clientX);
  };

  const stopResize = () => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    document.body.classList.remove("is-resizing");
  };

  panelResizer.addEventListener("mousedown", startResize);
  panelResizer.addEventListener("touchstart", startResize, { passive: false });
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("mouseup", stopResize);
  window.addEventListener("touchend", stopResize);
  window.addEventListener("touchcancel", stopResize);

}

window.addEventListener("resize", () => {
  if (currentLocation === "popup" && videoPanel.style.display !== "none") {
    positionPopupVideoPanel(currentVideoTarget);
  }

  if (currentLocation === "in-place" && videoPanel.style.display !== "none") {
    positionInPlaceVideoPanel(currentVideoTarget);
  }
});

function handleScrollInteraction() {
  scheduleTextScrollSync();
  scheduleFloatingPanelPosition();
}

window.addEventListener("scroll", handleScrollInteraction, { passive: true });
textSide?.addEventListener("scroll", handleScrollInteraction, { passive: true });
textPanel?.addEventListener("scroll", handleScrollInteraction, { passive: true });

setupSidebarControls();
setupPanelResize();
setLinkingGranularity('full');
setMode('full', false);
resetInteractionState();
updateTextLinkStates();
updateNavigationAvailability();
setSidebarCollapsed(true);
