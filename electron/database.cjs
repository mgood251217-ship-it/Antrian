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
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS antrian (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type_id INTEGER,
            nomor TEXT,
            status TEXT DEFAULT 'menunggu',
            loket TEXT,
            datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
            waktu_panggil DATETIME,
            waktu_selesai DATETIME
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS jenis_antrian (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT,
            kode_huruf TEXT,
            shortcut TEXT,
            current_number INTEGER DEFAULT 0
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS pengaturan_toko (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            nama_toko TEXT,
            logo_toko TEXT,
            running_text TEXT,
            print_mode TEXT DEFAULT 'langsung'
          )
        `);

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
            db.run(insertData);
          }
        });

        db.get('SELECT COUNT(*) AS count FROM jenis_antrian', (err, row) => {
          if (err) return reject(err);
          if (!row || row.count === 0) {
            const insertJenis = `
              INSERT INTO jenis_antrian (nama, kode_huruf, shortcut, current_number) VALUES
              ('Teller', 'A', '1', 0),
              ('Customer Service', 'B', '2', 0)
            `;
            db.run(insertJenis, (err) => {
              if (err) return reject(err);
            });
          }
        });

        db.get('SELECT COUNT(*) AS count FROM pengaturan_toko', (err, row) => {
          if (err) return reject(err);
          if (!row || row.count === 0) {
            db.run(`
              INSERT INTO pengaturan_toko (id, nama_toko, logo_toko, running_text) 
              VALUES (1, 'BANK INDONESIA JAMBI', '', 'Selamat datang di Bank Indonesia Jambi - Harap menunggu antrian Anda dipanggil')
            `);
          }
        });

        resolve(db);
      });
    });
  });
}

module.exports = initDB;