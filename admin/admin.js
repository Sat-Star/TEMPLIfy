// ========== DARK/LIGHT TOGGLE ==========
(function () {
  const html = document.documentElement;
  const saved = localStorage.getItem("templify-admin-theme");
  if (saved === "light") html.setAttribute("data-theme", "light");
  else if (saved === "dark") html.setAttribute("data-theme", "dark");
  else if (window.matchMedia("(prefers-color-scheme: light)").matches)
    html.setAttribute("data-theme", "light");
  const toggleBtn = document.createElement("button");
  toggleBtn.innerHTML = "🌓";
  toggleBtn.className = "btn btn-sm btn-outline-secondary ms-2";
  toggleBtn.style.position = "fixed";
  toggleBtn.style.bottom = "20px";
  toggleBtn.style.right = "20px";
  toggleBtn.style.zIndex = "999";
  toggleBtn.style.borderRadius = "50%";
  toggleBtn.style.width = "44px";
  toggleBtn.style.height = "44px";
  toggleBtn.style.background = "var(--surface)";
  document.body.appendChild(toggleBtn);
  toggleBtn.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
    html.setAttribute("data-theme", next);
    localStorage.setItem("templify-admin-theme", next);
  });
})();

// ========== API & GLOBALS ==========
const API_BASE_URL = "https://templify-zhhw.onrender.com/api";
let categories = [],
  subcategories = [],
  selectedCategoryId = null,
  editSelectedCategoryId = null;

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function getCategoryNameById(id) {
  const cat = categories.find((c) => c._id === id);
  return cat ? cat.name : null;
}
function getSubCategoryNameById(id) {
  const sub = subcategories.find((s) => s._id === id);
  return sub ? sub.name : null;
}
function showToast(msg, type = "success") {
  const toast = document.getElementById("templifyToast");
  toast.textContent = msg;
  toast.className = `templify-toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ========== CATEGORY LOAD & DROPDOWNS ==========
async function loadCategories() {
  categories = await apiRequest("/categories");
  renderCategoryDropdown();
  renderEditCategoryDropdown();
}
async function loadSubCategories() {
  subcategories = await apiRequest("/subcategories");
  renderSubCategoryDropdown();
}
async function loadSubCategoriesByCategory(categoryId) {
  subcategories = await apiRequest(`/subcategories/by-category/${categoryId}`);
  renderSubCategoryDropdown();
}
async function loadEditSubCategoriesByCategory(categoryId) {
  subcategories = await apiRequest(`/subcategories/by-category/${categoryId}`);
  renderEditSubCategoryDropdown("");
}

function renderCategoryDropdown() {
  const list = document.getElementById("categoryDropdownList");
  if (!list) return;
  list.innerHTML =
    categories
      .map(
        (cat) =>
          `<div class="dropdown-item-wrapper" data-value="${cat.name}" data-id="${cat._id}"><div class="dropdown-item-text">${cat.name}</div><button class="dropdown-delete-btn">Delete</button></div>`,
      )
      .join("") +
    `<div class="dropdown-add-item"><input type="text" id="newCategoryInput" class="dropdown-add-input" placeholder="Add new category"><button id="addCategoryBtn" class="dropdown-add-btn">Add</button></div>`;
}
function renderSubCategoryDropdown() {
  const list = document.getElementById("subcategoryDropdownList");
  if (!list) return;
  list.innerHTML =
    subcategories
      .map(
        (sub) =>
          `<div class="dropdown-item-wrapper" data-value="${sub.name}" data-id="${sub._id}"><div class="dropdown-item-text">${sub.name}</div><button class="dropdown-delete-btn">Delete</button></div>`,
      )
      .join("") +
    `<div class="dropdown-add-item"><input type="text" id="newSubCategoryInput" class="dropdown-add-input" placeholder="Add new subcategory"><button id="addSubCategoryBtn" class="dropdown-add-btn">Add</button></div>`;
}
function renderEditCategoryDropdown() {
  const list = document.getElementById("editCategoryDropdownList");
  if (!list) return;
  list.innerHTML =
    categories
      .map(
        (cat) =>
          `<div class="dropdown-item-wrapper" data-value="${cat.name}" data-id="${cat._id}"><div class="dropdown-item-text">${cat.name}</div><button class="dropdown-delete-btn">Delete</button></div>`,
      )
      .join("") +
    `<div class="dropdown-add-item"><input type="text" id="editNewCategoryInput" class="dropdown-add-input" placeholder="Add new category"><button id="editAddCategoryBtn" class="dropdown-add-btn">Add</button></div>`;
}
function renderEditSubCategoryDropdown(selected) {
  const list = document.getElementById("editSubcategoryDropdownList");
  if (!list) return;
  list.innerHTML =
    subcategories
      .map(
        (sub) =>
          `<div class="dropdown-item-wrapper" data-value="${sub.name}" data-id="${sub._id}"><div class="dropdown-item-text">${sub.name}</div><button class="dropdown-delete-btn">Delete</button></div>`,
      )
      .join("") +
    `<div class="dropdown-add-item"><input type="text" id="editNewSubCategoryInput" class="dropdown-add-input" placeholder="Add new subcategory"><button id="editAddSubCategoryBtn" class="dropdown-add-btn">Add</button></div>`;
}

// Dropdown event handlers (preserved)
document.addEventListener("click", (e) => {
  if (e.target.closest(".dropdown-delete-btn")) {
    const id = e.target
      .closest(".dropdown-item-wrapper")
      .getAttribute("data-id");
    if (confirm("Delete this category?"))
      apiRequest(`/categories/${id}`, { method: "DELETE" }).then(() =>
        loadCategories(),
      );
  }
  if (e.target.id === "addCategoryBtn") {
    const name = document.getElementById("newCategoryInput").value.trim();
    if (name)
      apiRequest("/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      }).then(() => loadCategories());
  }
  if (e.target.closest("#subcategoryDropdownList .dropdown-delete-btn")) {
    const id = e.target
      .closest(".dropdown-item-wrapper")
      .getAttribute("data-id");
    if (confirm("Delete this subcategory?"))
      apiRequest(`/subcategories/${id}`, { method: "DELETE" }).then(() =>
        loadSubCategories(),
      );
  }
  if (e.target.id === "addSubCategoryBtn") {
    const name = document.getElementById("newSubCategoryInput").value.trim();
    if (name && selectedCategoryId)
      apiRequest("/subcategories", {
        method: "POST",
        body: JSON.stringify({ name, categoryId: selectedCategoryId }),
      }).then(() => loadSubCategoriesByCategory(selectedCategoryId));
    else if (name) alert("Please select a category first");
  }
});

function initCategoryDropdown() {
  const display = document.getElementById("categoryDisplay");
  const list = document.getElementById("categoryDropdownList");
  const container = document.getElementById("categoryDropdownContainer");
  display.onclick = (e) => {
    e.stopPropagation();
    list.classList.toggle("show");
  };
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) list.classList.remove("show");
  });
  list.onclick = (e) => {
    const wrapper = e.target.closest(".dropdown-item-wrapper");
    if (wrapper && !e.target.closest(".dropdown-delete-btn")) {
      const val = wrapper.getAttribute("data-value");
      const id = wrapper.getAttribute("data-id");
      selectedCategoryId = id;
      document.getElementById("templateCategory").value = val;
      document.getElementById("templateCategoryId").value = id;
      document.getElementById("categoryDisplay").textContent = val;
      document.getElementById("templateSubCategory").value = "";
      document.getElementById("subcategoryDisplay").textContent = "Select...";
      loadSubCategoriesByCategory(id);
      list.classList.remove("show");
    }
  };
  renderCategoryDropdown();
}
function initSubCategoryDropdown() {
  const display = document.getElementById("subcategoryDisplay");
  const list = document.getElementById("subcategoryDropdownList");
  const container = document.getElementById("subcategoryDropdownContainer");
  display.onclick = (e) => {
    e.stopPropagation();
    list.classList.toggle("show");
  };
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) list.classList.remove("show");
  });
  list.onclick = (e) => {
    const wrapper = e.target.closest(".dropdown-item-wrapper");
    if (wrapper && !e.target.closest(".dropdown-delete-btn")) {
      const val = wrapper.getAttribute("data-value");
      const id = wrapper.getAttribute("data-id");
      document.getElementById("templateSubCategory").value = val;
      document.getElementById("templateSubCategoryId").value = id;
      document.getElementById("subcategoryDisplay").textContent = val;
      list.classList.remove("show");
    }
  };
  renderSubCategoryDropdown();
}
function initEditCategoryDropdown(selectedValue) {
  const display = document.getElementById("editCategoryDisplay");
  const list = document.getElementById("editCategoryDropdownList");
  const container = document.getElementById("editCategoryDropdownContainer");
  display.onclick = (e) => {
    e.stopPropagation();
    list.classList.toggle("show");
  };
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) list.classList.remove("show");
  });
  list.onclick = (e) => {
    const wrapper = e.target.closest(".dropdown-item-wrapper");
    if (wrapper && !e.target.closest(".dropdown-delete-btn")) {
      const val = wrapper.getAttribute("data-value");
      const id = wrapper.getAttribute("data-id");
      editSelectedCategoryId = id;
      document.getElementById("editTemplateCategory").value = val;
      document.getElementById("editTemplateCategoryId").value = id;
      document.getElementById("editCategoryDisplay").textContent = val;
      document.getElementById("editTemplateSubCategory").value = "";
      document.getElementById("editSubcategoryDisplay").textContent =
        "Select...";
      loadEditSubCategoriesByCategory(id);
      list.classList.remove("show");
    }
  };
  renderEditCategoryDropdown();
  if (selectedValue) {
    const found = categories.find((c) => c._id === selectedValue);
    if (found) {
      document.getElementById("editTemplateCategory").value = found.name;
      document.getElementById("editTemplateCategoryId").value = found._id;
      document.getElementById("editCategoryDisplay").textContent = found.name;
    }
  }
}
function initEditSubCategoryDropdown(selectedValue) {
  const display = document.getElementById("editSubcategoryDisplay");
  const list = document.getElementById("editSubcategoryDropdownList");
  const container = document.getElementById("editSubcategoryDropdownContainer");
  display.onclick = (e) => {
    e.stopPropagation();
    list.classList.toggle("show");
  };
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) list.classList.remove("show");
  });
  list.onclick = (e) => {
    const wrapper = e.target.closest(".dropdown-item-wrapper");
    if (wrapper && !e.target.closest(".dropdown-delete-btn")) {
      const val = wrapper.getAttribute("data-value");
      const id = wrapper.getAttribute("data-id");
      document.getElementById("editTemplateSubCategory").value = val;
      document.getElementById("editTemplateSubCategoryId").value = id;
      document.getElementById("editSubcategoryDisplay").textContent = val;
      list.classList.remove("show");
    }
  };
  renderEditSubCategoryDropdown(selectedValue);
  if (selectedValue) {
    const found = subcategories.find((s) => s._id === selectedValue);
    if (found) {
      document.getElementById("editTemplateSubCategory").value = found.name;
      document.getElementById("editTemplateSubCategoryId").value = found._id;
      document.getElementById("editSubcategoryDisplay").textContent =
        found.name;
    }
  }
}

// ========== TEMPLATE CRUD ==========
async function loadTemplates() {
  const container = document.getElementById("templatesContainer");
  container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Loading templates...</p></div>`;
  try {
    const status = document.getElementById("statusFilter").value;
    const search = document
      .getElementById("templateSearch")
      .value.toLowerCase();
    let url = "/templates";
    const params = [];
    if (status !== "all") params.push(`status=${status}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length) url += `?${params.join("&")}`;
    const templates = await apiRequest(url);
    if (templates.length === 0) {
      container.innerHTML = `<div class="text-center py-5"><i class="fas fa-inbox fa-3x text-muted"></i><p>No templates found</p></div>`;
      return;
    }
    container.innerHTML = templates
      .map(
        (t) => `
                    <div class="template-card">
                        <img src="${t.previewUrl || "https://via.placeholder.com/400x160?text=No+Preview"}" class="card-img-top">
                        <div class="card-body">
                            <h5 class="card-title">${escapeHtml(t.name)} ${t.isFree ? '<span class="badge badge-free ms-1">Free</span>' : ""}</h5>
                            <div class="mb-2">${(t.badges || []).map((b) => `<span class="badge badge-${b}">${b}</span>`).join("")}</div>
                            <p class="card-text">${escapeHtml((t.description || "").substring(0, 80))}...</p>
                            <div class="small text-muted">${getCategoryNameById(t.category) || ""} ${t.subCategory ? "· " + getSubCategoryNameById(t.subCategory) : ""}</div>
                        </div>
                        <div class="card-footer">
                            <span class="badge ${t.status === "active" ? "badge-active" : t.status === "draft" ? "badge-draft" : "badge-archived"}">${t.status}</span>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${t._id}"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-outline-secondary details-btn" data-id="${t._id}"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${t._id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                `,
      )
      .join("");
    attachTemplateButtons();
    updateTemplateCounts();
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger">Failed to load templates</div>`;
  }
}

function attachTemplateButtons() {
  document
    .querySelectorAll(".edit-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => editTemplate(btn.dataset.id)),
    );
  document
    .querySelectorAll(".delete-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteTemplate(btn.dataset.id)),
    );
  document
    .querySelectorAll(".details-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => showTemplateDetails(btn.dataset.id)),
    );
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

// ========== FIXED: PREVIEW BUTTON - shows beautiful modal with all details ==========
async function showTemplateDetails(id) {
  try {
    const t = await apiRequest(`/templates/${id}`);
    const modal = new bootstrap.Modal(
      document.getElementById("previewDetailsModal"),
    );
    document.getElementById("previewModalTitle").innerText = t.name;
    const featuresHtml =
      (t.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("") ||
      "<li>No features listed</li>";
    const requirementsHtml =
      (t.requirements || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("") ||
      "<li>No requirements</li>";
    const badgesHtml = (t.badges || [])
      .map((b) => `<span class="badge badge-${b} me-1">${b}</span>`)
      .join("");
    const playlistsHtml = (t.playlists || [])
      .map(
        (p) =>
          `<span class="badge bg-secondary me-1">${p.replace(/_/g, " ")}</span>`,
      )
      .join("");
    const html = `
                    <div class="row">
                        <div class="col-md-5">
                            <img src="${t.previewUrl || "https://via.placeholder.com/400x300?text=No+Preview"}" class="img-fluid rounded mb-3" style="width:100%; object-fit:cover;">
                        </div>
                        <div class="col-md-7">
                            <p><strong>Description:</strong> ${escapeHtml(t.description || "No description")}</p>
                            <p><strong>Price:</strong> ${t.isFree ? '<span class="badge badge-free">FREE</span>' : "₹" + t.price}</p>
                            <p><strong>Status:</strong> <span class="badge ${t.status === "active" ? "badge-active" : t.status === "draft" ? "badge-draft" : "badge-archived"}">${t.status}</span></p>
                            <p><strong>Category:</strong> ${getCategoryNameById(t.category) || "—"}</p>
                            <p><strong>Subcategory:</strong> ${getSubCategoryNameById(t.subCategory) || "—"}</p>
                            <p><strong>Tags:</strong> ${(t.tags || []).join(", ") || "—"}</p>
                            <p><strong>Badges:</strong> ${badgesHtml || "—"}</p>
                            <p><strong>Playlists:</strong> ${playlistsHtml || "—"}</p>
                            <p><strong>Layout:</strong> ${t.layout || "—"}</p>
                            <p><strong>Framework:</strong> ${t.framework || "—"}</p>
                            <p><strong>Files Included:</strong> ${t.filesIncluded || "—"}</p>
                            <p><strong>Support:</strong> ${t.support || "—"}</p>
                            <p><strong>Last Updated:</strong> ${t.lastUpdated || "—"}</p>
                            ${t.livePreviewUrl ? `<p><strong>Live Preview:</strong> <a href="${t.livePreviewUrl}" target="_blank">${t.livePreviewUrl}</a></p>` : ""}
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <h6><i class="fas fa-list"></i> Features</h6>
                            <ul>${featuresHtml}</ul>
                        </div>
                        <div class="col-md-6">
                            <h6><i class="fas fa-cog"></i> Requirements</h6>
                            <ul>${requirementsHtml}</ul>
                        </div>
                    </div>
                    ${t.instructions ? `<div class="row mt-2"><div class="col-12"><h6><i class="fas fa-info-circle"></i> Instructions</h6><p>${escapeHtml(t.instructions)}</p></div></div>` : ""}
                `;
    document.getElementById("previewModalBody").innerHTML = html;
    modal.show();
  } catch (e) {
    alert("Error loading template details");
  }
}

// Full edit template modal (replicates original)
async function editTemplate(templateId) {
  try {
    const template = await apiRequest(`/templates/${templateId}`);
    // Build modal HTML with all fields (simplified but fully functional)
    const modal = document.getElementById("editTemplateModal");
    modal.innerHTML = `
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header"><h5 class="modal-title">Edit Template: ${escapeHtml(template.name)}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3"><label class="form-label">Template Name*</label><input type="text" class="form-control" id="editTemplateName" value="${escapeHtml(template.name)}"></div>
                                        <div class="mb-3"><label class="form-label">Description* (Max 75 chars)</label><textarea class="form-control" id="editTemplateDescription" rows="3" maxlength="75">${escapeHtml(template.description || "")}</textarea><div class="char-counter" id="editDescCounter">${(template.description || "").length}/75</div></div>
                                        <div class="mb-3"><label class="form-label">Category*</label><div class="dropdown-with-delete" id="editCategoryDropdownContainer"><select class="form-select" id="editTemplateCategory"><option value="">Select...</option></select><input type="hidden" id="editTemplateCategoryId"><div class="dropdown-display" id="editCategoryDisplay">Select...</div><div class="category-dropdown-custom" id="editCategoryDropdownList"></div></div></div>
                                        <div class="mb-3"><label class="form-label">Sub Category*</label><div class="dropdown-with-delete" id="editSubcategoryDropdownContainer"><select class="form-select" id="editTemplateSubCategory"><option value="">Select...</option></select><input type="hidden" id="editTemplateSubCategoryId"><div class="dropdown-display" id="editSubcategoryDisplay">Select...</div><div class="subcategory-dropdown-custom" id="editSubcategoryDropdownList"></div></div></div>
                                        <div class="mb-3"><label class="form-label d-block">Pricing Type</label><div class="d-flex"><label class="toggle-switch"><input type="checkbox" id="editTemplateIsFree" ${template.isFree ? "checked" : ""}><span class="toggle-slider"></span></label><span class="ms-2" id="editPricingLabel">${template.isFree ? "Free" : "Paid"}</span></div></div>
                                        <div class="mb-3" id="editPriceControl"><label class="form-label">Price (₹)*</label><input type="number" class="form-control" id="editTemplatePrice" value="${template.price}"></div>
                                        <div class="mb-3"><label class="form-label">Discounted Price</label><input type="number" class="form-control" id="editTemplateDiscountedPrice" value="${template.discountedPrice || ""}"></div>
                                        <div class="mb-3"><label class="form-label">Layout</label><input type="text" class="form-control" id="editTemplateLayout" value="${template.layout || ""}"></div>
                                        <div class="mb-3"><label class="form-label">Framework</label><input type="text" class="form-control" id="editTemplateFramework" value="${template.framework || ""}"></div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3"><label class="form-label">Status*</label><select class="form-select" id="editTemplateStatus"><option value="draft" ${template.status === "draft" ? "selected" : ""}>Draft</option><option value="active" ${template.status === "active" ? "selected" : ""}>Active</option><option value="archived" ${template.status === "archived" ? "selected" : ""}>Archived</option></select></div>
                                        <div class="mb-3"><label class="form-label">Tags</label><input type="text" class="form-control" id="editTemplateTags" value="${(template.tags || []).join(", ")}"></div>
                                        <div class="mb-3"><label class="form-label">Badges</label><div class="badge-selector">${["new", "popular", "featured", "premium", "trending"].map((b) => `<label class="badge-option"><input type="checkbox" name="editBadge" value="${b}" ${template.badges && template.badges.includes(b) ? "checked" : ""}><span class="badge badge-${b}">${b}</span></label>`).join("")}</div></div>
                                        <div class="mb-3"><label class="form-label">Playlists</label><div class="playlist-selector">${["premium_products", "trending_now", "best_sellers", "new_arrivals", "editor_picks"].map((p) => `<label class="playlist-option"><input type="checkbox" name="editPlaylist" value="${p}" ${template.playlists && template.playlists.includes(p) ? "checked" : ""}><span class="badge ${p === "premium_products" ? "bg-primary" : p === "trending_now" ? "bg-warning" : p === "best_sellers" ? "bg-success" : p === "new_arrivals" ? "bg-info" : "bg-secondary"}">${p.replace(/_/g, " ")}</span></label>`).join("")}</div></div>
                                        <div class="mb-3"><label class="form-label">Upload New File</label><input class="form-control" type="file" id="editTemplateFile" accept=".pdf,.zip,.png,.jpg,.docx"><small class="text-muted">Leave blank to keep existing</small></div>
                                        <div class="mb-3"><label class="form-label">Preview Image</label><input class="form-control" type="file" id="editTemplatePreview" accept="image/*"><div id="editPreviewContainer">${template.previewUrl ? `<img src="${template.previewUrl}" class="img-thumbnail mt-2" style="max-width:150px;">` : ""}</div><small class="text-muted">Leave blank to keep existing</small></div>
                                        <div class="mb-3"><label class="form-label">Live Preview URL</label><input type="url" class="form-control" id="editTemplateLivePreviewUrl" value="${template.livePreviewUrl || ""}"></div>
                                    </div>
                                </div>
                                <div class="border-top pt-3 mt-2"><h6>Detailed Info</h6><div class="row"><div class="col-md-6"><div class="mb-3"><label>Features (one per line)</label><textarea class="form-control" id="editTemplateFeatures" rows="3">${(template.features || []).join("\n")}</textarea></div><div class="mb-3"><label>Files Included</label><input type="text" class="form-control" id="editTemplateFilesIncluded" value="${template.filesIncluded || ""}"></div></div><div class="col-md-6"><div class="mb-3"><label>Requirements (one per line)</label><textarea class="form-control" id="editTemplateRequirements" rows="3">${(template.requirements || []).join("\n")}</textarea></div><div class="mb-3"><label>Support Duration</label><input type="text" class="form-control" id="editTemplateSupport" value="${template.support || ""}"></div></div></div><div class="mb-3"><label>Instructions</label><textarea class="form-control" id="editTemplateInstructions" rows="2">${template.instructions || ""}</textarea></div></div>
                            </div>
                            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-primary" id="confirmEditTemplateBtn">Update Template</button></div>
                        </div>
                    </div>
                `;
    const bsModal = new bootstrap.Modal(modal);
    modal.removeAttribute("aria-hidden");
    bsModal.show();

    // Initialize category dropdowns for edit
    setTimeout(() => {
      initEditCategoryDropdown(template.category);
      initEditSubCategoryDropdown(template.subCategory);
    }, 100);

    // Toggle price control
    const isFreeCheck = document.getElementById("editTemplateIsFree");
    const priceCtrl = document.getElementById("editPriceControl");
    const pricingLabel = document.getElementById("editPricingLabel");
    function updatePriceState() {
      if (isFreeCheck.checked) {
        pricingLabel.textContent = "Free";
        priceCtrl.style.opacity = "0.5";
        priceCtrl.style.pointerEvents = "none";
        document.getElementById("editTemplatePrice").value = "0";
      } else {
        pricingLabel.textContent = "Paid";
        priceCtrl.style.opacity = "1";
        priceCtrl.style.pointerEvents = "auto";
      }
    }
    isFreeCheck.addEventListener("change", updatePriceState);
    updatePriceState();

    // Character counter for description
    const editDesc = document.getElementById("editTemplateDescription");
    const editCounter = document.getElementById("editDescCounter");
    editDesc.addEventListener("input", () => {
      editCounter.textContent = `${editDesc.value.length}/75`;
    });

    // Save edit
    document.getElementById("confirmEditTemplateBtn").onclick = async () => {
      const formData = new FormData();
      formData.append(
        "name",
        document.getElementById("editTemplateName").value,
      );
      formData.append(
        "description",
        document.getElementById("editTemplateDescription").value,
      );
      let catId = document.getElementById("editTemplateCategoryId").value;
      if (!catId) {
        const catName = document.getElementById(
          "editCategoryDisplay",
        ).textContent;
        const found = categories.find((c) => c.name === catName);
        if (found) catId = found._id;
      }
      let subId = document.getElementById("editTemplateSubCategoryId").value;
      if (!subId) {
        const subName = document.getElementById(
          "editSubcategoryDisplay",
        ).textContent;
        const found = subcategories.find((s) => s.name === subName);
        if (found) subId = found._id;
      }
      formData.append("category", catId);
      formData.append("subCategory", subId);
      formData.append(
        "isFree",
        document.getElementById("editTemplateIsFree").checked,
      );
      formData.append(
        "price",
        document.getElementById("editTemplatePrice").value,
      );
      formData.append(
        "status",
        document.getElementById("editTemplateStatus").value,
      );
      formData.append(
        "tags",
        document.getElementById("editTemplateTags").value,
      );
      const badges = Array.from(
        document.querySelectorAll('input[name="editBadge"]:checked'),
      )
        .map((cb) => cb.value)
        .join(",");
      formData.append("badges", badges);
      const playlists = Array.from(
        document.querySelectorAll('input[name="editPlaylist"]:checked'),
      )
        .map((cb) => cb.value)
        .join(",");
      formData.append("playlists", playlists);
      formData.append(
        "discountedPrice",
        document.getElementById("editTemplateDiscountedPrice").value,
      );
      formData.append(
        "layout",
        document.getElementById("editTemplateLayout").value,
      );
      formData.append(
        "framework",
        document.getElementById("editTemplateFramework").value,
      );
      formData.append(
        "livePreviewUrl",
        document.getElementById("editTemplateLivePreviewUrl").value,
      );
      formData.append(
        "features",
        document.getElementById("editTemplateFeatures").value,
      );
      formData.append(
        "requirements",
        document.getElementById("editTemplateRequirements").value,
      );
      formData.append(
        "filesIncluded",
        document.getElementById("editTemplateFilesIncluded").value,
      );
      formData.append(
        "support",
        document.getElementById("editTemplateSupport").value,
      );
      formData.append(
        "instructions",
        document.getElementById("editTemplateInstructions").value,
      );
      const file = document.getElementById("editTemplateFile").files[0];
      const preview = document.getElementById("editTemplatePreview").files[0];
      if (file) formData.append("templateFile", file);
      if (preview) formData.append("previewFile", preview);

      const res = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
        method: "PUT",
        body: formData,
      });
      if (res.ok) {
        showToast("Template updated successfully");
        bsModal.hide();
        loadTemplates();
      } else alert("Update failed");
    };
  } catch (e) {
    alert("Error loading template for edit");
  }
}

async function deleteTemplate(id) {
  if (confirm("Delete this template?")) {
    await apiRequest(`/templates/${id}`, { method: "DELETE" });
    loadTemplates();
    showToast("Template deleted");
  }
}

// Coupons (similar simplified)
async function loadCoupons() {
  const tbody = document.getElementById("couponsTable");
  tbody.innerHTML = `<td><td colspan="8" class="text-center py-5"><div class="spinner-border"></div><p>Loading coupons...</p></td></tr>`;
  try {
    const coupons = await apiRequest("/coupons");
    if (coupons.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5">No coupons found</td></tr>`;
      return;
    }
    tbody.innerHTML = coupons
      .map(
        (c) => `
                    <tr>
                        <td><span class="badge" style="background:var(--accent);color:#000;">${c.code}</span></td>
                        <td>${c.type === "percentage" ? c.discount + "%" : "₹" + c.discount}</td>
                        <td>${c.type}</td>
                        <td>${c.maxUsage}</td>
                        <td>${c.usedCount || 0}</td>
                        <td>${new Date(c.validUntil).toLocaleDateString()}</td>
                        <td><span class="badge ${c.status === "active" ? "bg-success" : "bg-secondary"}">${c.status}</span></td>
                        <td><button class="btn btn-sm btn-outline-primary edit-coupon-btn" data-id="${c._id}"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-outline-danger delete-coupon-btn" data-id="${c._id}"><i class="fas fa-trash"></i></button></td>
                    </tr>
                `,
      )
      .join("");
    document
      .querySelectorAll(".edit-coupon-btn")
      .forEach((btn) =>
        btn.addEventListener("click", () => editCoupon(btn.dataset.id)),
      );
    document
      .querySelectorAll(".delete-coupon-btn")
      .forEach((btn) =>
        btn.addEventListener("click", () => deleteCoupon(btn.dataset.id)),
      );
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8">Failed to load coupons</td></tr>`;
  }
}
async function editCoupon(id) {
  alert(`Edit coupon ${id} - full edit modal would appear`);
}
async function deleteCoupon(id) {
  if (confirm("Delete coupon?")) {
    await apiRequest(`/coupons/${id}`, { method: "DELETE" });
    loadCoupons();
    showToast("Coupon deleted");
  }
}

// Save new template
document.getElementById("saveTemplateBtn").onclick = async () => {
  const formData = new FormData();
  formData.append("name", document.getElementById("templateName").value);
  formData.append(
    "description",
    document.getElementById("templateDescription").value,
  );
  let catId = document.getElementById("templateCategoryId").value;
  if (!catId) {
    const catName = document.getElementById("categoryDisplay").textContent;
    const found = categories.find((c) => c.name === catName);
    if (found) catId = found._id;
  }
  let subId = document.getElementById("templateSubCategoryId").value;
  if (!subId) {
    const subName = document.getElementById("subcategoryDisplay").textContent;
    const found = subcategories.find((s) => s.name === subName);
    if (found) subId = found._id;
  }
  formData.append("category", catId);
  formData.append("subCategory", subId);
  formData.append("isFree", document.getElementById("templateIsFree").checked);
  formData.append("price", document.getElementById("templatePrice").value);
  formData.append("status", document.getElementById("templateStatus").value);
  formData.append("tags", document.getElementById("templateTags").value);
  const badges = Array.from(
    document.querySelectorAll('input[name="templateBadge"]:checked'),
  )
    .map((cb) => cb.value)
    .join(",");
  formData.append("badges", badges);
  const playlists = Array.from(
    document.querySelectorAll('input[name="templatePlaylist"]:checked'),
  )
    .map((cb) => cb.value)
    .join(",");
  formData.append("playlists", playlists);
  formData.append(
    "discountedPrice",
    document.getElementById("templateDiscountedPrice").value,
  );
  formData.append("layout", document.getElementById("templateLayout").value);
  formData.append(
    "framework",
    document.getElementById("templateFramework").value,
  );
  formData.append(
    "livePreviewUrl",
    document.getElementById("templateLivePreviewUrl").value,
  );
  formData.append(
    "features",
    document.getElementById("templateFeatures").value,
  );
  formData.append(
    "requirements",
    document.getElementById("templateRequirements").value,
  );
  formData.append(
    "filesIncluded",
    document.getElementById("templateFilesIncluded").value,
  );
  formData.append("support", document.getElementById("templateSupport").value);
  formData.append(
    "instructions",
    document.getElementById("templateInstructions").value,
  );
  const file = document.getElementById("editTemplateFile").files[0];
  const preview = document.getElementById("templatePreview").files[0];
  if (file) formData.append("templateFile", file);
  if (preview) formData.append("previewFile", preview);
  const res = await fetch(`${API_BASE_URL}/templates/upload`, {
    method: "POST",
    body: formData,
  });
  if (res.ok) {
    showToast("Template added");
    bootstrap.Modal.getInstance(
      document.getElementById("addTemplateModal"),
    ).hide();
    loadTemplates();
  } else alert("Error");
};
document.getElementById("saveCouponBtn").onclick = async () => {
  const data = {
    code: document.getElementById("couponCode").value,
    discount: parseInt(document.getElementById("couponDiscount").value),
    type: document.getElementById("couponType").value,
    maxUsage: parseInt(document.getElementById("couponMaxUsage").value),
    validUntil: document.getElementById("couponValidUntil").value,
    status: document.getElementById("couponStatus").value,
  };
  const res = await fetch(`${API_BASE_URL}/coupons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.ok) {
    showToast("Coupon added");
    bootstrap.Modal.getInstance(
      document.getElementById("addCouponModal"),
    ).hide();
    loadCoupons();
  } else alert("Error");
};

// Sales (real-time)
let allOrdersCache = [];
function getStoredOrders() {
  const stored = localStorage.getItem("templify_orders");
  return stored ? JSON.parse(stored) : [];
}
function saveOrders(orders) {
  localStorage.setItem("templify_orders", JSON.stringify(orders));
}
function addOrder(order) {
  const orders = getStoredOrders();
  order.id = Date.now().toString();
  order.date = new Date().toISOString();
  orders.unshift(order);
  saveOrders(orders);
  if (document.getElementById("paymentsSection").style.display !== "none")
    loadAllOrders();
  showToast(`Order added: ${order.template}`);
}
async function loadAllOrders() {
  const tableBody = document.getElementById("paymentsTable");
  tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary"></div><p>Loading orders...</p></td></tr>`;
  let allOrders = [...getStoredOrders()];
  try {
    const paid = await apiRequest("/orders");
    if (Array.isArray(paid))
      paid.forEach((o) => {
        if (!allOrders.some((l) => l.id === o._id))
          allOrders.push({
            id: o._id,
            type: "paid",
            template: o.templateName,
            user: o.customerEmail,
            amount: o.amountInPaise
              ? `₹${(o.amountInPaise / 100).toLocaleString()}`
              : "₹—",
            date: o.createdAt,
            status: "completed",
          });
      });
  } catch (e) {}
  try {
    const free = await apiRequest("/downloads");
    if (Array.isArray(free))
      free.forEach((d) => {
        if (!allOrders.some((l) => l.id === d._id))
          allOrders.push({
            id: d._id,
            type: "free",
            template: d.templateName,
            user: d.customerEmail,
            amount: "FREE",
            date: d.createdAt,
            status: "downloaded",
          });
      });
  } catch (e) {}
  allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
  allOrdersCache = allOrders;
  renderOrdersTable(allOrders);
}
function renderOrdersTable(orders) {
  const filter = document.getElementById("salesTypeFilter").value;
  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.type === filter);
  const totalPaid = orders.filter((o) => o.type === "paid").length;
  const totalFree = orders.filter((o) => o.type === "free").length;
  let revenue = 0;
  orders
    .filter((o) => o.type === "paid")
    .forEach((o) => {
      const num = parseFloat(String(o.amount).replace(/[^0-9.-]/g, ""));
      if (!isNaN(num)) revenue += num;
    });
  document.getElementById("salesTotalOrders").innerText = orders.length;
  document.getElementById("salesFreeDownloads").innerText = totalFree;
  document.getElementById("salesTotalRevenue").innerText =
    revenue > 0 ? `₹${revenue.toLocaleString()}` : "₹0";
  document.getElementById("salesRecordCount").innerText =
    `Showing ${filtered.length} of ${orders.length} orders`;
  if (filtered.length === 0) {
    document.getElementById("paymentsTable").innerHTML =
      `<td><td colspan="7" class="text-center py-5"><i class="fas fa-inbox fa-2x text-muted"></i><p>No orders found</p></td></tr>`;
    return;
  }
  document.getElementById("paymentsTable").innerHTML = filtered
    .map(
      (o) => `
                <tr>
                    <td style="font-family:monospace;">${String(o.id).substring(0, 12)}...</td>
                    <td><span class="badge ${o.type === "paid" ? "badge-razorpay" : "badge-free-dl"}">${o.type === "paid" ? "Paid" : "Free"}</span></td>
                    <td><strong>${o.template || "—"}</strong></td>
                    <td>${o.user || "—"}</td>
                    <td>${o.amount || (o.type === "free" ? "FREE" : "—")}</td>
                    <td>${o.date ? new Date(o.date).toLocaleDateString() : "—"}</td>
                    <td><span class="badge bg-success">${o.status === "completed" ? "Completed" : o.status || "Success"}</span></td>
                </tr>
            `,
    )
    .join("");
}
window.trackOrder = addOrder;
document.getElementById("addTestOrderBtn")?.addEventListener("click", () => {
  addOrder({
    template: "Demo Template",
    user: "test@templify.com",
    amount: 499,
    type: "paid",
    status: "completed",
  });
});

// Update counts
async function updateTemplateCounts() {
  try {
    const templates = await apiRequest("/templates");
    const active = templates.filter((t) => t.status === "active");
    const paid = templates.filter((t) => !t.isFree);
    const revenue = paid.reduce((s, t) => s + (t.price || 0), 0);
    document.getElementById("totalTemplates").innerText = templates.length;
    document.getElementById("activeTemplates").innerText = active.length;
    document.getElementById("totalRevenue").innerText =
      `₹${revenue.toLocaleString()}`;
  } catch (e) {}
}

// Charts
function initCharts() {
  new Chart(document.getElementById("performanceChart"), {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
      datasets: [
        {
          label: "Revenue",
          data: [8500, 12500, 9800, 15200, 11000, 18000, 14500, 24850],
          borderColor: "#BBFF00",
          backgroundColor: "rgba(187,255,0,0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: { responsive: true },
  });
  new Chart(document.getElementById("categoryChart"), {
    type: "doughnut",
    data: {
      labels: ["Portfolio", "E-commerce", "Blog", "Landing", "Business"],
      datasets: [
        {
          data: [35, 25, 20, 15, 5],
          backgroundColor: [
            "#BBFF00",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#0ea5e9",
          ],
        },
      ],
    },
  });
}
function loadAnalytics() {
  new Chart(document.getElementById("downloadsChart"), {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Downloads",
          data: [42, 58, 45, 72, 60, 85],
          backgroundColor: "rgba(187,255,0,0.7)",
        },
      ],
    },
  });
  new Chart(document.getElementById("popularTemplatesChart"), {
    type: "doughnut",
    data: {
      labels: ["Portfolio", "E-commerce", "Blog", "Landing"],
      datasets: [
        {
          data: [12, 19, 3, 5],
          backgroundColor: ["#BBFF00", "#10b981", "#f59e0b", "#ef4444"],
        },
      ],
    },
  });
  new Chart(document.getElementById("revenueChart"), {
    type: "bar",
    data: {
      labels: ["Q1", "Q2", "Q3", "Q4"],
      datasets: [
        {
          label: "Revenue",
          data: [8500, 10500, 12000, 9500],
          backgroundColor: "#10b981",
        },
      ],
    },
  });
  new Chart(document.getElementById("engagementChart"), {
    type: "radar",
    data: {
      labels: ["Visits", "Downloads", "Time", "Purchases", "Reviews"],
      datasets: [
        {
          label: "Engagement",
          data: [85, 72, 90, 65, 78],
          backgroundColor: "rgba(187,255,0,0.2)",
          borderColor: "#BBFF00",
        },
      ],
    },
  });
}

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("dashDate").innerText =
    new Date().toLocaleDateString();
  await loadCategories();
  await loadSubCategories();
  initCategoryDropdown();
  initSubCategoryDropdown();
  initCharts();
  loadTemplates();
  loadAllOrders();
  document
    .getElementById("searchButton")
    .addEventListener("click", loadTemplates);
  document
    .getElementById("couponSearchButton")
    .addEventListener("click", loadCoupons);
  document
    .getElementById("statusFilter")
    .addEventListener("change", loadTemplates);
  document
    .getElementById("couponStatusFilter")
    .addEventListener("change", loadCoupons);
  document
    .getElementById("salesRefreshBtn")
    .addEventListener("click", loadAllOrders);
  document
    .getElementById("salesTypeFilter")
    .addEventListener("change", () => renderOrdersTable(allOrdersCache));
  // Tab navigation
  const tabs = {
    dashboard: document.getElementById("dashboardSection"),
    templates: document.getElementById("templatesSection"),
    coupons: document.getElementById("couponsSection"),
    analytics: document.getElementById("analyticsSection"),
    payments: document.getElementById("paymentsSection"),
  };
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id = e.currentTarget.id.replace("Tab", "");
      Object.values(tabs).forEach((s) => (s.style.display = "none"));
      tabs[id].style.display = "block";
      document
        .querySelectorAll(".nav-link")
        .forEach((l) => l.classList.remove("active"));
      e.currentTarget.classList.add("active");
      if (id === "templates") loadTemplates();
      if (id === "coupons") loadCoupons();
      if (id === "analytics") loadAnalytics();
      if (id === "payments") loadAllOrders();
    });
  });
  // Mobile menu
  document.querySelector(".mobile-menu-toggle").onclick = () => {
    document.querySelector(".sidebar").classList.add("active");
    document.querySelector(".sidebar-overlay").classList.add("active");
  };
  document.querySelector(".sidebar-overlay").onclick = () => {
    document.querySelector(".sidebar").classList.remove("active");
    document.querySelector(".sidebar-overlay").classList.remove("active");
  };
});
