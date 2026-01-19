import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', '..', 'bolao.db');
const db = new sqlite3.Database(dbPath);

export function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Participants table
      db.run(`
        CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Groups table
      db.run(`
        CREATE TABLE IF NOT EXISTS groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          lottery_type TEXT NOT NULL CHECK(lottery_type IN ('mega-sena', 'lotofacil', 'quina', 'lotomania', 'dupla-sena')),
          draw_date DATE NOT NULL,
          total_quotas INTEGER NOT NULL,
          quota_value REAL NOT NULL,
          pix_key TEXT NOT NULL,
          status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'checked', 'finalized')),
          prize_amount REAL DEFAULT 0,
          admin_fee_type TEXT DEFAULT 'percentage' CHECK(admin_fee_type IN ('percentage', 'fixed')),
          admin_fee_value REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Group participants (junction table with quota info)
      db.run(`
        CREATE TABLE IF NOT EXISTS group_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          participant_id INTEGER NOT NULL,
          quota_quantity INTEGER NOT NULL DEFAULT 1,
          people_per_quota INTEGER NOT NULL DEFAULT 1,
          individual_value REAL NOT NULL,
          paid BOOLEAN DEFAULT 0,
          payment_date DATETIME,
          payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'approved', 'rejected')),
          receipt_path TEXT,
          rejection_reason TEXT,
          rejection_date DATETIME,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
          UNIQUE(group_id, participant_id)
        )
      `);

      // Bets table
      db.run(`
        CREATE TABLE IF NOT EXISTS bets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          numbers TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
        )
      `);

      // Draw results table
      db.run(`
        CREATE TABLE IF NOT EXISTS draw_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          result_numbers TEXT NOT NULL,
          draw_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          matches TEXT,
          sync_source TEXT DEFAULT 'manual' CHECK(sync_source IN ('manual', 'api')),
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
        )
      `);

      // Prize distributions table
      db.run(`
        CREATE TABLE IF NOT EXISTS prize_distributions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          participant_id INTEGER NOT NULL,
          quota_fraction REAL NOT NULL,
          prize_share REAL NOT NULL,
          paid_out BOOLEAN DEFAULT 0,
          payout_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
          UNIQUE(group_id, participant_id)
        )
      `);

      // Liquidation audit table (for tracking payment distribution)
      db.run(`
        CREATE TABLE IF NOT EXISTS liquidation_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          participant_id INTEGER,
          amount REAL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export default db;
