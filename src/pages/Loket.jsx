import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

export default function Loket() {
  const navigate = useNavigate();
  const namaLoket = localStorage.getItem('loketName') || '1';
  const serverIP = localStorage.getItem('serverIP') || 'localhost';
  const apiBaseUrl = `http://${serverIP}:3000`;
  const [jenisAntrian, setJenisAntrian] = useState([]);
  const [selectedJenis, setSelectedJenis] = useState('');
  const [previewNomor, setPreviewNomor] = useState('');
  const [displayNomor, setDisplayNomor] = useState('-');
  const [waktuBerjalan, setWaktuBerjalan] = useState('00:00');
  const [currentAntrianId, setCurrentAntrianId] = useState(null);
  const [currentNomorLengkap, setCurrentNomorLengkap] = useState(null);
  const [btnPanggilDisabled, setBtnPanggilDisabled] = useState(false);
  const [btnUlangDisabled, setBtnUlangDisabled] = useState(true);
  const [btnSelesaiDisabled, setBtnSelesaiDisabled] = useState(true);

  const socketRef = useRef();
  const timerIntervalRef = useRef();
  const startTimeRef = useRef();

  const updateTimer = useCallback(() => {
    if (!startTimeRef.current) return;
    const now = Date.now();
    const diff = Math.floor((now - startTimeRef.current) / 1000);
    const minutes = String(Math.floor(diff / 60)).padStart(2, '0');
    const seconds = String(diff % 60).padStart(2, '0');
    setWaktuBerjalan(`${minutes}:${seconds}`);
  }, []);

  const fetchJenisAntrian = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/jenis_antrian`);
      const result = await res.json();
      if (result.success) {
        setJenisAntrian(result.data);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memuat jenis antrian.');
    }
  }, [apiBaseUrl]);

  const handlePreviewAntrian = useCallback(
    async (type_id) => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/antrian/preview_next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type_id })
        });
        const result = await res.json();
        if (result.success && result.data) {
          setPreviewNomor(`Antrian selanjutnya: ${result.data}`);
        } else {
          setPreviewNomor('Tidak ada antrian menunggu');
        }
      } catch (err) {
        console.error(err);
        setPreviewNomor('');
      }
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    const init = async () => {
      const socketUrl = apiBaseUrl;
      socketRef.current = io(socketUrl);
      socketRef.current.on('connect', () => {
        socketRef.current.emit('loket_join', { namaLoket });
      });

      await fetchJenisAntrian();
    };

    init();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [namaLoket, apiBaseUrl, fetchJenisAntrian]);

  useEffect(() => {
    const updatePreview = async () => {
      if (selectedJenis) {
        await handlePreviewAntrian(selectedJenis);
      } else {
        setPreviewNomor('');
      }
    };

    updatePreview();
  }, [selectedJenis, handlePreviewAntrian]);

  const handlePanggilNext = async () => {
    if (!selectedJenis) return alert('Pilih jenis antrian terlebih dahulu');

    try {
      const res = await fetch(`${apiBaseUrl}/api/antrian/panggil_next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_id: selectedJenis, namaLoket })
      });
      const data = await res.json();

      if (data.success) {
        setCurrentAntrianId(data.id_antrian);
        setCurrentNomorLengkap(data.nomorLengkap);
        setDisplayNomor(data.nomorLengkap);
        
        setBtnUlangDisabled(false);
        setBtnSelesaiDisabled(false);
        setBtnPanggilDisabled(true);

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        startTimeRef.current = Date.now();
        updateTimer();
        timerIntervalRef.current = setInterval(updateTimer, 1000);

        handlePreviewAntrian(selectedJenis);
      } else {
        alert(data.message || 'Gagal memanggil antrian');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handlePanggilUlang = async () => {
    if (!currentNomorLengkap) return;
    try {
      await fetch(`${apiBaseUrl}/api/antrian/panggil_ulang`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaLoket, nomorLengkap: currentNomorLengkap })
      });
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleSelesai = async () => {
    if (!currentAntrianId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/antrian/selesai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_antrian: currentAntrianId })
      });
      const data = await res.json();

      if (data.success) {
        setCurrentAntrianId(null);
        setCurrentNomorLengkap(null);
        setDisplayNomor('-');

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setWaktuBerjalan('00:00');

        setBtnUlangDisabled(true);
        setBtnSelesaiDisabled(true);
        setBtnPanggilDisabled(false);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('loketName');
    navigate('/')
  };

  return (
    <div className="card">
      <h2>Loket <span id="namaLoketDisplay">{namaLoket}</span></h2>

      <label htmlFor="jenisAntrian">Pilih Jenis Antrian:</label>
      <select 
        id="jenisAntrian" 
        value={selectedJenis}
        onChange={(e) => setSelectedJenis(e.target.value)}
      >
        <option value="">-- Pilih --</option>
        {jenisAntrian.map(item => (
          <option key={item.id} value={item.id}>{item.nama}</option>
        ))}
      </select>
      <div className="preview-text">{previewNomor}</div>

      <div className="nomor-display">{displayNomor}</div>
      
      <div className="waktu-berjalan">{waktuBerjalan}</div>

      <button 
        className="btn-primary" 
        onClick={handlePanggilNext}
        disabled={btnPanggilDisabled}
      >
        PANGGIL BERIKUTNYA
      </button>
      <button 
        className="btn-warning" 
        onClick={handlePanggilUlang}
        disabled={btnUlangDisabled}
      >
        PANGGIL ULANG
      </button>
      <button 
        className="btn-success" 
        onClick={handleSelesai}
        disabled={btnSelesaiDisabled}
      >
        SELESAI
      </button>
      
      <br />
      <a href="/" className="logout" onClick={handleLogout}>Logout</a>
    </div>
  );
}