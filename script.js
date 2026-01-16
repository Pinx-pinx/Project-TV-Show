const root = document.getElementById("root");
const searchInput = document.getElementById("searchInput");
const episodeSelect = document.getElementById("episodeSelect");
const showSelect = document.getElementById("showSelect");
const episodeCount = document.getElementById("episodeCount");
const loadingSpinner = document.getElementById("loadingSpinner");
const showsContainer = document.getElementById("showsContainer");
const backToShowsBtn = document.getElementById("backToShows");
const showSearchInput = document.getElementById("showSearch");
const sortSelect = document.getElementById("sortSelect");

/*  Global State & Cache */
let allShows = [];
let allEpisodes = [];
const episodeCache = {}; // cache episodes per show

/* App Start */
window.onload = () => {
  fetchShows();
  setupSearch();
};

/* Fetch Shows */
async function fetchShows() {
  try {
    showLoading(true);
    const response = await fetch("https://api.tvmaze.com/shows");
    if (!response.ok) throw new Error("Failed to fetch shows");

    const data = await response.json();
    allShows = data.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    populateShowSelect(allShows);
    displayShows(allShows);
    showSearchInput.style.display = "block";
    showLoading(false);
  } catch (error) {
    root.innerHTML = "<p>Error loading shows. Please refresh the page.</p>";
    showLoading(false);
  }
}

/* Fetch Episodes for a Show */
async function fetchEpisodesForShow(showId) {
  if (episodeCache[showId]) {
    allEpisodes = episodeCache[showId];
    displayEpisodes(allEpisodes);
    setupEpisodeSelect(allEpisodes);
    return;
  }

  try {
    showLoading(true);
    const response = await fetch(
      `https://api.tvmaze.com/shows/${showId}/episodes`
    );
    if (!response.ok) throw new Error("Failed to fetch episodes");

    const data = await response.json();
    episodeCache[showId] = data;
    allEpisodes = data;

    displayEpisodes(allEpisodes);
    setupEpisodeSelect(allEpisodes);
    showLoading(false);
  } catch (error) {
    root.innerHTML = "<p>Error loading episodes. Please try another show.</p>";
    showLoading(false);
  }
}

/* Fetch Cast for a Show */
async function fetchCastForShow(showId) {
  try {
    const response = await fetch(
      `https://api.tvmaze.com/shows/${showId}?embed=cast`
    );
    if (!response.ok) throw new Error("Failed to fetch cast");
    const data = await response.json();
    return data._embedded.cast; // array of cast objects
  } catch (error) {
    console.error(error);
    return [];
  }
}

/* Populate show select dropdown */
function populateShowSelect(shows) {
  shows.forEach((show) => {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    showSelect.appendChild(option);
  });
}

/* Show select event */
showSelect.addEventListener("change", () => {
  const showId = showSelect.value;
  if (!showId) return;

  searchInput.value = "";
  episodeSelect.innerHTML = '<option value="">Jump to episode...</option>';
  root.innerHTML = "";
  fetchEpisodesForShow(showId);
});

/* Display Episodes */
function displayEpisodes(episodes) {
  root.innerHTML = "";

  episodes.forEach((episode) => {
    root.appendChild(createEpisodeCard(episode));
  });

  updateEpisodeCount(episodes.length, allEpisodes.length);
}

/* Create Episode Card with Read More */
function createEpisodeCard(episode) {
  const episodeCode = formatEpisodeCode(episode.season, episode.number);
  const episodeCard = document.createElement("section");
  episodeCard.className = "episode";
  episodeCard.id = episodeCode;

  const summaryText = episode.summary || "No summary available.";
  const truncated =
    summaryText.length > 150 ? summaryText.slice(0, 150) + "..." : summaryText;

  episodeCard.innerHTML = `
    <h2>${episode.name} (${episodeCode})</h2>
    <img src="${episode.image ? episode.image.medium : ""}" alt="${
    episode.name
  }">
    <div class="summary">${truncated}</div>
    ${
      summaryText.length > 150
        ? '<button class="read-more-btn">Read more</button>'
        : ""
    }
  `;

  if (summaryText.length > 150) {
    const btn = episodeCard.querySelector(".read-more-btn");
    btn.addEventListener("click", () => {
      episodeCard.querySelector(".summary").innerHTML = summaryText;
      btn.style.display = "none";
    });
  }

  return episodeCard;
}

