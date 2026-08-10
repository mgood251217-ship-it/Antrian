import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../config'
import Button from '../components/Button/Button'
import Card from '../components/Card/Card'
import Input from '../components/Input/Input'
import Select from '../components/Select/Select'
import { clearServerSession } from '../services/session'
import { DEFAULT_THEME, applyTheme, loadAndApplyTheme } from '../services/theme'

const COLOR_FIELDS = [
  { key: '--primary', label: 'Primary' },
  { key: '--primary-hover', label: 'Primary Hover' },
  { key: '--secondary', label: 'Secondary' },
  { key: '--secondary-hover', label: 'Secondary Hover' },
  { key: '--success', label: 'Success' },
  { key: '--success-hover', label: 'Success Hover' },
  { key: '--info', label: 'Info' },
  { key: '--info-hover', label: 'Info Hover' },
  { key: '--warning', label: 'Warning' },
  { key: '--warning-hover', label: 'Warning Hover' },
  { key: '--danger', label: 'Danger' },
  { key: '--danger-hover', label: 'Danger Hover' },
  { key: '--text', label: 'Text' },
  { key: '--text-muted', label: 'Text Muted' },
  { key: '--bg-card', label: 'Background Card' },
  { key: '--border', label: 'Border' }
]

function isHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}

function extractHex(value, fallback) {
  if (isHexColor(value)) return value.trim()
  const match = typeof value === 'string' && value.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/)
  return match ? match[0] : fallback
}

function parseGradient(value, fallbackStart = '#0f172a', fallbackEnd = '#020617') {
  const matches = (typeof value === 'string' && value.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g)) || []
  return { start: matches[0] || fallbackStart, end: matches[1] || fallbackEnd }
}

function buildGradient(start, end) {
  return `radial-gradient(circle at top, ${start}, ${end} 70%)`
}

