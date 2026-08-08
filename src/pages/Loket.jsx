import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import Input from '../components/Input/Input';
import Select from '../components/Select/Select';
import Section from '../components/Section/Section';
import '../styles/variables.css';

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

  const jenisOption = useMemo(() => {
    return jenisAntrian.map(item => ({ value: item.id, label: item.nama }));
  }, [jenisAntrian]);

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
    navigate('/');
  };

  return (
    <Section style={{ backgroundColor: 'var(--bg-root)' }}>
      <Card style={{ backgroundColor: 'var(--bg-card)', padding: '32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        <h2 style={{ margin: 0, fontSize: '26px', color: 'var(--text-main)', textAlign: 'center' }}>
          Loket <span id="namaLoketDisplay">{namaLoket}</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Select
            label="Pilih Jenis Antrian:"
            name="category"
            id="jenisAntrian"
            value={selectedJenis}
            onChange={(e) => setSelectedJenis(e.target.value)}
            options={jenisOption}
            margin="0"
            style={{ width: "100%" }}
          />
        </div>

        <div className="preview-text" style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', minHeight: '20px' }}>
          {previewNomor}
        </div>

        <div className="nomor-display" style={{ fontSize: '64px', fontWeight: 'bold', textAlign: 'center', color: 'var(--primary)', margin: '10px 0' }}>
          {displayNomor}
        </div>
        
        <div className="waktu-berjalan" style={{ fontSize: '20px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {waktuBerjalan}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
          <Button 
            variant="primary" 
            onClick={handlePanggilNext}
            disabled={btnPanggilDisabled}
            style={{ width: '100%', padding: '14px', fontSize: '16px', cursor: 'pointer' }}
          >
            PANGGIL BERIKUTNYA
          </Button>
          <Button 
            variant="secondary" 
            onClick={handlePanggilUlang}
            disabled={btnUlangDisabled}
            style={{ width: '100%', padding: '14px', fontSize: '16px', cursor: 'pointer' }}
          >
            PANGGIL ULANG
          </Button>
          <Button 
            variant="success" 
            onClick={handleSelesai}
            disabled={btnSelesaiDisabled}
            style={{ width: '100%', padding: '14px', fontSize: '16px', cursor: 'pointer' }}
          >
            SELESAI
          </Button>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <a href="/" className="logout" onClick={handleLogout} style={{ color: 'var(--danger)', textDecoration: 'none', fontWeight: '500' }}>
            Logout
          </a>
        </div>
      </Card>
    </Section>
  );
}