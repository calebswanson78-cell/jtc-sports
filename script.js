
const GAME_STORAGE_KEY = "jtcSportsGames";

const sampleGame = {
  id: "jtc-sample-iwu-elmhurst",
  homeTeam: "Illinois Wesleyan",
  awayTeam: "Elmhurst",
  sport: "Football",
  date: "2026-10-21",
  broadcastUrl: "https://www.youtube.com/@JTCSports78"
};

function getSavedGames() {
  try {
    const saved = localStorage.getItem(GAME_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    console.error("Unable to read JTC Sports games:", error);
  }

  return [];
}

// Seed the example only if this browser has no saved game list yet.
try {
  if (localStorage.getItem(GAME_STORAGE_KEY) === null) {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify([sampleGame]));
  }
} catch (error) {
  console.warn("Browser storage is unavailable:", error);
}

function formatGameDate(dateString) {
  if (!dateString) return "Date to be announced";

  const parts = dateString.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateString;

  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function renderPublicGames() {
  const list = document.getElementById("public-game-list");
  const empty = document.getElementById("public-game-empty");

  if (!list || !empty) return;

  list.replaceChildren();

  const games = getSavedGames().sort((a, b) =>
    (a.date || "").localeCompare(b.date || "")
  );

  empty.hidden = games.length > 0;

  for (const game of games) {
    const card = document.createElement("article");
    card.className = "game-card";

    const top = document.createElement("div");
    top.className = "game-card-top";

    const sport = document.createElement("span");
    sport.className = "sport-tag";
    sport.textContent = game.sport || "Sports";

    const date = document.createElement("span");
    date.textContent = formatGameDate(game.date);

    top.append(sport, date);

    const matchup = document.createElement("div");
    matchup.className = "matchup";

    const home = document.createElement("h3");
    home.textContent = game.homeTeam;

    const versus = document.createElement("span");
    versus.className = "versus";
    versus.textContent = "VS.";

    const away = document.createElement("h3");
    away.textContent = game.awayTeam;

    matchup.append(home, versus, away);

    const bottom = document.createElement("div");
    bottom.className = "game-card-bottom";

    const label = document.createElement("span");
    label.textContent = "JTC SPORTS";

    const link = document.createElement("a");
    link.href = game.broadcastUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "WATCH ↗";

    bottom.append(label, link);
    card.append(top, matchup, bottom);
    list.appendChild(card);
  }
}

const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label",
      isOpen ? "Close navigation" : "Open navigation");
  });

  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

renderPublicGames();

