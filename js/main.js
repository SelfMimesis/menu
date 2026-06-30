const videoSources = {
  base: "assets/01_E14_Food_Menu.mp4?v=20260630-8",
  overlays: [
    "assets/02_E14_Food_Menu.mp4?v=20260630-8",
    "assets/03_E14_Food_Menu.mp4?v=20260630-8"
  ]
};

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const DISPLAY_TITLE = "TRANSROLLINHYFA";
const OVERLAY_CROSSFADE_SECONDS = 0.18;
const OVERLAY_FADE_MS = 220;

const state = {
  overlayRunId: 0
};

document.addEventListener("DOMContentLoaded", () => {
  const kiosk = document.getElementById("kiosk");
  const frame = document.getElementById("videoFrame");
  const plaque = document.getElementById("statusPlaque");
  const baseVideo = document.getElementById("videoBase");
  const overlayVideos = [
    document.getElementById("videoOverlayA"),
    document.getElementById("videoOverlayB")
  ];
  const menuList = document.getElementById("menuList");
  const videoSystem = { frame, plaque, baseVideo, overlayVideos };

  setupViewportScale(kiosk);
  setupBaseVideo(videoSystem);
  setupOverlayVideos(overlayVideos);
  setupScrollControls(menuList);
  setupMenuSelection(menuList);
  setupAuxiliaryButtons();
  setupControlActions(videoSystem);
  setupOverlayTriggers(kiosk, videoSystem);
});

function setupViewportScale(kiosk) {
  const resizeScreen = () => {
    const scale = Math.min(
      window.innerWidth / BASE_WIDTH,
      window.innerHeight / BASE_HEIGHT
    );

    kiosk.style.setProperty("--screen-scale", scale.toFixed(4));
  };

  resizeScreen();
  window.addEventListener("resize", resizeScreen);
}

function setupBaseVideo({ frame, plaque, baseVideo }) {
  applyVideoDefaults(baseVideo);
  baseVideo.loop = true;
  baseVideo.src = videoSources.base;

  baseVideo.addEventListener("loadeddata", () => {
    frame.classList.remove("no-media");
    baseVideo.classList.add("is-active");
    plaque.textContent = DISPLAY_TITLE;
    playMedia(baseVideo);
  });

  baseVideo.addEventListener("error", () => {
    frame.classList.add("no-media");
    plaque.textContent = "NO SIGNAL";
  });

  baseVideo.load();
  playMedia(baseVideo);
}

function setupOverlayVideos(overlayVideos) {
  overlayVideos.forEach((video, index) => {
    applyVideoDefaults(video);
    video.loop = false;
    video.src = videoSources.overlays[index];
    video.load();
  });
}

function applyVideoDefaults(video) {
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = false;
  video.playsInline = true;
  video.preload = "auto";
}

function setupControlActions({ baseVideo }) {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;

      if (action === "restart") {
        restartBaseVideo(baseVideo);
      }

      if (action === "fullscreen") {
        enterFullscreen();
      }
    });
  });
}

function setupOverlayTriggers(kiosk, videoSystem) {
  kiosk.addEventListener("click", (event) => {
    if (!event.target.closest("button, .menu-item, .menu-card, .panel-emblem, .video-frame")) {
      return;
    }

    playOverlaySequence(videoSystem);
  });
}

