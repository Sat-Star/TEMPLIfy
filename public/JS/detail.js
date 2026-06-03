const API_BASE_URL = "https://templify-zhhw.onrender.com";

// Helper function to convert category ObjectId to name
let categoriesCache = [];

async function loadCategoriesForName() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories`);
    if (res.ok) {
      categoriesCache = await res.json();
    }
  } catch (err) {
    console.error("Error loading categories:", err);
  }
}

function getCategoryName(categoryId) {
  if (!categoryId) return null;
  // If it's already a name (string that's not an ObjectId), return it
  if (typeof categoryId === "string" && !categoryId.match(/^[0-9a-f]{24}$/i)) {
    return categoryId;
  }
  // Look up by ObjectId
  const category = categoriesCache.find((cat) => cat._id === categoryId);
  return category ? category.name : null;
}

document.addEventListener("DOMContentLoaded", async function () {
  // Load categories first for name conversion
  await loadCategoriesForName();
  const container = document.getElementById("template-detail-container");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    container.innerHTML =
      '<div class="error-message">No template selected. Please go back and select a template.</div>';
    return;
  }

  container.innerHTML = `
          <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading template details...</p>
          </div>
        `;

  try {
    const res = await fetch(`${API_BASE_URL}/api/templates/${id}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const template = await res.json();
    console.log("Template data received:", template);
    renderTemplateDetail(template);
  } catch (err) {
    console.error("Error loading template:", err);
    container.innerHTML = `
            <div class="error-message">
              <h3>Failed to load template details</h3>
              <p>Please check your internet connection and try again.</p>
              <button onclick="window.history.back()" style="margin-top: 15px; padding: 10px 20px; background: var(--accent); color: white; border: none; border-radius: 5px; cursor: pointer;">Go Back</button>
            </div>
          `;
  }
});

