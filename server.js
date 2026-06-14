require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const Razorpay = require("razorpay");
const { MongoClient, GridFSBucket, ObjectId } = require("mongodb");
const crypto = require("crypto");

const app = express();
const PORT = 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
const corsOptions = {
  origin: [
    "https://templifyy.netlify.app",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
  ], // Your client's origin
  credentials: true, // Allow credentials
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Setup GridFS
let gfsBucket;
mongoose.connection.once("open", () => {
  gfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
});

// Use multer memory storage for file uploads
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ storage: memoryStorage });

// MongoDB Connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Example Schema and Model
const ItemSchema = new mongoose.Schema({
  name: String,
  value: Number,
});
const Item = mongoose.model("Item", ItemSchema);

// Template Schema and Model
const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  price: { type: Number, required: true },
  isFree: { type: Boolean, default: false },
  discountedPrice: { type: Number },
  status: {
    type: String,
    enum: ["active", "draft", "archived"],
    default: "draft",
  },
  tags: [String],
  layout: { type: String },
  framework: { type: String },
  filesIncluded: { type: String },
  support: { type: String },
  features: [String],
  requirements: [String],
  instructions: { type: String },
  badges: [String],
  playlists: [String],
  createdAt: { type: Date, default: Date.now },
  downloads: { type: Number, default: 0 },
  previewUrl: String, // Optional, for future file upload
  fileUrl: String, // Optional, for future file upload
  fileId: mongoose.Schema.Types.ObjectId, // GridFS file id for protected download
  livePreviewUrl: String, // Optional, for live preview links
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
});
const Template = mongoose.model("Template", TemplateSchema);

// Coupon Schema and Model
const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discount: { type: Number, required: true },
  type: { type: String, enum: ["percentage", "fixed"], required: true },
  maxUsage: { type: Number, required: true },
  usedCount: { type: Number, default: 0 },
  validUntil: { type: Date, required: true },
  status: {
    type: String,
    enum: ["active", "inactive", "expired"],
    default: "active",
  },
  createdAt: { type: Date, default: Date.now },
});
const Coupon = mongoose.model("Coupon", CouponSchema);
// Download token schema (one-time tokens created after successful payment)
const DownloadTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Template",
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  usesLeft: { type: Number, default: 3 },
});
const DownloadToken = mongoose.model("DownloadToken", DownloadTokenSchema);

// Order Schema (for paid template purchases)
const OrderSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Template",
  },
  templateName: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  amountInPaise: { type: Number, required: true }, // Razorpay amount in paise
  originalPrice: { type: Number }, // Original price before discount
  discountedPrice: { type: Number }, // Price customer paid (after coupon/discount)
  couponCode: { type: String }, // Applied coupon code, if any
  couponDiscount: { type: Number }, // Discount amount from coupon
  razorpayPaymentId: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String },
  razorpaySignature: { type: String },
  status: {
    type: String,
    enum: ["completed", "pending", "failed"],
    default: "completed",
  },
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model("Order", OrderSchema);

// FreeDownload Schema (for free template downloads)
const FreeDownloadSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Template",
  },
  templateName: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  status: { type: String, enum: ["downloaded"], default: "downloaded" },
  createdAt: { type: Date, default: Date.now },
});
const FreeDownload = mongoose.model("FreeDownload", FreeDownloadSchema);

// Category Schema and Model
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
const Category = mongoose.model("Category", CategorySchema);

// SubCategory Schema and Model
const SubCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
});
// Create compound unique index: name + categoryId
SubCategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });
const SubCategory = mongoose.model("SubCategory", SubCategorySchema);

// Playlist Schema and Model
const PlaylistSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});
const Playlist = mongoose.model("Playlist", PlaylistSchema);

// Category API Endpoints

// Get all categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Create a new category
app.post("/api/categories", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const category = new Category({ name: name.trim() });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Category already exists" });
    }
    res.status(400).json({ error: "Failed to create category" });
  }
});

// Delete a category
app.delete("/api/categories/:id", async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete category" });
  }
});

// SubCategory API Endpoints

