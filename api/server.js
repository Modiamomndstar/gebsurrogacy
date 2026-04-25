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
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";
const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  crypto.createHash("sha256").update("admin123").digest("hex");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "superadmin";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const ADMIN_ROLE = process.env.ADMIN_ROLE || "superadmin";
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const SECRET_KEY = process.env.SECRET_KEY || crypto.randomBytes(32).toString("hex");

const generateToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64");
  const signature = crypto.createHmac("sha256", SECRET_KEY).update(`${header}.${body}`).digest("base64");
  return `${header}.${body}.${signature}`;
};

const verifyToken = (token) => {
  try {
    const [header, body, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", SECRET_KEY).update(`${header}.${body}`).digest("base64");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(body, "base64").toString());
  } catch (e) {
    return null;
  }
};

const logger = {
  info: (msg, data = {}) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, error = {}) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error),
  warn: (msg, data = {}) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
};

// Password Hashing Utility
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
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
        "img-src": ["'self'", "data:", "https://images.unsplash.com", "https://source.unsplash.com", "https://*.googleusercontent.com"],
        "script-src": ["'self'", "'unsafe-inline'", "https://*.googletagmanager.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
      },
    },
  })
);
app.use(
  cors({
    origin: true, // Allow all origins in production for simplicity with proxy
    credentials: true,
  }),
);

// Body parser middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const consultationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: "Too many consultation requests, please try again later",
  skipSuccessfulRequests: true,
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many subscription requests, please try again later",
  skipSuccessfulRequests: true,
});

app.use("/api/", limiter);
app.use("/api/consultations", consultationLimiter);
app.use("/api/subscribe", newsletterLimiter);

// Database setup
const db = new sqlite3.Database(
  process.env.DB_PATH || "./database.sqlite",
  (err) => {
    if (err) {
      logger.error("Error opening database", err);
      process.exit(1);
    } else {
      logger.info("Connected to SQLite database");
      initializeDatabase((initErr) => {
        if (initErr) {
          logger.error("Fatal database initialization error", initErr);
          process.exit(1);
        }

        server = app.listen(PORT, "0.0.0.0", () => {
          logger.info(`Server running on port ${PORT}`, {
            environment: NODE_ENV,
            timestamp: new Date().toISOString(),
          });
        });
      });
    }
  },
);

let server;