export default function Pengaturan() {
  const navigate = useNavigate()
  const [ipAddress, setIpAddress] = useState('')

  const [nama, setNama] = useState('')
  const [kodeHuruf, setKodeHuruf] = useState('')
  const [shortcut, setShortcut] = useState('')
  const [jenis, setJenis] = useState([])
  const [editingId, setEditingId] = useState(null)

  const [namaToko, setNamaToko] = useState('')
  const [logoToko, setLogoToko] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [runningText, setRunningText] = useState('')
  const [printMode, setPrintMode] = useState('langsung')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState('')
  const [themeVars, setThemeVars] = useState(DEFAULT_THEME)

  useEffect(() => {
    const loadServerInfo = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/server-info`)
        const data = await res.json()
        if (data.success && data.ip) {
          setIpAddress(data.ip)
          localStorage.setItem('serverIP', data.ip)
          return
        }
      } catch (error) {
        console.error(error)
      }

      const apiUrl = getApiUrl()
      const url = new URL(apiUrl)
      const detectedIp = url.hostname || 'localhost'
      setIpAddress(detectedIp)

      if (detectedIp !== 'localhost' && detectedIp !== '127.0.0.1') {
        localStorage.setItem('serverIP', detectedIp)
      }
    }

    fetchJenis()
    loadServerInfo()
    fetchPengaturanToko()
    loadAndApplyTheme().then((vars) => setThemeVars({ ...DEFAULT_THEME, ...vars }))
  }, [])

  const fetchJenis = async () => {
    const res = await fetch(`${getApiUrl()}/api/jenis_antrian`)
    const data = await res.json()
    if (data.success) setJenis(data.data)
  }

  const fetchPengaturanToko = async () => {
    const res = await fetch(`${getApiUrl()}/api/pengaturan_toko`)
    const data = await res.json()
    if (data.success && data.data) {
      setNamaToko(data.data.nama_toko || '')
      setLogoToko(data.data.logo_toko || '')
      setRunningText(data.data.running_text || '')
      setPrintMode(data.data.print_mode || 'langsung')
      setVideoUrl(data.data.video_url || '')
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
    }
  }

  const savePengaturanToko = async (e) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('nama_toko', namaToko)
    formData.append('running_text', runningText)
    formData.append('print_mode', printMode)
    if (logoFile) {
      formData.append('logo', logoFile)
    }
    if (videoFile) {
      formData.append('video', videoFile)
    }

    await fetch(`${getApiUrl()}/api/pengaturan_toko`, {
      method: 'POST',
      body: formData
    })
    
    setLogoFile(null)
    setVideoFile(null)
    alert('Pengaturan toko berhasil disimpan')
    fetchPengaturanToko()
  }

  const saveJenis = async (e) => {
    e.preventDefault()
    const endpoint = editingId ? '/api/jenis_antrian/edit' : '/api/jenis_antrian'
    await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, nama, kode_huruf: kodeHuruf, shortcut })
    })
    resetFormJenis()
    fetchJenis()
  }

  const editJenis = (item) => {
    setEditingId(item.id)
    setNama(item.nama)
    setKodeHuruf(item.kode_huruf)
    setShortcut(item.shortcut || '')
  }

  const resetFormJenis = () => {
    setEditingId(null)
    setNama('')
    setKodeHuruf('')
    setShortcut('')
  }

  const hapusJenis = async (id) => {
    await fetch(`${getApiUrl()}/api/jenis_antrian/hapus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    fetchJenis()
  }

  const handleLogout = () => {
    clearServerSession()
    navigate('/')
  }

  const setThemeVar = (key, value) => {
    setThemeVars((prev) => ({ ...prev, [key]: value }))
  }

  const saveTheme = async (e) => {
    e.preventDefault()
    try {
      await fetch(`${getApiUrl()}/api/pengaturan_tema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeVars)
      })
      applyTheme(themeVars)
      alert('Pengaturan warna berhasil disimpan. Klik "Restart Aplikasi" agar seluruh halaman ikut memuat ulang warna baru.')
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan pengaturan warna.')
    }
  }

  const resetTheme = () => {
    if (!window.confirm('Kembalikan warna ke default?')) return
    setThemeVars(DEFAULT_THEME)
    applyTheme(DEFAULT_THEME)
  }

  const handleRestartApp = () => {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.restartApp === 'function') {
      window.electronAPI.restartApp()
      return
    }
    // Fallback jika dibuka di browser biasa (bukan Electron)
    window.location.reload()
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '24px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif', background: 'var(--background)', color: 'var(--text)' }}>
        
        <div style={{ width: '100%', marginBottom: '24px', display: 'flex', gap: '12px' }}>
          <Button type="button" onClick={handleLogout} variant="danger" style={{ cursor: 'pointer' }}>
            Logout
          </Button>
          <Button type="button" onClick={handleRestartApp} variant="secondary" style={{ cursor: 'pointer' }}>
            Restart Aplikasi
          </Button>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          <Card style={{ flex: 1, minWidth: '350px', padding: '32px', boxSizing: 'border-box'}}>
            <h1 style={{ marginTop: 0, marginBottom: '8px', fontSize: '28px', color: 'var(--text)' }}>Pengaturan Server</h1>
            <p style={{ margin: '0 0 32px 0', color: 'var(--text-muted)', fontSize: '16px' }}>IP Server: {ipAddress}</p>

            <h2 style={{ fontSize: '22px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px', color: 'var(--text)' }}>Pengaturan Toko</h2>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} onSubmit={savePengaturanToko}>
              <Input
                value={namaToko}
                onChange={(e) => setNamaToko(e.target.value)}
                placeholder="Nama Toko"
                required
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Upload Logo Toko</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'inherit',
                    color: 'var(--text)',
                    boxSizing: 'border-box'
                  }}
                />
                {(logoPreview || logoToko) && (
                  <img
                    src={logoPreview || (logoToko.startsWith('http') ? logoToko : `${getApiUrl()}${logoToko.startsWith('/') ? '' : '/'}${logoToko}`)}
                    alt="Preview"
                    style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', marginTop: '8px' }}
                  />
                )}
              </div>

              <Input
                value={runningText}
                onChange={(e) => setRunningText(e.target.value)}
                placeholder="Running Text Display"
                required
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Mode Cetak Antrian di Display</span>
                <Select
                  value={printMode}
                  onChange={(e) => setPrintMode(e.target.value)}
                  options={[
                    { value: 'langsung', label: 'Cetak Langsung' },
                    { value: 'preview', label: 'Tampilkan Preview Dulu' }
                  ]}
                  margin="0"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Upload Video Display</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'inherit',
                    color: 'var(--text)',
                    boxSizing: 'border-box'
                  }}
                />
                {(videoPreview || videoUrl) && (
                  <video
                    src={videoPreview || (videoUrl.startsWith('http') ? videoUrl : `${getApiUrl()}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`)}
                    controls
                    style={{ width: '100%', maxHeight: '160px', borderRadius: '8px', marginTop: '8px', backgroundColor: '#000' }}
                  />
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {videoPreview ? 'Video baru siap disimpan.' : (videoUrl ? 'Video di atas adalah video yang sedang aktif.' : 'Belum ada video yang diupload.')}
                </span>
              </div>

              <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                <Button type="submit" variant="success" style={{ cursor: 'pointer', padding: '12px 24px' }}>Simpan Pengaturan Toko</Button>
              </div>
            </form>
          </Card>

          <Card style={{ flex: 1, minWidth: '350px', padding: '32px', boxSizing: 'border-box' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginTop: 0, color: 'var(--text)' }}>Jenis Antrian & Loket</h2>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} onSubmit={saveJenis}>
              <Input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama Antrian"
                required
              />
              <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    value={kodeHuruf}
                    onChange={(e) => setKodeHuruf(e.target.value)}
                    placeholder="Kode (Cth: A)"
                    required
                    maxLength={2}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value)}
                    placeholder="Shortcut"
                    required
                    maxLength={1}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                <Button type="submit" variant="primary" style={{ cursor: 'pointer', padding: '12px 24px' }}>
                  {editingId ? 'Simpan Perubahan' : 'Tambah Jenis'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={resetFormJenis} style={{ cursor: 'pointer', padding: '12px 24px' }}>
                    Batal
                  </Button>
                )}
              </div>
            </form>

            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              {jenis.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ fontSize: '18px', color: 'var(--text)' }}>{item.nama}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '15px' }}>({item.kode_huruf}) · Shortcut: {item.shortcut || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button type="button" variant="secondary" onClick={() => editJenis(item)} style={{ cursor: 'pointer' }}>
                      Edit
                    </Button>
                    <Button variant="danger" type="button" onClick={() => hapusJenis(item.id)} style={{ cursor: 'pointer' }}>
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', width: '100%', borderTop: '2px solid var(--border)', paddingTop: '24px' }}>
              <Button
                type="button"
                onClick={() => navigate('/display')}
                variant="primary"
                style={{ padding: '14px 32px', fontSize: '16px', cursor: 'pointer' }}
              >
                Buka Display
              </Button>
            </div>
          </Card>

          <Card style={{ flex: 1, minWidth: '350px', padding: '32px', boxSizing: 'border-box' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginTop: 0, color: 'var(--text)' }}>Pengaturan Warna</h2>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }} onSubmit={saveTheme}>
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '130px', fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                  <input
                    type="color"
                    value={extractHex(themeVars[key], '#000000')}
                    onChange={(e) => setThemeVar(key, e.target.value)}
                    style={{ width: '40px', height: '36px', padding: 0, border: '1px solid var(--border)', borderRadius: '6px', background: 'none', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <Input
                    value={themeVars[key] || ''}
                    onChange={(e) => setThemeVar(key, e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Background Halaman</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="color"
                      value={parseGradient(themeVars['--background']).start}
                      onChange={(e) => setThemeVar('--background', buildGradient(e.target.value, parseGradient(themeVars['--background']).end))}
                      style={{ width: '40px', height: '36px', padding: 0, border: '1px solid var(--border)', borderRadius: '6px', background: 'none', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Warna Atas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="color"
                      value={parseGradient(themeVars['--background']).end}
                      onChange={(e) => setThemeVar('--background', buildGradient(parseGradient(themeVars['--background']).start, e.target.value))}
                      style={{ width: '40px', height: '36px', padding: 0, border: '1px solid var(--border)', borderRadius: '6px', background: 'none', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Warna Bawah</span>
                  </div>
                </div>
                <div style={{ height: '44px', borderRadius: '8px', border: '1px solid var(--border)', background: themeVars['--background'] }} />
              </div>

              <div style={{ display: 'flex', gap: '16px', width: '100%', marginTop: '10px' }}>
                <Button type="submit" variant="success" style={{ cursor: 'pointer', padding: '12px 24px' }}>
                  Simpan Warna
                </Button>
                <Button type="button" variant="secondary" onClick={resetTheme} style={{ cursor: 'pointer', padding: '12px 24px' }}>
                  Reset ke Default
                </Button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Setelah simpan, klik tombol "Restart Aplikasi" di atas agar semua halaman (Loket, Display) ikut memuat warna baru.
              </p>
            </form>
          </Card>
          
        </div>
    </div>
  )
}