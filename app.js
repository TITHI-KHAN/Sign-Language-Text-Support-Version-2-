
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
let currentVideoScopeTarget = null;
// Stable boundary for the loaded video clip. Unlike link/hover scope, this changes only when a clip is requested.
let activeVideoSegmentTarget = null;
let activeVideoSegmentIndex = null;
let currentVideoTimelineStart = 0;
let currentVideoHasTimeline = true;
let isProgrammaticTextScroll = false;
let textScrollFrame = null;
let textScrollSyncTimer = null;
let sentenceClipCounter = 0;
let isInitializingVideoStart = false;
let isTextDrivenVideoSeek = false;
let lastUserScrollTime = 0;
let lastTextDrivenNavigationTime = 0;
let navigationPanelRevealToken = 0;
let videoStartInitToken = 0;
let currentBlobVideoUrl = null;
let hasUserPlacedPopup = false;
let popupDragPosition = null;
let popupDragState = null;
let activeTextClickHighlight = null;
const TITLE_TEXT = "Access Suggestions for Mobilizations";
const TITLE_CUE = { start: 0, end: 16.6667, text: TITLE_TEXT };
const textPanel = document.getElementById("textPanel");
const blogTitle = document.getElementById("blogTitle");
const video = document.getElementById("video");
const videoPanel = document.getElementById("videoPanel");
const videoCloseBtn = document.getElementById("videoCloseBtn");
const videoPlaceholder = document.getElementById("videoPlaceholder");
const segmentNavigation = document.getElementById("segmentNavigation");
const previousSegmentBtn = document.getElementById("previousSegmentBtn");
const nextSegmentBtn = document.getElementById("nextSegmentBtn");
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
const locationOptionButtons = document.querySelectorAll('[data-feature-option="location"]');
const navigationDropdown = navigationOptionButtons[0]?.closest(".support-dropdown");
const navigationUnavailableMessage = document.getElementById("navigationUnavailableMessage");
const MAIN_VIDEO_PATH = "video.mp4?v=2";
const MOBILE_LAYOUT_BREAKPOINT = 700;
const GRANULARITY_ORDER = ["word", "sentence", "paragraph", "full"];
const TIMELINE_MATCH_EPSILON = 0.005;
const LINK_UNDERLINE_STYLE = "solid";
// July 31 setting: keep the implementation available, but manual scrolling is visual only.
const ENABLE_SCROLL_DRIVEN_INTERACTION = false;
// Interactive Video is controlled by playback and Previous/Next, not text clicks.
const ENABLE_TEXT_SELECTION_IN_INTERACTIVE_VIDEO = false;
// Keep Previous/Next deterministic in Word segmentation by using document-order timeline intervals.
const USE_INDIVIDUAL_WORD_VIDEOS_FOR_SEGMENT_NAVIGATION = true;
const POPUP_TEXT_GAP = 12;
const VIEWPORT_PADDING = 12;

document.documentElement.dataset.linkUnderlineStyle = LINK_UNDERLINE_STYLE;

const popupVideoLayer = document.createElement("div");
popupVideoLayer.className = "video-popup-layer";
popupVideoLayer.hidden = true;
document.body.appendChild(popupVideoLayer);