// Validation utilities
const validators = {
  email: (email) => validator.isEmail(email),
  phone: (phone) => /^\+?[\d\s\-()]{10,}$/.test(phone),
  name: (name) =>
    validator.isLength(name, { min: 2, max: 100 }) &&
    /^[a-zA-Z\s'-]+$/.test(name),
  url: (url) => validator.isURL(url),
  sanitize: (input) => validator.escape(String(input).trim()),
};

// AI SERVICE LOGIC
const callAI = async (prompt, provider = "gemini", apiKey = "") => {
  if (!apiKey) throw new Error("AI API Key is missing");

  return new Promise((resolve, reject) => {
    let url, data, headers;

    if (provider === "gemini") {
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      data = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
      headers = { "Content-Type": "application/json" };
    } else if (provider === "openai" || provider === "groq") {
      url = provider === "groq" 
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
      data = JSON.stringify({
        model: provider === "groq" ? "llama3-8b-8192" : "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      });
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      };
    } else {
      return reject(new Error("Unsupported AI provider"));
    }

    const https = require("https");
    const options = {
      method: "POST",
      headers: headers
    };

    const req = https.request(url, options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => (responseBody += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(responseBody);
          if (res.statusCode !== 200) {
            return reject(new Error(json.error?.message || "AI API Error"));
          }
          
          let result;
          if (provider === "gemini") {
            result = json.candidates?.[0]?.content?.parts?.[0]?.text;
          } else {
            result = json.choices?.[0]?.message?.content;
          }
          resolve(result);
        } catch (e) {
          reject(new Error("Failed to parse AI response"));
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.write(data);
    req.end();
  });
};

function getAdminUserByToken(tokenHash, callback) {
  db.get(
    "SELECT id, username, role, active FROM admin_users WHERE token_hash = ? AND active = 1",
    [tokenHash],
    callback,
  );
}

function ensureDefaultAdminUser(callback) {
  const defaultEmail = process.env.ADMIN_EMAIL || "admin@gebsurrogacy.com";
  const defaultPass = process.env.ADMIN_PASSWORD || "admin123";
  const passHash = hashPassword(defaultPass);

  db.get("SELECT * FROM admin_users WHERE email = ?", [defaultEmail], (err, user) => {
    if (err) return callback(err);
    
    if (!user) {
      // Create if doesn't exist
      db.run(
        "INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [ADMIN_USERNAME, defaultEmail, passHash, "superadmin"],
        (insertErr) => {
          if (insertErr) return callback(insertErr);
          logger.info("Default admin user created", { username: ADMIN_USERNAME, email: defaultEmail });
          callback(null);
        },
      );
    } else {
      // Update password if env provided and it's the primary admin
      if (process.env.ADMIN_PASSWORD) {
        db.run(
          "UPDATE admin_users SET password_hash = ? WHERE email = ?",
          [passHash, defaultEmail],
          (updateErr) => {
            if (updateErr) logger.error("Failed to sync admin password", updateErr);
            callback(null);
          }
        );
      } else {
        callback(null);
      }
    }
  });
}

function ensureDefaultSettings(callback) {
  const defaultSettings = [
    { key: "company_name", value: "GEB Surrogacy Services", desc: "Official company name" },
    { key: "contact_email", value: "gebheritagagency@gmail.com", desc: "Public contact email" },
    { key: "contact_phone", value: "+234 703 427 0722", desc: "Public contact phone" },
    { key: "whatsapp_number", value: "+2347034270722", desc: "WhatsApp contact number" },
    { key: "consultation_fee", value: "$100", desc: "Fee for consultations" },
    { key: "address_nigeria", value: "Block D5 Flat 36 CBN Estate 2, Satellite Town Lagos Nigeria", desc: "Nigeria Office Address" },
    { key: "address_uk", value: "Leeds, UK", desc: "UK Presence Address" },
    { key: "address_usa", value: "California, USA", desc: "USA Presence Address" },
    { key: "uk_phone", value: "+44 7933 193271", desc: "UK Phone Number" },
    { key: "usa_phone", value: "+1 310 218 8513", desc: "USA Phone Number" },
    { key: "ai_provider", value: "gemini", desc: "AI provider (gemini, openai, or groq)" },
    { key: "ai_api_key", value: "", desc: "API key for the AI provider" },
    { key: "ai_topics", value: "Gestational Surrogacy, IVF Journey, Pregnancy Tips, Parenthood in UK/Nigeria", desc: "Topics for AI to focus on" },
    { key: "ai_auto_posting", value: "disabled", desc: "Enable or disable daily auto-posting" }
  ];

  db.get("SELECT COUNT(*) AS count FROM site_settings", [], (err, row) => {
    if (err) return callback(err);
    if (row && row.count > 0) return callback(null);

    const stmt = db.prepare("INSERT INTO site_settings (key, value, description) VALUES (?, ?, ?)");
    defaultSettings.forEach(s => stmt.run(s.key, s.value, s.desc));
    stmt.finalize(callback);
  });
}

function ensureDefaultTestimonies(callback) {
  const defaultTestimonies = [
    { name: "The Johnson Family", location: "Leeds, UK", quote: "GEB Surrogacy made our dream of parenthood a reality. Their support was unwavering throughout the entire journey. We are forever grateful." },
    { name: "The Smiths", location: "Lagos, Nigeria", quote: "Professional, caring, and dedicated. Blessing and her team walked with us every step of the way. We couldn't have asked for better support." },
    { name: "The Williams", location: "California, USA", quote: "After 10 years of trying, GEB Surrogacy helped us finally become parents. Their compassion and expertise are unmatched." }
  ];

  db.get("SELECT COUNT(*) AS count FROM testimonies", [], (err, row) => {
    if (err) return callback(err);
    if (row && row.count > 0) return callback(null);

    const stmt = db.prepare("INSERT INTO testimonies (name, location, quote) VALUES (?, ?, ?)");
    defaultTestimonies.forEach(t => stmt.run(t.name, t.location, t.quote));
    stmt.finalize(callback);
  });
}

function ensureDefaultServices(callback) {
  const defaultServices = [
    { title: "Gestational Surrogacy", description: "Full surrogacy program including surrogate matching, medical coordination, and comprehensive support.", icon: "Baby", features: JSON.stringify(["Personalized matching", "Medical screening", "Legal support", "Emotional counseling"]) },
    { title: "IVF Coordination", description: "Expert fertility treatment management with partner clinics, ensuring the highest standards of care.", icon: "Stethoscope", features: JSON.stringify(["Partner clinic network", "Treatment monitoring", "Travel coordination", "Success tracking"]) },
    { title: "Egg Donation", description: "Access to our premium donor database with comprehensive screening and matching services.", icon: "Users", features: JSON.stringify(["Verified donors", "Medical history", "Genetic screening", "Anonymous options"]) },
    { title: "Legal Support", description: "Comprehensive contract and parental rights assistance to protect all parties involved.", icon: "FileText", features: JSON.stringify(["Contract drafting", "Parental orders", "International law", "Documentation"]) }
  ];

  db.get("SELECT COUNT(*) AS count FROM services", [], (err, row) => {
    if (err) return callback(err);
    if (row && row.count > 0) return callback(null);

    const stmt = db.prepare("INSERT INTO services (title, description, icon, features) VALUES (?, ?, ?, ?)");
    defaultServices.forEach(s => stmt.run(s.title, s.description, s.icon, s.features));
    stmt.finalize(callback);
  });
}

const authorizeRoles = (allowedRoles) => (req, res, next) => {
  if (!req.adminUser || !allowedRoles.includes(req.adminUser.role)) {
    return res.status(403).json({ error: "Forbidden: Insufficient role" });
  }
  next();
};

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  try {
    // 1. Check if it's a new JWT-like token
    const decoded = verifyToken(token);
    if (decoded) {
      db.get("SELECT id, username, email, role, active FROM admin_users WHERE id = ? AND active = 1", [decoded.id], (err, user) => {
        if (!err && user) {
          req.adminUser = user;
          return next();
        }
        return res.status(401).json({ error: "Invalid or inactive user session" });
      });
    const tokenHash = hashToken(token);
    const user = await db.users.findOne({ token_hash: tokenHash, active: 1 });
    
    if (user) {
      req.adminUser = user;
      return next();
    }

    if (tokenHash === ADMIN_PASSWORD_HASH) {
      req.adminUser = { username: "admin", role: "superadmin", active: 1 };
      return next();
    }

    return res.status(403).json({ error: "Forbidden: Invalid session" });
  } catch (err) {
    logger.error("Auth error", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Email transporter setup
const smtpEnabled =
  process.env.SMTP_ENABLED !== "false" &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;
let transporter = null;

if (smtpEnabled) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      logger.warn("Email transporter verification failed", error);
    } else {
      logger.info("Email transporter ready");
    }
  });
} else {
  logger.info("SMTP email sending disabled for this environment");
}

const sendMail = (mailOptions) => {
  if (!transporter) {
    logger.warn("SMTP disabled, skipping email send", {
      to: mailOptions.to,
      subject: mailOptions.subject,
    });
    return Promise.resolve();
  }
  return transporter.sendMail(mailOptions);
};

// Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: "1.0.0",
  });
});

