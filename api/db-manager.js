#!/usr/bin/env node

/**
 * Database Management Script
 * Usage: node db-manager.js [command]
 * Commands:
 *   init      - Initialize database
 *   backup    - Create database backup
 *   restore   - Restore database from backup
 *   migrate   - Run migrations
 *   drop      - Drop all tables (WARNING)
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || "./database.sqlite";
const BACKUP_DIR = "./backups";

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Database initialization SQL
const INIT_SQL = `
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
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    active INTEGER DEFAULT 1
  );

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
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT,
    user_agent TEXT,
    page_url TEXT,
    referrer TEXT,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email);
  CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
  CREATE INDEX IF NOT EXISTS idx_consultations_created ON consultations(created_at);
  CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
  CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published_at);
  CREATE INDEX IF NOT EXISTS idx_visitors_visited ON visitors(visited_at);
`;

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`✓ Connected to database: ${DB_PATH}`);
          resolve();
        }
      });
    });
  }

  closeDatabase() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log("✓ Database connection closed");
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  runAsync(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async initialize() {
    try {
      await this.openDatabase();
      console.log("⏳ Initializing database...");
      await this.runAsync(INIT_SQL);
      console.log("✓ Database initialized successfully");
      await this.closeDatabase();
    } catch (error) {
      console.error("✗ Error initializing database:", error.message);
      process.exit(1);
    }
  }

  async backup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.sqlite`);

      if (!fs.existsSync(DB_PATH)) {
        throw new Error("Database file not found");
      }

      fs.copyFileSync(DB_PATH, backupPath);
      const backupSize = fs.statSync(backupPath).size / 1024 / 1024;
      console.log(
        `✓ Database backed up to: ${backupPath} (${backupSize.toFixed(2)} MB)`,
      );
    } catch (error) {
      console.error("✗ Error backing up database:", error.message);
      process.exit(1);
    }
  }

  async restore() {
    try {
      const backups = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("backup-") && f.endsWith(".sqlite"))
        .sort()
        .reverse();

      if (backups.length === 0) {
        throw new Error("No backups found");
      }

      console.log("Available backups:");
      backups.slice(0, 5).forEach((backup, index) => {
        console.log(`  ${index + 1}. ${backup}`);
      });

      // Use the latest backup
      const latestBackup = backups[0];
      const backupPath = path.join(BACKUP_DIR, latestBackup);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archivePath = path.join(BACKUP_DIR, `archive-${timestamp}.sqlite`);

      // Archive current database if it exists
      if (fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, archivePath);
        console.log(`✓ Current database archived to: ${archivePath}`);
      }

      // Restore from backup
      fs.copyFileSync(backupPath, DB_PATH);
      console.log(`✓ Database restored from: ${latestBackup}`);
    } catch (error) {
      console.error("✗ Error restoring database:", error.message);
      process.exit(1);
    }
  }

  async getStats() {
    try {
      await this.openDatabase();

      const getTalbeCount = (table) =>
        new Promise((resolve) => {
          this.db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
            resolve(row?.count || 0);
          });
        });

      const counts = {
        consultations: await getTalbeCount("consultations"),
        subscribers: await getTalbeCount("subscribers"),
        blog_posts: await getTalbeCount("blog_posts"),
        visitors: await getTalbeCount("visitors"),
      };

      console.log("\n📊 Database Statistics:");
      console.log(`   Consultations: ${counts.consultations}`);
      console.log(`   Subscribers: ${counts.subscribers}`);
      console.log(`   Blog Posts: ${counts.blog_posts}`);
      console.log(`   Visitors: ${counts.visitors}`);

      const dbSize = fs.statSync(DB_PATH).size / 1024 / 1024;
      console.log(`   Database Size: ${dbSize.toFixed(2)} MB\n`);

      await this.closeDatabase();
    } catch (error) {
      console.error("✗ Error getting stats:", error.message);
      process.exit(1);
    }
  }

  async drop() {
    try {
      const answer = await new Promise((resolve) => {
        process.stdout.write(
          '⚠️  This will delete all data. Type "yes" to confirm: ',
        );
        process.stdin.setEncoding("utf8");
        process.stdin.once("data", (data) => {
          resolve(data.toString().trim());
        });
      });

      if (answer !== "yes") {
        console.log("✗ Cancelled");
        process.exit(0);
      }

      await this.openDatabase();
      const tables = ["consultations", "subscribers", "blog_posts", "visitors"];

      for (const table of tables) {
        await this.runAsync(`DROP TABLE IF EXISTS ${table}`);
      }

      console.log("✓ All tables dropped");
      await this.closeDatabase();
    } catch (error) {
      console.error("✗ Error dropping tables:", error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const command = process.argv[2] || "help";
  const manager = new DatabaseManager();

  switch (command) {
    case "init":
      await manager.initialize();
      break;
    case "backup":
      await manager.backup();
      break;
    case "restore":
      await manager.restore();
      break;
    case "stats":
      await manager.getStats();
      break;
    case "drop":
      await manager.drop();
      break;
    default:
      console.log(`
Database Management Script

Usage: node db-manager.js [command]

Commands:
  init      Initialize or migrate database
  backup    Create a database backup
  restore   Restore from the latest backup
  stats     Show database statistics
  drop      Drop all tables (WARNING)
  help      Show this help message
      `);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
