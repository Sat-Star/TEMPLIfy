// Store templates globally for filtering
let allTemplates = [];
let allCategories = []; // Store fetched categories
let allSubcategories = []; // Store fetched subcategories
let selectedCategoryId = "all"; // Track selected category
let selectedSubcategories = []; // Track selected subcategories

// API Configuration
const API_BASE_URL = "https://templify-zhhw.onrender.com/api";

// Function to clear the templates cache
function clearTemplatesCache() {
  try {
    localStorage.removeItem("templify_templates_cache");
    localStorage.removeItem("templify_templates_cache_time");
    console.log("Templates cache cleared");
  } catch (e) {
    console.error("Error clearing cache:", e);
  }
}

// Fetch categories from API
async function loadCategories() {
  try {
    console.log("Loading categories...");
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allCategories = await response.json();
    console.log("Categories loaded successfully:", allCategories);
    renderCategoryTabs();
  } catch (err) {
    console.error("Failed to load categories:", err);
  }
}

// Helper function to check if a string is a valid MongoDB ObjectId
function isValidObjectId(str) {
  return typeof str === "string" && /^[0-9a-f]{24}$/i.test(str);
}

// Normalize template categories and subcategories to use IDs
function normalizeTemplateCategories() {
  console.log(
    "normalizeTemplateCategories called. allCategories:",
    allCategories,
    "allTemplates count:",
    allTemplates.length,
  );

  if (!allCategories || allCategories.length === 0) {
    console.log(
      "No categories loaded yet, skipping normalization - allCategories is empty",
    );
    console.log(
      "Proceeding with templates as-is. Current templates:",
      allTemplates.length,
    );
    return;
  }

  // Create a map of category names to IDs for quick lookup
  const categoryNameToId = {};
  allCategories.forEach((cat) => {
    categoryNameToId[cat.name.toLowerCase()] = cat._id;
  });

  // Create a map of subcategory names to IDs for quick lookup
  const subcategoryNameToId = {};
  allSubcategories.forEach((subcat) => {
    subcategoryNameToId[subcat.name.toLowerCase()] = subcat._id;
  });

  // Normalize each template's category and subcategory to use ObjectIds
  allTemplates = allTemplates.filter((template) => {
    // Skip templates without a category
    if (!template.category) {
      console.warn(`Template "${template.name}" has no category assigned`);
      return false; // Filter out templates with no category
    }

    if (typeof template.category === "string") {
      // Check if it's already a valid ObjectId
      if (isValidObjectId(template.category)) {
        console.log(
          `Template "${template.name}" already has ObjectId category: ${template.category}`,
        );
        return true; // Keep it as-is, it's already an ObjectId
      }

      // If category is a string name, try to convert to ID
      const categoryId = categoryNameToId[template.category.toLowerCase()];
      if (categoryId) {
        template.category = categoryId;
        console.log(
          `Normalized template "${template.name}" category to ID: ${categoryId}`,
        );
      } else {
        console.warn(`Could not find category ID for: ${template.category}`);
        return false; // Filter out if category not found
      }
    }

    // Normalize subcategory if it exists and is a string
    if (template.subCategory && typeof template.subCategory === "string") {
      // Check if it's already a valid ObjectId
      if (isValidObjectId(template.subCategory)) {
        console.log(
          `Template "${template.name}" already has ObjectId subcategory: ${template.subCategory}`,
        );
        return true; // Keep it as-is
      }

      const subcategoryId =
        subcategoryNameToId[template.subCategory.toLowerCase()];
      if (subcategoryId) {
        template.subCategory = subcategoryId;
        console.log(
          `Normalized template "${template.name}" subcategory to ID: ${subcategoryId}`,
        );
      } else {
        console.warn(
          `Could not find subcategory ID for: ${template.subCategory}`,
        );
        // Don't filter out, just leave it as is - it might be an ObjectId already
      }
    }

    return true;
  });

  console.log(
    `After normalization: ${allTemplates.length} templates with valid categories`,
  );
}

// Fetch all subcategories from API
async function loadAllSubcategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/subcategories`);
    allSubcategories = await response.json();
    console.log(`Loaded ${allSubcategories.length} subcategories from API`);
  } catch (err) {
    console.error("Failed to load all subcategories:", err);
    allSubcategories = [];
  }
}

// Fetch subcategories for a specific category
async function loadSubcategoriesByCategory(categoryId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/subcategories/by-category/${categoryId}`,
    );
    allSubcategories = await response.json();
    renderSubcategoryTabs(categoryId);
  } catch (err) {
    console.error("Failed to load subcategories:", err);
    allSubcategories = [];
    renderSubcategoryTabs(categoryId);
  }
}

