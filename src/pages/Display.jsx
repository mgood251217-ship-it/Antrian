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

const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
let nextAvailableAudioTime = 0

async function fetchAudioBuffer(url) {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return await audioCtx.decodeAudioData(arrayBuffer)
  } catch (error) {
    return null
  }
}

async function speakPanggilan({ kode_huruf, nomor, loket }) {
  if (typeof window === 'undefined') return

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume()
  }

  const urls = [
    '/audio/bel.mp3',
    '/audio/panggilan.mp3'
  ]

  if (kode_huruf) {
    const huruf = String(kode_huruf).toLowerCase()
    urls.push(`/audio/huruf/${huruf}.mp3`)
  }

  const nomorArray = String(nomor || '').split('')
  for (let i = 0; i < nomorArray.length; i++) {
    urls.push(`/audio/angka/${nomorArray[i]}.mp3`)
  }

  urls.push(
    '/audio/silahkan.mp3',
    '/audio/menuju.mp3',
    '/audio/loket.mp3',
    `/audio/angka/${loket}.mp3`
  )

  const buffers = await Promise.all(urls.map(fetchAudioBuffer))

  let startTime = Math.max(audioCtx.currentTime, nextAvailableAudioTime)
  
  const overlapTime = 0.15 
  const pauseAfterSilahkan = -0.2

  for (let index = 0; index < buffers.length; index++) {
    const buffer = buffers[index]
    if (!buffer) continue

    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    
    source.playbackRate.value = 1.05 
    
    source.connect(audioCtx.destination)
    source.start(startTime)
    
    const transitionTime = urls[index] === '/audio/silahkan.mp3'
      ? pauseAfterSilahkan
      : -overlapTime
    startTime += (buffer.duration / source.playbackRate.value) + transitionTime
  }

  nextAvailableAudioTime = startTime
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
  const [selesaiFlash, setSelesaiFlash] = useState({})
  
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

  const fetchStateRecovery = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/antrian/hari_ini`)
      const result = await res.json()
      
      if (result.success && result.data) {
        const list = result.data;
        
        const calledList = list.filter(item => item.status === 'dipanggil' || item.status === 'selesai');
        calledList.sort((a, b) => new Date(b.waktu_panggil).getTime() - new Date(a.waktu_panggil).getTime());
        const lastCalled = calledList[0];

        setDisplayState(prev => {
          const newState = { ...prev };
          
          if (lastCalled && (!newState.loketA || newState.loketA === '-')) {
            newState.loketA = `${lastCalled.kode_huruf} ${lastCalled.nomor}`;
            newState.currentLoket = lastCalled.loket || '-';
          }
          
          if (newState.lokets && newState.lokets.length > 0) {
            newState.lokets = newState.lokets.map(loket => {
              const activeAntrian = list.find(item => item.status === 'dipanggil' && String(item.loket) === String(loket.name));
              if (activeAntrian) {
                return { ...loket, nomor: `${activeAntrian.kode_huruf} ${activeAntrian.nomor}` };
              }
              return loket;
            });
          }
          return newState;
        });

        setAntrianCounts(prev => {
          if (prev.length === 0 && jenisAntrian.length > 0) {
            return jenisAntrian.map(jenis => {
              const count = list.filter(item => item.type_id === jenis.id && item.status === 'menunggu').length;
              return {
                id: jenis.id,
                nama: jenis.nama,
                kode_huruf: jenis.kode_huruf || jenis.kode || '',
                jumlah_menunggu: count
              };
            });
          }
          return prev;
        });
      }
    } catch (error) {
      console.error(error)
    }
  }, [jenisAntrian]);

  useEffect(() => {
    if (jenisAntrian.length > 0) {
      fetchStateRecovery();
    }
    const interval = setInterval(fetchStateRecovery, 10000);
    return () => clearInterval(interval);
  }, [fetchStateRecovery, jenisAntrian]);

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
    socket.on('antrian_selesai', (data) => {
      if (!data.loket) return
      setSelesaiFlash((prev) => ({ ...prev, [data.loket]: `${data.kode_huruf} ${data.nomor}`.trim() }))
      window.setTimeout(() => {
        setSelesaiFlash((prev) => {
          const next = { ...prev }
          delete next[data.loket]
          return next
        })
      }, 4000)
    })

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
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '15px' }}>
                      {item.nama} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>({item.kode_huruf})</span>
                    </span>
                    <span className="tabular" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>{item.jumlah_menunggu}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAmbilAntrian(item.id)}
                    disabled={loadingId !== null}
                    aria-label={`Cetak antrian ${item.nama}`}
                    style={{ padding: '8px 9px', border: '1px solid var(--primary)', borderRadius: '6px', backgroundColor: 'var(--primary)', color: '#fff', cursor: loadingId !== null ? 'wait' : 'pointer', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', opacity: loadingId !== null ? 0.6 : 1 }}
                  >
                    {loadingId === item.id ? '...' : 'Cetak'}
                  </button>
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

      <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', minHeight: '148px' }}>
        {displayState.lokets.map((loket, index) => {
          const isFlashSelesai = Boolean(selesaiFlash[loket.name])
          return (
            <div key={loket.name} style={{ flex: 1, textAlign: 'center', padding: '6px', borderRight: index === displayState.lokets.length - 1 ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <p style={{ fontSize: '24px', margin: 0, fontWeight: 700, color: 'var(--text-muted)', padding: "5px" }}>
                LOKET <span style={{ color: 'var(--primary)' }}>{loket.name}</span>
              </p>
              <TileNumber text={loket.nomor} tileSize={45} gap={3} flashKey={`${loket.name}-${loket.nomor}`} />
              {isFlashSelesai ? (
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
                  ✓ Selesai {selesaiFlash[loket.name]}
                </p>
              ) : loket.status ? (
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--warning)' }}>
                  {loket.status}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: loket.online ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`status-dot ${loket.online ? 'online' : 'offline'}`} />
                  {loket.online ? 'Online' : 'Offline'}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="running-ticker no-print" style={{ backgroundColor: 'var(--background)', padding: '6px', fontSize: '18px', color: 'var(--primary)', fontWeight: 700, borderTop: '1px solid var(--border)' }}>
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