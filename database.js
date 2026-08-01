const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

function initDB() {
  return new Promise((resolve, reject) => {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'antrian.sqlite');
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) return reject(err);

      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            name TEXT
          )
        `, (err) => {
          if (err) return reject(err);
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS antrian (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loket TEXT,
            nomor TEXT,
            status TEXT DEFAULT 'menunggu'
          )
        `, (err) => {
          if (err) return reject(err);
        });

        db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
          if (err) return reject(err);

          if (!row || row.count === 0) {
            const insertData = `
              INSERT INTO users (username, password, role, name) VALUES
              ('admin', 'admin123', 'server', 'Display'),
              ('loket1', 'user123', 'user', '1'),
              ('loket2', 'user123', 'user', '2'),
              ('loket3', 'user123', 'user', '3')
            `;

            db.run(insertData, (err) => {
              if (err) return reject(err);
              resolve(db);
            });
          } else {
            resolve(db);
          }
        });
      });
    });
  });
}

module.exports = initDB;