function playOverlaySequence({ baseVideo, overlayVideos }) {
  const [firstOverlay, secondOverlay] = overlayVideos;
  const runId = state.overlayRunId + 1;
  let secondStarted = false;

  state.overlayRunId = runId;
  resetOverlay(firstOverlay);
  resetOverlay(secondOverlay);

  prepareOverlay(firstOverlay, videoSources.overlays[0]);
  prepareOverlay(secondOverlay, videoSources.overlays[1]);

  const startSecondOverlay = () => {
    if (secondStarted || runId !== state.overlayRunId) {
      return;
    }

    secondStarted = true;
    showOverlay(secondOverlay);

    window.setTimeout(() => {
      if (runId === state.overlayRunId) {
        hideOverlay(firstOverlay);
      }
    }, OVERLAY_FADE_MS);
  };

  firstOverlay.ontimeupdate = () => {
    if (!Number.isFinite(firstOverlay.duration)) {
      return;
    }

    if (firstOverlay.duration - firstOverlay.currentTime <= OVERLAY_CROSSFADE_SECONDS) {
      startSecondOverlay();
    }
  };

  firstOverlay.onended = startSecondOverlay;
  firstOverlay.onerror = startSecondOverlay;
  secondOverlay.onended = () => {
    if (runId !== state.overlayRunId) {
      return;
    }

    returnToBaseVideo(baseVideo, overlayVideos);
  };
  secondOverlay.onerror = secondOverlay.onended;

  showOverlay(firstOverlay);
}

function prepareOverlay(video, source) {
  if (video.getAttribute("src") !== source) {
    video.src = source;
    video.load();
  }

  try {
    video.currentTime = 0;
  } catch (error) {
    // Some browsers reject currentTime before metadata is ready; playback still starts at zero after load.
  }
}

function showOverlay(video) {
  video.classList.add("is-visible");
  playMedia(video);
}

function hideOverlay(video) {
  video.classList.remove("is-visible");

  window.setTimeout(() => {
    if (!video.classList.contains("is-visible")) {
      video.pause();
      prepareOverlay(video, video.getAttribute("src"));
    }
  }, OVERLAY_FADE_MS);
}

function returnToBaseVideo(baseVideo, overlayVideos) {
  baseVideo.loop = true;
  baseVideo.classList.add("is-active");
  restartBaseVideo(baseVideo);

  overlayVideos.forEach((video) => {
    hideOverlay(video);
    cleanupOverlay(video);
  });
}

function resetOverlay(video) {
  cleanupOverlay(video);
  video.classList.remove("is-visible");
  video.pause();
  prepareOverlay(video, video.getAttribute("src"));
}

function cleanupOverlay(video) {
  video.ontimeupdate = null;
  video.onended = null;
  video.onerror = null;
}

function restartBaseVideo(baseVideo) {
  try {
    baseVideo.currentTime = 0;
  } catch (error) {
    // Keep the UI responsive even if the browser has not loaded metadata yet.
  }

  playMedia(baseVideo);
}

function playMedia(video) {
  const playPromise = video.play();

  if (playPromise) {
    playPromise.catch(() => {});
  }
}

function enterFullscreen() {
  const target = document.documentElement;

  if (!document.fullscreenElement && target.requestFullscreen) {
    target.requestFullscreen().catch(() => {});
  }
}

function setupScrollControls(menuList) {
  document.querySelectorAll("[data-scroll-menu]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.scrollMenu === "up" ? -1 : 1;

      menuList.scrollBy({
        top: direction * 160,
        behavior: "smooth"
      });
    });
  });
}

function setupMenuSelection(menuList) {
  const notice = document.getElementById("menuNotice");
  const noticeDish = document.getElementById("noticeDish");
  const noticePrice = document.getElementById("noticePrice");
  let noticeTimer;

  menuList.addEventListener("click", (event) => {
    const item = event.target.closest(".menu-item");

    if (!item) {
      return;
    }

    const [dish, price] = item.querySelectorAll("span");

    menuList.querySelectorAll(".menu-item").forEach((currentItem) => {
      currentItem.classList.remove("is-selected");
    });

    item.classList.add("is-selected");
    noticeDish.textContent = dish.textContent;
    noticePrice.textContent = price.textContent;
    notice.classList.add("is-visible");
    notice.setAttribute("aria-hidden", "false");

    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice.classList.remove("is-visible");
      notice.setAttribute("aria-hidden", "true");
    }, 4600);
  });
}

function setupAuxiliaryButtons() {
  document.querySelectorAll("[data-panel-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-panel-mode]").forEach((item) => {
        item.classList.remove("is-active");
      });

      button.classList.add("is-active");
    });
  });
}
