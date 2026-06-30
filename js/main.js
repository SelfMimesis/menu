const videos = [
  "assets/02_E14_Food_Menu.mp4",
  "assets/video-02.mp4",
  "assets/video-03.mp4"
];

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const DNA_FRAME_RATE = 24;
const DNA_FRAME_DURATION = 1000 / DNA_FRAME_RATE;

const state = {
  currentIndex: 0,
  activePlayer: 0,
  sequenceEnabled: true,
  switching: false
};

document.addEventListener("DOMContentLoaded", () => {
  const kiosk = document.getElementById("kiosk");
  const frame = document.getElementById("videoFrame");
  const plaque = document.getElementById("statusPlaque");
  const players = [
    document.getElementById("videoA"),
    document.getElementById("videoB")
  ];
  const menuList = document.getElementById("menuList");
  const leftPanel = document.querySelector(".left-panel");

  setupViewportScale(kiosk);
  setupDnaBackground(leftPanel);
  setupScrollControls(menuList);
  setupMenuSelection(menuList);
  setupAuxiliaryButtons();
  setupPlayerAttributes(players);
  setupVideoEvents(players, frame, plaque);
  setupControls(players, frame, plaque);
  playVideo(players, frame, plaque, 0, 0);
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

function setupDnaBackground(panel) {
  if (!panel) {
    return;
  }

  let lastFrame = 0;
  const startTime = performance.now();

  panel.style.setProperty("--dna-frame-duration", `${DNA_FRAME_DURATION.toFixed(2)}ms`);

  const renderFrame = (timestamp) => {
    if (timestamp - lastFrame >= DNA_FRAME_DURATION) {
      const elapsed = (timestamp - startTime) / 1000;
      const mainRotation = -18 + elapsed * 13.85;
      const haloRotation = 18 - elapsed * 10.59;
      const driftX = Math.sin(elapsed * 0.42) * 10;
      const driftY = Math.cos(elapsed * 0.37) * -12;
      const mainScale = 1 + Math.sin(elapsed * 0.5) * 0.018;
      const haloScale = 1.02 + Math.cos(elapsed * 0.28) * 0.018;
      const posX = wrap(elapsed * 5.92, 154);
      const posY = wrap(-elapsed * 3.92, 102);
      const haloX = wrap(elapsed * 7.06, 240);
      const haloY = wrap(-elapsed * 4.24, 144);
      const headerX = wrap(elapsed * 24, 192);
      const headerY = wrap(-elapsed * 24, 192);
      const headerTabX = wrap(elapsed * 18, 144);
      const headerTabY = wrap(-elapsed * 18, 144);

      panel.style.setProperty("--dna-pos-a", `${formatPx(posX)} ${formatPx(posY)}`);
      panel.style.setProperty("--dna-pos-b", `${formatPx(posX + 77)} ${formatPx(posY + 51)}`);
      panel.style.setProperty("--dna-pos-c", `${formatPx(posX)} ${formatPx(posY)}`);
      panel.style.setProperty("--dna-pos-d", `${formatPx(posX + 77)} ${formatPx(posY + 51)}`);
      panel.style.setProperty("--dna-rotate", `${formatNumber(mainRotation)}deg`);
      panel.style.setProperty("--dna-x", formatPx(driftX));
      panel.style.setProperty("--dna-y", formatPx(driftY));
      panel.style.setProperty("--dna-scale", formatNumber(mainScale));
      panel.style.setProperty("--dna-halo-pos-a", `${formatPx(haloX)} ${formatPx(haloY)}`);
      panel.style.setProperty("--dna-halo-pos-b", `${formatPx(wrap(elapsed * 6.59, 224))} 0px`);
      panel.style.setProperty("--dna-halo-rotate", `${formatNumber(haloRotation)}deg`);
      panel.style.setProperty("--dna-halo-scale", formatNumber(haloScale));
      panel.style.setProperty("--header-stripe-pos", `${formatPx(headerX)} ${formatPx(headerY)}`);
      panel.style.setProperty("--header-tab-stripe-pos", `${formatPx(headerTabX)} ${formatPx(headerTabY)}`);

      lastFrame = timestamp - ((timestamp - lastFrame) % DNA_FRAME_DURATION);
    }

    requestAnimationFrame(renderFrame);
  };

  requestAnimationFrame(renderFrame);
}

function setupPlayerAttributes(players) {
  players.forEach((player) => {
    player.muted = true;
    player.defaultMuted = true;
    player.autoplay = true;
    player.playsInline = true;
    player.preload = "auto";
  });
}

function setupVideoEvents(players, frame, plaque) {
  players.forEach((player) => {
    player.addEventListener("ended", () => {
      if (!player.classList.contains("is-active") || !state.sequenceEnabled) {
        return;
      }

      playVideo(players, frame, plaque, getNextIndex(state.currentIndex), 0);
    });
  });
}

function setupControls(players, frame, plaque) {
  document.querySelectorAll("[data-video-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetIndex = Number(button.dataset.videoIndex);
      state.sequenceEnabled = true;
      playVideo(players, frame, plaque, targetIndex, 0);
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;

      if (action === "previous") {
        playVideo(players, frame, plaque, getPreviousIndex(state.currentIndex), 0);
      }

      if (action === "next") {
        playVideo(players, frame, plaque, getNextIndex(state.currentIndex), 0);
      }

      if (action === "sequence") {
        state.sequenceEnabled = true;
        playActive(players);
      }

      if (action === "restart") {
        restartActive(players);
      }

      if (action === "fullscreen") {
        enterFullscreen();
      }
    });
  });
}