// Get all subcategories
app.get("/api/subcategories", async (req, res) => {
  try {
    const subcategories = await SubCategory.find().sort({ createdAt: 1 });
    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

// Get subcategories by category ID
app.get("/api/subcategories/by-category/:categoryId", async (req, res) => {
  try {
    const subcategories = await SubCategory.find({
      categoryId: req.params.categoryId,
    }).sort({ createdAt: 1 });
    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

// Create a new subcategory
app.post("/api/subcategories", async (req, res) => {
  try {
    const { name, categoryId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Subcategory name is required" });
    }
    const subcategory = new SubCategory({
      name: name.trim(),
      categoryId: categoryId || null,
    });
    await subcategory.save();
    res.status(201).json(subcategory);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Subcategory already exists" });
    }
    res.status(400).json({ error: "Failed to create subcategory" });
  }
});

// Delete a subcategory
app.delete("/api/subcategories/:id", async (req, res) => {
  try {
    await SubCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete subcategory" });
  }
});

// Playlist API Endpoints

// Get all playlists
app.get("/api/playlists", async (req, res) => {
  try {
    const playlists = await Playlist.find().sort({ createdAt: 1 });
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

// Create a new playlist
app.post("/api/playlists", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Playlist name is required" });
    }
    const playlist = new Playlist({ name: name.trim(), description });
    await playlist.save();
    res.status(201).json(playlist);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Playlist already exists" });
    }
    res.status(400).json({ error: "Failed to create playlist" });
  }
});

// Delete a playlist
app.delete("/api/playlists/:id", async (req, res) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete playlist" });
  }
});

// Get templates by playlist
app.get("/api/templates/playlist/:playlistName", async (req, res) => {
  try {
    const { playlistName } = req.params;
    const templates = await Template.find({
      playlists: playlistName,
      status: "active",
    }).sort({ createdAt: -1 });

    // Make URLs absolute and normalize arrays
    const result = templates.map((t) => {
      t = t.toObject();
      // Ensure playlists and badges are always arrays
      if (!Array.isArray(t.playlists)) {
        t.playlists = t.playlists ? [t.playlists] : [];
      }
      if (!Array.isArray(t.badges)) {
        t.badges = t.badges ? [t.badges] : [];
      }
      t.previewUrl = makeAbsoluteUrl(t.previewUrl);
      if (t.isFree) {
        t.fileUrl = makeAbsoluteUrl(t.fileUrl);
      } else {
        delete t.fileUrl;
      }
      delete t.fileId;
      return t;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Coupon API Endpoints

// Create a new coupon
app.post("/api/coupons", async (req, res) => {
  try {
    const { code, discount, type, maxUsage, validUntil, status } = req.body;
    if (!code || !discount || !type || !maxUsage || !validUntil || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const coupon = new Coupon({
      code: code.trim().toUpperCase(),
      discount,
      type,
      maxUsage,
      validUntil,
      status,
    });
    await coupon.save();
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Coupon code already exists" });
    }
    res.status(400).json({ error: "Failed to create coupon" });
  }
});

// Get all coupons
app.get("/api/coupons", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// Get a single coupon by ID
app.get("/api/coupons/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    res.status(400).json({ error: "Failed to fetch coupon" });
  }
});

// Update a coupon
app.put("/api/coupons/:id", async (req, res) => {
  try {
    const { code, discount, type, maxUsage, validUntil, status } = req.body;
    const update = {
      code: code.trim().toUpperCase(),
      discount,
      type,
      maxUsage,
      validUntil,
      status,
    };
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    res.status(400).json({ error: "Failed to update coupon" });
  }
});

// Delete a coupon
app.delete("/api/coupons/:id", async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete coupon" });
  }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});

// Set BASE_URL for file links
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Helper function to make URLs absolute
function makeAbsoluteUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url}`;
}

// Example API Routes
app.get("/api/items", async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

app.post("/api/items", async (req, res) => {
  const item = new Item(req.body);
  await item.save();
  res.status(201).json(item);
});

// API: Get all templates (with optional status/search)
app.get("/api/templates", async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status && status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    let templates = await Template.find(query).sort({ createdAt: -1 });
    // Ensure previewUrl is absolute and DO NOT expose fileUrl for paid templates
    templates = templates.map((t) => {
      t = t.toObject();
      // Ensure playlists and badges are always arrays
      if (!Array.isArray(t.playlists)) {
        t.playlists = t.playlists ? [t.playlists] : [];
      }
      if (!Array.isArray(t.badges)) {
        t.badges = t.badges ? [t.badges] : [];
      }
      t.previewUrl = makeAbsoluteUrl(t.previewUrl);
      // Only expose fileUrl for free templates
      if (t.isFree) {
        t.fileUrl = makeAbsoluteUrl(t.fileUrl);
      } else {
        delete t.fileUrl;
      }
      // never expose internal fileId
      delete t.fileId;
      return t;
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// API: Create a new template
app.post("/api/templates", async (req, res) => {
  try {
    const template = new Template(req.body);
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ error: "Failed to create template" });
  }
});

// API: Delete a template
app.delete("/api/templates/:id", async (req, res) => {
  try {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete template" });
  }
});

// API: Update template category and subcategory
app.patch("/api/templates/:id", async (req, res) => {
  try {
    console.log("PATCH /api/templates/:id called with ID:", req.params.id);
    console.log("PATCH body:", req.body);
    const { category, subCategory } = req.body;
    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      { category, subCategory },
      { new: true },
    );
    console.log("Template updated via PATCH. New values:", {
      id: updatedTemplate._id,
      category: updatedTemplate.category,
      subCategory: updatedTemplate.subCategory,
    });
    res.json(updatedTemplate);
  } catch (err) {
    console.error("PATCH error:", err);
    res.status(400).json({ error: "Failed to update template" });
  }
});

// API: Upload template with files (store in GridFS)
app.post(
  "/api/templates/upload",
  uploadMemory.fields([
    { name: "templateFile", maxCount: 1 },
    { name: "previewFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        description,
        category,
        subCategory,
        price,
        isFree,
        status,
        tags,
        layout,
        framework,
        filesIncluded,
        support,
        features,
        requirements,
        instructions,
        livePreviewUrl,
        badges,
        playlists,
      } = req.body;
      let templateFileId, previewFileId;
      let templateFileUrl, previewFileUrl;
      // Save files to GridFS and get their IDs
      if (req.files["templateFile"]) {
        const file = req.files["templateFile"][0];
        const uploadStream = gfsBucket.openUploadStream(file.originalname, {
          contentType: file.mimetype,
        });
        uploadStream.end(file.buffer);
        await new Promise((resolve, reject) => {
          uploadStream.on("finish", () => {
            templateFileId = uploadStream.id;
            templateFileUrl = `${BASE_URL}/api/files/${templateFileId}`;
            resolve();
          });
          uploadStream.on("error", reject);
        });
      }
      if (req.files["previewFile"]) {
        const file = req.files["previewFile"][0];
        const uploadStream = gfsBucket.openUploadStream(file.originalname, {
          contentType: file.mimetype,
        });
        uploadStream.end(file.buffer);
        await new Promise((resolve, reject) => {
          uploadStream.on("finish", () => {
            previewFileId = uploadStream.id;
            previewFileUrl = `${BASE_URL}/api/files/${previewFileId}`;
            resolve();
          });
          uploadStream.on("error", reject);
        });
      }
      const template = new Template({
        name,
        description,
        category,
        subCategory,
        price: Number(price),
        discountedPrice:
          req.body.discountedPrice !== undefined &&
          req.body.discountedPrice !== ""
            ? Number(req.body.discountedPrice)
            : undefined,
        isFree: isFree === "true" || isFree === true,
        status,
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        badges: badges
          ? badges
              .split(",")
              .map((b) => b.trim())
              .filter(Boolean)
          : [],
        playlists: playlists
          ? playlists
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
        layout,
        framework,
        filesIncluded,
        support,
        features: features
          ? features
              .split(/,|\n/)
              .map((f) => f.trim())
              .filter(Boolean)
          : [],
        requirements: requirements
          ? requirements
              .split(/,|\n/)
              .map((r) => r.trim())
              .filter(Boolean)
          : [],
        instructions,
        livePreviewUrl: livePreviewUrl || undefined,
        previewUrl: previewFileUrl,
        fileUrl: templateFileUrl,
        fileId: templateFileId,
        createdAt: new Date(),
        downloads: 0,
      });
      await template.save();
      res.status(201).json(template);
    } catch (err) {
      res.status(400).json({ error: "Failed to upload template" });
    }
  },
);

// API: Serve files from GridFS (with inline or attachment option)
app.get("/api/files/:id", async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const files = await mongoose.connection.db
      .collection("uploads.files")
      .find({ _id: fileId })
      .toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }
    const file = files[0];
    // If image, display inline; if zip or other, force download
    const isImage = (file.contentType || "").startsWith("image/");
    if (isImage) {
      res.set("Content-Type", file.contentType);
      res.set("Content-Disposition", `inline; filename=\"${file.filename}\"`);
    } else {
      res.set("Content-Type", file.contentType || "application/octet-stream");
      res.set(
        "Content-Disposition",
        `attachment; filename=\"${file.filename}\"`,
      );
    }
    gfsBucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    res.status(404).json({ error: "File not found" });
  }
});

