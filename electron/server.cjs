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
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `logo_${Date.now()}${ext}`);
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

    app.get('/api/server-info', (req, res) => {
      res.json({ success: true, ip: getNetworkIP() });
    });

    app.get('/api/pengaturan_toko', (req, res) => {
      db.get('SELECT * FROM pengaturan_toko WHERE id = 1', [], (err, row) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: row });
      });
    });

    app.post('/api/pengaturan_toko', upload.single('logo'), (req, res) => {
      const { nama_toko, running_text, print_mode } = req.body;

      db.get('SELECT logo_toko FROM pengaturan_toko WHERE id = 1', [], (err, row) => {
        if (err) return res.status(500).json({ success: false });

        const logo_toko = req.file
          ? `/uploads/${req.file.filename}`
          : (row ? row.logo_toko : '');

        const finalPrintMode = print_mode === 'preview' ? 'preview' : 'langsung';

        db.run(`
          INSERT OR REPLACE INTO pengaturan_toko (id, nama_toko, logo_toko, running_text, print_mode) 
          VALUES (1, ?, ?, ?, ?)
        `, [nama_toko, logo_toko, running_text, finalPrintMode], function(err) {
          if (err) return res.status(500).json({ success: false });
          io.emit('update_toko', { nama_toko, logo_toko, running_text, print_mode: finalPrintMode });
          res.json({ success: true, logo_toko, print_mode: finalPrintMode });
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

        const nextNumber = row.current_number + 1;
        const nomorFormat = nextNumber.toString().padStart(3, '0');

        db.run('UPDATE jenis_antrian SET current_number = ? WHERE id = ?', [nextNumber, id], (err) => {
          if (err) return res.status(500).json({ success: false });
          db.run('INSERT INTO antrian (type_id, nomor, status) VALUES (?, ?, ?)', [id, nomorFormat, 'menunggu'], (err) => {
            if (err) return res.status(500).json({ success: false });

            const nomorLengkap = `${row.kode_huruf} ${nomorFormat}`;
            displayState.loketA = nomorLengkap;
            displayState.currentLoket = 'AMBIL ANTRIAN';
            io.emit('update_display', displayState);

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

    app.post('/api/antrian/preview_next', (req, res) => {
      const { type_id } = req.body;
      db.get(`
        SELECT a.nomor, j.kode_huruf 
        FROM antrian a 
        JOIN jenis_antrian j ON a.type_id = j.id 
        WHERE a.type_id = ? AND a.status = 'menunggu' 
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
        WHERE a.type_id = ? AND a.status = 'menunggu' 
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
      res.json({ success: true });
    });

    app.post('/api/antrian/selesai', (req, res) => {
      const { id_antrian } = req.body;
      db.run('UPDATE antrian SET status = ?, waktu_selesai = CURRENT_TIMESTAMP WHERE id = ?', ['selesai', id_antrian], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
      });
    });

    io.on('connection', (socket) => {
      socket.emit('init_data', displayState);

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