(function () {
  const params = new URLSearchParams(window.location.search);
  const participantId = params.get("pid")?.trim() || "";
  const sessionId = params.get("session") || "";
  let studyOrigin = "";

  try {
    studyOrigin = window.opener?.location.origin || "";
  } catch (_error) {
    studyOrigin = "";
  }

  const allowedStudyOrigin = studyOrigin === "https://tithi-khan.github.io"
    || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(studyOrigin);
  const enabled = /^[A-Za-z0-9_-]{1,64}$/.test(participantId)
    && /^[0-9a-f-]{36}$/i.test(sessionId)
    && window.opener
    && allowedStudyOrigin;
  const pending = new Map();
  let lastVideoIntentAt = 0;

  if (!enabled) {
    return;
  }

  function selectedValue(feature) {
    return document.querySelector(
      `[data-feature-option="${feature}"].current-selection`
    )?.dataset.value || "";
  }

  function currentState() {
    return {
      location: selectedValue("location"),
      segmentation: selectedValue("segmentation") ||
        document.body.dataset.mode || "",
      linking_granularity: selectedValue("linking-granularity"),
      navigation: selectedValue("navigation"),
      sidebar_open: document.getElementById("sidebarMenuBtn")
        ?.getAttribute("aria-expanded") === "true",
      video_visible: document.getElementById("videoPanel")
        ?.style.display !== "none"
    };
  }

  function sendPending(entry) {
    if (!window.opener || window.opener.closed) {
      return;
    }

    window.opener.postMessage(
      {
        type: "prototype-interaction",
        participant_id: participantId.toLowerCase(),
        session_id: sessionId,
        interaction: entry
      },
      studyOrigin
    );
  }

  function logInteraction(action, details = {}) {
    const entry = {
      event_id: crypto.randomUUID(),
      action,
      occurred_at: new Date().toISOString(),
      ...details,
      state: currentState()
    };

    pending.set(entry.event_id, entry);
    sendPending(entry);
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== studyOrigin) return;
    if (event.source !== window.opener) return;
    if (event.data?.type !== "prototype-interaction-ack") return;

    pending.delete(event.data.event_id);
  });

  setInterval(() => {
    pending.forEach(sendPending);
  }, 2000);

  document.addEventListener("click", (event) => {
    const target = event.target.closest?.(
      "button, .support-dropdown-trigger, .cueChunk"
    );

    if (!target) return;

    if (target.matches("[data-feature-option]") && !target.disabled) {
      queueMicrotask(() => {
        logInteraction("feature_selected", {
          feature: target.dataset.featureOption,
          value: target.dataset.value
        });
      });
      return;
    }

    if (target.classList.contains("cueChunk")) {
      logInteraction("text_unit_selected", {
        target_type: document.body.dataset.mode || "text",
        target_value: target.textContent.trim().slice(0, 1000),
        segment_start: target.dataset.start || "",
        segment_end: target.dataset.end || ""
      });
      return;
    }

    if (target.id === "sidebarMenuBtn") {
      queueMicrotask(() => {
        logInteraction(
          target.getAttribute("aria-expanded") === "true"
            ? "support_tool_opened"
            : "support_tool_closed"
        );
      });
      return;
    }

    if (target.id === "videoCloseBtn") {
      queueMicrotask(() => logInteraction("video_closed"));
      return;
    }

    if (target.id === "previousSegmentBtn") {
      queueMicrotask(() => logInteraction("previous_segment_selected"));
      return;
    }

    if (target.id === "nextSegmentBtn") {
      queueMicrotask(() => logInteraction("next_segment_selected"));
      return;
    }

    if (target.classList.contains("support-dropdown-trigger")) {
      logInteraction("feature_menu_selected", {
        value: target.textContent.trim().slice(0, 80)
      });
    }
  }, true);

  const video = document.getElementById("video");

  const markVideoIntent = () => {
    lastVideoIntentAt = Date.now();
  };

  video?.addEventListener("pointerdown", markVideoIntent, true);
  video?.addEventListener("keydown", markVideoIntent, true);

  video?.addEventListener("play", () => {
    if (Date.now() - lastVideoIntentAt < 1500) {
      logInteraction("video_played", {
        video_time: Number(video.currentTime.toFixed(3))
      });
    }
  });

  video?.addEventListener("pause", () => {
    if (Date.now() - lastVideoIntentAt < 1500 && !video.ended) {
      logInteraction("video_paused", {
        video_time: Number(video.currentTime.toFixed(3))
      });
    }
  });

  video?.addEventListener("seeked", () => {
    if (Date.now() - lastVideoIntentAt < 1500) {
      logInteraction("video_seeked", {
        video_time: Number(video.currentTime.toFixed(3))
      });
    }
  });

  window.addEventListener("pagehide", () => {
    logInteraction("prototype_closed");
  });

  logInteraction("prototype_opened", {
    target_value: document.title
  });
})();
