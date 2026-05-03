const express = require("express");
const path = require("path");
const cors = require("cors");
const Datastore = require("nedb-promises");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const validator = require("validator");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const AIEngine = require("./ai_cron");

// Email Transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  crypto.createHash("sha256").update("admin123").digest("hex");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "superadmin";

const SECRET_KEY = process.env.SECRET_KEY || crypto.randomBytes(32).toString("hex");

const logger = {
  info: (msg, data = {}) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, error = {}) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error),
  warn: (msg, data = {}) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Password Hashing Utility
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return key === hash;
};

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://images.unsplash.com", "https://source.unsplash.com", "https://*.googleusercontent.com", "https://*.googlesyndication.com"],
        "script-src": ["'self'", "'unsafe-inline'", "https://*.googletagmanager.com", "https://pagead2.googlesyndication.com", "https://adservice.google.com", "https://*.googlesyndication.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.googlesyndication.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "frame-src": ["'self'", "https://googleads.g.doubleclick.net", "https://*.googlesyndication.com", "https://*.google.com"],
      },
    },
  })
);

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const tokenHash = hashToken(token);
    const user = await db.users.findOne({ token_hash: tokenHash, active: 1 });
    
    if (user) {
      req.adminUser = user;
      return next();
    }

    // Fallback for initial setup/dev
    if (tokenHash === ADMIN_PASSWORD_HASH) {
      req.adminUser = { username: "admin", role: "superadmin", active: 1 };
      return next();
    }

    return res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting (Temporarily disabled for production stability)
// const limiter = rateLimit({ ... });
// app.use("/api/", limiter);

// Database Configuration (NeDB - Pure JS for compatibility)
const dbPath = process.env.DB_PATH || "./data";
const db = {
  users: Datastore.create(path.join(dbPath, "users.db")),
  services: Datastore.create(path.join(dbPath, "services.db")),
  testimonies: Datastore.create(path.join(dbPath, "testimonies.db")),
  messages: Datastore.create(path.join(dbPath, "messages.db")),
  settings: Datastore.create(path.join(dbPath, "settings.db")),
  visitors: Datastore.create(path.join(dbPath, "visitors.db")),
  consultations: Datastore.create(path.join(dbPath, "consultations.db")),
  blog_posts: Datastore.create(path.join(dbPath, "blog_posts.db")),
  ai_logs: Datastore.create(path.join(dbPath, "ai_logs.db")),
  newsletter: Datastore.create(path.join(dbPath, "newsletter.db")),
  surrogate_apps: Datastore.create(path.join(dbPath, "surrogate_apps.db")),
  analytics: Datastore.create(path.join(dbPath, "analytics.db")),
  comments: Datastore.create(path.join(dbPath, "comments.db")),
};

