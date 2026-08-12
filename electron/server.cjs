const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const initDB = require('./database.cjs');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      const prefix = file.fieldname === 'video' ? 'video' : 'logo';
      cb(null, `${prefix}_${Date.now()}${ext}`);
    }
  })
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  const preferred = ['Wi-Fi', 'WiFi', 'Ethernet', 'Ethernet 2', 'Local Area Connection', 'en0', 'en1', 'eth0', 'eth1'];

  for (const name of preferred) {
    const list = interfaces[name] || [];
    const match = list.find((iface) => iface.family === 'IPv4' && !iface.internal);
    if (match) return match.address;
  }

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return '127.0.0.1';
}

(async () => {
  try {
    const db = await initDB();

    app.use(cors());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    const distPath = path.join(__dirname, '../dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }

    app.use('/uploads', express.static(uploadsDir));

    app.post('/api/login', (req, res) => {
      const { username, password } = req.body;
      db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (row) res.json({ success: true, role: row.role, name: row.name });
        else res.json({ success: false });
      });
    });

    app.get('/api/users', (req, res) => {
      db.all('SELECT id, username, role, name FROM users ORDER BY role DESC, name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: rows || [] });
      });
    });

    app.post('/api/users', (req, res) => {
      const { username, password, role, name } = req.body;
      if (!username || !password || !role || !name) {
        return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
      }
      db.run('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)', [username, password, role, name], function (err) {
        if (err) {
          if (err.message && err.message.includes('UNIQUE')) {
            return res.status(400).json({ success: false, message: 'Username sudah dipakai.' });
          }
          return res.status(500).json({ success: false });
        }
        refreshLoketsFromUsers();
        res.json({ success: true, id: this.lastID });
      });
    });

    app.post('/api/users/edit', (req, res) => {
      const { id, username, password, role, name } = req.body;
      if (!id || !username || !role || !name) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
      }
      const sql = password
        ? 'UPDATE users SET username = ?, password = ?, role = ?, name = ? WHERE id = ?'
        : 'UPDATE users SET username = ?, role = ?, name = ? WHERE id = ?';
      const params = password ? [username, password, role, name, id] : [username, role, name, id];

      db.run(sql, params, (err) => {
        if (err) {
          if (err.message && err.message.includes('UNIQUE')) {
            return res.status(400).json({ success: false, message: 'Username sudah dipakai.' });
          }
          return res.status(500).json({ success: false });
        }
        refreshLoketsFromUsers();
        res.json({ success: true });
      });
    });

    app.post('/api/users/hapus', (req, res) => {
      const { id } = req.body;
      db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false });
        refreshLoketsFromUsers();
        res.json({ success: true });
      });
    });

    app.get('/api/server-info', (req, res) => {
      res.json({ success: true, ip: getNetworkIP() });
    });

    app.get('/api/pengaturan_toko', (req, res) => {
      db.get('SELECT * FROM pengaturan_toko WHERE id = 1', [], (err, row) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: row });
      });
    });

    app.post('/api/pengaturan_toko', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'video', maxCount: 1 }]), (req, res) => {
      const { nama_toko, running_text, print_mode, video_url } = req.body;

      db.get('SELECT logo_toko, video_url FROM pengaturan_toko WHERE id = 1', [], (err, row) => {
        if (err) return res.status(500).json({ success: false });

        const logoFile = req.files && req.files.logo && req.files.logo[0];
        const videoFile = req.files && req.files.video && req.files.video[0];

        const logo_toko = logoFile
          ? `/uploads/${logoFile.filename}`
          : (row ? row.logo_toko : '');

        const finalVideoUrl = videoFile
          ? `/uploads/${videoFile.filename}`
          : (video_url !== undefined ? video_url : (row ? row.video_url : ''));

        const finalPrintMode = print_mode === 'preview' ? 'preview' : 'langsung';

        db.run(`
          INSERT OR REPLACE INTO pengaturan_toko (id, nama_toko, logo_toko, running_text, print_mode, video_url) 
          VALUES (1, ?, ?, ?, ?, ?)
        `, [nama_toko, logo_toko, running_text, finalPrintMode, finalVideoUrl], function(err) {
          if (err) return res.status(500).json({ success: false });
          io.emit('update_toko', { nama_toko, logo_toko, running_text, print_mode: finalPrintMode, video_url: finalVideoUrl });
          res.json({ success: true, logo_toko, print_mode: finalPrintMode, video_url: finalVideoUrl });
        });
      });
    });

    app.get('/api/jenis_antrian', (req, res) => {
      db.all('SELECT * FROM jenis_antrian', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: rows });
      });
    });

    app.post('/api/jenis_antrian', (req, res) => {
      const { nama, kode_huruf, shortcut } = req.body;
      db.run('INSERT INTO jenis_antrian (nama, kode_huruf, shortcut) VALUES (?, ?, ?)', [nama, kode_huruf, shortcut], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, id: this.lastID });
      });
    });

    app.post('/api/jenis_antrian/edit', (req, res) => {
      const { id, nama, kode_huruf, shortcut } = req.body;
      db.run('UPDATE jenis_antrian SET nama = ?, kode_huruf = ?, shortcut = ? WHERE id = ?', [nama, kode_huruf, shortcut, id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
      });
    });

    app.post('/api/jenis_antrian/hapus', (req, res) => {
      const { id } = req.body;
      db.run('DELETE FROM jenis_antrian WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
      });
    });

    app.post('/api/cetak_antrian', (req, res) => {
      const { id } = req.body;
      db.get('SELECT * FROM jenis_antrian WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(500).json({ success: false });

        // Nomor antrian dihitung dari jumlah antrian HARI INI saja untuk jenis ini,
        // sehingga otomatis mulai dari 001 lagi setiap hari tanpa perlu hapus data lama.
        db.get(`
          SELECT COUNT(*) AS jumlah FROM antrian
          WHERE type_id = ? AND date(datetime, 'localtime') = date('now', 'localtime')
        `, [id], (err, countRow) => {
          if (err) return res.status(500).json({ success: false });

          const nextNumber = (countRow ? countRow.jumlah : 0) + 1;
          const nomorFormat = nextNumber.toString().padStart(3, '0');

          db.run('INSERT INTO antrian (type_id, nomor, status) VALUES (?, ?, ?)', [id, nomorFormat, 'menunggu'], (err) => {
            if (err) return res.status(500).json({ success: false });

            // Ambil antrian tidak mengubah tampilan LOKET/NOMOR utama di Display,
            // itu hanya berubah saat ada panggilan dari Loket.
            broadcastCounts();

            res.json({ success: true, nomor: nomorFormat, nama: row.nama, kode_huruf: row.kode_huruf });
          });
        });
      });
    });

    const userRows = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM users WHERE role = 'user' ORDER BY name", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let displayState = {
      loketA: '-',
      currentLoket: '-',
      lokets: userRows.map(r => ({
        name: r.name,
        nomor: '-',
        online: false,
        socketId: null
      }))
    };

    function refreshLoketsFromUsers() {
      db.all("SELECT name FROM users WHERE role = 'user' ORDER BY name", [], (err, rows) => {
        if (err) return;
        const names = (rows || []).map(r => r.name);
        const existingByName = {};
        displayState.lokets.forEach((l) => { existingByName[l.name] = l; });
        displayState.lokets = names.map((name) => existingByName[name] || { name, nomor: '-', online: false, socketId: null });
        io.emit('update_display', displayState);
      });
    }

    function broadcastCounts() {
      db.all(`
        SELECT j.id, j.nama, j.kode_huruf,
          SUM(CASE WHEN a.status = 'menunggu' AND date(a.datetime, 'localtime') = date('now', 'localtime') THEN 1 ELSE 0 END) AS jumlah_menunggu
        FROM jenis_antrian j
        LEFT JOIN antrian a ON a.type_id = j.id
        GROUP BY j.id
        ORDER BY j.id
      `, [], (err, rows) => {
        if (err) return;
        io.emit('update_counts', (rows || []).map(r => ({ ...r, jumlah_menunggu: r.jumlah_menunggu || 0 })));
        io.emit('antrian_list_changed');
      });
    }

    app.get('/api/antrian/hari_ini', (req, res) => {
      db.all(`
        SELECT a.id, a.nomor, a.status, a.loket, a.datetime, a.waktu_panggil, a.waktu_selesai,
               j.kode_huruf, j.nama
        FROM antrian a
        JOIN jenis_antrian j ON a.type_id = j.id
        WHERE date(a.datetime, 'localtime') = date('now', 'localtime')
        ORDER BY a.datetime ASC
      `, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: rows || [] });
      });
    });

    app.post('/api/antrian/preview_next', (req, res) => {
      const { type_id } = req.body;
      db.get(`
        SELECT a.nomor, j.kode_huruf 
        FROM antrian a 
        JOIN jenis_antrian j ON a.type_id = j.id 
        WHERE a.type_id = ? AND a.status = 'menunggu' AND date(a.datetime, 'localtime') = date('now', 'localtime')
        ORDER BY a.datetime ASC LIMIT 1
      `, [type_id], (err, row) => {
        if (err) return res.status(500).json({ success: false });
        if (!row) return res.json({ success: true, data: null });
        res.json({ success: true, data: `${row.kode_huruf} ${row.nomor}` });
      });
    });

    app.post('/api/antrian/panggil_next', (req, res) => {
      const { type_id, namaLoket } = req.body;
      db.get(`
        SELECT a.*, j.kode_huruf 
        FROM antrian a 
        JOIN jenis_antrian j ON a.type_id = j.id 
        WHERE a.type_id = ? AND a.status = 'menunggu' AND date(a.datetime, 'localtime') = date('now', 'localtime')
        ORDER BY a.datetime ASC LIMIT 1
      `, [type_id], (err, row) => {
        if (err) return res.status(500).json({ success: false });
        if (!row) return res.json({ success: false, message: 'Belum ada antrian yang menunggu' });

        db.run('UPDATE antrian SET status = ?, loket = ?, waktu_panggil = CURRENT_TIMESTAMP WHERE id = ?', ['dipanggil', namaLoket, row.id], (err) => {
          if (err) return res.status(500).json({ success: false });

          const nomorLengkap = `${row.kode_huruf} ${row.nomor}`;
          const loket = displayState.lokets.find(x => x.name === namaLoket);
          if (loket) loket.nomor = nomorLengkap;
          
          displayState.loketA = nomorLengkap;
          displayState.currentLoket = namaLoket;
          
          io.emit('update_display', displayState);
          io.emit('panggilan_antrian', { kode_huruf: row.kode_huruf, nomor: row.nomor, loket: namaLoket });
          broadcastCounts();
          res.json({ success: true, id_antrian: row.id, nomorLengkap });
        });
      });
    });

    app.post('/api/antrian/panggil_ulang', (req, res) => {
      const { namaLoket, nomorLengkap } = req.body;
      const loket = displayState.lokets.find(x => x.name === namaLoket);
      if (loket) loket.nomor = nomorLengkap;
      
      displayState.loketA = nomorLengkap;
      displayState.currentLoket = namaLoket;
      io.emit('update_display', displayState);

      const [kode_huruf, ...rest] = String(nomorLengkap || '').split(' ');
      const nomor = rest.join(' ');
      io.emit('panggilan_antrian', { kode_huruf, nomor, loket: namaLoket });

      res.json({ success: true });
    });

    app.post('/api/antrian/selesai', (req, res) => {
      const { id_antrian } = req.body;
      db.run('UPDATE antrian SET status = ?, waktu_selesai = CURRENT_TIMESTAMP WHERE id = ?', ['selesai', id_antrian], (err) => {
        if (err) return res.status(500).json({ success: false });
        io.emit('antrian_list_changed');
        res.json({ success: true });
      });
    });

    app.post('/api/antrian/batal', (req, res) => {
      const { id_antrian } = req.body;
      db.run('UPDATE antrian SET status = ?, waktu_selesai = CURRENT_TIMESTAMP WHERE id = ?', ['batal', id_antrian], (err) => {
        if (err) return res.status(500).json({ success: false });
        io.emit('antrian_list_changed');
        res.json({ success: true });
      });
    });

    app.get('/api/pengaturan_tema', (req, res) => {
      db.get('SELECT variables FROM pengaturan_tema WHERE id = 1', [], (err, row) => {
        if (err) return res.status(500).json({ success: false });
        let data = null;
        if (row && row.variables) {
          try { data = JSON.parse(row.variables); } catch (e) { data = null; }
        }
        res.json({ success: true, data });
      });
    });

    app.post('/api/pengaturan_tema', (req, res) => {
      const variables = req.body && typeof req.body === 'object' ? req.body : {};
      db.run(`INSERT OR REPLACE INTO pengaturan_tema (id, variables) VALUES (1, ?)`, [JSON.stringify(variables)], (err) => {
        if (err) return res.status(500).json({ success: false });
        io.emit('update_tema', variables);
        res.json({ success: true });
      });
    });

    function resetDisplayUntukHariBaru() {
      displayState.loketA = '-';
      displayState.currentLoket = '-';
      displayState.lokets.forEach((l) => { l.nomor = '-'; });
      io.emit('update_display', displayState);
      broadcastCounts();
    }

    function scheduleResetTengahMalam() {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      const msUntilMidnight = nextMidnight - now;
      setTimeout(() => {
        resetDisplayUntukHariBaru();
        setInterval(resetDisplayUntukHariBaru, 24 * 60 * 60 * 1000);
      }, msUntilMidnight);
    }
    scheduleResetTengahMalam();

    io.on('connection', (socket) => {
      socket.emit('init_data', displayState);
      broadcastCounts();

      socket.on('loket_join', (data) => {
        const loket = displayState.lokets.find(x => x.name === data.namaLoket);
        if (loket) {
          loket.online = true;
          loket.socketId = socket.id;
        }
        io.emit('update_display', displayState);
      });

      socket.on('disconnect', () => {
        const loket = displayState.lokets.find(x => x.socketId === socket.id);
        if (loket) {
          loket.online = false;
          loket.socketId = null;
          io.emit('update_display', displayState);
        }
      });
    });

    app.get(/^\/(?!api\/).*/, (req, res) => {
      if (fs.existsSync(distPath)) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        res.send('API server is running. Use the React frontend separately with Vite or build output.');
      }
    });

    server.listen(3000, () => {
      console.log(`Server berjalan di http://${getNetworkIP()}:3000`);
    });
  } catch (error) {
    process.exit(1);
  }
})();