const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const initDB = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Fungsi untuk mendapatkan IP Local (LAN/WLAN)
function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
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

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Cors handling manual untuk request beda IP
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    app.get('/', (req, res) => {
      res.render('index');
    });

    app.get('/login-server', (req, res) => {
      res.render('login-server');
    });

    app.get('/login-user', (req, res) => {
      res.render('login-user');
    });

    // Halaman Pengaturan Baru
    app.get('/pengaturan', (req, res) => {
      const ipAddress = getNetworkIP();
      res.render('pengaturan', { ipAddress });
    });

    app.get('/display', (req, res) => {
      res.render('display');
    });

    app.get('/loket', (req, res) => {
      res.render('loket');
    });

    app.post('/api/login', (req, res) => {
      const { username, password } = req.body;
      db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) {
          console.error('Login query error:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        }

        if (row) {
          res.json({ success: true, role: row.role, name: row.name });
        } else {
          res.json({ success: false });
        }
      });
    });

    let currentQueue = {
      loketA: 'A 015',
      currentLoket: 'A',
      loket1: 'A 015',
      loket2: 'A 011',
      loket3: 'A 012',
      loket4: 'B 013',
      loket5: 'B 014'
    };

    io.on('connection', (socket) => {
      socket.emit('init_data', currentQueue);

      socket.on('panggil', (data) => {
        currentQueue[data.loketID] = data.nomor;
        currentQueue.loketA = data.nomor;
        currentQueue.currentLoket = data.namaLoket;
        io.emit('update_display', currentQueue);
      });
    });

    server.listen(3000, () => {
      console.log(`Server berjalan di http://${getNetworkIP()}:3000`);
    });
  } catch (error) {
    console.error('Gagal menginisialisasi database:', error);
    process.exit(1);
  }
})();