// --- AUTH ENDPOINTS ---

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.users.findOne({ username, active: 1 });
    
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    
    await db.users.update({ _id: user._id }, { $set: { token_hash: tokenHash } });
    
    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    logger.error("Login error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin routes with NeDB async
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
    res.json(services);
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
    res.json(testimonies);
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
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const current = await db.settings.findOne({});
    if (current) {
      await db.settings.update({ _id: current._id }, { $set: { ...req.body, updated_at: new Date() } });
    } else {
      await db.settings.insert({ ...req.body, updated_at: new Date() });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

app.get("/api/services", async (req, res) => {
  try {
    const services = await db.services.find({}).sort({ created_at: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

app.get("/api/testimonies", async (req, res) => {
  try {
    const testimonies = await db.testimonies.find({}).sort({ created_at: -1 });
    res.json(testimonies);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch testimonies" });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await db.settings.findOne({});
    res.json(settings || {});
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
    // Total visits
    db.get("SELECT COUNT(*) as total FROM visitors", [], (err, row) => {
      if (!err && row) {
        stats.totalVisits = row.total;
      }
      completed++;
      if (completed === total) {
        res.json(stats);
      }
    });

    // Unique visitors (by IP)
    db.get(
      "SELECT COUNT(DISTINCT ip_address) as unique FROM visitors",
      [],
      (err, row) => {
        if (!err && row) {
          stats.uniqueVisitors = row.unique;
        }
        completed++;
        if (completed === total) {
          res.json(stats);
        }
      },
    );

    // Today's visits
    db.get(
      "SELECT COUNT(*) as today FROM visitors WHERE date(visited_at) = date('now')",
      [],
      (err, row) => {
        if (!err && row) {
          stats.todayVisits = row.today;
        }
        completed++;
        if (completed === total) {
          res.json(stats);
        }
      },
    );
  } catch (error) {
    logger.error("Get visitor stats error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error", err);
  res.status(err.status || 500).json({
    error: NODE_ENV === "production" ? "Internal server error" : err.message,
    ...(NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// 404 handler for API
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Serve static files from the React app
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// The "catchall" handler: for any request that doesn't match an API route or a static file, send back index.html.
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Server will start after database initialization completes

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      db.close((err) => {
        if (err) {
          logger.error("Error closing database", err);
        } else {
          logger.info("Database connection closed");
        }
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
});

module.exports = app;
