const videos = [
  "assets/02_E14_Food_Menu.mp4",
  "assets/video-02.mp4",
  "assets/video-03.mp4"
];

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const DISPLAY_TITLE = "TRANSROLLINHYFA";

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

  setupViewportScale(kiosk);
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
  plaque.textContent = DISPLAY_TITLE;
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
