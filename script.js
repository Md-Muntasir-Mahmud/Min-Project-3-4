const API_URL = "https://dummyjson.com/products?limit=100";

const elements = {
  search: document.querySelector("#searchInput"),
  clear: document.querySelector("#clearSearch"),
  category: document.querySelector("#categorySelect"),
  sort: document.querySelector("#sortSelect"),
  grid: document.querySelector("#productGrid"),
  status: document.querySelector("#status"),
  empty: document.querySelector("#emptyState"),
  error: document.querySelector("#errorState"),
  count: document.querySelector("#productCount"),
  title: document.querySelector("#sectionTitle"),
  favorites: document.querySelector("#favoritesToggle"),
  savedCount: document.querySelector("#savedCount"),
  reset: document.querySelector("#resetFilters"),
  retry: document.querySelector("#retryButton")
};

let products = [];
let showingFavorites = false;
let savedIds = loadSavedIds();

function loadSavedIds() {
  try {
    const stored = JSON.parse(localStorage.getItem("novaSavedProducts") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn("Saved products could not be read:", error);
    return [];
  }
}

function saveSavedIds() {
  localStorage.setItem("novaSavedProducts", JSON.stringify(savedIds));
  updateSavedCount();
}

function updateSavedCount() {
  elements.savedCount.textContent = savedIds.length;
}

function setLoading(isLoading) {
  elements.status.hidden = !isLoading;
  elements.grid.hidden = isLoading;
  if (isLoading) {
    elements.empty.hidden = true;
    elements.error.hidden = true;
  }
}

async function fetchProducts() {
  setLoading(true);
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.products)) throw new Error("Unexpected API response");
    products = data.products;
    populateCategories();
    setLoading(false);
    renderProducts();
  } catch (error) {
    console.error("Product loading error:", error);
    setLoading(false);
    elements.grid.hidden = true;
    elements.error.hidden = false;
  }
}

function populateCategories() {
  const categories = [...new Set(products.map(product => product.category))].sort();
  elements.category.innerHTML = '<option value="all">All categories</option>';
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category.replaceAll("-", " ");
    elements.category.append(option);
  });
}

function getVisibleProducts() {
  const query = elements.search.value.trim().toLowerCase();
  const category = elements.category.value;

  let visible = products.filter(product => {
    const matchesText = product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.brand?.toLowerCase().includes(query);
    const matchesCategory = category === "all" || product.category === category;
    const matchesSaved = !showingFavorites || savedIds.includes(product.id);
    return matchesText && matchesCategory && matchesSaved;
  });

  switch (elements.sort.value) {
    case "price-low": visible.sort((a, b) => a.price - b.price); break;
    case "price-high": visible.sort((a, b) => b.price - a.price); break;
    case "rating": visible.sort((a, b) => b.rating - a.rating); break;
    case "title": visible.sort((a, b) => a.title.localeCompare(b.title)); break;
  }
  return visible;
}

function renderProducts() {
  const visibleProducts = getVisibleProducts();
  elements.grid.innerHTML = "";
  elements.count.textContent = visibleProducts.length;
  elements.title.textContent = showingFavorites ? "Your saved products" : "Explore products";
  elements.clear.hidden = elements.search.value.length === 0;
  elements.favorites.classList.toggle("active", showingFavorites);
  elements.favorites.setAttribute("aria-pressed", String(showingFavorites));
  elements.favorites.querySelector("span").textContent = showingFavorites ? "♥" : "♡";

  visibleProducts.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";

    const imageArea = document.createElement("div");
    imageArea.className = "image-area";
    const image = document.createElement("img");
    image.src = product.thumbnail || product.images?.[0] || "";
    image.alt = product.title;
    image.loading = "lazy";
    imageArea.append(image);

    const saveButton = document.createElement("button");
    const isSaved = savedIds.includes(product.id);
    saveButton.className = `save-button${isSaved ? " saved" : ""}`;
    saveButton.type = "button";
    saveButton.textContent = isSaved ? "♥" : "♡";
    saveButton.setAttribute("aria-label", isSaved ? `Remove ${product.title} from saved` : `Save ${product.title}`);
    saveButton.addEventListener("click", () => toggleSaved(product.id));
    imageArea.append(saveButton);

    const info = document.createElement("div");
    info.className = "product-info";
    const category = document.createElement("span");
    category.className = "category";
    category.textContent = product.category.replaceAll("-", " ");
    const title = document.createElement("h3");
    title.className = "product-title";
    title.textContent = product.title;
    const bottom = document.createElement("div");
    bottom.className = "product-bottom";
    const price = document.createElement("span");
    price.className = "price";
    price.textContent = `$${product.price.toFixed(2)}`;
    const rating = document.createElement("span");
    rating.className = "rating";
    rating.innerHTML = `<b>★</b> ${Number(product.rating).toFixed(1)}`;
    bottom.append(price, rating);
    info.append(category, title, bottom);
    card.append(imageArea, info);
    elements.grid.append(card);
  });

  const hasProducts = visibleProducts.length > 0;
  elements.empty.hidden = hasProducts;
  elements.grid.hidden = !hasProducts;
}

function toggleSaved(productId) {
  if (savedIds.includes(productId)) {
    savedIds = savedIds.filter(id => id !== productId);
  } else {
    savedIds.push(productId);
  }
  saveSavedIds();
  renderProducts();
}

function resetFilters() {
  elements.search.value = "";
  elements.category.value = "all";
  elements.sort.value = "featured";
  showingFavorites = false;
  renderProducts();
}

elements.search.addEventListener("input", renderProducts);
elements.clear.addEventListener("click", () => {
  elements.search.value = "";
  renderProducts();
  elements.search.focus();
});
elements.category.addEventListener("change", renderProducts);
elements.sort.addEventListener("change", renderProducts);
elements.favorites.addEventListener("click", () => {
  showingFavorites = !showingFavorites;
  renderProducts();
});
elements.reset.addEventListener("click", resetFilters);
elements.retry.addEventListener("click", fetchProducts);

updateSavedCount();
fetchProducts();
