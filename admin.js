
const GAMES_KEY = "jtcSportsGames";
const VIDEOS_KEY = "jtcSportsVideos";
const FEATURED_DURATION = 24 * 60 * 60 * 1000;

let editingGameId = null;
let editingVideoId = null;

const $ = id => document.getElementById(id);

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("Could not read storage:", error);
    return [];
  }
}

function saveStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function safeHttpUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (error) {}

  return "";
}

function formatDate(value) {
  if (!value) return "Date to be announced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function setMessage(id, message) {
  $(id).textContent = message;
}

/* -------------------------
   GAME SCHEDULE
------------------------- */

function getGames() {
  return readStorage(GAMES_KEY);
}

function resetGameForm() {
  editingGameId = null;
  $("game-form").reset();
  $("game-form-heading").textContent = "Add a Game";
  $("save-game-button").textContent = "Add Game";
  $("cancel-game-edit").hidden = true;
  setMessage("game-message", "");
}

function renderGames() {
  const games = getGames();
  const list = $("game-list");

  list.replaceChildren();

  if (games.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No games have been added yet.";
    list.appendChild(empty);
    return;
  }

  games.sort((a, b) => {
    return (new Date(a.date).getTime() || 0) -
           (new Date(b.date).getTime() || 0);
  });

  games.forEach(game => {
    const item = document.createElement("article");
    item.className = "admin-item";

    const title = document.createElement("h3");
    title.textContent =
      `${game.homeTeam || "Home Team"} vs. ${game.awayTeam || "Away Team"}`;

    const sport = document.createElement("span");
    sport.className = "status-label";
    sport.textContent = game.sport || "Sports";

    const date = document.createElement("p");
    date.textContent = formatDate(game.date);

    item.append(title, sport, date);

    if (game.broadcastUrl) {
      const link = document.createElement("a");
      link.href = game.broadcastUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open broadcast link";
      link.style.color = "#8bcaff";
      item.appendChild(link);
    }

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "admin-button small";
    edit.textContent = "Edit Game";
    edit.addEventListener("click", () => editGame(game.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-button danger small";
    remove.textContent = "Delete Game";
    remove.addEventListener("click", () => deleteGame(game.id));

    actions.append(edit, remove);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

$("game-form").addEventListener("submit", event => {
  event.preventDefault();

  const homeTeam = $("home-team").value.trim();
  const awayTeam = $("away-team").value.trim();
  const sport = $("sport").value;
  const date = $("game-date").value;
  const rawUrl = $("broadcast-url").value.trim();

  if (!homeTeam || !awayTeam || !sport || !date) {
    setMessage("game-message", "Please complete all required fields.");
    return;
  }

  let broadcastUrl = "";

  if (rawUrl) {
    broadcastUrl = safeHttpUrl(rawUrl);

    if (!broadcastUrl) {
      setMessage("game-message", "Please enter a valid link beginning with http:// or https://.");
      return;
    }
  }

  const games = getGames();
  const existing = games.find(game => game.id === editingGameId);

  const game = {
    id: editingGameId || makeId(),
    homeTeam,
    awayTeam,
    sport,
    date,
    broadcastUrl,
    createdAt: existing?.createdAt || Date.now()
  };

  const updatedGames = editingGameId
    ? games.map(item => item.id === editingGameId ? game : item)
    : [...games, game];

  try {
    saveStorage(GAMES_KEY, updatedGames);
    resetGameForm();
    renderGames();

    setMessage(
      "game-message",
      editingGameId ? "Game updated!" : "Game added to your schedule!"
    );
  } catch (error) {
    setMessage("game-message", "Could not save the game. Check your browser storage.");
  }
});

function editGame(id) {
  const game = getGames().find(item => item.id === id);
  if (!game) return;

  editingGameId = id;

  $("home-team").value = game.homeTeam || "";
  $("away-team").value = game.awayTeam || "";
  $("sport").value = game.sport || "";
  $("game-date").value = game.date || "";
  $("broadcast-url").value = game.broadcastUrl || "";

  $("game-form-heading").textContent = "Edit Game";
  $("save-game-button").textContent = "Save Changes";
  $("cancel-game-edit").hidden = false;

  setMessage("game-message", "Update the details, then click Save Changes.");
  $("game-form-heading").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteGame(id) {
  const game = getGames().find(item => item.id === id);
  if (!game) return;

  if (!confirm(`Delete ${game.homeTeam} vs. ${game.awayTeam}?`)) return;

  saveStorage(
    GAMES_KEY,
    getGames().filter(item => item.id !== id)
  );

  if (editingGameId === id) resetGameForm();

  renderGames();
  setMessage("game-message", "Game deleted.");
}

$("cancel-game-edit").addEventListener("click", resetGameForm);

/* -------------------------
   YOUTUBE VIDEO MANAGER
------------------------- */

function getVideos() {
  return readStorage(VIDEOS_KEY);
}

function getYouTubeId(value) {
  const safeUrl = safeHttpUrl(value);
  if (!safeUrl) return "";

  try {
    const url = new URL(safeUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (url.searchParams.get("v")) {
        return url.searchParams.get("v");
      }

      const parts = url.pathname.split("/").filter(Boolean);

      if (
        ["live", "shorts", "embed", "v"].includes(parts[0]) &&
        parts[1]
      ) {
        return parts[1];
      }
    }
  } catch (error) {}

  return "";
}

function resetVideoForm() {
  editingVideoId = null;
  $("video-form").reset();
  $("video-form-heading").textContent = "Add a Watch Live Video";
  $("save-video-button").textContent = "Add Video";
  $("cancel-video-edit").hidden = true;
  setMessage("video-message", "");
}

function expireFeaturedVideos(videos) {
  let changed = false;
  const now = Date.now();

  const updated = videos.map(video => {
    if (!video.featured) return video;

    // Start the timer for featured videos created before this feature existed.
    if (!video.featuredAt) {
      changed = true;
      return { ...video, featuredAt: now };
    }

    if (now - video.featuredAt >= FEATURED_DURATION) {
      changed = true;
      return { ...video, featured: false, featuredAt: null };
    }

    return video;
  });

  if (changed) saveStorage(VIDEOS_KEY, updated);

  return updated;
}

function renderVideos() {
  const videos = expireFeaturedVideos(getVideos());
  const list = $("admin-video-list");

  list.replaceChildren();

  if (videos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No videos have been added yet.";
    list.appendChild(empty);
    return;
  }

  videos.forEach(video => {
    const item = document.createElement("article");
    item.className = "admin-item";

    const title = document.createElement("h3");
    title.textContent = video.title || "Untitled Video";

    const type = document.createElement("span");
    type.className = "status-label";
    type.textContent = video.type || "live";

    item.append(title, type);

    if (video.featured) {
      const featured = document.createElement("span");
      featured.className = "status-label";
      featured.textContent = "FEATURED";
      item.appendChild(featured);

      const expiry = document.createElement("p");
      const remaining = Math.max(
        0,
        FEATURED_DURATION - (Date.now() - video.featuredAt)
      );

      const hours = Math.ceil(remaining / (60 * 60 * 1000));
      expiry.textContent = `Featured for up to ${hours} more hour(s).`;
      item.appendChild(expiry);
    }

    const link = document.createElement("p");
    link.textContent = video.url || "";
    item.appendChild(link);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const feature = document.createElement("button");
    feature.type = "button";
    feature.className = "admin-button small";
    feature.textContent = video.featured ? "Featured" : "Make Featured";
    feature.disabled = Boolean(video.featured);
    feature.addEventListener("click", () => featureVideo(video.id));

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "admin-button secondary small";
    edit.textContent = "Edit Video";
    edit.addEventListener("click", () => editVideo(video.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-button danger small";
    remove.textContent = "Delete Video";
    remove.addEventListener("click", () => deleteVideo(video.id));

    actions.append(feature, edit, remove);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

$("video-form").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("video-title").value.trim();
  const url = safeHttpUrl($("video-url").value.trim());
  const type = $("video-type").value;
  const wantsFeatured = $("video-featured").checked;

  if (!title || !url) {
    setMessage("video-message", "Please enter a title and a valid video link.");
    return;
  }

  const videoId = getYouTubeId(url);

  if (!videoId) {
    setMessage("video-message", "Please enter a valid YouTube video, Shorts, or live link.");
    return;
  }

  const videos = getVideos();
  const existing = videos.find(video => video.id === editingVideoId);
  const shouldFeature = wantsFeatured || Boolean(existing?.featured);

  const newVideo = {
    id: editingVideoId || makeId(),
    title,
    videoId,
    url,
    type,
    featured: shouldFeature,
    featuredAt: shouldFeature
      ? (wantsFeatured ? Date.now() : (existing?.featuredAt || Date.now()))
      : null
  };

  let updatedVideos = editingVideoId
    ? videos.map(video => video.id === editingVideoId ? newVideo : video)
    : [...videos, newVideo];

  // Only one video can be featured at a time.
  if (shouldFeature) {
    updatedVideos = updatedVideos.map(video => ({
      ...video,
      featured: video.id === newVideo.id,
      featuredAt: video.id === newVideo.id ? newVideo.featuredAt : null
    }));
  }

  try {
    saveStorage(VIDEOS_KEY, updatedVideos);
    resetVideoForm();
    renderVideos();
    setMessage("video-message", "Video saved!");
  } catch (error) {
    setMessage("video-message", "Could not save the video. Check your browser storage.");
  }
});

function featureVideo(id) {
  const videos = getVideos();
  const selected = videos.find(video => video.id === id);
  if (!selected) return;

  const now = Date.now();

  const updated = videos.map(video => ({
    ...video,
    featured: video.id === id,
    featuredAt: video.id === id ? now : null
  }));

  saveStorage(VIDEOS_KEY, updated);
  renderVideos();
  setMessage("video-message", "Featured video updated. It will expire after 24 hours.");
}

function editVideo(id) {
  const video = getVideos().find(item => item.id === id);
  if (!video) return;

  editingVideoId = id;

  $("video-title").value = video.title || "";
  $("video-url").value = video.url || "";
  $("video-type").value = video.type || "live";
  $("video-featured").checked = Boolean(video.featured);

  $("video-form-heading").textContent = "Edit Video";
  $("save-video-button").textContent = "Save Changes";
  $("cancel-video-edit").hidden = false;

  setMessage("video-message", "Update the details, then click Save Changes.");
  $("video-form-heading").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteVideo(id) {
  const video = getVideos().find(item => item.id === id);
  if (!video) return;

  if (!confirm(`Delete "${video.title}"?`)) return;

  saveStorage(
    VIDEOS_KEY,
    getVideos().filter(item => item.id !== id)
  );

  if (editingVideoId === id) resetVideoForm();

  renderVideos();
  setMessage("video-message", "Video deleted.");
}

$("cancel-video-edit").addEventListener("click", resetVideoForm);

/* -------------------------
   STARTUP AND LIVE UPDATES
------------------------- */

function refreshAdmin() {
  renderGames();
  renderVideos();
}

refreshAdmin();

window.addEventListener("storage", event => {
  if (event.key === GAMES_KEY || event.key === VIDEOS_KEY) {
    refreshAdmin();
  }
});
