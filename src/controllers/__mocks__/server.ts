import sqlite from 'sqlite3';

// Create a mock database for testing
export const db = new sqlite.Database(':memory:');