function renderTemplateDetail(template) {
  const container = document.getElementById("template-detail-container");

  // Check if template data exists
  if (!template || typeof template !== "object") {
    container.innerHTML = `
            <div class="error-message">
              <h3>Invalid Template Data</h3>
              <p>The template data could not be loaded correctly.</p>
            </div>
          `;
    return;
  }

  // Safely process data with defaults
  const features = Array.isArray(template.features)
    ? template.features
    : template.features
      ? String(template.features)
          .split("\n")
          .filter((f) => f.trim())
      : [];

  const tags = Array.isArray(template.tags)
    ? template.tags
    : template.tags
      ? String(template.tags)
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : [];

  const requirements = Array.isArray(template.requirements)
    ? template.requirements
    : template.requirements
      ? String(template.requirements)
          .split("\n")
          .filter((r) => r.trim())
      : [];

  const browsers = Array.isArray(template.compatibleBrowsers)
    ? template.compatibleBrowsers
    : template.compatibleBrowsers
      ? String(template.compatibleBrowsers)
          .split(",")
          .map((b) => b.trim())
          .filter((b) => b)
      : [];

  const playlists = Array.isArray(template.playlists)
    ? template.playlists
    : template.playlists
      ? String(template.playlists)
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p)
      : [];

  const badges = Array.isArray(template.badges)
    ? template.badges
    : template.badges
      ? String(template.badges)
          .split(",")
          .map((b) => b.trim())
          .filter((b) => b)
      : [];

  // Safely parse prices
  const price = template.price ? parseFloat(template.price) : 0;
  const discountedPrice = template.discountedPrice
    ? parseFloat(template.discountedPrice)
    : null;
  const isFree =
    template.isFree === true || template.isFree === "true" || price === 0;

  // Price display
  let priceHtml = "";
  let priceLabel = "";
  if (isFree) {
    priceHtml = '<div class="free-badge">FREE</div>';
    priceLabel = "Free download";
  } else if (discountedPrice && discountedPrice < price) {
    const savings = price - discountedPrice;
    priceHtml = `
            <div>
              <span class="price-original">₹${price}</span>
              <span class="price-amount">₹${discountedPrice}</span>
            </div>
            <div class="price-save">Save ₹${savings}</div>
          `;
    priceLabel = "One-time payment";
  } else {
    priceHtml = `<div class="price-amount">₹${price}</div>`;
    priceLabel = "One-time payment";
  }

  // Format date
  let lastUpdated = "Not specified";
  try {
    if (template.lastUpdated) {
      const date = new Date(template.lastUpdated);
      if (!isNaN(date.getTime())) {
        lastUpdated = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
  } catch (e) {
    console.error("Error parsing date:", e);
  }

  // Rating stars
  const rating = template.rating ? parseFloat(template.rating) : 4.5;
  const reviews = template.reviews ? parseInt(template.reviews) : 0;
  const starsHtml = `
          <span style="color: #f59e0b; font-size: 14px;">
            ${"★".repeat(Math.floor(rating))}${rating % 1 >= 0.5 ? "½" : ""}
          </span>
          <span style="color: var(--secondary); font-size: 12px; margin-left: 4px;">
            ${rating.toFixed(1)} (${reviews} reviews)
          </span>
        `;

  // Get template type
  const templateType = template.category || "Template";
  const typeIcons = {
    Sheet: "fas fa-file-excel",
    Notion: "fas fa-sticky-note",
    Resume: "fas fa-file-alt",
    Website: "fas fa-globe",
    Dashboard: "fas fa-chart-bar",
    Portfolio: "fas fa-briefcase",
    Blog: "fas fa-blog",
    HTML: "fas fa-code",
    CSS: "fab fa-css3",
    JavaScript: "fab fa-js",
  };

  const typeIcon = typeIcons[templateType] || "fas fa-file";

  // Badges HTML
  const badgesHtml = badges
    .map((badge) => {
      const badgeClass = `badge badge-${badge.toLowerCase()}`;
      return `<span class="${badgeClass}">${badge}</span>`;
    })
    .join("");

  // Ensure we have safe values for all fields
  const safeTemplate = {
    name: template.name || "Unnamed Template",
    description: template.description || "No description available.",
    usageInstructions:
      template.instructions || "No usage instructions provided.",
    category: getCategoryName(template.category) || "General",
    framework: template.framework || "Not specified",
    layout: template.layout || "Responsive",
    status: template.status || "Published",
    filesIncluded: template.filesIncluded || "Not specified",
    supportDuration: template.supportDuration || "Not specified",
    livePreviewUrl: template.livePreviewUrl || "",
    _id: template._id || template.id || "N/A",
  };

  // Render the template
  container.innerHTML = `
          <!-- Header -->
          <div class="detail-header">
            <div class="header-top">
              <div class="template-title-container">
                <div class="template-type">
                  <i class="${typeIcon}"></i>
                  ${safeTemplate.category} Template
                </div>
                <h1 class="template-title">${safeTemplate.name}</h1>
                <div class="template-subtitle">Template By - TEMPLIfy</div>
                
                ${
                  badgesHtml
                    ? `
                  <div class="template-badges">
                    ${badgesHtml}
                  </div>
                `
                    : ""
                }
              </div>
              
              <div class="close-btn" onclick="window.history.back()">
                <i class="fas fa-times"></i>
              </div>
            </div>
            
            <div class="template-meta">
              <div class="meta-item">
                <i class="fas fa-star"></i>
                <span>${starsHtml}</span>
              </div>
              
              <div class="meta-item">
                <i class="fas fa-tag"></i>
                <span>${safeTemplate.category}</span>
              </div>
              
              <div class="meta-item">
                <i class="fas fa-calendar-alt"></i>
                <span>${lastUpdated}</span>
              </div>
              
              <div class="meta-item">
                <i class="fas fa-code"></i>
                <span>${safeTemplate.framework}</span>
              </div>
              
              <div class="meta-item">
                <i class="fas fa-layer-group"></i>
                <span>${safeTemplate.status}</span>
              </div>
            </div>
            
            ${
              tags.length > 0
                ? `
              <div class="template-tags">
                ${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
              </div>
            `
                : ""
            }
          </div>

          <!-- Main Content -->
          <div class="main-content">
            <!-- Left Column: Template Details -->
            <div class="detail-column">
              <!-- Hero Image -->
              <div class="hero-image">
                <img src="${template.previewUrl || "https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"}" 
                     alt="${safeTemplate.name}"
                     onerror="this.src='https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'">
              </div>

              <!-- Usage Instructions Section (Renamed from Description) -->
              <div class="content-card">
                <h3 class="card-title">
                  <i class="fas fa-book"></i>
                  Usage Instructions
                </h3>
                <div class="usage-text">
                  ${safeTemplate.usageInstructions}
                </div>
                
                <!-- Description Subsection -->
                ${
                  safeTemplate.description
                    ? `
                  <div class="description-section">
                    <h4 class="description-title">
                      <i class="fas fa-info-circle"></i>
                      Description
                    </h4>
                    <div class="description-text">
                      ${safeTemplate.description}
                    </div>
                  </div>
                `
                    : ""
                }
              </div>

              <!-- Key Features Section -->
              ${
                features.length > 0
                  ? `
                <div class="content-card">
                  <h3 class="card-title">
                    <i class="fas fa-star"></i>
                    Key Features
                  </h3>
                  <div class="features-grid">
                    ${features
                      .map(
                        (feature) => `
                      <div class="feature-item">
                        <i class="fas fa-check feature-check"></i>
                        <span>${feature}</span>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              `
                  : ""
              }

              <!-- Detailed Information Section -->
              <div class="content-card">
                <h3 class="card-title">
                  <i class="fas fa-list-alt"></i>
                  Detailed Information
                </h3>
                <div class="details-grid">
                  ${
                    safeTemplate.filesIncluded
                      ? `
                    <div class="detail-item">
                      <div class="detail-label">Files Included</div>
                      <div class="detail-value">${safeTemplate.filesIncluded}</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    safeTemplate.supportDuration
                      ? `
                    <div class="detail-item">
                      <div class="detail-label">Support Duration</div>
                      <div class="detail-value">${safeTemplate.supportDuration}</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    safeTemplate.framework
                      ? `
                    <div class="detail-item">
                      <div class="detail-label">Framework</div>
                      <div class="detail-value">${safeTemplate.framework}</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    safeTemplate.layout
                      ? `
                    <div class="detail-item">
                      <div class="detail-label">Layout</div>
                      <div class="detail-value">${safeTemplate.layout}</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    browsers.length > 0
                      ? `
                    <div class="detail-item">
                      <div class="detail-label">Compatible Browsers</div>
                      <div class="detail-value">${browsers.join(", ")}</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    requirements.length > 0
                      ? `
                    <div class="detail-item">
                      <div class="detail-label">Requirements</div>
                      <div class="detail-value">${requirements.join(", ")}</div>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>

              <!-- Requirements Section -->
              ${
                requirements.length > 0
                  ? `
                <div class="content-card">
                  <h3 class="card-title">
                    <i class="fas fa-server"></i>
                    System Requirements
                  </h3>
                  <div class="requirements-list">
                    ${requirements.map((req) => `<span class="requirement-tag">${req}</span>`).join("")}
                  </div>
                </div>
              `
                  : ""
              }

              <!-- Compatible Browsers Section -->
              ${
                browsers.length > 0
                  ? `
                <div class="content-card">
                  <h3 class="card-title">
                    <i class="fas fa-globe"></i>
                    Compatible Browsers
                  </h3>
                  <div class="browsers-list">
                    ${browsers.map((browser) => `<span class="browser-tag">${browser}</span>`).join("")}
                  </div>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Right Column: Purchase Card -->
            <div class="purchase-column">
              <div class="purchase-card">
                <div class="price-display">
                  ${priceHtml}
                  <p style="color: var(--secondary); margin-top: 8px; font-size: 13px;">${priceLabel}</p>
                </div>

                <div class="action-buttons">
                  ${
                    safeTemplate.livePreviewUrl
                      ? `
                    <a href="${safeTemplate.livePreviewUrl}" class="btn btn-preview" target="_blank" rel="noopener noreferrer">
                      <i class="fas fa-eye"></i>
                      Live Preview
                    </a>
                  `
                      : ""
                  }
                  
                  ${
                    isFree
                      ? `
                    <a href="payment.html?id=${safeTemplate._id}&name=${encodeURIComponent(safeTemplate.name)}&price=0&free=true" class="btn btn-download">
                      <i class="fas fa-download"></i>
                      Download Now
                    </a>
                  `
                      : `
                    <a href="payment.html?id=${safeTemplate._id}&name=${encodeURIComponent(safeTemplate.name)}&price=${discountedPrice && discountedPrice < price ? discountedPrice : price}&originalPrice=${price}" class="btn btn-purchase">
                      <i class="fas fa-shopping-cart"></i>
                      Purchase Now
                    </a>
                  `
                  }
                </div>

                <!-- Quick Information -->
                <ul class="info-list">
                  <li>
                    <span class="info-label">Template Type</span>
                    <span class="info-value">${safeTemplate.category} Template</span>
                  </li>
                  <li>
                    <span class="info-label">Category</span>
                    <span class="info-value">${safeTemplate.category}</span>
                  </li>
                  <li>
                    <span class="info-label">Layout</span>
                    <span class="info-value">${safeTemplate.layout}</span>
                  </li>
                  <li>
                    <span class="info-label">Framework</span>
                    <span class="info-value">${safeTemplate.framework}</span>
                  </li>
                  <li>
                    <span class="info-label">Files Included</span>
                    <span class="info-value">${safeTemplate.filesIncluded}</span>
                  </li>
                  <li>
                    <span class="info-label">Support</span>
                    <span class="info-value">${safeTemplate.supportDuration}</span>
                  </li>
                  <li>
                    <span class="info-label">Last Updated</span>
                    <span class="info-value">${lastUpdated}</span>
                  </li>
                  <li>
                    <span class="info-label">Status</span>
                    <span class="info-value">${safeTemplate.status}</span>
                  </li>
                </ul>

                <!-- Playlists -->
                ${
                  playlists.length > 0
                    ? `
                  <div class="playlist-container">
                    <div style="font-size: 14px; color: var(--primary); margin-bottom: 8px; font-weight: 500;">
                      <i class="fas fa-list" style="margin-right: 8px; font-size: 12px;"></i>
                      Included in Playlists
                    </div>
                    <div class="playlist-tags">
                      ${playlists.map((playlist) => `<span class="playlist-tag">${playlist}</span>`).join("")}
                  </div>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="page-footer">
            <p>© 2026 TEMPLIfy. All rights reserved.</p>
            <p style="font-size: 12px; margin-top: 4px; color: #9ca3af;">
              Template ID: ${safeTemplate._id}
            </p>
          </div>
        `;

  // Update page title
  document.title = `${safeTemplate.name} | TEMPLIfy`;
}
