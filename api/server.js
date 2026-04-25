const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
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
      return;
    }

    // 2. Fallback to legacy token hash check
    const tokenHash = hashToken(token);
    db.get("SELECT id, username, email, role, active FROM admin_users WHERE token_hash = ? AND active = 1", [tokenHash], (err, user) => {
      if (err) {
        logger.error("Admin auth lookup failed", err);
        return res.status(500).json({ error: "Server error" });
      }

      if (user) {
        req.adminUser = user;
        return next();
      }

      // 3. Fallback to hardcoded admin hash (legacy)
      if (tokenHash === ADMIN_PASSWORD_HASH) {
        req.adminUser = { username: "admin", role: "superadmin", active: 1 };
        return next();
      }

      if (process.env.NODE_ENV === "development" && token === "dev-token") {
        req.adminUser = { username: "dev", role: "superadmin", active: 1 };
        return next();
      }

      return res.status(403).json({ error: "Forbidden: Invalid session" });
    });
  } catch (err) {
    logger.error("Auth error", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Initialize database tables
function initializeDatabase(callback) {
  db.serialize(() => {
    // Consultations table
    db.run(`
      CREATE TABLE IF NOT EXISTS consultations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        location TEXT NOT NULL,
        preferred_date TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Newsletter subscribers table
    db.run(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        active INTEGER DEFAULT 1
      )
    `);

    // Blog posts table
    db.run(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        excerpt TEXT,
        content TEXT,
        category TEXT,
        author TEXT,
        image_url TEXT,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Admin users table
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        role TEXT NOT NULL,
        token_hash TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // Check if we need to add email/password_hash columns to existing table
      db.all("PRAGMA table_info(admin_users)", (err, columns) => {
        if (!err && columns) {
          const hasEmail = columns.some(c => c.name === 'email');
          if (!hasEmail) {
            db.run("ALTER TABLE admin_users ADD COLUMN email TEXT UNIQUE");
            db.run("ALTER TABLE admin_users ADD COLUMN password_hash TEXT");
          }
        }
      });
    });

    // Site settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Testimonies table
    db.run(`
      CREATE TABLE IF NOT EXISTS testimonies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        quote TEXT NOT NULL,
        image_url TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // Add image_url if it doesn't exist
      db.all("PRAGMA table_info(testimonies)", (err, columns) => {
        if (!err && columns && !columns.some(c => c.name === 'image_url')) {
          db.run("ALTER TABLE testimonies ADD COLUMN image_url TEXT");
        }
      });
    });

    // Services table
    db.run(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        features TEXT, -- JSON array
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Visitors table
    db.run(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT,
        user_agent TEXT,
        page_url TEXT,
        referrer TEXT,
        visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Automation log
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_automation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT, -- 'scrape', 'generate', 'post'
        status TEXT, -- 'success', 'error'
        message TEXT,
        topic TEXT,
        post_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_consultations_created ON consultations(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_visitors_visited ON visitors(visited_at)`, (err) => {
      if (err) {
        logger.error("Error initializing database tables", err);
      } else {
        logger.info("Database tables and indexes initialized");
      }
      
      // Ensure default content then call final callback
      ensureDefaultAdminUser((adminErr) => {
        if (adminErr) logger.error("Error creating default admin user", adminErr);
        ensureDefaultSettings((settingsErr) => {
          if (settingsErr) logger.error("Error creating default settings", settingsErr);
          ensureDefaultTestimonies((testiErr) => {
            if (testiErr) logger.error("Error creating default testimonies", testiErr);
            ensureDefaultServices((servErr) => {
              if (servErr) logger.error("Error creating default services", servErr);
              if (typeof callback === "function") {
                callback(err || adminErr || settingsErr || testiErr || servErr);
              }
            });
          });
        });
      });
    });
  });
}

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

  // Verify email transporter connection
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

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db.get(
    "SELECT * FROM admin_users WHERE email = ? AND active = 1",
    [email],
    (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user || !user.password_hash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (verifyPassword(password, user.password_hash)) {
        const token = generateToken({ id: user.id, username: user.username, role: user.role });
        res.json({
          success: true,
          token,
          user: { id: user.id, username: user.username, role: user.role }
        });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    }
  );
});

