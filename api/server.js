const express = require("express");
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

// Logger utility
const logger = {
  info: (msg, data = {}) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, error = {}) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error),
  warn: (msg, data = {}) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
};

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:5173", "http://localhost:3001"],
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
      initializeDatabase();
    }
  },
);

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

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (
      tokenHash !== ADMIN_PASSWORD_HASH &&
      process.env.NODE_ENV !== "development"
    ) {
      return res.status(403).json({ error: "Forbidden: Invalid token" });
    }
    next();
  } catch (err) {
    logger.error("Auth error", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Initialize database tables
function initializeDatabase() {
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

  // Visitor tracking table
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

  // Create indexes for performance
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_consultations_created ON consultations(created_at)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published_at)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_visitors_visited ON visitors(visited_at)`,
  );

  logger.info("Database tables initialized");
}

// Email transporter setup
const transporter = nodemailer.createTransport({
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
      return res
        .status(400)
        .json({
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
              <li>Phone: +2347034270723</li>
              <li>WhatsApp: +2347034270723</li>
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
        Promise.all([
          transporter.sendMail(clientMailOptions),
          transporter.sendMail(adminMailOptions),
        ])
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

      transporter
        .sendMail(mailOptions)
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

    const sanitizedData = {
      title: validators.sanitize(title),
      excerpt: validators.sanitize(excerpt || ""),
      content: validator.escape(content),
      category: validators.sanitize(category || ""),
      author: validators.sanitize(author || "GEB Team"),
      imageUrl: imageUrl && validators.url(imageUrl) ? imageUrl : null,
      publishedAt: publishedAt || new Date().toISOString(),
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
  } catch (error) {
    logger.error("Create blog post error", error);
    res.status(500).json({ error: "Internal server error" });
  }
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
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
});

module.exports = app;
