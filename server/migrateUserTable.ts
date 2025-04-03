import { Sequelize } from 'sequelize';
import db from './models';

// Database migration to remove role column
const migrateUserTable = async () => {
  try {
    console.log('Starting database migration...');
    await db.authenticate();
    console.log('Database connection established.');
    
    // Check if role column exists
    const [results] = await db.query(`PRAGMA table_info('users')`);
    const columns = results as any[];
    
    // Find role column
    const roleColumn = columns.find(col => col.name === 'role');
    
    if (roleColumn) {
      console.log('Role column found, creating backup table...');
      
      // Create new table without role column
      await db.query(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firebaseId TEXT UNIQUE NOT NULL,
          email TEXT NOT NULL,
          walletAddress TEXT UNIQUE NOT NULL,
          createdAt TEXT,
          updatedAt TEXT
        )
      `);
      
      // Copy data to new table
      console.log('Copying data to new table...');
      await db.query(`
        INSERT INTO users_new (id, firebaseId, email, walletAddress, createdAt, updatedAt)
        SELECT id, firebaseId, email, walletAddress, createdAt, updatedAt FROM users
      `);
      
      // Drop old table and rename new one
      console.log('Replacing old table with new one...');
      await db.query('DROP TABLE users');
      await db.query('ALTER TABLE users_new RENAME TO users');
      
      console.log('Migration successful. Role column removed from users table.');
    } else {
      console.log('Role column not found. No migration needed.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.close();
    console.log('Database connection closed.');
  }
};

// Run migration
migrateUserTable(); 