/* Display Shows */
function displayShows(shows) {
  showsContainer.innerHTML = "";

  shows.forEach((show) => {
    const card = document.createElement("div");
    card.className = "show-card";

    // Favorite star
    const favoriteStar = isFavorite(show.id) ? "★" : "☆";

    card.innerHTML = `
      <h3>${show.name}</h3>
      <button class="favorite-btn">${favoriteStar}</button>
      <img src="${show.image?.medium || ""}">
      <div class="show-summary">${
        show.summary || "<p>No summary available.</p>"
      }</div>
      <p><b>Genres:</b> ${show.genres.join(", ")}</p>
      <p><b>Status:</b> ${show.status}</p>
      <p><b>Rating:</b> ${show.rating.average}</p>
      <p><b>Runtime:</b> ${show.runtime} min</p>
    `;

    // Click show card to view episodes
    card.addEventListener("click", () => {
      showEpisodesView();
      fetchEpisodesForShow(show.id);
      fetchCastForShow(show.id).then((cast) => displayCast(cast));
    });

    // Favorite button click
    card.querySelector(".favorite-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(show.id);
      displayShows(allShows);
    });

    showsContainer.appendChild(card);
  });
}

/* Display Cast */
function displayCast(cast) {
  let castContainer = document.getElementById("castContainer");
  if (!castContainer) {
    castContainer = document.createElement("div");
    castContainer.id = "castContainer";
    root.appendChild(castContainer);
  }
  castContainer.innerHTML = "<h3>Cast:</h3>";
  cast.forEach((c) => {
    const p = document.createElement("p");
    p.textContent = `${c.person.name} as ${c.character.name}`;
    castContainer.appendChild(p);
  });
}

/* Show / Hide Views */
function showEpisodesView() {
  showsContainer.style.display = "none";
  showSearchInput.style.display = "none";
  backToShowsBtn.style.display = "block";
}

function showShowsView() {
  showsContainer.style.display = "grid";
  showSearchInput.style.display = "block";
  backToShowsBtn.style.display = "none";
  root.innerHTML = "";
}

/* Search Episodes */
function setupSearch() {
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allEpisodes.filter(
      (ep) =>
        ep.name.toLowerCase().includes(term) ||
        ep.summary.toLowerCase().includes(term)
    );
    displayEpisodes(filtered);
  });
}

/* Search Shows */
showSearchInput.addEventListener("input", () => {
  const term = showSearchInput.value.toLowerCase();
  const filtered = allShows.filter(
    (show) =>
      show.name.toLowerCase().includes(term) ||
      show.genres.join(" ").toLowerCase().includes(term) ||
      (show.summary && show.summary.toLowerCase().includes(term))
  );
  displayShows(filtered);
});

/* Episode Selector */
function setupEpisodeSelect(episodes) {
  episodeSelect.innerHTML = '<option value="">Jump to episode...</option>';
  episodes.forEach((ep) => {
    const code = formatEpisodeCode(ep.season, ep.number);
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${code} - ${ep.name}`;
    episodeSelect.appendChild(option);
  });
}

episodeSelect.addEventListener("change", () => {
  const id = episodeSelect.value;
  if (!id) return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
});

backToShowsBtn.addEventListener("click", showShowsView);

/* Format S01E01 */
function formatEpisodeCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(
    2,
    "0"
  )}`;
}

/* Update episode count */
function updateEpisodeCount(shown, total) {
  episodeCount.textContent = `Displaying ${shown} / ${total} episodes`;
}

/* Show loading spinner */
function showLoading(isLoading) {
  loadingSpinner.style.display = isLoading ? "block" : "none";
}

/* Favorites */
function toggleFavorite(showId) {
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  if (favorites.includes(showId)) {
    favorites = favorites.filter((id) => id !== showId);
  } else {
    favorites.push(showId);
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function isFavorite(showId) {
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  return favorites.includes(showId);
}

/* Sort Shows */
sortSelect.addEventListener("change", () => {
  const value = sortSelect.value;
  let sorted = [...allShows];
  if (value === "rating") {
    sorted.sort((a, b) => (b.rating.average || 0) - (a.rating.average || 0));
  } else if (value === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  displayShows(sorted);
});