function normalizeWordKey(word) {
  return word
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function getIndividualSignVideo(word) {
  return window.SIGN_VIDEO_MAP?.[normalizeWordKey(word)]?.video_url || "";
}

function getStandaloneWordVideo(word) {
  return getIndividualSignVideo(word);
}

function revokeCurrentBlobVideoUrl() {
  if (!currentBlobVideoUrl) {
    return;
  }

  URL.revokeObjectURL(currentBlobVideoUrl);
  currentBlobVideoUrl = null;
}

function shouldUseIndividualWordVideos() {
  return currentMode === "word" && currentLinkingGranularity === "word";
}

function setWordLinkAffordance(element, word) {
  if (currentLinkingGranularity !== "word") {
    return;
  }

  const wordKey = normalizeWordKey(word);

  if (!wordKey) {
    return;
  }

  element.dataset.wordKey = wordKey;

  if (!shouldUseIndividualWordVideos()) {
    return;
  }

  const standaloneWordVideo = getStandaloneWordVideo(wordKey);

  if (standaloneWordVideo) {
    element.dataset.hasWordVideo = "true";
    element.dataset.signVideoUrl = standaloneWordVideo;
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
  const selectVideoSegment = shouldSelectVideoSegmentationLevel() || fallback.selectVideoSegment === true;
  const selectionStart = selectVideoSegment && Number.isFinite(segmentStart) ? segmentStart : start;
  const selectionEnd = selectVideoSegment && Number.isFinite(segmentEnd) ? segmentEnd : end;
  const sentenceClipIndex = Number.parseInt(element.dataset.sentenceClipIndex, 10);
  const paragraphClipIndex = Number.parseInt(element.dataset.paragraphClipIndex, 10);

  if (currentMode === "paragraph" && Number.isFinite(paragraphClipIndex)) {
    return {
      src: MAIN_VIDEO_PATH,
      timelineStart: 0,
      seekTo: Number.isFinite(selectionStart) ? selectionStart : null,
      stopAt: Number.isFinite(segmentEnd) ? segmentEnd : selectionEnd
    };
  }

  if (currentMode === "sentence" && Number.isFinite(sentenceClipIndex)) {
    return {
      src: MAIN_VIDEO_PATH,
      timelineStart: 0,
      seekTo: Number.isFinite(selectionStart) ? selectionStart : 0,
      stopAt: Number.isFinite(segmentEnd) ? segmentEnd : selectionEnd
    };
  }

  return {
    src: MAIN_VIDEO_PATH,
    seekTo: Number.isFinite(selectionStart) ? selectionStart : fallback.seekTo,
    stopAt: Number.isFinite(selectionEnd) ? selectionEnd : fallback.stopAt,
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

function getValidLocation(location) {
  const validButtons = Array.from(locationOptionButtons).filter((button) => !button.disabled);

  return validButtons.some((button) => button.dataset.value === location)
    ? location
    : validButtons[0]?.dataset.value || "popup";
}

function ensureValidLocationSelection({ markChoice = true } = {}) {
  currentLocation = getValidLocation(currentLocation);
  updateChoiceVisuals("location", currentLocation, { markChoice });
}

function getGranularityRank(granularity) {
  return GRANULARITY_ORDER.indexOf(granularity);
}

function isSupportedGranularity(granularity) {
  return getGranularityRank(granularity) !== -1;
}

function isFullTextLinkedUnit() {
  return currentMode === "full" && currentLinkingGranularity === "full";
}

function hasExplicitGranularityChoices() {
  return choiceMadeByFeature.segmentation
    && choiceMadeByFeature["linking-granularity"];
}

function getStateMachineState(mode = currentMode, linkingGranularity = currentLinkingGranularity) {
  const modeRank = getGranularityRank(mode);
  const linkingRank = getGranularityRank(linkingGranularity);
  const valid = modeRank !== -1 && linkingRank !== -1 && linkingRank <= modeRank;
  const navigationAvailable = valid;

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
  activeTextClickHighlight = null;
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
  revokeCurrentBlobVideoUrl();
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
  ensureVideoScopeTarget();
  updateLinkingGranularityAvailability();
  updateTextLinkStates();
  updateNavigationAvailability();
  scheduleTextScrollSync();
  updateSegmentNavigationButtons();
}

function setNavigationInteraction(navigationMode, { markChoice = true, deferPanelReveal = false } = {}) {
  const availability = getNavigationAvailability();

  if (!availability.available || !availability.allowedModes.includes(navigationMode)) {
    return;
  }

  ensureValidLocationSelection({ markChoice: true });
  currentNavigation = navigationMode;
  lastEnabledNavigation = navigationMode;
  hasNavigationChoice = markChoice;
  ensureVideoScopeTarget();

  navigationOptionButtons.forEach((button) => {
    const optionAvailable = availability.allowedModes.includes(button.dataset.value);
    button.disabled = !optionAvailable;
    button.classList.toggle("selected", markChoice && button.dataset.value === navigationMode);
    button.classList.toggle("current-selection", hasNavigationChoice && button.dataset.value === navigationMode);
    button.classList.toggle("is-disabled", !optionAvailable);
    button.setAttribute("aria-disabled", String(!optionAvailable));
  });

  const revealNavigationPanel = () => {
    applyNavigationInitialState(navigationMode);
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
  updateSegmentNavigationButtons();
}

function setVideoPlaceholderVisible(visible) {
  if (!videoPlaceholder) {
    return;
  }

  videoPlaceholder.hidden = !visible;

  if (!visible) {
    return;
  }

  resetVideoPanelPlacementStyles();
  videoPlaceholder.textContent = "Select text to view video.";

  if (sidebarContent) {
    const supportDropdowns = sidebarContent.querySelector(".support-dropdowns");
    const anchor = videoPanel?.parentElement === sidebarContent ? videoPanel.nextSibling : supportDropdowns?.nextSibling;

    if (anchor) {
      sidebarContent.insertBefore(videoPlaceholder, anchor);
    } else {
      sidebarContent.appendChild(videoPlaceholder);
    }
  }

  if (currentLocation === "side") {
    setSidebarCollapsed(false);
  }
}

function applyNavigationInitialState(navigationMode = currentNavigation) {
  if (!hasNavigationChoice) {
    setVideoPlaceholderVisible(false);
    return;
  }

  if (navigationMode === "text-centric") {
    setVideoVisible(false);
    currentVideoScopeTarget = getStartingTextChunk();
    setVideoPlaceholderVisible(true);
    updateTextLinkStates();
    return;
  }

  if (navigationMode === "video-centric" || navigationMode === "both") {
    setVideoPlaceholderVisible(false);
    prepareVideoCentricPanel();
  }
}

function setLinkingGranularity(granularity) {
  if (getValidLinkingGranularity(currentMode, granularity) !== granularity) {
    updateLinkingGranularityAvailability();
    return;
  }

  activeTextClickHighlight = null;
  currentLinkingGranularity = granularity;

  updateChoiceVisuals("linking-granularity", granularity);

  renderContent();
  ensureVideoScopeTarget();
  updateLinkingGranularityAvailability();
  updateTextLinkStates();
  updateNavigationAvailability();
  updateSegmentNavigationButtons();
}

function getNavigationAvailability() {
  const { navigationAvailable, sameGranularity } = getStateMachineState();
  const requiredSettingsSelected = choiceMadeByFeature.segmentation
    && choiceMadeByFeature["linking-granularity"];

  return {
    available: navigationAvailable && !sameGranularity && requiredSettingsSelected,
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
    return hasExplicitGranularityChoices();
  }

  if (hasNavigationChoice) {
    return currentNavigation === "text-centric" || currentNavigation === "both";
  }

  return state.sameGranularity;
}

function canVideoControlText() {
  const state = getStateMachineState();
  return state.navigationAvailable
    && hasNavigationChoice
    && (currentNavigation === "video-centric" || currentNavigation === "both");
}

function shouldSelectVideoSegmentationLevel() {
  return hasNavigationChoice && currentNavigation === "video-centric";
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

function isVideoShowing() {
  return videoPanel?.style.display !== "none";
}

function isChunkInCurrentVideoScope(chunk) {
  const scopeTarget = currentVideoScopeTarget || currentVideoTarget;

  return Boolean(chunk && scopeTarget && isSameDisplayedSegment(chunk, scopeTarget));
}

function hasActiveVideoScope() {
  return Boolean(currentVideoScopeTarget || currentVideoTarget);
}

function shouldLimitTextNavigationToCurrentVideoScope() {
  return hasActiveVideoScope() && currentNavigation === "video-centric";
}

function canUseTextChunkForNavigation(chunk) {
  return Boolean(chunk)
    && canTextControlVideo()
    && isTextChunkInArticle(chunk)
    && (!shouldLimitTextNavigationToCurrentVideoScope() || isChunkInCurrentVideoScope(chunk))
    && (!shouldUseIndividualWordVideos() || chunk.dataset.hasWordVideo === "true");
}

function canUseTextChunkForSegmentSelection(chunk) {
  return Boolean(chunk)
    && ENABLE_TEXT_SELECTION_IN_INTERACTIVE_VIDEO
    && shouldSelectVideoSegmentationLevel()
    && isTextChunkInArticle(chunk)
    && (!hasActiveVideoScope() || !isChunkInCurrentVideoScope(chunk))
    && Number.isFinite(parseFloat(chunk.dataset.segmentStart))
    && Number.isFinite(parseFloat(chunk.dataset.segmentEnd));
}

function canActivateTextChunk(chunk) {
  return canUseTextChunkForNavigation(chunk) || canUseTextChunkForSegmentSelection(chunk);
}

function updateTextLinkStates() {
  const { sameGranularity } = getStateMachineState();

  document.querySelectorAll(".cueChunk").forEach((chunk) => {
    const isInActiveScope = isChunkInCurrentVideoScope(chunk);
    const shouldShowSameGranularityLink = sameGranularity
      && hasExplicitGranularityChoices()
      && canUseTextChunkForNavigation(chunk);
    const shouldShowNavigationLink = (currentNavigation === "text-centric" || currentNavigation === "both")
      && canUseTextChunkForNavigation(chunk)
      && isInActiveScope;
    const shouldShowSegmentSelectionLink = canUseTextChunkForSegmentSelection(chunk)
      && !hasActiveVideoScope();
    const shouldShowLink = shouldShowSameGranularityLink
      || shouldShowNavigationLink
      || shouldShowSegmentSelectionLink;

    chunk.classList.toggle("is-linked", shouldShowLink);
    chunk.setAttribute("aria-disabled", String(!canActivateTextChunk(chunk)));
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

  if (isFullTextLinkedUnit()) {
    if (hasExplicitGranularityChoices()) {
      configureFullTextLinkedUnit(blogTitle, TITLE_TEXT);
    } else {
      setFormattedText(blogTitle, TITLE_TEXT);
    }
    return;
  }

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

function appendInterUnitSpace(container) {
  container.appendChild(document.createTextNode(" "));
}

function configureFullTextLinkedUnit(element, text) {
  element.classList.add("cueChunk", "full-text-linked-unit");
  element.dataset.start = TITLE_CUE.start;
  element.dataset.end = getFullTextEnd();
  setSegmentRange(element, TITLE_CUE.start, getFullTextEnd());
  setFormattedText(element, text);
  element.onclick = () => {
    playClipForTarget(MAIN_VIDEO_PATH, element, {
      seekTo: TITLE_CUE.start,
      timelineStart: 0,
      stopAt: null
    });
  };
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
        span.textContent = word;
        span.className = "cueChunk inline-text";
        span.dataset.start = wordStart;
        span.dataset.end = wordEnd;
        setDisplayedSegmentRange(span, cue, { wordStart, wordEnd, sentenceStart, sentenceEnd });
        setClipIndexes(span, { sentenceClipIndex, paragraphClipIndex: cueIndex });

        setWordLinkAffordance(span, word);

        if (currentLinkingGranularity === "word") {
          span.onclick = (e) => {
            e.stopPropagation();

            if (shouldUseIndividualWordVideos()) {
              const availableWordVideo = span.dataset.signVideoUrl || getStandaloneWordVideo(clean);

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
        appendInterUnitSpace(container);
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
      setFormattedText(span, sentenceText);
      span.dataset.start = sentenceStart;
      span.dataset.end = sentenceEnd;
      setDisplayedSegmentRange(span, cue, { sentenceStart, sentenceEnd });
      setClipIndexes(span, { sentenceClipIndex, paragraphClipIndex: cueIndex });

      span.onclick = () => {
        const playback = getClipPlaybackForTarget(span, { seekTo: sentenceStart, stopAt: sentenceEnd });
        playClipForTarget(playback.src, span, playback);
      };
      container.appendChild(span);
      appendInterUnitSpace(container);
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
    if (hasExplicitGranularityChoices()) {
      configureFullTextLinkedUnit(container, rawText);
    } else {
      setFormattedText(container, rawText);
    }
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

function setVideoScopeTarget(element) {
  currentVideoScopeTarget = element || null;
  updateTextLinkStates();
}

function ensureVideoScopeTarget() {
  if (currentNavigation === "none") {
    currentVideoScopeTarget = null;
    return;
  }

  if (currentVideoScopeTarget && isTextChunkInArticle(currentVideoScopeTarget)) {
    return;
  }

  currentVideoScopeTarget = getStartingTextChunk();
}

function highlightChunk(element) {
  document.querySelectorAll(".cueChunk").forEach((chunk) => {
    chunk.classList.remove("activeHighlight", "activeSegmentHighlight");
  });

  if (!element) {
    updateTextLinkStates();
    return;
  }

  if (isFullTextLinkedUnit()) {
    document.querySelectorAll(".cueChunk.full-text-linked-unit").forEach((chunk) => {
      chunk.classList.add("activeHighlight");
    });
    updateTextLinkStates();
    return;
  }

  const segmentStart = element.dataset.segmentStart;
  const segmentEnd = element.dataset.segmentEnd;

  if (segmentStart && segmentEnd && currentNavigation !== "text-centric" && currentNavigation !== "both" && !shouldSelectVideoSegmentationLevel()) {
    document.querySelectorAll(".cueChunk").forEach((chunk) => {
      if (isSameDisplayedSegment(chunk, element)) {
        chunk.classList.add("activeSegmentHighlight");
      }
    });
  }

  element.classList.add("activeHighlight");

  updateTextLinkStates();
}

function clearTextClickHighlight() {
  activeTextClickHighlight = null;
  document.querySelectorAll(".cueChunk").forEach((chunk) => {
    chunk.classList.remove("activeHighlight", "activeSegmentHighlight");
  });
  updateTextLinkStates();
}

function getNextChunkStart(element) {
  const start = parseFloat(element?.dataset.start);

  if (!Number.isFinite(start)) {
    return null;
  }

  return Array.from(document.querySelectorAll(".cueChunk"))
    .map((chunk) => parseFloat(chunk.dataset.start))
    .filter((chunkStart) => Number.isFinite(chunkStart) && chunkStart > start)
    .sort((a, b) => a - b)[0] ?? null;
}

function getVideoSegmentRange(element) {
  const start = parseFloat(element?.dataset.segmentStart);
  const end = parseFloat(element?.dataset.segmentEnd);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return { start, end };
}

function getVideoSegmentIdentity(element, segmentationType = currentMode) {
  if (!element) {
    return "";
  }

  if (segmentationType === "paragraph" && element.dataset.paragraphClipIndex !== undefined) {
    return `paragraph:${element.dataset.paragraphClipIndex}`;
  }

  if (segmentationType === "sentence" && element.dataset.sentenceClipIndex !== undefined) {
    return `sentence:${element.dataset.sentenceClipIndex}`;
  }

  const range = getVideoSegmentRange(element);
  return range ? `${segmentationType}:${range.start.toFixed(4)}:${range.end.toFixed(4)}` : "";
}

function isSameVideoSegment(first, second) {
  const firstIdentity = getVideoSegmentIdentity(first);
  const secondIdentity = getVideoSegmentIdentity(second);

  if (firstIdentity && secondIdentity) {
    return firstIdentity === secondIdentity;
  }

  const firstRange = getVideoSegmentRange(first);
  const secondRange = getVideoSegmentRange(second);

  return Boolean(firstRange && secondRange
    && Math.abs(firstRange.start - secondRange.start) < TIMELINE_MATCH_EPSILON
    && Math.abs(firstRange.end - secondRange.end) < TIMELINE_MATCH_EPSILON);
}

function getLinkedUnitsInsideActiveVideoSegment(segmentElement = activeVideoSegmentTarget || currentVideoScopeTarget) {
  if (!segmentElement) return [];
  return Array.from(document.querySelectorAll(".cueChunk"))
    .filter((chunk) => isSameVideoSegment(chunk, segmentElement))
    .sort((first, second) => parseFloat(first.dataset.start) - parseFloat(second.dataset.start));
}

// Temporary timing adapter. Replace this helper when sign-level timestamps exist.
function getEstimatedLinkedUnitInterval(element, videoSegmentElement = element) {
  const segment = getVideoSegmentRange(videoSegmentElement);

  if (!segment || !element) {
    return null;
  }

  const linkedUnits = Array.from(document.querySelectorAll(".cueChunk"))
    .filter((chunk) => isSameVideoSegment(chunk, videoSegmentElement))
    .sort((first, second) => parseFloat(first.dataset.start) - parseFloat(second.dataset.start));
  const unitIndex = linkedUnits.indexOf(element);

  if (unitIndex < 0 || linkedUnits.length === 0) {
    return null;
  }

  const estimatedUnitDuration = (segment.end - segment.start) / linkedUnits.length;
  const start = segment.start + (unitIndex * estimatedUnitDuration);
  const end = unitIndex === linkedUnits.length - 1
    ? segment.end
    : start + estimatedUnitDuration;

  return { start, end };
}

function getLinkedUnitPositionInsideVideoSegment(element, videoSegmentElement = element) {
  if (!element || !getVideoSegmentRange(videoSegmentElement)) {
    return null;
  }

  const linkedUnits = Array.from(document.querySelectorAll(".cueChunk"))
    .filter((chunk) => isSameVideoSegment(chunk, videoSegmentElement))
    .sort((first, second) => parseFloat(first.dataset.start) - parseFloat(second.dataset.start));
  const index = linkedUnits.indexOf(element);

  return index >= 0 ? { index, count: linkedUnits.length } : null;
}

function getLinkedUnitTimelineRange(element) {
  if (!element) {
    return null;
  }

  if (isFullTextLinkedUnit()) {
    return { start: TITLE_CUE.start, end: getFullTextEnd() };
  }

  return getEstimatedLinkedUnitInterval(element, currentVideoScopeTarget || element);
}

function getCurrentVideoTimelineTime() {
  if (!currentVideoHasTimeline) {
    return video.currentTime;
  }

  return currentVideoTimelineStart + video.currentTime;
}

function updateTextClickHighlightFromVideoTime() {
  if (!activeTextClickHighlight || (currentNavigation !== "text-centric" && currentNavigation !== "both")) {
    return;
  }

  if (isTextDrivenVideoSeek || isInitializingVideoStart || video.seeking || video.readyState < 1) {
    return;
  }

  if (!isTextChunkInArticle(activeTextClickHighlight.element)) {
    clearTextClickHighlight();
    return;
  }

  const currentTime = activeTextClickHighlight.usesLoadedClipDuration
    ? video.currentTime
    : currentVideoHasTimeline
    ? getCurrentVideoTimelineTime()
    : activeTextClickHighlight.start + video.currentTime;
  const range = activeTextClickHighlight.usesLoadedClipDuration
    ? {
        start: activeTextClickHighlight.start,
        end: activeTextClickHighlight.end
      }
    : getLinkedUnitTimelineRange(activeTextClickHighlight.element);

  if (!range) {
    clearTextClickHighlight();
    return;
  }

  activeTextClickHighlight.start = range.start;
  activeTextClickHighlight.end = range.end;
  const { start, end } = range;

  if (Number.isFinite(currentTime) && currentTime + TIMELINE_MATCH_EPSILON >= start && currentTime < end) {
    if (!activeTextClickHighlight.element.classList.contains("activeHighlight")) {
      highlightChunk(activeTextClickHighlight.element);
    }
    return;
  }

  clearTextClickHighlight();
}

function highlightTextClickForActiveRange(element) {
  const range = getLinkedUnitTimelineRange(element);

  if (!range) {
    highlightChunk(element);
    activeTextClickHighlight = null;
    return;
  }

  activeTextClickHighlight = { element, ...range };
  highlightChunk(element);
}

function getVideoSegments(segmentationType = currentMode) {
  if (segmentationType === "full") {
    return [];
  }

  const segments = [];
  const segmentsByIdentity = new Map();

  Array.from(document.querySelectorAll(".cueChunk"))
    .sort((first, second) => parseFloat(first.dataset.segmentStart) - parseFloat(second.dataset.segmentStart))
    .forEach((element) => {
      const range = getVideoSegmentRange(element);
      const identity = getVideoSegmentIdentity(element, segmentationType);

      if (!range || !identity) {
        return;
      }

      const existing = segmentsByIdentity.get(identity);

      if (existing) {
        existing.start = Math.min(existing.start, range.start);
        existing.end = Math.max(existing.end, range.end);
      } else {
        const segment = { ...range, identity, element };
        segmentsByIdentity.set(identity, segment);
        segments.push(segment);
      }
    });

  return segments;
}

function getCurrentVideoSegmentIndex(currentTime = getCurrentVideoTimelineTime(), segmentationType = currentMode) {
  const segments = getVideoSegments(segmentationType);
  if (segmentationType === currentMode && Number.isInteger(activeVideoSegmentIndex)
      && activeVideoSegmentIndex >= 0 && activeVideoSegmentIndex < segments.length) {
    return activeVideoSegmentIndex;
  }
  // Previous/Next follows the loaded video segment, never hover or linking-granularity scope.
  const activeIdentity = getVideoSegmentIdentity(activeVideoSegmentTarget || currentVideoScopeTarget, segmentationType);
  const scopeIndex = segments.findIndex((segment) => segment.identity === activeIdentity);

  if (scopeIndex >= 0) {
    return scopeIndex;
  }

  return segments.findIndex((segment, index) => (
    currentTime + TIMELINE_MATCH_EPSILON >= segment.start
    && (currentTime < segment.end || index === segments.length - 1)
  ));
}

function shouldShowSegmentNavigation() {
  return hasNavigationChoice
    && (currentNavigation === "video-centric" || currentNavigation === "both")
    && currentMode !== "full"
    && isVideoShowing();
}

function updateSegmentNavigationVisibility() {
  const show = shouldShowSegmentNavigation();

  if (segmentNavigation) {
    segmentNavigation.hidden = !show;
  }

  return show;
}

function updateSegmentNavigationButtons() {
  const segmentName = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
  const accessibleName = currentMode.toLowerCase();
  const previousLabel = previousSegmentBtn?.querySelector(".segment-nav-label");
  const nextLabel = nextSegmentBtn?.querySelector(".segment-nav-label");
  if (previousLabel) previousLabel.textContent = `Previous ${segmentName}`;
  if (nextLabel) nextLabel.textContent = `Next ${segmentName}`;
  previousSegmentBtn?.setAttribute("aria-label", `Previous ${accessibleName} video segment`);
  previousSegmentBtn?.setAttribute("title", `Previous ${accessibleName} video segment`);
  nextSegmentBtn?.setAttribute("aria-label", `Next ${accessibleName} video segment`);
  nextSegmentBtn?.setAttribute("title", `Next ${accessibleName} video segment`);

  if (!updateSegmentNavigationVisibility()) {
    return;
  }

  const segments = getVideoSegments();
  const currentIndex = getCurrentVideoSegmentIndex();
  const hasValidCurrentSegment = currentIndex >= 0 && currentIndex < segments.length;
  const hasMultipleSegments = segments.length > 1;
  const previousDisabled = !hasValidCurrentSegment || !hasMultipleSegments || currentIndex === 0;
  const nextDisabled = !hasValidCurrentSegment
    || !hasMultipleSegments
    || currentIndex === segments.length - 1;

  previousSegmentBtn.disabled = previousDisabled;
  previousSegmentBtn.setAttribute("aria-disabled", String(previousDisabled));
  nextSegmentBtn.disabled = nextDisabled;
  nextSegmentBtn.setAttribute("aria-disabled", String(nextDisabled));
}

function navigateToAdjacentVideoSegment(direction) {
  if (!hasNavigationChoice
      || (currentNavigation !== "video-centric" && currentNavigation !== "both")
      || currentMode === "full") {
    return;
  }

  const segments = getVideoSegments(currentMode);
  const currentIndex = getCurrentVideoSegmentIndex(getCurrentVideoTimelineTime(), currentMode);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= segments.length) {
    updateSegmentNavigationButtons();
    return;
  }

  activeTextClickHighlight = null;
  lastTextDrivenNavigationTime = Date.now();
  const target = segments[nextIndex].element;
  activeVideoSegmentIndex = nextIndex;
  const playback = getClipPlaybackForTarget(target, { selectVideoSegment: true });
  currentVideoScopeTarget = null;
  const individualWordVideo = USE_INDIVIDUAL_WORD_VIDEOS_FOR_SEGMENT_NAVIGATION
    && shouldUseIndividualWordVideos() && target.dataset.hasWordVideo === "true"
    ? target.dataset.signVideoUrl || getStandaloneWordVideo(target.dataset.wordKey || target.textContent)
    : "";

  if (individualWordVideo) {
    playClipForTarget(individualWordVideo, target, {
      seekTo: 0,
      limitToLinkedUnit: false,
      allowProgrammaticNavigation: true
    });
  } else {
    playClipForTarget(playback.src, target, {
      ...playback,
      limitToLinkedUnit: false,
      allowProgrammaticNavigation: true
    });
  }
  updateSegmentNavigationButtons();
}

let hoverSegmentTarget = null;

function clearHoverSegmentHighlight() {
  hoverSegmentTarget = null;
  document.querySelectorAll(".cueChunk.hoverSegmentHighlight").forEach((chunk) => {
    chunk.classList.remove("hoverSegmentHighlight");
  });
}

function highlightHoverSegment(element) {
  if (!element || !canActivateTextChunk(element) || !element.classList.contains("is-linked")) {
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

  if (!isTextChunkInArticle(chunk)) {
    return;
  }

  // Scrolling can move new words underneath a stationary pointer and dispatch mouseover.
  // Never let that incidental hover replace an already active video scope.
  if ((currentNavigation === "text-centric" || currentNavigation === "both")
      && !hasActiveVideoScope() && !isChunkInCurrentVideoScope(chunk)) {
    setVideoScopeTarget(chunk);
  }

  if (chunk === hoverSegmentTarget) {
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

  if (currentLocation === "popup" && videoPanel.style.display !== "none") {
    positionPopupVideoPanel(element);
  }

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

  const adjustedTime = time + TIMELINE_MATCH_EPSILON;

  return Array.from(document.querySelectorAll(".cueChunk")).find((element) => {
    const start = parseFloat(element.dataset.start);
    const end = parseFloat(element.dataset.end);

    return Number.isFinite(start) && Number.isFinite(end) && adjustedTime >= start && time < end;
  }) || null;
}

function syncHighlightFromVideoTime(options = {}) {
  if (isInitializingVideoStart || isTextDrivenVideoSeek) {
    return;
  }

  if (!isVideoShowing()) {
    return;
  }

  if (!canVideoControlText()) {
    return;
  }

  if (currentNavigation === "both" && activeTextClickHighlight) {
    return;
  }

  const shouldAutoScrollText = options.forceScroll === true
    || currentNavigation === "video-centric"
    || currentNavigation === "both";

  if (!isMainVideoSource() && !currentVideoHasTimeline) {
    if (currentVideoTarget) {
      activateVideoTarget(currentVideoTarget, {
        scroll: shouldAutoScrollText,
        forceScroll: options.forceScroll === true
      });
    }
    return;
  }

  const timelineTime = currentVideoTimelineStart + video.currentTime;
  let activeChunk;
  const segmentTarget = activeVideoSegmentTarget || currentVideoScopeTarget;
  if (currentMode !== "full" && segmentTarget) {
    const linkedUnits = getLinkedUnitsInsideActiveVideoSegment(segmentTarget);
    activeChunk = linkedUnits.find((unit) => {
      const start = parseFloat(unit.dataset.start);
      const end = parseFloat(unit.dataset.end);
      return timelineTime + TIMELINE_MATCH_EPSILON >= start && timelineTime < end;
    });
    if (!activeChunk && linkedUnits.length) {
      activeChunk = timelineTime < parseFloat(linkedUnits[0].dataset.start)
        ? linkedUnits[0]
        : linkedUnits[linkedUnits.length - 1];
    }
  } else {
    activeChunk = getChunkForMainVideoTime(timelineTime);
  }

  if (activeChunk) {
    activateVideoTarget(activeChunk, {
      scroll: shouldAutoScrollText,
      forceScroll: options.forceScroll === true
    });
    updateSegmentNavigationButtons();
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

  const playback = getClipPlaybackForTarget(firstChunk);
  const initialSrc = shouldUseIndividualWordVideos() && firstChunk.dataset.hasWordVideo === "true"
    ? firstChunk.dataset.signVideoUrl || getStandaloneWordVideo(firstChunk.dataset.wordKey || firstChunk.textContent)
    : playback.src || MAIN_VIDEO_PATH;
  const initialSeek = Number.isFinite(playback.seekTo) ? playback.seekTo : 0;
  stopTime = null;
  isInitializingVideoStart = true;
  const initToken = ++videoStartInitToken;
  window.clearTimeout(textScrollSyncTimer);
  textScrollSyncTimer = null;

  if (textScrollFrame !== null) {
    cancelAnimationFrame(textScrollFrame);
    textScrollFrame = null;
  }

  video.pause();
  revokeCurrentBlobVideoUrl();
  video.src = initialSrc;
  currentVideoTimelineStart = Number.isFinite(playback.timelineStart) ? playback.timelineStart : 0;
  currentVideoHasTimeline = initialSrc === MAIN_VIDEO_PATH || Number.isFinite(playback.timelineStart);
  video.load();
  video.pause();
  video.currentTime = initialSeek;

  setVideoVisible(true, firstChunk);
  currentVideoTarget = firstChunk;
  currentVideoScopeTarget = firstChunk;
  activeVideoSegmentTarget = firstChunk;
  activeVideoSegmentIndex = 0;
  highlightChunk(firstChunk);
  scrollChunkIntoViewFromVideo(firstChunk, true);
  const shouldAutoPlayFullText = currentMode === "full" && initialSrc === MAIN_VIDEO_PATH;
  let didRequestFullTextBlob = false;
  let didStartFullTextPlayback = false;

  const applyInitialPlaybackState = () => {
    if (!shouldAutoPlayFullText) {
      video.pause();
      return;
    }

    if (didStartFullTextPlayback) {
      return;
    }

    didStartFullTextPlayback = true;
    video.play().catch(() => {});
  };

  const applyStartTime = () => {
    if (initToken !== videoStartInitToken) {
      return;
    }

    video.currentTime = initialSeek;
    currentVideoTarget = firstChunk;
    currentVideoScopeTarget = firstChunk;
    highlightChunk(firstChunk);

    if (currentMode === "full" && !currentBlobVideoUrl && !didRequestFullTextBlob && !hasUsableSeekRange()) {
      didRequestFullTextBlob = true;
      loadSeekableBlobSource(MAIN_VIDEO_PATH, 0, initToken, applyInitialPlaybackState);
      return;
    }

    applyInitialPlaybackState();
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
      if (initToken === videoStartInitToken) {
        isInitializingVideoStart = false;
      }
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

  activeTextClickHighlight = null;
  revokeCurrentBlobVideoUrl();

  video.src = src;
  updateSegmentNavigationButtons();

  if (shouldLoad) {
    video.load();
  }

  return true;
}

function canSeekLoadedVideoTo(time) {
  if (!Number.isFinite(time) || time <= 0) {
    return true;
  }

  for (let index = 0; index < video.seekable.length; index += 1) {
    if (time >= video.seekable.start(index) && time <= video.seekable.end(index)) {
      return true;
    }
  }

  return false;
}

function hasUsableSeekRange() {
  for (let index = 0; index < video.seekable.length; index += 1) {
    if (video.seekable.end(index) > video.seekable.start(index)) {
      return true;
    }
  }

  return false;
}

async function loadSeekableBlobSource(src, seekTo, playbackToken, playVideo) {
  try {
    const response = await fetch(src);

    if (!response.ok) {
      playVideo();
      return;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    if (playbackToken !== videoStartInitToken) {
      URL.revokeObjectURL(blobUrl);
      return;
    }

    revokeCurrentBlobVideoUrl();

    currentBlobVideoUrl = blobUrl;
    video.src = blobUrl;
    video.load();

    const seekBlobAndPlay = () => {
      video.currentTime = seekTo;
      scheduleProgrammaticSeekCompletion(playbackToken);
      playVideo();
    };

    if (video.readyState < 1) {
      video.addEventListener("loadedmetadata", seekBlobAndPlay, { once: true });
    } else {
      seekBlobAndPlay();
    }
  } catch (error) {
    playVideo();
  }
}

function scheduleProgrammaticSeekCompletion(playbackToken) {
  let completed = false;
  const complete = (forceSync = false) => {
    if ((!forceSync && completed) || (playbackToken !== null && playbackToken !== videoStartInitToken)) {
      return;
    }

    completed = true;
    isTextDrivenVideoSeek = false;
    updateTextClickHighlightFromVideoTime();

    if (canVideoControlText()) {
      syncHighlightFromVideoTime({ forceScroll: currentNavigation === "video-centric" });
    }
  };

  video.addEventListener("seeked", complete, { once: true });
  window.setTimeout(complete, 350);
  window.setTimeout(() => complete(true), 850);
}

function startVideoPlaybackAt(seekTo, sourceChanged, { fallbackBlobSrc = null, playbackToken = null, play = true } = {}) {
  const finishPlaybackState = () => {
    if (play) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  if (!Number.isFinite(seekTo)) {
    isTextDrivenVideoSeek = false;
    finishPlaybackState();
    return;
  }

  const applySeekAndPlay = () => {
    if (playbackToken !== null && playbackToken !== videoStartInitToken) {
      return;
    }

    if (fallbackBlobSrc && (fallbackBlobSrc === MAIN_VIDEO_PATH || !hasUsableSeekRange() || !canSeekLoadedVideoTo(seekTo))) {
      loadSeekableBlobSource(fallbackBlobSrc, seekTo, playbackToken, finishPlaybackState);
      return;
    }

    video.currentTime = seekTo;
    scheduleProgrammaticSeekCompletion(playbackToken);
    finishPlaybackState();
  };

  if (sourceChanged || (fallbackBlobSrc && video.readyState < 1)) {
    video.addEventListener("loadedmetadata", applySeekAndPlay, { once: true });
    video.load();
    return;
  }

  applySeekAndPlay();
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
  currentVideoScopeTarget = element;
  activeVideoSegmentTarget = element;
  activeVideoSegmentIndex = getVideoSegments(currentMode)
    .findIndex((segment) => segment.identity === getVideoSegmentIdentity(element, currentMode));
  lastActiveEl = element;
  currentVideoTimelineStart = 0;
  currentVideoHasTimeline = true;
  stopTime = currentMode === "full" ? null : stopAt;
  isTextDrivenVideoSeek = true;
  lastTextDrivenNavigationTime = Date.now();
  const sourceChanged = setVideoSource(MAIN_VIDEO_PATH, false);
  if (currentNavigation === "text-centric") {
    highlightTextClickForActiveRange(element);
  } else {
    highlightChunk(element);
  }
  const fallbackBlobSrc = (currentNavigation === "text-centric" || currentNavigation === "both") && Number.isFinite(start)
    ? MAIN_VIDEO_PATH
    : null;
  startVideoPlaybackAt(start, sourceChanged, {
    fallbackBlobSrc,
    playbackToken: ++videoStartInitToken,
    play
  });
}

function playClipForTarget(src, element, {
  stopAt = null,
  seekTo = null,
  timelineStart = null,
  limitToLinkedUnit = true,
  allowProgrammaticNavigation = false
} = {}) {
  if (!allowProgrammaticNavigation && !canActivateTextChunk(element)) {
    return;
  }

  const playbackToken = ++videoStartInitToken;
  isInitializingVideoStart = false;
  isTextDrivenVideoSeek = true;
  lastTextDrivenNavigationTime = Date.now();

  if (currentNavigation === "text-centric" && element && src === MAIN_VIDEO_PATH) {
    seekMainVideoFromText(element, { play: true, stopAt });
    return;
  }

  if (videoPanel.style.display !== "none" && currentVideoTarget !== element) {
    setVideoVisible(false);
  }

  setVideoVisible(true, element);
  currentVideoScopeTarget = element;
  activeVideoSegmentTarget = element;
  activeVideoSegmentIndex = getVideoSegments(currentMode)
    .findIndex((segment) => segment.identity === getVideoSegmentIdentity(element, currentMode));
  const firstLinkedUnit = getLinkedUnitsInsideActiveVideoSegment(element)[0] || element;
  const sourceChanged = setVideoSource(src, false);
  currentVideoTimelineStart = Number.isFinite(timelineStart) ? timelineStart : 0;
  currentVideoHasTimeline = src === MAIN_VIDEO_PATH || Number.isFinite(timelineStart);

  if (shouldSelectVideoSegmentationLevel() || allowProgrammaticNavigation) {
    currentVideoTarget = firstLinkedUnit;
    highlightChunk(firstLinkedUnit);
    scrollChunkIntoViewFromVideo(firstLinkedUnit, true);
    if (currentLocation === "popup") positionPopupVideoPanel(firstLinkedUnit);
    updateTextLinkStates();
  } else if (currentNavigation === "text-centric" || currentNavigation === "both") {
    highlightTextClickForActiveRange(element);
  } else {
    activateVideoTarget(element);
  }
  stopTime = currentMode === "full" && !allowProgrammaticNavigation ? null : stopAt;

  if (!Number.isFinite(seekTo) && !sourceChanged) {
    video.currentTime = 0;
  }

  const playbackSeekTo = currentNavigation === "both" && Number.isFinite(seekTo)
    ? seekTo + TIMELINE_MATCH_EPSILON
    : seekTo;
  const fallbackBlobSrc = (currentNavigation === "text-centric" || currentNavigation === "both" || shouldSelectVideoSegmentationLevel()) && Number.isFinite(seekTo)
    ? src
    : null;

  const linkedUnitPosition = limitToLinkedUnit
    && getStateMachineState().linkingRank < getStateMachineState().modeRank
    && (currentNavigation === "text-centric" || currentNavigation === "both")
    && src !== MAIN_VIDEO_PATH
    ? getLinkedUnitPositionInsideVideoSegment(element, element)
    : null;

  if (linkedUnitPosition) {
    const playEstimatedClipUnit = () => {
      if (playbackToken !== videoStartInitToken || !Number.isFinite(video.duration)) {
        return;
      }

      const unitDuration = video.duration / linkedUnitPosition.count;
      const estimatedStart = linkedUnitPosition.index * unitDuration;
      const estimatedEnd = linkedUnitPosition.index === linkedUnitPosition.count - 1
        ? video.duration
        : estimatedStart + unitDuration;
      if (activeTextClickHighlight?.element === element) {
        activeTextClickHighlight.start = estimatedStart;
        activeTextClickHighlight.end = estimatedEnd;
        activeTextClickHighlight.usesLoadedClipDuration = true;
      }
      startVideoPlaybackAt(estimatedStart, false, {
        fallbackBlobSrc: src,
        playbackToken
      });
    };

    if (sourceChanged || video.readyState < 1) {
      video.addEventListener("loadedmetadata", playEstimatedClipUnit, { once: true });
      video.load();
    } else {
      playEstimatedClipUnit();
    }
    return;
  }

  startVideoPlaybackAt(playbackSeekTo, sourceChanged, { fallbackBlobSrc, playbackToken });

  if (shouldSelectVideoSegmentationLevel()) {
    const initialTimelineTime = currentVideoTimelineStart + (Number.isFinite(playbackSeekTo) ? playbackSeekTo : 0);
    const initialChunk = getChunkForMainVideoTime(initialTimelineTime);

    if (initialChunk) {
      activateVideoTarget(initialChunk, { forceScroll: true });
    }
  }
}

function syncVideoToTextScroll() {
  if (isProgrammaticTextScroll || isTextDrivenVideoSeek || isInitializingVideoStart || !hasNavigationChoice || currentNavigation !== "both") {
    return;
  }

  if (Date.now() - lastTextDrivenNavigationTime < 1000) {
    return;
  }

  const activeChunk = getCenteredTextChunk();

  if (!activeChunk) {
    return;
  }

  if (!canUseTextChunkForNavigation(activeChunk)) {
    return;
  }

  const targetChanged = activeChunk !== currentVideoTarget;

  currentVideoTarget = activeChunk;
  currentVideoScopeTarget = activeChunk;
  lastActiveEl = activeChunk;
  highlightChunk(activeChunk);

  if (currentLocation === "popup" && currentMode === "full" && currentNavigation === "both") {
    setVideoVisible(true, activeChunk, { position: false });
  }

  if (currentLinkingGranularity === "word") {
    if (shouldUseIndividualWordVideos() && activeChunk.dataset.hasWordVideo === "true") {
      setVideoVisible(true, activeChunk, { position: currentLocation !== "popup" });
      setVideoSource(activeChunk.dataset.signVideoUrl || getStandaloneWordVideo(activeChunk.dataset.wordKey || activeChunk.textContent));
      currentVideoTimelineStart = 0;
      currentVideoHasTimeline = false;
      video.pause();
    } else {
      const playback = getClipPlaybackForTarget(activeChunk);
      const shouldKeepPlaying = !video.paused;
      setVideoVisible(true, activeChunk, { position: currentLocation !== "popup" });
      activateVideoTarget(activeChunk, { scroll: false });
      stopTime = null;
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
  if (!ENABLE_SCROLL_DRIVEN_INTERACTION) {
    return;
  }

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

  updateTextClickHighlightFromVideoTime();
  syncHighlightFromVideoTime();
});

video.addEventListener("seeking", () => {
  updateTextClickHighlightFromVideoTime();
  syncHighlightFromVideoTime({ forceScroll: true });
});
video.addEventListener("seeked", () => {
  updateTextClickHighlightFromVideoTime();
  syncHighlightFromVideoTime({ forceScroll: true });
});
video.addEventListener("play", syncHighlightFromVideoTime);
video.addEventListener("ended", () => {
  updateTextClickHighlightFromVideoTime();
  // Force the final state through the segment-scoped clamp so the last unit remains active.
  syncHighlightFromVideoTime();
});
video.addEventListener("loadedmetadata", updateSegmentNavigationButtons);

previousSegmentBtn?.addEventListener("click", () => navigateToAdjacentVideoSegment(-1));
nextSegmentBtn?.addEventListener("click", () => navigateToAdjacentVideoSegment(1));

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

function clampPopupPosition(left, top) {
  const panelRect = videoPanel.getBoundingClientRect();
  const viewportPadding = 12;
  const maxLeft = Math.max(window.innerWidth - panelRect.width - viewportPadding, viewportPadding);
  const maxTop = Math.max(window.innerHeight - panelRect.height - viewportPadding, viewportPadding);

  return {
    left: Math.min(Math.max(left, viewportPadding), maxLeft),
    top: Math.min(Math.max(top, viewportPadding), maxTop)
  };
}

function setPopupPanelPosition(left, top) {
  const position = clampPopupPosition(left, top);

  popupDragPosition = position;
  videoPanel.style.left = `${position.left}px`;
  videoPanel.style.top = `${position.top}px`;
}

function resetPopupDragPlacement() {
  hasUserPlacedPopup = false;
  popupDragPosition = null;
  popupDragState = null;
  document.body.classList.remove("is-popup-dragging");
}

function positionPopupVideoPanel(targetElement = null) {
  const panelWidth = getSideVideoWidth();

  videoPanel.style.width = `${panelWidth}px`;

  const anchor = getPopupAnchor(targetElement);
  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = videoPanel.getBoundingClientRect();
  const width = panelRect.width || panelWidth;
  const height = panelRect.height;
  const overlaps = (position) => !(position.left + width <= anchorRect.left || position.left >= anchorRect.right
    || position.top + height <= anchorRect.top || position.top >= anchorRect.bottom);
  const valid = (position) => position.left >= VIEWPORT_PADDING && position.top >= VIEWPORT_PADDING
    && position.left + width <= window.innerWidth - VIEWPORT_PADDING
    && position.top + height <= window.innerHeight - VIEWPORT_PADDING && !overlaps(position);

  if (hasUserPlacedPopup && popupDragPosition && valid(popupDragPosition)) {
    setPopupPanelPosition(popupDragPosition.left, popupDragPosition.top);
    return;
  }

  const currentPosition = {
    left: parseFloat(videoPanel.style.left),
    top: parseFloat(videoPanel.style.top)
  };
  if (!hasUserPlacedPopup && Number.isFinite(currentPosition.left)
      && Number.isFinite(currentPosition.top) && valid(currentPosition)) {
    return;
  }

  const candidates = [
    { left: anchorRect.right + POPUP_TEXT_GAP, top: Math.min(Math.max(anchorRect.top, VIEWPORT_PADDING), window.innerHeight - height - VIEWPORT_PADDING) },
    { left: anchorRect.left - width - POPUP_TEXT_GAP, top: Math.min(Math.max(anchorRect.top, VIEWPORT_PADDING), window.innerHeight - height - VIEWPORT_PADDING) },
    { left: Math.min(Math.max(anchorRect.left, VIEWPORT_PADDING), window.innerWidth - width - VIEWPORT_PADDING), top: anchorRect.bottom + POPUP_TEXT_GAP },
    { left: Math.min(Math.max(anchorRect.left, VIEWPORT_PADDING), window.innerWidth - width - VIEWPORT_PADDING), top: anchorRect.top - height - POPUP_TEXT_GAP }
  ];
  const position = candidates.find(valid)
    || clampPopupPosition(anchorRect.right + POPUP_TEXT_GAP, anchorRect.bottom + POPUP_TEXT_GAP);
  setPopupPanelPosition(position.left, position.top);
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

function isPopupDragIgnoredTarget(target, event) {
  if (!target?.closest) {
    return false;
  }

  if (target.closest("button, input, select, textarea, a, .video-controls, .segment-nav, [role='button'], [role='slider'], [contenteditable='true']")) {
    return true;
  }

  const videoElement = target.closest("video");

  if (!videoElement) {
    return false;
  }

  const point = "touches" in event
    ? event.touches[0] || event.changedTouches[0] || null
    : event;

  if (!point) {
    return true;
  }

  const rect = videoElement.getBoundingClientRect();
  const controlsHeight = Math.min(56, rect.height * 0.36);
  return point.clientY >= rect.bottom - controlsHeight;
}

function setupPopupDrag() {
  if (!videoPanel) {
    return;
  }

  const getClientPoint = (event) => {
    if ("touches" in event) {
      return event.touches[0] || event.changedTouches[0] || null;
    }

    return event;
  };

  const startDrag = (event) => {
    if (currentLocation !== "popup" || videoPanel.style.display === "none" || isPopupDragIgnoredTarget(event.target, event)) {
      return;
    }

    const point = getClientPoint(event);

    if (!point) {
      return;
    }

    const rect = videoPanel.getBoundingClientRect();
    popupDragState = {
      pointerId: event.pointerId ?? null,
      offsetX: point.clientX - rect.left,
      offsetY: point.clientY - rect.top
    };
    hasUserPlacedPopup = true;
    document.body.classList.add("is-popup-dragging");
    event.preventDefault();
  };

  const moveDrag = (event) => {
    if (!popupDragState) {
      return;
    }

    const point = getClientPoint(event);

    if (!point) {
      return;
    }

    event.preventDefault();
    setPopupPanelPosition(point.clientX - popupDragState.offsetX, point.clientY - popupDragState.offsetY);
  };

  const stopDrag = () => {
    if (!popupDragState) {
      return;
    }

    popupDragState = null;
    document.body.classList.remove("is-popup-dragging");
  };

  videoPanel.addEventListener("mousedown", startDrag);
  videoPanel.addEventListener("touchstart", startDrag, { passive: false });
  window.addEventListener("mousemove", moveDrag);
  window.addEventListener("touchmove", moveDrag, { passive: false });
  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("touchend", stopDrag);
  window.addEventListener("touchcancel", stopDrag);
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

  resetPopupDragPlacement();

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
  updateSegmentNavigationVisibility();

  if (videoPanel.style.display !== "none" && currentLocation === "side") {
    setSidebarCollapsed(false);
  }
}

function resetInteractionState({ preserveNavigationChoice = false } = {}) {
  navigationPanelRevealToken += 1;
  videoStartInitToken += 1;
  isInitializingVideoStart = false;
  activeTextClickHighlight = null;
  stopTime = null;
  lastActiveEl = null;
  currentVideoTarget = null;
  currentVideoScopeTarget = null;
  activeVideoSegmentTarget = null;
  activeVideoSegmentIndex = null;
  if (!preserveNavigationChoice) {
    currentNavigation = "none";
    hasNavigationChoice = false;
    choiceMadeByFeature.navigation = false;
    clearChoiceVisual("navigation");
  }
  document.querySelectorAll(".cueChunk").forEach((element) => {
    element.classList.remove("activeHighlight", "activeSegmentHighlight");
  });

  video.pause();
  revokeCurrentBlobVideoUrl();
  video.src = MAIN_VIDEO_PATH;
  video.currentTime = 0;
  setVideoVisible(false);
  setVideoPlaceholderVisible(false);
}

function setVideoVisible(visible, targetElement = null, { position = true } = {}) {
  if (!videoPanel) {
    return;
  }

  if (visible) {
    setVideoPlaceholderVisible(false);
    ensureValidLocationSelection({ markChoice: true });
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
    activeTextClickHighlight = null;
    currentVideoTarget = null;
    currentVideoScopeTarget = null;
    activeVideoSegmentTarget = null;
    activeVideoSegmentIndex = null;
    lastActiveEl = null;
    stopTime = null;
    document.querySelectorAll(".cueChunk").forEach((element) => {
      element.classList.remove("activeHighlight", "activeSegmentHighlight");
    });
    video.pause();
    video.currentTime = 0;
  }

  updateTextLinkStates();
  updateSegmentNavigationButtons();
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

    if (currentNavigation === "text-centric" && hasNavigationChoice) {
      currentVideoScopeTarget = getStartingTextChunk();
      setVideoPlaceholderVisible(true);
      updateTextLinkStates();
      updateSegmentNavigationButtons();
    }
  });

  featureOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const feature = button.dataset.featureOption;

      if (button.disabled) {
        return;
      }

      const preservesNavigationChoice = feature === "segmentation"
        || feature === "linking-granularity";
      resetInteractionState({ preserveNavigationChoice: preservesNavigationChoice });

      if (feature === "segmentation") {
        choiceMadeByFeature.segmentation = true;
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
        choiceMadeByFeature["linking-granularity"] = true;
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
  if (ENABLE_SCROLL_DRIVEN_INTERACTION) scheduleTextScrollSync();
  scheduleFloatingPanelPosition();
}

window.addEventListener("scroll", handleScrollInteraction, { passive: true });
textSide?.addEventListener("scroll", handleScrollInteraction, { passive: true });
textPanel?.addEventListener("scroll", handleScrollInteraction, { passive: true });

setupSidebarControls();
ensureValidLocationSelection({ markChoice: true });
setupPanelResize();
setupPopupDrag();
setLinkingGranularity('full');
setMode('full', false);
resetInteractionState();
updateTextLinkStates();
updateNavigationAvailability();
setSidebarCollapsed(true);
