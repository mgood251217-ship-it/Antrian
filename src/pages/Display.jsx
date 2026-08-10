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

function TileNumber({ text, tileSize = 72, gap = 6, flashKey, emptyLabel = '' }) {
  const isEmpty = !text || text === '-'

  if (isEmpty) {
    return (
      <div style={{ height: `${tileSize * 1.22}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {emptyLabel && (
          <span style={{ fontSize: `${Math.max(13, tileSize * 0.22)}px`, color: 'var(--text-muted)' }}>{emptyLabel}</span>
        )}
      </div>
    )
  }

  const chars = String(text).split('')
  return (
    <div key={flashKey} className="tile-board" style={{ display: 'flex', gap: `${gap}px`, justifyContent: 'center' }}>
      {chars.map((char, index) => (
        char === ' '
          ? <div key={index} style={{ width: `${tileSize * 0.35}px` }} />
          : (
            <div
              key={index}
              className="tile-cell"
              style={{
                width: `${tileSize}px`,
                height: `${tileSize * 1.22}px`,
                fontSize: `${tileSize * 0.62}px`
              }}
            >
              <span>{char}</span>
              <div className="tile-seam" />
            </div>
          )
      ))}
    </div>
  )
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
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      background-color: var(--background);
      color: var(--text);
      overflow: hidden;
      position: relative;
    }
    .tabular {
      font-family: ui-monospace, 'Cascadia Code', 'Roboto Mono', 'IBM Plex Mono', 'SF Mono', monospace;
      font-variant-numeric: tabular-nums;
    }
    .eyebrow {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .tile-cell {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.18));
      background-color: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--primary);
      font-family: ui-monospace, 'Cascadia Code', 'Roboto Mono', 'IBM Plex Mono', 'SF Mono', monospace;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      box-shadow: 0 6px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
      line-height: 1;
    }
    .tile-seam {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: rgba(0,0,0,0.35);
    }
    .tile-board {
      animation: boardPulse 900ms ease-out;
    }
    @keyframes boardPulse {
      0% { transform: scale(0.97); filter: brightness(1.9); }
      100% { transform: scale(1); filter: brightness(1); }
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot.online {
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }
    .status-dot.offline {
      background: var(--danger);
    }
    .count-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px 10px 12px;
      border-radius: 10px;
      background-color: var(--bg-card);
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      white-space: nowrap;
    }
    .running-ticker marquee {
      font-family: ui-monospace, 'Cascadia Code', 'Roboto Mono', monospace;
      letter-spacing: 0.5px;
    }
    @media (prefers-reduced-motion: reduce) {
      .tile-board { animation: none; }
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

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 32px', backgroundColor: 'var(--bg-card)', borderBottom: '3px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {toko.logo_toko ? (
            <img src={resolveLogoUrl(toko.logo_toko)} alt="Logo" style={{ height: '64px', width: 'auto', maxWidth: '200px', objectFit: 'contain', borderRadius: '10px' }} />
          ) : (
            <div style={{ width: '52px', height: '52px', backgroundColor: 'var(--primary)', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold', fontSize: '22px' }}>
              {toko.nama_toko.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="eyebrow" style={{ margin: '0 0 4px 0' }}>Sistem Antrian</p>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '0.5px' }}>{toko.nama_toko}</h1>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="tabular" style={{ fontSize: '34px', color: 'var(--primary)', margin: 0, fontWeight: 700, lineHeight: 1 }}>{formatTime(now)}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{formatDate(now)}</p>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: '20px 24px', gap: '20px' }}>
        <div style={{ flex: 0.35, backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '22px', minHeight: 0 }}>
            <p className="eyebrow" style={{ margin: 0, fontSize: '15px' }}>Nomor Antrian</p>
            <TileNumber
              text={displayState.loketA}
              tileSize={88}
              flashKey={`${displayState.loketA}-${displayState.currentLoket}`}
              emptyLabel="Menunggu panggilan berikutnya"
            />
            <p style={{ fontSize: '36px', fontWeight: 800, margin: 0, color: 'var(--text-muted)' }}>
              LOKET <span style={{ color: 'var(--primary)' }}>{displayState.currentLoket}</span>
            </p>
          </div>

          {antrianCounts.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', flexShrink: 0 }}>
              <p className="eyebrow" style={{ margin: '0 0 4px 0' }}>Menunggu Hari Ini</p>
              {antrianCounts.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '15px' }}>
                    {item.nama} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>({item.kode_huruf})</span>
                  </span>
                  <span className="tabular" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>{item.jumlah_menunggu}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 0.65, border: '1px solid var(--border)', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden' }}>
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

      <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', minHeight: '128px' }}>
        {displayState.lokets.map((loket, index) => (
          <div key={loket.name} style={{ flex: 1, textAlign: 'center', padding: '16px 8px', borderRight: index === displayState.lokets.length - 1 ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <p style={{ fontSize: '16px', margin: 0, fontWeight: 700, color: 'var(--text-muted)' }}>
              LOKET <span style={{ color: 'var(--primary)' }}>{loket.name}</span>
            </p>
            <TileNumber text={loket.nomor} tileSize={32} gap={3} flashKey={`${loket.name}-${loket.nomor}`} />
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: loket.online ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${loket.online ? 'online' : 'offline'}`} />
              {loket.online ? 'Online' : 'Offline'}
            </p>
          </div>
        ))}
      </div>

      <div className="running-ticker no-print" style={{ backgroundColor: 'var(--background)', padding: '14px', fontSize: '22px', color: 'var(--primary)', fontWeight: 700, borderTop: '1px solid var(--border)' }}>
        <marquee>{toko.running_text}</marquee>
      </div>

      {showPreview && ticketData && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', width: '320px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
            <p className="eyebrow" style={{ margin: '0 0 4px 0' }}>Preview Antrian</p>
            <h2 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '18px' }}>{ticketData.nama}</h2>
            {toko.logo_toko && <img src={resolveLogoUrl(toko.logo_toko)} alt="Logo" style={{ width: '44px', height: '44px', objectFit: 'contain', marginBottom: '12px' }} />}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <TileNumber text={ticketData.nomor} tileSize={40} gap={4} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 24px 0' }}>{ticketData.waktu}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleBatalCetak}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '15px' }}
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