// Protected download route: stream file only if valid one-time token provided
app.get("/api/download/:token", async (req, res) => {
  try {
    const tokenStr = req.params.token;
    const tokenDoc = await DownloadToken.findOne({ token: tokenStr });
    if (!tokenDoc)
      return res.status(404).json({ error: "Invalid download token" });
    if (tokenDoc.usesLeft <= 0)
      return res.status(403).json({
        error:
          "This download token has already been used the maximum number of times",
      });
    if (new Date(tokenDoc.expiresAt) < new Date())
      return res.status(410).json({ error: "Download token expired" });

    const template = await Template.findById(tokenDoc.templateId);
    if (!template) return res.status(404).json({ error: "Template not found" });
    if (!template.fileId)
      return res.status(404).json({ error: "File not available" });

    const fileId = new ObjectId(template.fileId);
    const files = await mongoose.connection.db
      .collection("uploads.files")
      .find({ _id: fileId })
      .toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }
    const file = files[0];
    const isImage = (file.contentType || "").startsWith("image/");
    if (isImage) {
      res.set("Content-Type", file.contentType);
      res.set("Content-Disposition", `inline; filename="${file.filename}"`);
    } else {
      res.set("Content-Type", file.contentType || "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${file.filename}"`);
    }

    // decrement usesLeft and increment downloads
    tokenDoc.usesLeft -= 1;
    await tokenDoc.save();
    template.downloads = (template.downloads || 0) + 1;
    await template.save();

    gfsBucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Failed to process download" });
  }
});

// API: Update a template (with optional file uploads, store in GridFS)
app.put(
  "/api/templates/:id",
  uploadMemory.fields([
    { name: "templateFile", maxCount: 1 },
    { name: "previewFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        description,
        category,
        subCategory,
        price,
        isFree,
        status,
        tags,
        layout,
        framework,
        filesIncluded,
        support,
        features,
        requirements,
        instructions,
        livePreviewUrl,
        badges,
        playlists,
      } = req.body;

      let update = {
        name,
        description,
        category,
        subCategory,
        price: Number(price),
        discountedPrice:
          req.body.discountedPrice !== undefined &&
          req.body.discountedPrice !== ""
            ? Number(req.body.discountedPrice)
            : undefined,
        isFree: isFree === "true" || isFree === true,
        status,
        tags:
          tags && tags.trim()
            ? tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
        badges:
          badges && badges.trim()
            ? badges
                .split(",")
                .map((b) => b.trim())
                .filter(Boolean)
            : [],
        playlists:
          playlists && playlists.trim()
            ? playlists
                .split(",")
                .map((p) => p.trim())
                .filter(Boolean)
            : [],
        layout,
        framework,
        filesIncluded,
        support,
        features: features
          ? features
              .split(/,|\n/)
              .map((f) => f.trim())
              .filter(Boolean)
          : [],
        requirements: requirements
          ? requirements
              .split(/,|\n/)
              .map((r) => r.trim())
              .filter(Boolean)
          : [],
        instructions:
          instructions && instructions.trim() ? instructions : undefined,
        livePreviewUrl: livePreviewUrl || undefined,
      };
      if (req.files["templateFile"]) {
        const file = req.files["templateFile"][0];
        const uploadStream = gfsBucket.openUploadStream(file.originalname, {
          contentType: file.mimetype,
        });
        uploadStream.end(file.buffer);
        await new Promise((resolve, reject) => {
          uploadStream.on("finish", () => {
            update.fileUrl = `${BASE_URL}/api/files/${uploadStream.id}`;
            update.fileId = uploadStream.id;
            resolve();
          });
          uploadStream.on("error", reject);
        });
      }
      if (req.files["previewFile"]) {
        const file = req.files["previewFile"][0];
        const uploadStream = gfsBucket.openUploadStream(file.originalname, {
          contentType: file.mimetype,
        });
        uploadStream.end(file.buffer);
        await new Promise((resolve, reject) => {
          uploadStream.on("finish", () => {
            update.previewUrl = `${BASE_URL}/api/files/${uploadStream.id}`;
            resolve();
          });
          uploadStream.on("error", reject);
        });
      }
      const template = await Template.findByIdAndUpdate(req.params.id, update, {
        new: true,
      });
      if (!template)
        return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (err) {
      res.status(400).json({ error: "Failed to update template" });
    }
  },
);

// API: Create Razorpay order
app.post("/api/create-razorpay-order", async (req, res) => {
  try {
    let { amount, currency, receipt } = req.body;
    // Ensure receipt is no more than 40 characters
    if (receipt && receipt.length > 40) {
      receipt = receipt.substring(0, 40);
    }
    console.log("Creating order with:", { amount, currency, receipt });
    const options = { amount, currency, receipt };
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});

// API: Get a single template by ID (with error logging)
app.get("/api/templates/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log("Fetching template with id:", id);
    if (!id || id.length !== 24) {
      return res.status(400).json({ error: "Invalid template ID format" });
    }
    let template = await Template.findById(id);
    if (!template) {
      console.log("Template not found for id:", id);
      return res.status(404).json({ error: "Template not found" });
    }
    template = template.toObject();
    // Ensure playlists is always an array
    if (!Array.isArray(template.playlists)) {
      template.playlists = template.playlists ? [template.playlists] : [];
    }
    // Ensure badges is always an array
    if (!Array.isArray(template.badges)) {
      template.badges = template.badges ? [template.badges] : [];
    }
    template.previewUrl = makeAbsoluteUrl(template.previewUrl);
    // Only expose fileUrl for free templates
    if (template.isFree) {
      template.fileUrl = makeAbsoluteUrl(template.fileUrl);
    } else {
      delete template.fileUrl;
    }
    // never expose internal fileId
    delete template.fileId;
    res.json(template);
  } catch (err) {
    console.error("Error fetching template by id:", err);
    res.status(400).json({ error: "Failed to fetch template" });
  }
});

// Increment coupon usedCount after successful payment
app.post("/api/coupons/increment", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Coupon code required" });
    const coupon = await Coupon.findOneAndUpdate(
      { code: code.trim().toUpperCase() },
      { $inc: { usedCount: 1 } },
      { new: true },
    );
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json({ success: true, usedCount: coupon.usedCount });
  } catch (err) {
    res.status(400).json({ error: "Failed to increment coupon usage" });
  }
});
// Validate coupon (check existence, status, expiry, usage limit)
app.post("/api/coupons/validate", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Coupon code required" });
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon) return res.status(404).json({ error: "Invalid coupon code" });
    if (coupon.status !== "active")
      return res.status(400).json({ error: "Coupon is not active" });
    if (new Date(coupon.validUntil) < new Date())
      return res.status(400).json({ error: "Coupon has expired" });
    if (coupon.usedCount >= coupon.maxUsage)
      return res
        .status(400)
        .json({ error: "Sorry, coupon's usage limit has reached" });
    // Return coupon details for discount application
    res.json({
      code: coupon.code,
      discount: coupon.discount,
      type: coupon.type,
      maxUsage: coupon.maxUsage,
      usedCount: coupon.usedCount,
      validUntil: coupon.validUntil,
      status: coupon.status,
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to validate coupon" });
  }
});

// API: Verify Razorpay payment signature
app.post("/api/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      templateId,
    } = req.body;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
    if (generated_signature === razorpay_signature) {
      // Optionally, you can mark the order as paid in your DB here
      // If client provided a templateId, create a one-time download token
      if (templateId) {
        // validate template id
        if (!ObjectId.isValid(templateId)) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid templateId" });
        }
        const template = await Template.findById(templateId);
        if (!template)
          return res
            .status(404)
            .json({ success: false, error: "Template not found" });
        // If template doesn't have fileId (older records), try to extract it from fileUrl
        if (!template.fileId && template.fileUrl) {
          const m = String(template.fileUrl).match(
            /\/api\/files\/([a-fA-F0-9]{24})/,
          );
          if (m && m[1]) {
            try {
              template.fileId = m[1];
              await template.save();
            } catch (e) {
              console.warn(
                "Failed to save extracted fileId for template",
                template._id,
                e,
              );
            }
          }
        }
        if (template.isFree) {
          return res.json({
            success: true,
            note: "Template is free; no download token required",
          });
        }
        const tokenStr = crypto.randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        const dt = new DownloadToken({
          token: tokenStr,
          templateId: template._id,
          expiresAt,
        });
        await dt.save();
        return res.json({ success: true, downloadToken: tokenStr, expiresAt });
      }
      return res.json({ success: true });
    } else {
      return res.json({ success: false, error: "Signature mismatch" });
    }
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, error: "Verification failed" });
  }
});

// Admin migration endpoint: populate fileId from fileUrl for older templates
// Protect with ADMIN_SECRET env var passed in header 'x-admin-secret'
app.post("/api/admin/migrate-fileids", async (req, res) => {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret)
      return res
        .status(500)
        .json({ error: "Admin secret not configured on server" });
    const provided = req.headers["x-admin-secret"] || req.body.adminSecret;
    if (provided !== adminSecret)
      return res.status(401).json({ error: "Unauthorized" });

    const templates = await Template.find({
      fileId: { $exists: false },
      fileUrl: { $exists: true, $ne: null },
    });
    let updated = 0;
    for (const t of templates) {
      const m = String(t.fileUrl).match(/\/api\/files\/([a-fA-F0-9]{24})/);
      if (m && m[1]) {
        t.fileId = m[1];
        try {
          await t.save();
          updated++;
        } catch (e) {
          console.warn(
            "Failed saving template during migration",
            t._id,
            e.message,
          );
        }
      }
    }
    res.json({ success: true, inspected: templates.length, updated });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: "Migration failed" });
  }
});

// Order API Endpoints (for paid template purchases)

// Create a new paid order
app.post("/api/orders", async (req, res) => {
  try {
    const {
      templateId,
      templateName,
      customerName,
      customerEmail,
      customerPhone,
      amountInPaise,
      originalPrice,
      discountedPrice,
      couponCode,
      couponDiscount,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

    if (!templateId || !customerEmail || !razorpayPaymentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const order = new Order({
      templateId,
      templateName,
      customerName,
      customerEmail,
      customerPhone,
      amountInPaise,
      originalPrice,
      discountedPrice,
      couponCode,
      couponDiscount,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      status: "completed",
    });

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    console.error("Order creation error:", err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "Order with this payment ID already exists" });
    }
    res.status(400).json({ error: "Failed to create order" });
  }
});

// Get all paid orders (for admin)
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("templateId");
    res.json(orders);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get single order by ID
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("templateId");
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: "Failed to fetch order" });
  }
});

// FreeDownload API Endpoints (for free template downloads)

// Create a new free download record
app.post("/api/downloads", async (req, res) => {
  try {
    const {
      templateId,
      templateName,
      customerName,
      customerEmail,
      customerPhone,
    } = req.body;

    if (!templateId || !customerEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const freeDownload = new FreeDownload({
      templateId,
      templateName,
      customerName,
      customerEmail,
      customerPhone,
      status: "downloaded",
    });

    await freeDownload.save();
    res.status(201).json(freeDownload);
  } catch (err) {
    console.error("Free download creation error:", err);
    res.status(400).json({ error: "Failed to record free download" });
  }
});

// Get all free downloads (for admin)
app.get("/api/downloads", async (req, res) => {
  try {
    const downloads = await FreeDownload.find()
      .sort({ createdAt: -1 })
      .populate("templateId");
    res.json(downloads);
  } catch (err) {
    console.error("Get downloads error:", err);
    res.status(500).json({ error: "Failed to fetch downloads" });
  }
});

// Get single free download by ID
app.get("/api/downloads/:id", async (req, res) => {
  try {
    const download = await FreeDownload.findById(req.params.id).populate(
      "templateId",
    );
    if (!download)
      return res.status(404).json({ error: "Download record not found" });
    res.json(download);
  } catch (err) {
    res.status(400).json({ error: "Failed to fetch download" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