// Initialize Database
const multer = require("multer");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const initializeDatabase = async () => {
  try {
    const defaultEmail = (process.env.ADMIN_EMAIL || "admin@gebsurrogacy.com").trim().toLowerCase();
    const defaultPass = process.env.ADMIN_PASSWORD || "Admin@1234";

    logger.info(`Synchronizing Superadmin: ${defaultEmail}`);

    // Sync superadmin from .env on every start (Upsert maintains the same ID)
    await db.users.update(
      { role: "superadmin" },
      { 
        $set: { 
          email: defaultEmail, 
          username: ADMIN_USERNAME, 
          password_hash: hashPassword(defaultPass),
          active: 1 
        } 
      },
      { upsert: true }
    );
    
    logger.info("Superadmin account is now LIVE and READY");

    // Ensure default services
    const servicesCount = await db.services.count({});
    if (servicesCount === 0) {
      const defaultServices = [
        { title: "Surrogacy", description: "Finding the perfect match for your journey.", icon: "Users", created_at: new Date() },
        { title: "Egg Donation", description: "Premium donor selection and care.", icon: "Sparkles", created_at: new Date() },
        { title: "Legal Support", description: "Expert guidance through surrogacy laws.", icon: "Scale", created_at: new Date() },
      ];
      await db.services.insert(defaultServices);
      logger.info("Default services initialized");
    }

    // Ensure default settings
    const settingsCount = await db.settings.count({});
    if (settingsCount === 0) {
      await db.settings.insert({
        consultation_fee: "₦50,000 / $100",
        whatsapp_number: "+2347034270722",
        contact_email: "gebsurrogacyservices@gmail.com",
        nigeria_email: "gebheritagagency@gmail.com",
        uk_email: "gebsurrogacyservices@gmail.com",
        usa_email: "surrogacynigeria01@gmail.com",
        contact_phone: "+2347034270722",
        nigeria_phone: "+2347034270722",
        uk_phone: "+447933193271",
        usa_phone: "+13102188513",
        nigeria_address: "Block D5 Flat 36 CBN Estate 2, Satellite Town Lagos Nigeria",
        uk_address: "Leeds, UK",
        usa_address: "California, USA",
        ai_provider: "gemini",
        ai_auto_posting: "enabled",
        site_name: "GEB Surrogacy Services"
      });
      logger.info("Default settings initialized with official contact info");
    }

    logger.info("All database tables initialized");
    
    // Initialize AI Engine
    const aiEngine = new AIEngine(db);
    await aiEngine.startCron();
    app.locals.aiEngine = aiEngine;

    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running on port ${PORT}`, { 
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });
  } catch (err) {
    logger.error("Database initialization error", err);
  }
};

initializeDatabase();

// --- Static Uploads ---
app.use("/uploads", express.static(uploadDir));

// --- ADMIN UPLOAD ENDPOINT ---
app.post("/api/admin/upload", authenticateAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

// Since the client might call /api/uploads/... we need this proxy/alias if not serving directly
app.use("/api/uploads", express.static(uploadDir));

// --- AUTH ENDPOINTS ---

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (email || username || "").trim().toLowerCase();
    
    logger.info(`Login attempt for: ${identifier}`);

    const user = await db.users.findOne({ 
      $or: [
        { email: identifier },
        { username: identifier },
        { email: identifier.toLowerCase() }
      ],
      active: 1 
    });
    
    if (!user) {
      logger.warn(`Login failed: User not found for ${identifier}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    logger.info(`Found user record for ${identifier}:`, { 
      id: user._id, 
      username: user.username, 
      email: user.email, 
      role: user.role 
    });

    if (!verifyPassword(password, user.password_hash)) {
      logger.warn(`Login failed: Password mismatch for ${identifier}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    
    await db.users.update({ _id: user._id }, { $set: { token_hash: tokenHash } });
    
    logger.info(`Login successful for ${identifier}. Sending response...`);

    // The frontend expects a "success" field to be true!
    const responseData = {
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        username: user.username || "superadmin",
        email: user.email || identifier,
        role: user.role || "superadmin"
      }
    };

    res.json(responseData);
  } catch (error) {
    logger.error("Login error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Alias for older admin routes
app.post("/api/admin/login", (req, res) => {
  return res.redirect(307, "/api/auth/login");
});

// Admin stats
app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
  try {
    const messageCount = await db.messages.count({});
    const serviceCount = await db.services.count({});
    const visitorCount = await db.visitors.count({});
    res.json({
      messages: messageCount,
      services: serviceCount,
      visitors: visitorCount,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/api/admin/messages", authenticateAdmin, async (req, res) => {
  try {
    const messages = await db.messages.find({}).sort({ created_at: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/api/admin/services", authenticateAdmin, async (req, res) => {
  try {
    const services = await db.services.find({}).sort({ created_at: -1 });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

app.post("/api/admin/services", authenticateAdmin, async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    const newService = await db.services.insert({ title, description, icon, created_at: new Date() });
    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ error: "Failed to create service" });
  }
});

app.delete("/api/admin/services/:id", authenticateAdmin, async (req, res) => {
  try {
    await db.services.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

app.get("/api/admin/testimonies", authenticateAdmin, async (req, res) => {
  try {
    const testimonies = await db.testimonies.find({}).sort({ created_at: -1 });
    res.json({ testimonies });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch testimonies" });
  }
});

app.post("/api/admin/testimonies", authenticateAdmin, async (req, res) => {
  try {
    const { name, role, content, image_url } = req.body;
    const newTestimony = await db.testimonies.insert({ name, role, content, image_url, created_at: new Date() });
    res.status(201).json(newTestimony);
  } catch (error) {
    res.status(500).json({ error: "Failed to create testimony" });
  }
});

app.delete("/api/admin/testimonies/:id", authenticateAdmin, async (req, res) => {
  try {
    await db.testimonies.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete testimony" });
  }
});

app.get("/api/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const settings = await db.settings.findOne({});
    res.json({ settings: settings || {} });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.put("/api/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const newSettings = req.body.settings || req.body;
    const current = await db.settings.findOne({});
    if (current) {
      await db.settings.update({ _id: current._id }, { $set: { ...newSettings, updated_at: new Date() } });
    } else {
      await db.settings.insert({ ...newSettings, updated_at: new Date() });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await db.users.find({}, { password_hash: 0 }).sort({ created_at: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const { username, email, role, password } = req.body;
    
    // Check if user already exists
    const existing = await db.users.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const password_hash = hashPassword(password);
    const newUser = await db.users.insert({
      username,
      email,
      role: role || "admin",
      password_hash,
      active: 1,
      created_at: new Date()
    });

    res.status(201).json({ success: true, user: { id: newUser._id, username: newUser.username, role: newUser.role } });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.get("/api/services", async (req, res) => {
  try {
    const rawServices = await db.services.find({}).sort({ created_at: -1 });
    const services = rawServices.map(s => ({ ...s, id: s._id }));
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

app.get("/api/testimonies", async (req, res) => {
  try {
    const rawTestimonies = await db.testimonies.find({}).sort({ created_at: -1 });
    const testimonies = rawTestimonies.map(t => ({ ...t, id: t._id }));
    res.json({ testimonies });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch testimonies" });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await db.settings.findOne({});
    res.json({ settings: settings || {} });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    await db.messages.insert({ name, email, subject, message, status: "unread", created_at: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.post("/api/track-visit", async (req, res) => {
  try {
    const { pageUrl, referrer } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    // Log individual visit
    await db.visitors.insert({ 
      ip_address: req.ip, 
      page_url: pageUrl, 
      referrer, 
      visit_time: new Date() 
    });

    // Update daily analytics
    await db.analytics.update(
      { date: today },
      { $inc: { total_visits: 1 }, $set: { last_visit: new Date() } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    res.json({ success: true });
  }
});

// Newsletter Subscription
app.post("/api/newsletter", async (req, res) => {
  try {
    const { name, email } = req.body;
    const existing = await db.newsletter.findOne({ email });
    if (existing) return res.status(400).json({ error: "Already subscribed" });
    
    await db.newsletter.insert({ name, email, created_at: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Subscription failed" });
  }
});

// Surrogate Application
app.post("/api/surrogate-apply", async (req, res) => {
  try {
    const appData = { ...req.body, status: "pending", created_at: new Date() };
    await db.surrogate_apps.insert(appData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Application failed" });
  }
});

app.get("/api/blog-posts", async (req, res) => {
  try {
    const { category, limit } = req.query;
    let query = { status: "published" };
    if (category && category !== 'All') query.category = category;
    
    let dbQuery = db.blog_posts.find(query).sort({ created_at: -1 });
    if (limit) dbQuery = dbQuery.limit(parseInt(limit));
    
    const rawPosts = await dbQuery;
    const posts = rawPosts.map(p => ({ ...p, id: p._id }));
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

app.get("/api/blog-posts/:id", async (req, res) => {
  try {
    const post = await db.blog_posts.findOne({ _id: req.params.id });
    if (!post) return res.status(404).json({ error: "Post not found" });
    
    // Fetch comments for this post
    const comments = await db.comments.find({ post_id: req.params.id, status: "approved" }).sort({ created_at: -1 });
    
    res.json({ ...post, id: post._id, comments });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Blog Comments
app.post("/api/blog-posts/:id/comments", async (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) return res.status(400).json({ error: "Name and content required" });
    
    const comment = await db.comments.insert({
      post_id: req.params.id,
      name,
      content,
      status: "approved", // Auto-approve for now, can change to 'pending' later
      created_at: new Date()
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: "Failed to post comment" });
  }
});

app.get("/api/admin/blog-posts", authenticateAdmin, async (req, res) => {
  try {
    const posts = await db.blog_posts.find({}).sort({ created_at: -1 });
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

app.post("/api/admin/blog-posts", authenticateAdmin, async (req, res) => {
  try {
    const { title, content, excerpt, category, author, status, imageUrl } = req.body;
    const newPost = await db.blog_posts.insert({
      title,
      content,
      excerpt,
      category: category || "Surrogacy",
      author: author || "GEB Surrogacy Manager",
      status: status || "draft",
      image_url: imageUrl || `https://loremflickr.com/800/600/${encodeURIComponent(category || 'family,surrogacy')}`,
      published_at: status === "published" ? new Date() : null,
      created_at: new Date()
    });
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

app.put("/api/admin/blog-posts/:id", authenticateAdmin, async (req, res) => {
  try {
    const updates = req.body;
    if (updates.status === "published" && !updates.published_at) updates.published_at = new Date();
    await db.blog_posts.update({ _id: req.params.id }, { $set: { ...updates, updated_at: new Date() } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

app.delete("/api/admin/blog-posts/:id", authenticateAdmin, async (req, res) => {
  try {
    await db.blog_posts.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

// --- CONSULTATIONS ---
app.get("/api/consultations", authenticateAdmin, async (req, res) => {
  try {
    const rawConsultations = await db.consultations.find({}).sort({ created_at: -1 });
    const consultations = rawConsultations.map(c => ({ ...c, id: c._id }));
    res.json({ consultations });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch consultations" });
  }
});

app.post("/api/consultations", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, location, preferred_date, message } = req.body;
    
    const newConsultation = await db.consultations.insert({
      first_name,
      last_name,
      email,
      phone,
      location,
      preferred_date,
      message,
      status: "pending",
      created_at: new Date()
    });

    // Send Emails (Don't await to avoid blocking response)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@gebsurrogacy.com";
    const settings = await db.settings.findOne({}) || {};
    const feeInfo = settings.consultation_fee ? `\n\nPlease note the consultation fee is ${settings.consultation_fee}, which will be discussed during our call.` : "";
    
    if (process.env.SMTP_USER) {
      // 1. Notify Admin
      transporter.sendMail({
        from: `"GEB Surrogacy System" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `New Consultation Request from ${first_name} ${last_name}`,
        text: `You have a new consultation request:\n\nName: ${first_name} ${last_name}\nEmail: ${email}\nPhone: ${phone}\nLocation: ${location}\nDate: ${preferred_date}\n\nMessage: ${message || "N/A"}`
      }).catch(err => logger.error("Failed to send admin email", err));

      // 2. Notify User
      transporter.sendMail({
        from: `"GEB Surrogacy Services" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Consultation Request Received - GEB Surrogacy`,
        text: `Dear ${first_name},\n\nThank you for requesting a consultation with GEB Surrogacy Services. We have received your details for ${preferred_date} and will contact you shortly to confirm the appointment.${feeInfo}\n\nWarm regards,\nThe GEB Surrogacy Team`
      }).catch(err => logger.error("Failed to send user email", err));
    }

    res.status(201).json(newConsultation);
  } catch (error) {
    res.status(500).json({ error: "Failed to book consultation" });
  }
});

app.put("/api/consultations/:id", authenticateAdmin, async (req, res) => {
  try {
    await db.consultations.update({ _id: req.params.id }, { $set: { status: req.body.status, updated_at: new Date() } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update consultation" });
  }
});

app.delete("/api/consultations/:id", authenticateAdmin, async (req, res) => {
  try {
    await db.consultations.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete consultation" });
  }
});

// --- AI LOGS & GENERATION ---
app.get("/api/admin/ai/logs", authenticateAdmin, async (req, res) => {
  try {
    const rawLogs = await db.ai_logs.find({}).sort({ created_at: -1 }).limit(50);
    const logs = rawLogs.map(l => ({ ...l, id: l._id }));
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch AI logs" });
  }
});

app.post("/api/admin/ai/generate", authenticateAdmin, async (req, res) => {
  try {
    const { topic } = req.body;
    const aiEngine = req.app.locals.aiEngine;
    
    if (!aiEngine) {
      return res.status(500).json({ error: "AI Engine not initialized" });
    }

    const settings = await db.settings.findOne({});
    const defaultTopic = settings?.ai_topics?.split(',')[0]?.trim() || "The benefits of surrogacy";
    
    const post = await aiEngine.generatePost(topic || defaultTopic);
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to generate AI content" });
  }
});

// --- ADMIN SUMMARY ---
app.get("/api/admin/summary", authenticateAdmin, async (req, res) => {
  try {
    const consultations = await db.consultations.count({});
    const blogPosts = await db.blog_posts.count({});
    const testimonials = await db.testimonies.count({});
    const visitors = await db.visitors.count({});
    const newsletter = await db.newsletter.count({});
    const surrogateApps = await db.surrogate_apps.count({});
    
    // Recent analytics
    const last7Days = await db.analytics.find({}).sort({ date: -1 }).limit(7);
    
    res.json({ consultations, blogPosts, testimonials, visitors, newsletter, surrogateApps, analytics: last7Days });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Admin endpoints for new collections
app.get("/api/admin/newsletter", authenticateAdmin, async (req, res) => {
  try {
    const subscribers = await db.newsletter.find({}).sort({ created_at: -1 });
    res.json({ subscribers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

app.get("/api/admin/surrogate-apps", authenticateAdmin, async (req, res) => {
  try {
    const apps = await db.surrogate_apps.find({}).sort({ created_at: -1 });
    res.json({ apps });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

app.get("/api/admin/comments", authenticateAdmin, async (req, res) => {
  try {
    const comments = await db.comments.find({}).sort({ created_at: -1 });
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

app.delete("/api/admin/comments/:id", authenticateAdmin, async (req, res) => {
  try {
    await db.comments.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Fix 404 JSON for missing API routes before catch-all
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API Endpoint Not Found" });
});

// Serve static files
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// Catch-all
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