// Render category tabs dynamically
function renderCategoryTabs() {
  const categoryTabs = document.getElementById("category-tabs");
  if (!categoryTabs) return;

  // Always include "All Templates" button
  let html = `<button class="category-tab active" data-category-id="all">All Templates</button>`;

  // Add each category as a tab
  allCategories.forEach((category) => {
    html += `
      <button class="category-tab" data-category-id="${category._id}">
        ${category.name}
      </button>
    `;
  });

  categoryTabs.innerHTML = html;

  // Add click event listeners to category tabs
  document.querySelectorAll(".category-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const categoryId = this.dataset.categoryId;
      selectCategory(categoryId);
    });
  });
}

// Handle category selection
function selectCategory(categoryId) {
  selectedCategoryId = categoryId;
  selectedSubcategories = []; // Reset subcategory selection

  // Update active class on category tabs
  document.querySelectorAll(".category-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document
    .querySelector(`[data-category-id="${categoryId}"]`)
    .classList.add("active");

  if (categoryId === "all") {
    // Clear subcategories and render all templates
    document.getElementById("subcategory-tabs").classList.remove("active");
    document.getElementById("subcategory-tabs").innerHTML = "";
    renderTemplates(allTemplates);
  } else {
    // Load subcategories for this category
    loadSubcategoriesByCategory(categoryId);
  }
}

// Render subcategory tabs dynamically
function renderSubcategoryTabs(categoryId) {
  const subcategoryTabs = document.getElementById("subcategory-tabs");
  if (!subcategoryTabs) return;

  console.log("Rendering subcategories for category:", categoryId);
  console.log("Available subcategories:", allSubcategories);

  if (!allSubcategories || allSubcategories.length === 0) {
    subcategoryTabs.classList.remove("active");
    subcategoryTabs.innerHTML = "";
    filterByCategory(categoryId);
    return;
  }

  // Find category name for display
  const category = allCategories.find((c) => c._id === categoryId);
  const categoryName = category ? category.name : "Category";

  // Create "All [Category]" button
  let html = `
    <button class="subcategory-tab active" data-subcategory-id="all" data-category-id="${categoryId}">
      All ${categoryName}
    </button>
  `;

  // Add each subcategory as a button
  allSubcategories.forEach((subcat) => {
    html += `
      <button class="subcategory-tab" data-subcategory-id="${subcat._id}" data-category-id="${categoryId}">
        ${subcat.name}
      </button>
    `;
  });

  subcategoryTabs.innerHTML = html;
  subcategoryTabs.classList.add("active");

  // Add click event listeners to subcategory tabs
  document.querySelectorAll(".subcategory-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const subcategoryId = this.dataset.subcategoryId;
      const catId = this.dataset.categoryId;

      // Update active class
      document.querySelectorAll(".subcategory-tab").forEach((t) => {
        t.classList.remove("active");
      });
      this.classList.add("active");

      if (subcategoryId === "all") {
        selectedSubcategories = [];
        filterByCategory(catId);
      } else {
        // Toggle subcategory selection
        if (selectedSubcategories.includes(subcategoryId)) {
          selectedSubcategories = selectedSubcategories.filter(
            (id) => id !== subcategoryId,
          );
        } else {
          selectedSubcategories = [subcategoryId];
        }
        filterBySubcategories(catId, selectedSubcategories);
      }
    });
  });

  // Show templates for this category (all subcategories)
  console.log("Filtering by category:", categoryId);
  console.log("All templates count:", allTemplates.length);
  filterByCategory(categoryId);
}

// Get badge HTML showing all badges
function getBadgesHTML(template) {
  let badgesHtml = "";

  // Add all badges
  if (
    template.badges &&
    Array.isArray(template.badges) &&
    template.badges.length > 0
  ) {
    template.badges.forEach((badge) => {
      const badgeLower = badge.toLowerCase();
      let badgeClass = "";

      if (badgeLower.includes("new")) badgeClass = "new";
      else if (badgeLower.includes("popular")) badgeClass = "popular";
      else if (badgeLower.includes("featured")) badgeClass = "featured";
      else if (badgeLower.includes("premium")) badgeClass = "premium";
      else if (badgeLower.includes("trending")) badgeClass = "trending";

      if (badgeClass) {
        badgesHtml += `<div class="product-badge ${badgeClass}">${badge.toUpperCase()}</div>`;
      }
    });
  }

  // Add FREE badge if template is free
  if (template.isFree && !badgesHtml.includes("free")) {
    badgesHtml += `<div class="product-badge free">FREE</div>`;
  }

  // Fallback badge if no badges and not free
  if (!badgesHtml && !template.isFree) {
    const badgeClass = getBadgeClass(template);
    const badgeText = getBadgeText(template);
    badgesHtml = `<div class="product-badge ${badgeClass}">${badgeText}</div>`;
  }

  return badgesHtml;
}

