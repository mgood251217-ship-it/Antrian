import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import Input from '../components/Input/Input';
import Select from '../components/Select/Select';
import '../styles/variables.css';

function formatWaktu(value) {
  if (!value) return '-';
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('id-ID', { hour12: false });
}

function statusInfo(status) {
  switch (status) {
    case 'menunggu': return { label: 'Menunggu', color: 'var(--text-muted)' };
    case 'dipanggil': return { label: 'Dipanggil', color: 'var(--primary)' };
    case 'selesai': return { label: 'Selesai', color: 'var(--success)' };
    case 'batal': return { label: 'Batal', color: 'var(--danger)' };
    default: return { label: status || '-', color: 'var(--text-muted)' };
  }
}

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
  const [antrianList, setAntrianList] = useState([]);

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

  const fetchAntrianList = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/antrian/hari_ini`);
      const result = await res.json();
      if (result.success) {
        setAntrianList(result.data || []);
      }
    } catch (err) {
      console.error(err);
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
      socketRef.current.on('antrian_list_changed', () => fetchAntrianList());

      await fetchJenisAntrian();
      await fetchAntrianList();
    };

    init();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [namaLoket, apiBaseUrl, fetchJenisAntrian, fetchAntrianList]);

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
        fetchAntrianList();
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
      fetchAntrianList();
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
        fetchAntrianList();
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
        fetchAntrianList();
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
    <div style={{ width: '100%', height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text)' }}>
          Loket <span id="namaLoketDisplay">{namaLoket}</span>
        </h2>
        <a href="/" className="logout" onClick={handleLogout} style={{ color: 'var(--danger)', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
          Logout
        </a>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '20px', padding: '0 28px 24px 28px', minHeight: 0, overflow: 'hidden' }}>
        {/* Kolom kiri: Panggilan */}
        <Card style={{ flex: '0 0 420px', maxWidth: '420px', backgroundColor: 'var(--bg-card)', padding: '28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
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

          <div className="nomor-display" style={{ fontSize: '58px', fontWeight: 'bold', textAlign: 'center', color: 'var(--primary)', margin: '4px 0' }}>
            {displayNomor}
          </div>
          
          <div className="waktu-berjalan" style={{ fontSize: '20px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {waktuBerjalan}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
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
        </Card>

        {/* Kolom kanan: Keterangan / Riwayat */}
        <Card style={{ flex: 1, backgroundColor: 'var(--bg-card)', padding: '28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>Keterangan</h3>

          {antrianCounts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
              {antrianCounts.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text)' }}>{item.nama}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({item.kode_huruf})</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{item.jumlah_menunggu}</span>
                </div>
              ))}
            </div>
          )}

          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 }}>
            Riwayat Antrian Hari Ini
          </span>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {antrianList.length === 0 && (
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Belum ada antrian hari ini.</p>
            )}
            {[...antrianList].reverse().map((item) => {
              const info = statusInfo(item.status);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    flexShrink: 0
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '15px' }}>
                      {item.kode_huruf} {item.nomor}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {item.status === 'menunggu' && `Diambil pukul ${formatWaktu(item.datetime)}`}
                      {item.status === 'dipanggil' && `Loket ${item.loket} • ${formatWaktu(item.waktu_panggil)}`}
                      {item.status === 'selesai' && `Selesai • Loket ${item.loket} • ${formatWaktu(item.waktu_selesai)}`}
                      {item.status === 'batal' && `Dibatalkan • ${formatWaktu(item.waktu_selesai)}`}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: info.color, flexShrink: 0 }}>{info.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}