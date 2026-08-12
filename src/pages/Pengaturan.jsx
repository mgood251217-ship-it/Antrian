import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
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

function todayLocalDate() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

function formatDurasi(detik) {
  const total = Math.round(detik || 0)
  if (total <= 0) return '-'
  const menit = Math.floor(total / 60)
  const sisaDetik = total % 60
  return `${menit}m ${sisaDetik}s`
}

function formatWaktuLengkap(value) {
  if (!value) return '-'
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return value
  return date.toLocaleString('id-ID', { hour12: false })
}

function statusInfo(status) {
  switch (status) {
    case 'menunggu': return { label: 'Menunggu', color: 'var(--text-muted)' }
    case 'dipanggil': return { label: 'Dipanggil', color: 'var(--primary)' }
    case 'selesai': return { label: 'Selesai', color: 'var(--success)' }
    case 'batal': return { label: 'Batal', color: 'var(--danger)' }
    default: return { label: status || '-', color: 'var(--text-muted)' }
  }
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

  const [users, setUsers] = useState([])
  const [userEditingId, setUserEditingId] = useState(null)
  const [userUsername, setUserUsername] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userRole, setUserRole] = useState('user')
  const [userName, setUserName] = useState('')

  const [laporanTanggal, setLaporanTanggal] = useState(todayLocalDate())
  const [laporan, setLaporan] = useState(null)
  const [laporanLoading, setLaporanLoading] = useState(false)

  const [riwayatTanggal, setRiwayatTanggal] = useState(todayLocalDate())
  const [riwayatList, setRiwayatList] = useState([])
  const [riwayatLoading, setRiwayatLoading] = useState(false)

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
    fetchUsers()
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

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/users`)
      const data = await res.json()
      if (data.success) setUsers(data.data)
    } catch (error) {
      console.error(error)
    }
  }

  const saveUser = async (e) => {
    e.preventDefault()
    const endpoint = userEditingId ? '/api/users/edit' : '/api/users'
    try {
      const res = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userEditingId,
          username: userUsername,
          password: userPassword,
          role: userRole,
          name: userName
        })
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || 'Gagal menyimpan user.')
        return
      }
      resetFormUser()
      fetchUsers()
    } catch (error) {
      console.error(error)
      alert('Terjadi kesalahan jaringan.')
    }
  }

  const editUser = (item) => {
    setUserEditingId(item.id)
    setUserUsername(item.username)
    setUserPassword('')
    setUserRole(item.role)
    setUserName(item.name)
  }

  const resetFormUser = () => {
    setUserEditingId(null)
    setUserUsername('')
    setUserPassword('')
    setUserRole('user')
    setUserName('')
  }

  const hapusUser = async (id) => {
    if (!window.confirm('Hapus user ini?')) return
    await fetch(`${getApiUrl()}/api/users/hapus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    fetchUsers()
  }

  const fetchLaporan = async (tanggal) => {
    setLaporanLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/laporan/harian?tanggal=${tanggal}`)
      const data = await res.json()
      if (data.success) setLaporan(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLaporanLoading(false)
    }
  }

  useEffect(() => {
    fetchLaporan(laporanTanggal)
  }, [laporanTanggal])

  const fetchRiwayat = async (tanggal) => {
    setRiwayatLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/riwayat/antrian?tanggal=${tanggal}`)
      const data = await res.json()
      if (data.success) setRiwayatList(data.data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setRiwayatLoading(false)
    }
  }

  useEffect(() => {
    fetchRiwayat(riwayatTanggal)
  }, [riwayatTanggal])

  const exportRiwayatExcel = () => {
    if (!riwayatList || riwayatList.length === 0) {
      alert('Tidak ada data riwayat untuk tanggal ini.')
      return
    }
    const rows = riwayatList.map((item) => ({
      'Nomor': `${item.kode_huruf} ${item.nomor}`,
      'Jenis Antrian': item.nama,
      'Status': statusInfo(item.status).label,
      'Loket': item.loket || '-',
      'Waktu Ambil': formatWaktuLengkap(item.datetime),
      'Waktu Panggil': formatWaktuLengkap(item.waktu_panggil),
      'Waktu Selesai': formatWaktuLengkap(item.waktu_selesai)
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Antrian')
    XLSX.writeFile(workbook, `riwayat-antrian-${riwayatTanggal}.xlsx`)
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
            <h2 style={{ fontSize: '22px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginTop: 0, color: 'var(--text)' }}>Manajemen User</h2>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} onSubmit={saveUser}>
              <Input
                value={userUsername}
                onChange={(e) => setUserUsername(e.target.value)}
                placeholder="Username"
                required
              />
              <Input
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                type="password"
                placeholder={userEditingId ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'}
                required={!userEditingId}
              />
              <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    options={[
                      { value: 'user', label: 'Petugas Loket' },
                      { value: 'server', label: 'Admin Server' }
                    ]}
                    margin="0"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={userRole === 'user' ? 'Nama Loket (Cth: 1)' : 'Nama'}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                <Button type="submit" variant="primary" style={{ cursor: 'pointer', padding: '12px 24px' }}>
                  {userEditingId ? 'Simpan Perubahan' : 'Tambah User'}
                </Button>
                {userEditingId && (
                  <Button type="button" variant="secondary" onClick={resetFormUser} style={{ cursor: 'pointer', padding: '12px 24px' }}>
                    Batal
                  </Button>
                )}
              </div>
            </form>

            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              {users.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ fontSize: '18px', color: 'var(--text)' }}>{item.username}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                      {item.role === 'server' ? 'Admin Server' : `Petugas Loket ${item.name}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button type="button" variant="secondary" onClick={() => editUser(item)} style={{ cursor: 'pointer' }}>
                      Edit
                    </Button>
                    <Button variant="danger" type="button" onClick={() => hapusUser(item.id)} style={{ cursor: 'pointer' }}>
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
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

          <Card style={{ flex: '1 1 100%', padding: '32px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '22px', margin: 0, color: 'var(--text)' }}>Laporan Harian</h2>
              <input
                type="date"
                value={laporanTanggal}
                onChange={(e) => setLaporanTanggal(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: 'inherit',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
              />
            </div>

            {laporanLoading && <p style={{ color: 'var(--text-muted)' }}>Memuat laporan...</p>}

            {!laporanLoading && laporan && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
                  {[
                    { label: 'Total Diambil', value: laporan.ringkasan.total_ambil },
                    { label: 'Selesai', value: laporan.ringkasan.total_selesai },
                    { label: 'Batal', value: laporan.ringkasan.total_batal },
                    { label: 'Belum Dipanggil', value: laporan.ringkasan.total_menunggu },
                    { label: 'Rata Waktu Tunggu', value: formatDurasi(laporan.ringkasan.rata_tunggu_detik) },
                    { label: 'Rata Waktu Layanan', value: formatDurasi(laporan.ringkasan.rata_layanan_detik) }
                  ].map((stat) => (
                    <div key={stat.label} style={{ flex: '1 1 150px', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 420px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '12px' }}>Per Jenis Antrian</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {laporan.per_jenis.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Belum ada jenis antrian.</p>
                      )}
                      {laporan.per_jenis.map((item) => (
                        <div key={item.id} style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                            <strong style={{ color: 'var(--text)', fontSize: '15px' }}>{item.nama} <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 400 }}>({item.kode_huruf})</span></strong>
                            <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '15px' }}>{item.total_ambil} diambil</span>
                          </div>
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
                            <span>Selesai: <strong style={{ color: 'var(--success)' }}>{item.total_selesai}</strong></span>
                            <span>Batal: <strong style={{ color: 'var(--danger)' }}>{item.total_batal}</strong></span>
                            <span>Menunggu: <strong style={{ color: 'var(--text)' }}>{item.total_menunggu}</strong></span>
                            <span>Rata Tunggu: <strong style={{ color: 'var(--text)' }}>{formatDurasi(item.rata_tunggu_detik)}</strong></span>
                            <span>Rata Layanan: <strong style={{ color: 'var(--text)' }}>{formatDurasi(item.rata_layanan_detik)}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: '1 1 220px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '12px' }}>Per Loket</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {laporan.per_loket.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Belum ada panggilan.</p>
                      )}
                      {laporan.per_loket.map((item) => (
                        <div key={item.loket} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>Loket {item.loket}</span>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{item.total} dilayani</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card style={{ flex: '1 1 100%', padding: '32px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '22px', margin: 0, color: 'var(--text)' }}>Riwayat Antrian</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={riwayatTanggal}
                  onChange={(e) => setRiwayatTanggal(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'inherit',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
                <Button type="button" variant="success" onClick={exportRiwayatExcel} style={{ cursor: 'pointer', padding: '10px 20px' }}>
                  Export Excel
                </Button>
              </div>
            </div>

            {riwayatLoading && <p style={{ color: 'var(--text-muted)' }}>Memuat riwayat...</p>}

            {!riwayatLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {riwayatList.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Belum ada antrian pada tanggal ini.</p>
                )}
                {[...riwayatList].reverse().map((item) => {
                  const info = statusInfo(item.status)
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ minWidth: '90px' }}>
                        <strong style={{ color: 'var(--text)', fontSize: '15px' }}>{item.kode_huruf} {item.nomor}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.nama}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', flex: 1, minWidth: '200px' }}>
                        <span>Ambil: {formatWaktuLengkap(item.datetime)}</span>
                        {item.loket && <span> &nbsp;•&nbsp; Loket {item.loket}</span>}
                        {item.waktu_panggil && <span> &nbsp;•&nbsp; Panggil: {formatWaktuLengkap(item.waktu_panggil)}</span>}
                        {item.waktu_selesai && <span> &nbsp;•&nbsp; Selesai: {formatWaktuLengkap(item.waktu_selesai)}</span>}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: info.color, flexShrink: 0 }}>{info.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
          
        </div>
    </div>
  )
}