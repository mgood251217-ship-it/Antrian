import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import Input from '../components/Input/Input';
import Select from '../components/Select/Select';
import Section from '../components/Section/Section';

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
  const [antrianCounts, setAntrianCounts] = useState([]);

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
      socketRef.current.on('update_counts', (counts) => setAntrianCounts(counts || []));

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

  const handleBatal = async () => {
    if (!currentAntrianId) return;
    if (!window.confirm('Batalkan antrian ini? (misal konsumen tidak jadi / tidak menyaut)')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/antrian/batal`, {
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

        {antrianCounts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {antrianCounts.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-root)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-main)' }}>{item.nama}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({item.kode_huruf})</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{item.jumlah_menunggu}</span>
              </div>
            ))}
          </div>
        )}

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
          <Button 
            variant="danger" 
            onClick={handleBatal}
            disabled={btnSelesaiDisabled}
            style={{ width: '100%', padding: '14px', fontSize: '16px', cursor: 'pointer' }}
          >
            BATAL
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