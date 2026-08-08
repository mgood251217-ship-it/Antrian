import { useCallback, useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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

function resolveLogoUrl(logo) {
  if (!logo) return ''
  if (logo.startsWith('http')) return logo
  return `${getApiUrl()}${logo.startsWith('/') ? '' : '/'}${logo}`
}

const DEFAULT_VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4'

function resolveVideoUrl(video) {
  if (!video) return DEFAULT_VIDEO_URL
  if (video.startsWith('http')) return video
  return `${getApiUrl()}${video.startsWith('/') ? '' : '/'}${video}`
}

function speakPanggilan({ kode_huruf, nomor, loket }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const nomorDieja = String(nomor || '').split('').join(' ')
  const text = `Panggilan ${kode_huruf} ${nomorDieja}, silahkan menuju loket ${loket}`

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'id-ID'
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}

function printTicketSilently() {
  try {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printTicket === 'function') {
      window.electronAPI.printTicket()
      return
    }
  } catch (error) {
    console.error(error)
  }
  // Fallback jika dijalankan di browser biasa (bukan Electron)
  window.print()
}

export default function Display() {
  const navigate = useNavigate()
  const [displayState, setDisplayState] = useState({ loketA: '-', currentLoket: '-', lokets: [] })
  const [now, setNow] = useState(new Date())
  const [jenisAntrian, setJenisAntrian] = useState([])
  const [toko, setToko] = useState({ nama_toko: 'NAMA TOKO', logo_toko: '', running_text: 'Selamat datang', print_mode: 'langsung', video_url: '' })
  const [loadingId, setLoadingId] = useState(null)
  const [ticketData, setTicketData] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [antrianCounts, setAntrianCounts] = useState([])
  
  const loadingRef = useRef(loadingId)

  useEffect(() => {
    loadingRef.current = loadingId
  }, [loadingId])

  const fetchJenisAntrian = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/jenis_antrian`)
      const result = await res.json()
      if (result.success) {
        setJenisAntrian(result.data || [])
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchPengaturanToko = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/pengaturan_toko`)
      const result = await res.json()
      if (result.success && result.data) {
        setToko({
          nama_toko: result.data.nama_toko || 'NAMA TOKO',
          logo_toko: result.data.logo_toko || '',
          running_text: result.data.running_text || 'Selamat datang',
          print_mode: result.data.print_mode || 'langsung',
          video_url: result.data.video_url || ''
        })
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  const handleAmbilAntrian = async (id) => {
    if (loadingRef.current === id) return
    setLoadingId(id)

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

        if (toko.print_mode === 'preview') {
          setShowPreview(true)
          setLoadingId(null)
        } else if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            printTicketSilently()
            setLoadingId(null)
          }, 300)
        }
      } else {
        setLoadingId(null)
      }
    } catch (error) {
      setLoadingId(null)
    }
  }

  const handleKonfirmasiCetak = () => {
    printTicketSilently()
    setShowPreview(false)
  }

  const handleBatalCetak = () => {
    setShowPreview(false)
  }

  useEffect(() => {
    fetchJenisAntrian()
    fetchPengaturanToko()
  }, [fetchJenisAntrian, fetchPengaturanToko])

  useEffect(() => {
    const socket = io(getApiUrl())
    socket.on('init_data', (state) => setDisplayState(state))
    socket.on('update_display', (state) => setDisplayState(state))
    socket.on('update_counts', (counts) => setAntrianCounts(counts || []))
    socket.on('panggilan_antrian', (data) => speakPanggilan(data))

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        navigate('/pengaturan')
        return
      }

      const matchedAntrian = jenisAntrian.find(
        (item) => item.shortcut && item.shortcut.toLowerCase() === event.key.toLowerCase()
      )

      if (matchedAntrian && !loadingRef.current) {
        handleAmbilAntrian(matchedAntrian.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [jenisAntrian, navigate])

  const globalAndPrintStyles = `
    html, body, #root {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background-color: var(--bg-root);
      color: var(--text);
      overflow: hidden;
      position: relative;
    }
    .print-ticket {
      display: none;
    }
    @media print {
      @page {
        margin: 0;
        size: 58mm auto;
      }
      html, body, #root, .display-page {
        background-color: #ffffff !important;
      }
      body {
        background-color: #ffffff !important;
      }
      body * {
        visibility: hidden;
      }
      .display-page > :not(.print-ticket) {
        display: none !important;
      }
      .print-ticket {
        display: block !important;
        position: absolute;
        top: 0;
        left: 0;
        width: 58mm;
        padding: 4mm;
        background: #ffffff !important;
        color: #000000;
        text-align: center;
        font-family: 'Courier New', Courier, monospace;
        box-sizing: border-box;
        margin: 0;
      }
      .print-ticket * {
        visibility: visible;
      }
      .no-print {
        display: none !important;
      }
    }
  `

  return (
    <div className="display-page" style={{ width: '100%', minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{globalAndPrintStyles}</style>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 32px', backgroundColor: 'var(--bg-card)', borderBottom: '3px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {toko.logo_toko ? (
            <img src={resolveLogoUrl(toko.logo_toko)} alt="Logo" style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '8px' }} />
          ) : (
            <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--primary)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold', fontSize: '24px' }}>
              {toko.nama_toko.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '1px' }}>{toko.nama_toko}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '36px', color: 'var(--primary)', margin: 0, fontWeight: 'bold' }}>{formatTime(now)}</p>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', margin: 0 }}>{formatDate(now)}</p>
        </div>
      </header>

      {antrianCounts.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', padding: '12px 24px', overflowX: 'auto' }}>
          {antrianCounts.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{item.nama}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({item.kode_huruf})</span>
              <span style={{ marginLeft: '4px', fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>
                {item.jumlah_menunggu}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>menunggu</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: '24px', gap: '24px' }}>
        <div style={{ flex: 0.35, backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '42px', fontWeight: 'bold', margin: 0, color: 'var(--text-muted)' }}>
            LOKET <span style={{ color: 'var(--primary)' }}>{displayState.currentLoket}</span>
          </p>
          <p style={{ fontSize: '22px', margin: '32px 0 16px 0', color: 'var(--text)' }}>NOMOR ANTRIAN</p>
          <p style={{ fontSize: '100px', fontWeight: 'bold', color: 'var(--primary)', margin: 0, lineHeight: 1 }}>{displayState.loketA}</p>
        </div>

        <div style={{ flex: 0.65, border: '2px solid var(--border-color)', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
          <video
            key={toko.video_url}
            width="100%"
            height="100%"
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            style={{ objectFit: 'cover', pointerEvents: 'none' }}
          >
            <source src={resolveVideoUrl(toko.video_url)} type="video/mp4" />
          </video>
        </div>
      </div>

      <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', borderTop: '2px solid var(--border-color)', borderBottom: '2px solid var(--border-color)', minHeight: '140px' }}>
        {displayState.lokets.map((loket, index) => (
          <div key={loket.name} style={{ flex: 1, textAlign: 'center', padding: '20px 0', borderRight: index === displayState.lokets.length - 1 ? 'none' : '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: '20px', margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              LOKET <span style={{ color: 'var(--primary)' }}>{loket.name}</span>
            </p>
            <p style={{ fontSize: '42px', fontWeight: 'bold', margin: 0, color: loket.nomor !== '-' ? 'var(--text)' : 'var(--text-muted)' }}>{loket.nomor}</p>
            <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: '500', color: loket.online ? '#10b981' : '#ef4444' }}>
              {loket.online ? 'Online' : 'Offline'}
            </p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--bg-root)', padding: '16px', fontSize: '24px', color: 'var(--primary)', fontWeight: 'bold', borderTop: '1px solid var(--border-color)' }}>
        <marquee>{toko.running_text}</marquee>
      </div>

      {showPreview && ticketData && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '32px', width: '320px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: 'var(--text)' }}>Preview Antrian</h2>
            {toko.logo_toko && <img src={resolveLogoUrl(toko.logo_toko)} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '12px' }} />}
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>{ticketData.nama}</p>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary)', margin: '8px 0' }}>{ticketData.nomor}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 24px 0' }}>{ticketData.waktu}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleBatalCetak}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '15px' }}
              >
                Batal
              </button>
              <button
                onClick={handleKonfirmasiCetak}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
              >
                Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {ticketData && (
        <div className="print-ticket">
          {toko.logo_toko && <img src={resolveLogoUrl(toko.logo_toko)} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', marginBottom: '8px' }} />}
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>{toko.nama_toko}</div>
          <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', letterSpacing: '1px' }}>ANTRIAN</div>
          <div style={{ fontSize: '14px', marginBottom: '12px' }}>{ticketData.nama}</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '12px 0' }}>{ticketData.nomor}</div>
          <div style={{ borderBottom: '1px dashed black', margin: '12px 0' }}></div>
          <div style={{ fontSize: '11px', marginTop: '8px' }}>{ticketData.waktu}</div>
          <div style={{ fontSize: '11px', marginTop: '8px', padding: '0 4px' }}>Silakan menunggu sampai nomor Anda dipanggil.</div>
        </div>
      )}
    </div>
  )
}