// Get badge text based on template data (backward compatibility)
function getBadgeText(template) {
  if (template.isFree) return "FREE";
  if (
    template.badges &&
    Array.isArray(template.badges) &&
    template.badges.length > 0
  ) {
    return template.badges[0].toUpperCase();
  }
  if (template.popular) return "POPULAR";
  return "PREMIUM";
}

// Get badge class based on template data (backward compatibility)
function getBadgeClass(template) {
  if (template.isFree) return "free";
  if (
    template.badges &&
    Array.isArray(template.badges) &&
    template.badges.length > 0
  ) {
    const badge = template.badges[0].toLowerCase();
    if (badge.includes("new")) return "new";
    if (badge.includes("popular")) return "popular";
    if (badge.includes("featured")) return "featured";
    if (badge.includes("trending")) return "trending";
  }
  if (template.badge && template.badge.toLowerCase().includes("new"))
    return "new";
  if (template.badge && template.badge.toLowerCase().includes("popular"))
    return "popular";
  return "premium";
}

// Render templates to the grid
function renderTemplates(templates) {
  const grid = document.getElementById("all-templates-grid");
  if (!grid) return;

  if (!templates || templates.length === 0) {
    grid.innerHTML =
      '<div class="text-center" style="grid-column: 1 / -1; padding: 40px; color: var(--text-medium);">No templates found in this category.</div>';
    return;
  }

  grid.innerHTML = templates
    .map((template) => {
      // Price HTML - Fixed spacing for free and discounted cards
      let priceHtml = "";
      if (template.isFree) {
        priceHtml = `
                        <div class="price-container">
                            <div class="price free" style="margin-bottom: 2px;">FREE</div>
                            ${template.price && template.price !== "0" ? `<div class="original-price">₹${template.price}</div>` : ""}
                        </div>
                    `;
      } else if (
        template.discountedPrice &&
        template.discountedPrice !== "" &&
        Number(template.discountedPrice) < Number(template.price)
      ) {
        priceHtml = `
                        <div class="price-container">
                            <div class="price" style="margin-bottom: 2px;">₹${template.discountedPrice}</div>
                            <div class="original-price">₹${template.price}</div>
                        </div>
                    `;
      } else {
        priceHtml = `<div class="price-container"><div class="price" style="margin-bottom: 2px;">₹${template.price}</div></div>`;
      }

      // Badge HTML
      const badgesHtml = getBadgesHTML(template);

      // Check if preview URL exists
      const hasPreview =
        template.livePreviewUrl ||
        (template.previewUrl && template.previewUrl.trim() !== "");

      return `
                    <div class="product-card" data-category="${template.category || ""}">
                        <div class="product-image" style="background-image: url('${
                          template.previewUrl ||
                          "https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1674&q=80"
                        }')">
                            ${badgesHtml}
                            ${
                              hasPreview
                                ? `
                            <div class="product-overlay">
                                <button class="preview-btn" data-preview="${template.livePreviewUrl || template.previewUrl || "#"}" onclick="handlePreviewClick(event, '${template.livePreviewUrl || template.previewUrl || "#"}')">
                                    <i class="fas fa-eye"></i> Live Preview
                                </button>
                            </div>
                            `
                                : ""
                            }
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${template.name}</h3>
                            <p class="product-description">${template.description}</p>
                            <div class="product-footer">
                                ${priceHtml}
                                <div class="product-actions">
                                    <button class="action-btn details-btn" onclick="handleDetailsClick('${template._id}')">
                                        Details
                                    </button>
                                    <button class="action-btn buy-btn ${template.isFree ? "free" : ""}" 
                                        onclick="handleBuyClick('${template._id}', '${template.name.replace(/'/g, "\\'")}', '${template.price}', ${template.isFree})">
                                        ${template.isFree ? "Download" : "Get Now"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
    })
    .join("");
}

// Handle preview button clicks
function handlePreviewClick(event, previewUrl) {
  event.stopPropagation();
  event.preventDefault();

  if (previewUrl && previewUrl !== "#") {
    window.open(previewUrl, "_blank");
  }
}

// Handle details button click
function handleDetailsClick(templateId) {
  window.location.href = `detail.html?id=${templateId}`;
}

// Handle buy button click
function handleBuyClick(templateId, templateName, templatePrice, isFree) {
  if (isFree || templatePrice == 0) {
    window.location.href = `payment.html?id=${templateId}&name=${encodeURIComponent(templateName)}&price=0&free=true`;
  } else {
    window.location.href = `payment.html?id=${templateId}&name=${encodeURIComponent(templateName)}&price=${templatePrice}`;
  }
}

// Filter templates by category (new dynamic system)
function filterByCategory(categoryId) {
  console.log("filterByCategory called with:", categoryId);
  console.log("Total templates available:", allTemplates.length);

  if (categoryId === "all") {
    console.log("Showing all templates");
    renderTemplates(allTemplates);
    return;
  }

  const filtered = allTemplates.filter((template) => {
    // Handle both ObjectId and string category references
    const matches =
      template.category === categoryId || template.category?._id === categoryId;
    if (matches) {
      console.log(`Template "${template.name}" matches category ${categoryId}`);
    }
    return matches;
  });

  console.log(
    `Filtered templates for category ${categoryId}:`,
    filtered.length,
  );
  renderTemplates(filtered);
}

// Filter templates by subcategories (new dynamic system)
function filterBySubcategories(categoryId, subcategoryIds) {
  console.log(
    "filterBySubcategories called with categoryId:",
    categoryId,
    "subcategoryIds:",
    subcategoryIds,
  );

  if (!subcategoryIds || subcategoryIds.length === 0) {
    filterByCategory(categoryId);
    return;
  }

  const filtered = allTemplates.filter((template) => {
    // Normalize comparison - handle both direct values and nested _id
    const categoryMatch =
      String(template.category) === String(categoryId) ||
      (template.category?._id &&
        String(template.category._id) === String(categoryId));

    const subcategoryMatch = subcategoryIds.some((subId) => {
      const templateSubcat = template.subCategory;
      const match =
        String(templateSubcat) === String(subId) ||
        (templateSubcat?._id && String(templateSubcat._id) === String(subId));
      return match;
    });

    if (!subcategoryMatch && categoryMatch) {
      console.log(
        `Template "${template.name}" matched category but NOT subcategory.`,
        {
          templateSubCategory: template.subCategory,
          lookingForIds: subcategoryIds,
          templateSubcategoryString: String(template.subCategory),
        },
      );
    }

    return categoryMatch && subcategoryMatch;
  });

  console.log(`Filtered ${filtered.length} templates for subcategories`);
  renderTemplates(filtered);
}

// Show subcategories for a parent category
function showSubcategories(parentCategory) {
  const subcategoryTabs = document.getElementById("subcategory-tabs");

  if (parentCategory === "all") {
    subcategoryTabs.classList.remove("active");
    subcategoryTabs.innerHTML = "";
    return;
  }

  const categoryData = parentCategories[parentCategory];
  if (!categoryData) {
    subcategoryTabs.classList.remove("active");
    subcategoryTabs.innerHTML = "";
    return;
  }

  // Create "All [Category]" button
  const allButton = `<button class="subcategory-tab active" data-parent="${parentCategory}" data-subcategory="all">All ${categoryData.name}</button>`;

  // Create subcategory buttons
  const subcategoryButtons = categoryData.subcategories
    .map(
      (subcat) =>
        `<button class="subcategory-tab" data-parent="${parentCategory}" data-subcategory="${subcat}">${subcat.charAt(0).toUpperCase() + subcat.slice(1)}</button>`,
    )
    .join("");

  subcategoryTabs.innerHTML = allButton + subcategoryButtons;
  subcategoryTabs.classList.add("active");

  // Add click event listeners to subcategory tabs
  document.querySelectorAll(".subcategory-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remove active class from all subcategory tabs
      document.querySelectorAll(".subcategory-tab").forEach((t) => {
        t.classList.remove("active");
      });

      // Add active class to clicked tab
      this.classList.add("active");

      const parentCat = this.dataset.parent;
      const subcat = this.dataset.subcategory;

      filterTemplatesBySubcategory(parentCat, subcat);
    });
  });
}

// Filter templates by parent category and subcategory
function filterTemplatesByParentAndSubcategory(
  parentCategory,
  subcategory = "all",
) {
  if (parentCategory === "all") {
    renderTemplates(allTemplates);
    return;
  }

  const filtered = allTemplates.filter((template) => {
    const templateCategory = (template.category || "").toLowerCase();

    // Check if template belongs to the parent category
    for (const parent in parentCategories) {
      if (parent === parentCategory) {
        if (subcategory === "all") {
          // Return all templates in this parent category
          return parentCategories[parent].subcategories.some(
            (cat) => cat.toLowerCase() === templateCategory,
          );
        } else {
          // Return only templates in the specific subcategory
          return subcategory.toLowerCase() === templateCategory;
        }
      }
    }
    return false;
  });
  renderTemplates(filtered);
}

// Alias function for backward compatibility
function filterTemplatesByParent(parentCategory) {
  filterTemplatesByParentAndSubcategory(parentCategory, "all");
}

// New function to filter by subcategory
function filterTemplatesBySubcategory(parentCategory, subcategory) {
  filterTemplatesByParentAndSubcategory(parentCategory, subcategory);
}

// Fetch templates from backend
async function fetchAndRenderTemplates() {
  console.log("fetchAndRenderTemplates started");
  const grid = document.getElementById("all-templates-grid");
  grid.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading templates...</p>
            </div>
        `;

  const CACHE_KEY = "templify_templates_cache";
  const CACHE_TIME_KEY = "templify_templates_cache_time";
  const CACHE_DURATION = 30 * 1000; // 30 seconds instead of 5 minutes - shorter to catch updates

  // Try to use cache first
  let useCache = false;
  let cachedTemplates = null;
  try {
    const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
    if (cacheTime && Date.now() - Number(cacheTime) < CACHE_DURATION) {
      const cacheData = localStorage.getItem(CACHE_KEY);
      if (cacheData) {
        cachedTemplates = JSON.parse(cacheData);
        useCache = true;
      }
    }
  } catch (e) {
    // Ignore cache errors
  }

  if (useCache && Array.isArray(cachedTemplates)) {
    console.log("Using cached templates, count:", cachedTemplates.length);
    allTemplates = cachedTemplates.filter(
      (t) => (t.status || "").toLowerCase() === "active",
    );
    console.log("After filtering by active status:", allTemplates.length);
    console.log(
      "allCategories state before loadAllSubcategories:",
      allCategories.length,
    );
    // Load all subcategories before normalizing
    await loadAllSubcategories();
    console.log(
      "After loadAllSubcategories. allCategories state:",
      allCategories.length,
    );
    normalizeTemplateCategories();
    console.log(
      "After normalization, templates to render:",
      allTemplates.length,
    );
    renderTemplates(allTemplates);
    // Also fetch in background to update cache
    fetch(`${API_BASE_URL}/templates`)
      .then((res) => res.json())
      .then((templates) => {
        console.log("Background fetch got templates:", templates.length);
        localStorage.setItem(CACHE_KEY, JSON.stringify(templates));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      })
      .catch(() => {});
    return;
  }

  // No valid cache, fetch from API
  try {
    console.log("No valid cache, fetching from API");
    const res = await fetch(`${API_BASE_URL}/templates`);
    console.log("API response status:", res.status);
    let templates = await res.json();
    console.log("API returned templates, count:", templates.length);
    // Only show templates with status 'active'
    allTemplates = templates.filter(
      (t) => (t.status || "").toLowerCase() === "active",
    );
    console.log("After filtering by active status:", allTemplates.length);
    console.log(
      "allCategories state before loadAllSubcategories:",
      allCategories.length,
    );
    // Load all subcategories before normalizing
    await loadAllSubcategories();
    console.log(
      "After loadAllSubcategories. allCategories state:",
      allCategories.length,
    );
    normalizeTemplateCategories();
    console.log(
      "After normalization, templates to render:",
      allTemplates.length,
    );
    renderTemplates(allTemplates);
    // Save to cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(templates));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {}
  } catch (err) {
    grid.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 40px; color: #ef4444;">
                    Failed to load templates. Please try again later.
                </div>
            `;
    console.error("Error loading templates:", err);
  }
}

// Initialize category system
async function initCategorySystem() {
  console.log("initCategorySystem started");
  // Load categories dynamically when page loads
  await loadCategories();
  console.log("Categories loaded, allCategories count:", allCategories.length);
  // After categories are loaded, fetch templates
  await fetchAndRenderTemplates();
  console.log("Templates fetched and rendered");
}

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded event fired");
  initCategorySystem();
});
