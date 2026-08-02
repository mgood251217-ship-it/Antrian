import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getApiUrl } from '../config'

function formatTime(date) {
  return date.toLocaleTimeString('id-ID', { hour12: false })
}

function formatDate(date) {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

export default function Display() {
  const [displayState, setDisplayState] = useState({ loketA: '-', currentLoket: '-', lokets: [] })
  const [now, setNow] = useState(new Date())
  const [jenisAntrian, setJenisAntrian] = useState([])
  const [loadingId, setLoadingId] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [ticketData, setTicketData] = useState(null)

  const fetchJenisAntrian = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/jenis_antrian`)
      const result = await res.json()
      if (result.success) {
        setJenisAntrian(result.data || [])
      }
    } catch (error) {
      console.error('Gagal memuat jenis antrian:', error)
    }
  }, [])

  const handleAmbilAntrian = async (id) => {
    setLoadingId(id)
    setStatusMessage('')

    try {
      const res = await fetch(`${getApiUrl()}/api/cetak_antrian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      const result = await res.json()

      if (result.success) {
        const nextTicket = {
          nomor: `${result.kode_huruf} ${result.nomor}`,
          nama: result.nama,
          waktu: new Date().toLocaleString('id-ID')
        }

        setTicketData(nextTicket)
        setStatusMessage(`Antrian ${nextTicket.nomor} berhasil diambil.`)

        if (typeof window !== 'undefined') {
          window.setTimeout(() => window.print(), 300)
        }
      } else {
        setStatusMessage('Gagal mengambil antrian. Silakan coba lagi.')
      }
    } catch (error) {
      console.error('Gagal mengambil antrian:', error)
      setStatusMessage('Gagal mengambil antrian. Periksa koneksi server.')
    } finally {
      setLoadingId(null)
    }
  }

  useEffect(() => {
    const loadJenisAntrian = async () => {
      await fetchJenisAntrian()
    }

    loadJenisAntrian()
  }, [fetchJenisAntrian])

  useEffect(() => {
    const socket = io(getApiUrl())
    socket.on('connect', () => {
      console.log('Connected to display socket')
    })
    socket.on('init_data', (state) => setDisplayState(state))
    socket.on('update_display', (state) => setDisplayState(state))
    socket.on('connect_error', (err) => console.error('Socket connect error:', err))

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        window.history.back()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Menyimpan style global, hover, dan print media query
  const globalAndPrintStyles = `
    html, body, #root {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
    }
    body {
      font-family: Arial, sans-serif;
      background-color: #0d3b66;
      color: white;
      overflow: hidden;
      position: relative;
    }
    .print-btn:hover {
      background-color: #008eb0;
    }
    .print-ticket {
      display: none;
    }
    @media print {
      body * {
        visibility: hidden;
      }
      .display-page > :not(.print-ticket) {
        visibility: hidden;
      }
      .print-ticket {
        display: block !important;
        visibility: visible;
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 320px;
        padding: 24px;
        border: 2px solid #000;
        background: white;
        color: #000;
        text-align: center;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      }
    }
  `

  return (
    <div className="display-page" style={{ width: '100%', minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{globalAndPrintStyles}</style>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 30px', backgroundColor: '#092e52', borderBottom: '3px solid #00a8cc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '50px', height: '50px', backgroundColor: '#ccc', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'black', fontWeight: 'bold', fontSize: '24px' }}>B</div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'normal', letterSpacing: '1px' }}>BANK INDONESIA JAMBI</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '36px', color: '#ffeb3b', margin: 0, fontWeight: 'bold' }}>{formatTime(now)}</p>
          <p style={{ fontSize: '16px', margin: 0 }}>{formatDate(now)}</p>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: '15px', gap: '15px' }}>
        <div style={{ flex: 0.35, backgroundColor: '#1a4a76', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px solid #00a8cc', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.3)' }}>
          <p style={{ fontSize: '52px', fontWeight: 'bold', margin: 0 }}>
            LOKET <span style={{ color: '#ffeb3b' }}>{displayState.currentLoket}</span>
          </p>
          <p style={{ fontSize: '26px', margin: '30px 0 10px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>NOMOR ANTRIAN</p>
          <p style={{ fontSize: '90px', fontWeight: 'bold', color: '#ffeb3b', margin: 0, textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}>{displayState.loketA}</p>
        </div>

        <div style={{ flex: 0.65, border: '2px solid #00a8cc', backgroundColor: '#000', position: 'relative' }}>
          <video width="100%" height="100%" controls autoPlay loop muted style={{ objectFit: 'cover' }}>
            <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      <div style={{ display: 'flex', backgroundColor: '#1a4a76', borderTop: '3px solid #00a8cc', borderBottom: '3px solid #00a8cc', minHeight: '120px' }}>
        {displayState.lokets.map((loket, index) => (
          <div key={loket.name} style={{ flex: 1, textAlign: 'center', padding: '15px 0', borderRight: index === displayState.lokets.length - 1 ? 'none' : '2px solid #00a8cc', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: '18px', margin: '0 0 10px 0', fontWeight: 'bold' }}>
              LOKET <span style={{ color: '#ffeb3b' }}>{loket.name}</span>
            </p>
            <p style={{ fontSize: '38px', fontWeight: 'bold', margin: 0, color: loket.nomor !== '-' ? '#ffeb3b' : 'white' }}>{loket.nomor}</p>
            <p style={{ marginTop: '10px', fontSize: '14px', color: loket.online ? '#5cb85c' : '#fb7185' }}>
              {loket.online ? 'Online' : 'Offline'}
            </p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#092e52', padding: '12px', fontSize: '28px', color: '#ffeb3b', fontWeight: 'bold' }}>
        <marquee>
          Unlimited running text - Selamat datang di Bank Indonesia Jambi - Harap menunggu antrian Anda dipanggil
        </marquee>
      </div>

      <div style={{ position: 'absolute', top: '100px', right: '30px', background: 'rgba(9, 46, 82, 0.9)', padding: '20px', border: '2px solid #00a8cc', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1000, width: '250px' }}>
        <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#fff', fontSize: '18px' }}>AMBIL ANTRIAN</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {jenisAntrian.map((item, index) => (
            <button
              key={item.id}
              className="print-btn"
              style={{ width: '100%', padding: '15px', marginBottom: index === jenisAntrian.length - 1 ? 0 : '10px', backgroundColor: '#00a8cc', color: 'white', border: 'none', borderRadius: '6px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.3s' }}
              onClick={() => handleAmbilAntrian(item.id)}
              disabled={loadingId === item.id}
            >
              {loadingId === item.id ? 'Memproses...' : `Ambil ${item.nama}`}
            </button>
          ))}
        </div>
        {statusMessage && <p style={{ marginTop: '10px', color: '#fff', textAlign: 'center' }}>{statusMessage}</p>}
      </div>

      {ticketData && (
        <div className="print-ticket">
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', letterSpacing: '2px' }}>ANTRIAN</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px' }}>{ticketData.nomor}</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>{ticketData.nama}</div>
          <div style={{ fontSize: '13px', marginTop: '8px' }}>{ticketData.waktu}</div>
          <div style={{ fontSize: '13px', marginTop: '8px' }}>Silakan menunggu sampai nomor Anda dipanggil.</div>
        </div>
      )}
    </div>
  )
}