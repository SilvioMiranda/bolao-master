import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', '..', 'bolao.db');
const db = new sqlite3.Database(dbPath);

/**
 * Migration script to add new fields to existing database
 * This ensures backward compatibility with existing databases
 */
export function runMigrations(): Promise<void> {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            console.log('🔄 Running database migrations...');

            // Add payment_status to group_participants if it doesn't exist
            db.run(`
                ALTER TABLE group_participants 
                ADD COLUMN payment_status TEXT DEFAULT 'pending' 
                CHECK(payment_status IN ('pending', 'approved', 'rejected'))
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error adding payment_status:', err.message);
                }
            });

            // Add rejection_reason to group_participants
            db.run(`
                ALTER TABLE group_participants 
                ADD COLUMN rejection_reason TEXT
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error adding rejection_reason:', err.message);
                }
            });

            // Add rejection_date to group_participants
            db.run(`
                ALTER TABLE group_participants 
                ADD COLUMN rejection_date DATETIME
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error adding rejection_date:', err.message);
                }
            });

            // Add sync_source to draw_results
            db.run(`
                ALTER TABLE draw_results 
                ADD COLUMN sync_source TEXT DEFAULT 'manual' 
                CHECK(sync_source IN ('manual', 'api'))
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error adding sync_source:', err.message);
                }
            });

            // Add paid_out to prize_distributions
            db.run(`
                ALTER TABLE prize_distributions 
                ADD COLUMN paid_out BOOLEAN DEFAULT 0
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error adding paid_out:', err.message);
                }
            });

            // Add payout_date to prize_distributions
            db.run(`
                ALTER TABLE prize_distributions 
                ADD COLUMN payout_date DATETIME
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error adding payout_date:', err.message);
                }
            });

            // Create liquidation_audit table if it doesn't exist
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
                if (err) {
                    console.error('Error creating liquidation_audit table:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Database migrations completed successfully');
                    resolve();
                }
            });
        });
    });
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}
