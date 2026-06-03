document.addEventListener("DOMContentLoaded", async function () {
  const API_BASE_URL = "https://templify-zhhw.onrender.com";

  // SCALABLE TEMPLATE SECTION SYSTEM
  class TemplateSectionManager {
    constructor() {
      this.sections = [];
      this.allTemplates = [];
      this.cacheKey = "templify_templates_cache";
      this.cacheTimeKey = "templify_templates_cache_time";
      this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async initialize() {
      await this.loadTemplates();
      this.setupSections();
      this.setupSearch();
      this.setupEventListeners();
    }

    async loadTemplates() {
      // Try to use cache first
      let useCache = false;
      let cachedTemplates = null;

      try {
        const cacheTime = localStorage.getItem(this.cacheTimeKey);
        if (cacheTime && Date.now() - Number(cacheTime) < this.cacheDuration) {
          const cacheData = localStorage.getItem(this.cacheKey);
          if (cacheData) {
            cachedTemplates = JSON.parse(cacheData);
            useCache = true;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }

      if (useCache && Array.isArray(cachedTemplates)) {
        this.allTemplates = cachedTemplates.filter(
          (t) => (t.status || "").toLowerCase() === "active",
        );
        // Fetch fresh data in background
        this.fetchFreshTemplates();
        return;
      }

      // Fetch from API
      await this.fetchFreshTemplates();
    }

    async fetchFreshTemplates() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/templates`);
        const templates = await res.json();
        this.allTemplates = templates.filter(
          (t) => (t.status || "").toLowerCase() === "active",
        );
        // Cache the data
        try {
          localStorage.setItem(this.cacheKey, JSON.stringify(templates));
          localStorage.setItem(this.cacheTimeKey, Date.now().toString());
        } catch (e) {}
      } catch (err) {
        console.error("Error loading templates:", err);
        // Show error in all sections
        this.showErrorInAllSections();
      }
    }

    showErrorInAllSections() {
      const sections = [
        "premiumTemplatesGrid",
        "trendingNowGrid",
        "bestSellersGrid",
        "newArrivalsGrid",
        "editorPicksGrid",
      ];
      sections.forEach((sectionId) => {
        const grid = document.getElementById(sectionId);
        if (grid) {
          grid.innerHTML = `
                      <div class="text-center" style="grid-column: 1 / -1; padding: 40px; color: var(--accent);">
                        Failed to load templates. Please try again later.
                      </div>
                    `;
        }
      });
    }

    setupSections() {
      // Define sections with their configurations - now using playlists
      this.sections = [
        {
          id: "premiumTemplatesGrid",
          name: "Premium Templates",
          playlistName: "premium_products",
          emptyMessage: "No premium templates available at the moment.",
        },
        {
          id: "trendingNowGrid",
          name: "Trending Now",
          playlistName: "trending_now",
          emptyMessage: "No trending templates available at the moment.",
        },
        {
          id: "bestSellersGrid",
          name: "Best Sellers",
          playlistName: "best_sellers",
          emptyMessage: "No best sellers available at the moment.",
        },
        {
          id: "newArrivalsGrid",
          name: "New Arrivals",
          filter: (templates) => {
            // Sort by creation date (newest first)
            const sorted = [...templates].sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
              const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
              return dateB - dateA;
            });
            return sorted.slice(0, 6);
          },
          emptyMessage: "No new arrivals available at the moment.",
        },
        {
          id: "editorPicksGrid",
          name: "Editor's Picks",
          playlistName: "editor_picks",
          emptyMessage: "No editor picks available at the moment.",
        },
      ];

      // Render each section
      this.sections.forEach((section) => {
        this.renderSection(section);
      });
    }

    async renderSection(section) {
      const grid = document.getElementById(section.id);
      if (!grid) return;

      // Find the parent section element
      const sectionElement = grid.closest("section");

      // Show loading
      grid.innerHTML = `
                  <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading ${section.name.toLowerCase()}...</p>
                  </div>
                `;

      let filteredTemplates = [];

      // If section has a playlist name, fetch from playlist API
      if (section.playlistName) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/templates/playlist/${section.playlistName}`,
          );
          filteredTemplates = await res.json();
        } catch (err) {
          console.error(`Error loading playlist ${section.playlistName}:`, err);
        }
      } else if (section.filter) {
        // Otherwise use the filter function
        filteredTemplates = section.filter(this.allTemplates);
      }

      if (!filteredTemplates || filteredTemplates.length === 0) {
        // Hide the entire section if no templates
        if (sectionElement) {
          sectionElement.style.display = "none";
        }
        return;
      }

      // Show section if it has templates
      if (sectionElement) {
        sectionElement.style.display = "block";
      }

      // Render templates
      grid.innerHTML = filteredTemplates
        .map((template) => this.createTemplateCard(template))
        .join("");
    }

    createTemplateCard(template) {
      // Determine template type
      const templateType = template.type || "HTML Website";
      const typeName = this.getTemplateTypeName(templateType);

      // Check for discount
      const hasDiscount =
        template.discountedPrice &&
        template.discountedPrice !== "" &&
        Number(template.discountedPrice) < Number(template.price);

      const displayPrice = template.isFree
        ? 0
        : hasDiscount
          ? template.discountedPrice
          : template.price;
      const originalPrice = template.price;

      // Price HTML
      let priceHtml = "";
      if (template.isFree) {
        priceHtml = `
                    <span class="original-price">₹${originalPrice || "999"}</span> 
                    <span class="template-price free-price">FREE</span>
                  `;
      } else if (hasDiscount) {
        priceHtml = `
                    <span class="template-price discounted-price">₹${displayPrice}</span>
                    <span class="original-price">₹${originalPrice}</span>
                  `;
      } else {
        priceHtml = `<span class="template-price">₹${displayPrice}</span>`;
      }

      return `
                  <div class="template-card">
                    <div class="template-image" style="background-image: url('${
                      template.previewUrl ||
                      "https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1674&q=80"
                    }')">
                      <!-- Template Type Tag - Left top -->
                      <div class="template-type-tag">
                        ${typeName}
                      </div>
                      
                      <div class="template-overlay">
                        <button class="preview-btn" data-preview="${
                          template.livePreviewUrl || template.previewUrl || "#"
                        }">
                          <i class="fas fa-eye"></i> Live Preview
                        </button>
                      </div>
                    </div>
                    <div class="template-info">
                      <h3>${template.name}</h3>
                      <p>${template.description}</p>
                      <div class="template-features">
                        <ul>
                          ${
                            template.features &&
                            Array.isArray(template.features) &&
                            template.features.length > 0
                              ? template.features
                                  .slice(0, 3)
                                  .map((feature) => `<li>${feature}</li>`)
                                  .join("")
                              : `<li>Responsive Design</li><li>Easy Customization</li><li>Clean Code</li>`
                          }
                        </ul>
                      </div>
                      <div class="template-footer">
                        <div class="price-container">
                          ${priceHtml}
                        </div>
                        <div class="template-actions">
                          <!-- Details Button -->
                          <button class="details-button" data-id="${template._id}">
                            <i class="fas fa-info-circle"></i> Details
                          </button>
                          <button class="buy-button ${template.isFree ? "free-button" : ""}" 
                            data-id="${template._id}"
                            data-price="${displayPrice}"
                            data-name="${template.name}">
                            <i class="fas ${template.isFree ? "fa-download" : "fa-shopping-cart"}"></i> 
                            ${template.isFree ? "Download" : "Get Template"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
    }

    getTemplateTypeName(type) {
      const lowerType = type ? type.toLowerCase() : "html";

      if (lowerType.includes("google")) return "GOOGLE SHEETS";
      if (lowerType.includes("notion")) return "NOTION";
      if (lowerType.includes("html") || lowerType.includes("website"))
        return "HTML WEBSITE";
      if (lowerType.includes("saas")) return "SaaS PRODUCT";

      return "HTML WEBSITE";
    }

    setupSearch() {
      const searchInput = document.getElementById("searchInput");
      const searchButton = document.getElementById("searchButton");

      const handleSearch = () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
          localStorage.setItem("searchQuery", searchTerm);
          window.location.href = "template.html";
        }
      };

      if (searchButton && searchInput) {
        searchButton.addEventListener("click", handleSearch);
        searchInput.addEventListener("keypress", function (e) {
          if (e.key === "Enter") {
            handleSearch();
          }
        });
      }
    }

    setupEventListeners() {
      // Handle button clicks using event delegation
      document.addEventListener("click", (e) => {
        const buyButton = e.target.closest(".buy-button");
        const detailsButton = e.target.closest(".details-button");
        const previewButton = e.target.closest(".preview-btn");

        if (buyButton) {
          const templateId = buyButton.getAttribute("data-id");
          const templatePrice = buyButton.getAttribute("data-price");
          const templateName = buyButton.getAttribute("data-name");

          // Check if template is free
          const card = buyButton.closest(".template-card");
          const isFree = card && card.querySelector(".free-price") !== null;

          if (isFree || templatePrice == 0 || templatePrice === "0") {
            window.location.href = `payment.html?id=${templateId}&price=0&free=true&name=${encodeURIComponent(templateName)}`;
          } else {
            window.location.href = `payment.html?id=${templateId}&price=${templatePrice}&name=${encodeURIComponent(
              templateName,
            )}`;
          }
        }

        if (detailsButton) {
          const templateId = detailsButton.getAttribute("data-id");
          window.location.href = `detail.html?id=${templateId}`;
        }

        if (previewButton) {
          e.preventDefault();
          const url = previewButton.dataset.preview;
          if (url && url !== "#") window.open(url, "_blank");
        }
      });

      // Smooth scrolling for anchor links
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
          e.preventDefault();
          const targetId = this.getAttribute("href");
          if (targetId === "#") return;
          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            window.scrollTo({
              top: targetElement.offsetTop - 80,
              behavior: "smooth",
            });
          }
        });
      });
    }
  }

  // Initialize the template section manager
  const templateManager = new TemplateSectionManager();
  await templateManager.initialize();
});