// --- SETTINGS ENDPOINTS ---

app.get("/api/settings", (req, res) => {
  db.all("SELECT key, value, description FROM site_settings", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch settings" });
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json({ settings, metadata: rows });
  });
});

app.put("/api/admin/settings", authenticateAdmin, authorizeRoles(["superadmin"]), (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: "Settings object required" });
  }

  db.serialize(() => {
    const stmt = db.prepare("UPDATE site_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?");
    Object.entries(settings).forEach(([key, value]) => {
      stmt.run(String(value), key);
    });
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: "Failed to update settings" });
      res.json({ success: true });
    });
  });
});

// Submit consultation request
app.post("/api/consultations", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      location,
      preferredDate,
      message,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        error: "Required fields missing: firstName, lastName, email, phone",
      });
    }

    // Validate input
    if (!validators.name(firstName)) {
      return res.status(400).json({ error: "Invalid first name" });
    }
    if (!validators.name(lastName)) {
      return res.status(400).json({ error: "Invalid last name" });
    }
    if (!validators.email(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (!validators.phone(phone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // Sanitize inputs
    const sanitizedData = {
      firstName: validators.sanitize(firstName),
      lastName: validators.sanitize(lastName),
      email: validator.normalizeEmail(email),
      phone: validators.sanitize(phone),
      location: validators.sanitize(location || ""),
      preferredDate: preferredDate ? validators.sanitize(preferredDate) : null,
      message: validators.sanitize(message || ""),
    };

    const sql = `
      INSERT INTO consultations (first_name, last_name, email, phone, location, preferred_date, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        sanitizedData.firstName,
        sanitizedData.lastName,
        sanitizedData.email,
        sanitizedData.phone,
        sanitizedData.location,
        sanitizedData.preferredDate,
        sanitizedData.message,
      ],
      function (err) {
        if (err) {
          logger.error("Error saving consultation", err);
          return res.status(500).json({ error: "Failed to save consultation" });
        }

        const consultationId = this.lastID;

        // Send confirmation email to client
        const clientMailOptions = {
          from: process.env.SMTP_USER,
          to: sanitizedData.email,
          subject: "Consultation Request Received - GEB Surrogacy Services",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f8a4b9;">Thank you for contacting GEB Surrogacy Services</h2>
            <p>Dear ${sanitizedData.firstName} ${sanitizedData.lastName},</p>
            <p>We have received your consultation request and will get back to you within 24 hours.</p>
            <p><strong>Your Request Details:</strong></p>
            <ul>
              <li>Preferred Date: ${sanitizedData.preferredDate || "Not specified"}</li>
              <li>Location: ${sanitizedData.location || "Not specified"}</li>
            </ul>
            <p>In the meantime, you can reach us directly:</p>
            <ul>
              <li>Phone: +2347034270722</li>
              <li>WhatsApp: +2347034270722</li>
              <li>Email: gebheritagagency@gmail.com</li>
            </ul>
            <p>Best regards,<br>GEB Surrogacy Services Team</p>
          </div>
        `,
        };

        // Send notification email to admin
        const adminMailOptions = {
          from: process.env.SMTP_USER,
          to: process.env.ADMIN_EMAIL || "gebheritagagency@gmail.com",
          subject: "New Consultation Request - GEB Surrogacy",
          html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>New Consultation Request</h2>
            <p><strong>Name:</strong> ${sanitizedData.firstName} ${sanitizedData.lastName}</p>
            <p><strong>Email:</strong> ${sanitizedData.email}</p>
            <p><strong>Phone:</strong> ${sanitizedData.phone}</p>
            <p><strong>Location:</strong> ${sanitizedData.location || "Not specified"}</p>
            <p><strong>Preferred Date:</strong> ${sanitizedData.preferredDate || "Not specified"}</p>
            <p><strong>Message:</strong> ${sanitizedData.message || "No message"}</p>
            <p><strong>Consultation ID:</strong> ${consultationId}</p>
          </div>
        `,
        };

        // Send emails asynchronously
        Promise.all([sendMail(clientMailOptions), sendMail(adminMailOptions)])
          .then(() => {
            logger.info("Consultation emails sent", {
              consultationId,
              email: sanitizedData.email,
            });
          })
          .catch((error) => {
            logger.error("Failed to send consultation emails", error);
          });

        res.status(201).json({
          success: true,
          message: "Consultation request submitted successfully",
          id: consultationId,
        });
      },
    );
  } catch (error) {
    logger.error("Consultation endpoint error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- TESTIMONIES ENDPOINTS ---

// Get all active testimonies (public)
app.get("/api/testimonies", (req, res) => {
  db.all("SELECT * FROM testimonies WHERE active = 1 ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch testimonies" });
    res.json({ testimonies: rows });
  });
});

app.get("/api/admin/testimonies", authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM testimonies ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch all testimonies" });
    res.json({ testimonies: rows });
  });
});

// Create testimony (admin)
app.post("/api/testimonies", authenticateAdmin, (req, res) => {
  const { name, location, quote, image_url } = req.body;
  if (!name || !quote) return res.status(400).json({ error: "Name and quote are required" });
  
  db.run("INSERT INTO testimonies (name, location, quote, image_url) VALUES (?, ?, ?, ?)", 
    [validators.sanitize(name), validators.sanitize(location || ""), validators.sanitize(quote), image_url], 
    function(err) {
      if (err) return res.status(500).json({ error: "Failed to create testimony" });
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

// Update testimony (admin)
app.put("/api/testimonies/:id", authenticateAdmin, (req, res) => {
  const { name, location, quote, active, image_url } = req.body;
  const id = req.params.id;
  
  db.run("UPDATE testimonies SET name = ?, location = ?, quote = ?, active = ?, image_url = ? WHERE id = ?",
    [validators.sanitize(name), validators.sanitize(location), validators.sanitize(quote), active ? 1 : 0, image_url, id],
    function(err) {
      if (err) return res.status(500).json({ error: "Failed to update testimony" });
      res.json({ success: true });
    }
  );
});

// Delete testimony (admin)
app.delete("/api/testimonies/:id", authenticateAdmin, (req, res) => {
  db.run("DELETE FROM testimonies WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to delete testimony" });
    res.json({ success: true });
  });
});

// --- SERVICES ENDPOINTS ---

// Get all active services (public)
app.get("/api/services", (req, res) => {
  db.all("SELECT * FROM services WHERE active = 1 ORDER BY id ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch services" });
    // Parse features JSON
    const services = rows.map(r => ({
      ...r,
      features: JSON.parse(r.features || "[]")
    }));
    res.json({ services });
  });
});

app.get("/api/admin/services", authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM services ORDER BY id ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch all services" });
    const services = rows.map(r => ({
      ...r,
      features: JSON.parse(r.features || "[]")
    }));
    res.json({ services });
  });
});

// Create/Update service (admin)
app.post("/api/services", authenticateAdmin, (req, res) => {
  const { title, description, icon, features } = req.body;
  db.run("INSERT INTO services (title, description, icon, features) VALUES (?, ?, ?, ?)",
    [validators.sanitize(title), validators.sanitize(description), validators.sanitize(icon), JSON.stringify(features || [])],
    function(err) {
      if (err) return res.status(500).json({ error: "Failed to create service" });
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

app.put("/api/services/:id", authenticateAdmin, (req, res) => {
  const { title, description, icon, features, active } = req.body;
  db.run("UPDATE services SET title = ?, description = ?, icon = ?, features = ?, active = ? WHERE id = ?",
    [validators.sanitize(title), validators.sanitize(description), validators.sanitize(icon), JSON.stringify(features || []), active ? 1 : 0, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: "Failed to update service" });
      res.json({ success: true });
    }
  );
});

// --- CONSULTATIONS ENDPOINTS ---

// Get all consultations (admin)
app.get("/api/consultations", authenticateAdmin, (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    let sql = "SELECT * FROM consultations";
    const params = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(validators.sanitize(status));
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    db.all(sql, params, (err, rows) => {
      if (err) {
        logger.error("Error fetching consultations", err);
        return res.status(500).json({ error: "Failed to fetch consultations" });
      }
      res.json({ consultations: rows, count: rows.length });
    });
  } catch (error) {
    logger.error("Get consultations error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update consultation status (admin)
app.put("/api/consultations/:id", authenticateAdmin, (req, res) => {
  const { status } = req.body;
  const id = req.params.id;
  
  if (!status) return res.status(400).json({ error: "Status is required" });
  
  db.run("UPDATE consultations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [validators.sanitize(status), id],
    function(err) {
      if (err) return res.status(500).json({ error: "Failed to update consultation" });
      res.json({ success: true });
    }
  );
});

// Delete consultation (admin)
app.delete("/api/consultations/:id", authenticateAdmin, (req, res) => {
  db.run("DELETE FROM consultations WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to delete consultation" });
    res.json({ success: true });
  });
});

// Download consultation requests as CSV (admin)
app.get("/api/consultations/csv", authenticateAdmin, (req, res) => {
  try {
    db.all("SELECT * FROM consultations ORDER BY created_at DESC", [], (err, rows) => {
      if (err) {
        logger.error("Error exporting consultations CSV", err);
        return res.status(500).json({ error: "Failed to export consultations" });
      }

      const header = [
        "ID",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Location",
        "Preferred Date",
        "Message",
        "Status",
        "Created At",
        "Updated At",
      ];

      const csvRows = rows.map((row) => [
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.location,
        row.preferred_date,
        row.message?.replace(/\r?\n/g, ' '),
        row.status,
        row.created_at,
        row.updated_at,
      ]);

      const csvContent = [header, ...csvRows]
        .map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=consultations.csv");
      res.send(csvContent);
    });
  } catch (error) {
    logger.error("Get consultations CSV error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Subscribe to newsletter
app.post("/api/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!validators.email(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const normalizedEmail = validator.normalizeEmail(email);
    const sql = "INSERT INTO subscribers (email) VALUES (?)";

    db.run(sql, [normalizedEmail], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({ error: "Email already subscribed" });
        }
        logger.error("Error subscribing", err);
        return res.status(500).json({ error: "Failed to subscribe" });
      }

      const subscriberId = this.lastID;

      // Send welcome email
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: normalizedEmail,
        subject: "Welcome to GEB Surrogacy Newsletter",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f8a4b9;">Welcome to Our Newsletter!</h2>
            <p>Thank you for subscribing to GEB Surrogacy Services newsletter.</p>
            <p>You'll receive updates on:</p>
            <ul>
              <li>Surrogacy news and insights</li>
              <li>Success stories from our families</li>
              <li>Health tips and guidance</li>
              <li>Agency updates and events</li>
            </ul>
            <p>Best regards,<br>GEB Surrogacy Services Team</p>
          </div>
        `,
      };

      sendMail(mailOptions)
        .then(() => {
          logger.info("Welcome email sent", {
            subscriberId,
            email: normalizedEmail,
          });
        })
        .catch((error) => {
          logger.error("Failed to send welcome email", error);
        });

      res.status(201).json({
        success: true,
        message: "Subscribed successfully",
        id: subscriberId,
      });
    });
  } catch (error) {
    logger.error("Subscribe endpoint error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all subscribers (admin)
app.get("/api/subscribers", authenticateAdmin, (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const sql = `SELECT id, email, subscribed_at FROM subscribers WHERE active = 1
                 ORDER BY subscribed_at DESC LIMIT ? OFFSET ?`;

    db.all(sql, [parseInt(limit), parseInt(offset)], (err, rows) => {
      if (err) {
        logger.error("Error fetching subscribers", err);
        return res.status(500).json({ error: "Failed to fetch subscribers" });
      }
      res.json({ subscribers: rows, count: rows.length });
    });
  } catch (error) {
    logger.error("Get subscribers error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Blog posts - Get all published
app.get("/api/blog-posts", (req, res) => {
  try {
    const { limit = 10, offset = 0, category } = req.query;
    let sql = "SELECT * FROM blog_posts WHERE published_at IS NOT NULL";
    const params = [];

    if (category) {
      sql += " AND category = ?";
      params.push(validators.sanitize(category));
    }

    sql += " ORDER BY published_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    db.all(sql, params, (err, rows) => {
      if (err) {
        logger.error("Error fetching blog posts", err);
        return res.status(500).json({ error: "Failed to fetch blog posts" });
      }
      res.json({ posts: rows, count: rows.length });
    });
  } catch (error) {
    logger.error("Get blog posts error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single blog post
app.get("/api/blog-posts/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid blog post ID" });
    }

    const sql =
      "SELECT * FROM blog_posts WHERE id = ? AND published_at IS NOT NULL";
    db.get(sql, [id], (err, row) => {
      if (err) {
        logger.error("Error fetching blog post", err);
        return res.status(500).json({ error: "Failed to fetch blog post" });
      }
      if (!row) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(row);
    });
  } catch (error) {
    logger.error("Get blog post error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create blog post (admin)
app.post("/api/blog-posts", authenticateAdmin, async (req, res) => {
  try {
    const { title, excerpt, content, category, author, imageUrl, publishedAt } =
      req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    if (validator.isLength(title, { min: 5, max: 200 }) === false) {
      return res
        .status(400)
        .json({ error: "Title must be between 5 and 200 characters" });
    }

    let publishedAtValue = null;
    if (publishedAt && publishedAt !== 'draft') {
      const publishedAtDate = new Date(publishedAt);
      if (!Number.isNaN(publishedAtDate.getTime())) {
        publishedAtValue = publishedAtDate.toISOString();
      }
    }

    const sanitizedData = {
      title: validators.sanitize(title),
      excerpt: validators.sanitize(excerpt || ""),
      content: validator.escape(content),
      category: validators.sanitize(category || ""),
      author: validators.sanitize(author || "GEB Team"),
      imageUrl: imageUrl && validators.url(imageUrl) ? imageUrl : null,
      publishedAt: publishedAtValue,
    };

    const sql = `
      INSERT INTO blog_posts (title, excerpt, content, category, author, image_url, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        sanitizedData.title,
        sanitizedData.excerpt,
        sanitizedData.content,
        sanitizedData.category,
        sanitizedData.author,
        sanitizedData.imageUrl,
        sanitizedData.publishedAt,
      ],
      function (err) {
        if (err) {
          logger.error("Error creating blog post", err);
          return res.status(500).json({ error: "Failed to create blog post" });
        }
        logger.info("Blog post created", { postId: this.lastID });
        res.status(201).json({ success: true, id: this.lastID });
      },
    );

    return;
  } catch (error) {
    logger.error("Create blog post error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all blog posts (admin)
app.get("/api/admin/blog-posts", authenticateAdmin, (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const sql = `SELECT * FROM blog_posts ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    db.all(sql, [parseInt(limit), parseInt(offset)], (err, rows) => {
      if (err) {
        logger.error("Error fetching admin blog posts", err);
        return res.status(500).json({ error: "Failed to fetch admin blog posts" });
      }
      res.json({ posts: rows, count: rows.length });
    });
  } catch (error) {
    logger.error("Get admin blog posts error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update blog post (admin)
app.put("/api/blog-posts/:id", authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid blog post ID" });
    }

    const { title, excerpt, content, category, author, imageUrl, publishedAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    let publishedAtValue = null;
    if (publishedAt && publishedAt !== 'draft') {
      const publishedAtDate = new Date(publishedAt);
      if (!Number.isNaN(publishedAtDate.getTime())) {
        publishedAtValue = publishedAtDate.toISOString();
      }
    }

    const sql = `
      UPDATE blog_posts SET title = ?, excerpt = ?, content = ?, category = ?, author = ?, image_url = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(
      sql,
      [
        validators.sanitize(title),
        validators.sanitize(excerpt || ""),
        validator.escape(content),
        validators.sanitize(category || ""),
        validators.sanitize(author || "GEB Team"),
        imageUrl && validators.url(imageUrl) ? imageUrl : null,
        publishedAtValue,
        id,
      ],
      function (err) {
        if (err) {
          logger.error("Error updating blog post", err);
          return res.status(500).json({ error: "Failed to update blog post" });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: "Blog post not found" });
        }
        res.json({ success: true });
      },
    );
  } catch (error) {
    logger.error("Update blog post error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete blog post (admin)
app.delete("/api/blog-posts/:id", authenticateAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid blog post ID" });
    }

    db.run("DELETE FROM blog_posts WHERE id = ?", [id], function (err) {
      if (err) {
        logger.error("Error deleting blog post", err);
        return res.status(500).json({ error: "Failed to delete blog post" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json({ success: true });
    });
  } catch (error) {
    logger.error("Delete blog post error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- AI AUTOMATION ENDPOINTS ---

app.get("/api/admin/ai/logs", authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM ai_automation_log ORDER BY created_at DESC LIMIT 50", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch logs" });
    res.json({ logs: rows });
  });
});

app.post("/api/admin/ai/generate", authenticateAdmin, async (req, res) => {
  try {
    const { topic } = req.body;
    
    // Fetch AI settings
    db.all("SELECT key, value FROM site_settings WHERE key LIKE 'ai_%'", [], async (err, settings) => {
      if (err) return res.status(500).json({ error: "Failed to fetch AI settings" });
      
      const config = {};
      settings.forEach(s => config[s.key] = s.value);
      
      if (!config.ai_api_key) return res.status(400).json({ error: "AI API Key not configured" });

      const targetTopic = topic || config.ai_topics?.split(",")[0]?.trim() || "Surrogacy Journey";
      
      const prompt = `Write a comprehensive, professional, and highly engaging educational blog post about "${targetTopic}" related to surrogacy, IVF, and parenthood. 
      
      Requirements:
      1. Use clear, captivated headings (H2, H3).
      2. Include bullet points or numbered lists for readability.
      3. The content must be at least 800 words.
      4. Suggest a high-quality stock image search term related to the topic.
      5. Format the ENTIRE response as a VALID JSON object with these EXACT keys: 
         "title", "excerpt", "content" (HTML formatted string), "category", "image_search_term".

      Example structure for "content":
      "<h2>Introduction</h2><p>...</p><h3>Key Benefits</h3><ul><li>...</li></ul>..."`;

      try {
        const aiResponse = await callAI(prompt, config.ai_provider, config.ai_api_key);
        // Clean up the response if AI wraps it in markdown code blocks
        const cleanedResponse = aiResponse.replace(/```json|```/g, "").trim();
        const postData = JSON.parse(cleanedResponse);

        // Fetch a relevant image from Unsplash (Source API)
        const imageUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(postData.image_search_term || targetTopic)}`;

        // Insert into blog_posts
        db.run(
          "INSERT INTO blog_posts (title, excerpt, content, category, author, image_url, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [postData.title, postData.excerpt, postData.content, postData.category, "GEB AI Writer", imageUrl, new Date().toISOString()],
          function(insertErr) {
            if (insertErr) {
              db.run("INSERT INTO ai_automation_log (action, status, message, topic) VALUES (?, ?, ?, ?)", ["post", "error", insertErr.message, targetTopic]);
              return res.status(500).json({ error: "Failed to save generated post" });
            }
            
            db.run("INSERT INTO ai_automation_log (action, status, message, topic, post_id) VALUES (?, ?, ?, ?, ?)", 
              ["post", "success", "AI generated post published", targetTopic, this.lastID]);
              
            res.json({ success: true, post: postData });
          }
        );
      } catch (aiErr) {
        db.run("INSERT INTO ai_automation_log (action, status, message, topic) VALUES (?, ?, ?, ?)", ["generate", "error", aiErr.message, targetTopic]);
        res.status(500).json({ error: aiErr.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin summary dashboard
app.get("/api/admin/summary", authenticateAdmin, (req, res) => {
  try {
    const result = {};
    db.serialize(() => {
      db.get("SELECT COUNT(*) AS total FROM consultations", [], (err, row) => {
        result.consultations = err ? 0 : row.total;
        db.get("SELECT COUNT(*) AS total FROM subscribers WHERE active = 1", [], (err2, row2) => {
          result.subscribers = err2 ? 0 : row2.total;
          db.get("SELECT COUNT(*) AS total FROM visitors", [], (err3, row3) => {
            result.visitors = err3 ? 0 : row3.total;
            db.get("SELECT COUNT(*) AS total FROM blog_posts", [], (err4, row4) => {
              result.blogPosts = err4 ? 0 : row4.total;
              db.get("SELECT COUNT(*) AS total FROM testimonies", [], (err5, row5) => {
                result.testimonials = err5 ? 0 : row5.total;
                res.json(result);
              });
            });
          });
        });
      });
    });
  } catch (error) {
    logger.error("Admin summary error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin users management
app.get("/api/admin/users", authenticateAdmin, authorizeRoles(["superadmin"]), (req, res) => {
  db.all("SELECT id, username, email, role, active, created_at FROM admin_users", [], (err, rows) => {
    if (err) {
      logger.error("Error fetching admin users", err);
      return res.status(500).json({ error: "Failed to fetch admin users" });
    }
    res.json({ users: rows });
  });
});

app.post("/api/admin/users", authenticateAdmin, authorizeRoles(["superadmin"]), (req, res) => {
  try {
    const { username, email, role, password } = req.body;
    if (!username || !email || !role || !password) {
      return res.status(400).json({ error: "Username, email, role, and password are required" });
    }

    const passHash = hashPassword(password);
    db.run(
      "INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [validators.sanitize(username), validators.sanitize(email), passHash, validators.sanitize(role)],
      function (err) {
        if (err) {
          logger.error("Error creating admin user", err);
          return res.status(500).json({ error: "Failed to create admin user" });
        }
        res.status(201).json({ success: true, id: this.lastID });
      },
    );
  } catch (error) {
    logger.error("Create admin user error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/admin/users/:id", authenticateAdmin, authorizeRoles(["superadmin"]), (req, res) => {
  const id = req.params.id;
  if (id == 1) return res.status(403).json({ error: "Cannot delete the primary admin" });
  
  db.run("DELETE FROM admin_users WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to delete user" });
    res.json({ success: true });
  });
});

// Track visitor
app.post("/api/track-visit", (req, res) => {
  try {
    const { pageUrl, referrer } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    if (!pageUrl) {
      return res.status(400).json({ error: "pageUrl is required" });
    }

    const sql =
      "INSERT INTO visitors (ip_address, user_agent, page_url, referrer) VALUES (?, ?, ?, ?)";
    db.run(
      sql,
      [
        ipAddress,
        userAgent,
        validators.sanitize(pageUrl),
        validators.sanitize(referrer || ""),
      ],
      (err) => {
        if (err) {
          logger.warn("Error tracking visit", err);
        }
      },
    );

    res.json({ success: true });
  } catch (error) {
    logger.warn("Track visit error", error);
    res.json({ success: true });
  }
});

// Get visitor stats (admin)
app.get("/api/visitor-stats", authenticateAdmin, (req, res) => {
  try {
    const stats = {};
    let completed = 0;
    const total = 3;

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