function playVideo(players, frame, plaque, index, attempts) {
  if (state.switching) {
    return;
  }

  if (attempts >= videos.length) {
    frame.classList.add("no-media");
    plaque.textContent = "NO SIGNAL";
    setActiveButton(state.currentIndex);
    return;
  }

  const targetIndex = normalizeIndex(index);
  const inactivePlayerIndex = state.activePlayer === 0 ? 1 : 0;
  const incoming = players[inactivePlayerIndex];
  const outgoing = players[state.activePlayer];

  state.switching = true;
  frame.classList.add("no-media");
  plaque.textContent = `CHANNEL ${String(targetIndex + 1).padStart(2, "0")}`;

  const cleanup = () => {
    incoming.removeEventListener("loadeddata", handleReady);
    incoming.removeEventListener("canplay", handleReady);
    incoming.removeEventListener("error", handleError);
  };

  const handleReady = () => {
    cleanup();
    swapPlayers(incoming, outgoing, inactivePlayerIndex, targetIndex, frame, plaque);
  };

  const handleError = () => {
    cleanup();
    state.switching = false;
    playVideo(players, frame, plaque, getNextIndex(targetIndex), attempts + 1);
  };

  incoming.addEventListener("loadeddata", handleReady, { once: true });
  incoming.addEventListener("canplay", handleReady, { once: true });
  incoming.addEventListener("error", handleError, { once: true });

  if (incoming.dataset.preloadedIndex === String(targetIndex) && incoming.readyState >= 2) {
    handleReady();
  } else {
    incoming.dataset.preloadedIndex = String(targetIndex);
    incoming.src = videos[targetIndex];
    incoming.load();

    if (incoming.readyState >= 2) {
      handleReady();
    }
  }
}

function swapPlayers(incoming, outgoing, incomingIndex, videoIndex, frame, plaque) {
  outgoing.pause();
  outgoing.classList.remove("is-active");

  incoming.currentTime = 0;
  incoming.classList.add("is-active");

  const playPromise = incoming.play();

  if (playPromise) {
    playPromise.catch(() => {
      incoming.muted = true;
      incoming.play().catch(() => {});
    });
  }

  state.activePlayer = incomingIndex;
  state.currentIndex = videoIndex;
  state.switching = false;

  frame.classList.remove("no-media");
  plaque.textContent = "FOOD MENU";
  setActiveButton(videoIndex);
  preloadNextVideo(outgoing, getNextIndex(videoIndex));
}

function preloadNextVideo(player, nextIndex) {
  const nextSource = videos[nextIndex];

  if (!player || player.dataset.preloadedIndex === String(nextIndex)) {
    return;
  }

  player.dataset.preloadedIndex = String(nextIndex);
  player.src = nextSource;
  player.load();
}

function playActive(players) {
  const active = players[state.activePlayer];

  active.play().catch(() => {});
}

function restartActive(players) {
  const active = players[state.activePlayer];

  active.currentTime = 0;
  playActive(players);
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

function setActiveButton(index) {
  document.querySelectorAll("[data-video-index]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.videoIndex) === index);
  });
}

function getNextIndex(index) {
  return normalizeIndex(index + 1);
}

function getPreviousIndex(index) {
  return normalizeIndex(index - 1);
}

function normalizeIndex(index) {
  return (index + videos.length) % videos.length;
}

function wrap(value, max) {
  return ((value % max) + max) % max;
}

function formatPx(value) {
  return `${formatNumber(value)}px`;
}

function formatNumber(value) {
  return value.toFixed(2);
}
