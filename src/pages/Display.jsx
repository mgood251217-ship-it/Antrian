import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getApiUrl } from '../config'
import './Display.css'

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

  return (
    <div className="display-page">
      <header className="header">
        <div className="header-left">
          <div className="logo-circle">B</div>
          <h1>BANK INDONESIA JAMBI</h1>
        </div>
        <div className="time">
          <p className="clock">{formatTime(now)}</p>
          <p className="date">{formatDate(now)}</p>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <p className="loket-title">
            LOKET <span>{displayState.currentLoket}</span>
          </p>
          <p className="nomor-title">NOMOR ANTRIAN</p>
          <p className="nomor-value">{displayState.loketA}</p>
        </div>

        <div className="right-panel">
          <video width="100%" height="100%" controls autoPlay loop muted style={{ objectFit: 'cover' }}>
            <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      <div className="bottom-panel">
        {displayState.lokets.map((loket) => (
          <div key={loket.name} className="loket-box">
            <p className="loket-box-title">
              LOKET <span>{loket.name}</span>
            </p>
            <p className={`loket-box-value ${loket.nomor !== '-' ? 'yellow' : ''}`}>{loket.nomor}</p>
            <p style={{ marginTop: '10px', fontSize: '14px', color: loket.online ? '#5cb85c' : '#fb7185' }}>
              {loket.online ? 'Online' : 'Offline'}
            </p>
          </div>
        ))}
      </div>

      <div className="marquee-container">
        <marquee>
          Unlimited running text - Selamat datang di Bank Indonesia Jambi - Harap menunggu antrian Anda dipanggil
        </marquee>
      </div>

      <div className="print-panel">
        <h3>AMBIL ANTRIAN</h3>
        <div className="button-container">
          {jenisAntrian.map((item) => (
            <button
              key={item.id}
              className="print-btn"
              onClick={() => handleAmbilAntrian(item.id)}
              disabled={loadingId === item.id}
            >
              {loadingId === item.id ? 'Memproses...' : `Ambil ${item.nama}`}
            </button>
          ))}
        </div>
        {statusMessage && <p className="status-message">{statusMessage}</p>}
      </div>

      {ticketData && (
        <div className="print-ticket">
          <div className="ticket-header">ANTRIAN</div>
          <div className="ticket-number">{ticketData.nomor}</div>
          <div className="ticket-service">{ticketData.nama}</div>
          <div className="ticket-time">{ticketData.waktu}</div>
          <div className="ticket-note">Silakan menunggu sampai nomor Anda dipanggil.</div>
        </div>
      )}
    </div>
  )
}
