import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../config'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import './PageStyles.css'

export default function Pengaturan() {
  const navigate = useNavigate()
  const [ipAddress, setIpAddress] = useState('')
  const [nama, setNama] = useState('')
  const [kodeHuruf, setKodeHuruf] = useState('')
  const [jenis, setJenis] = useState([])

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
        console.error('Gagal memuat info server:', error)
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
  }, [])

  const fetchJenis = async () => {
    const res = await fetch(`${getApiUrl()}/api/jenis_antrian`)
    const data = await res.json()
    if (data.success) setJenis(data.data)
  }

  const addJenis = async (e) => {
    e.preventDefault()
    await fetch(`${getApiUrl()}/api/jenis_antrian`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, kode_huruf: kodeHuruf })
    })
    setNama('')
    setKodeHuruf('')
    fetchJenis()
  }

  const hapusJenis = async (id) => {
    await fetch(`${getApiUrl()}/api/jenis_antrian/hapus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    fetchJenis()
  }

  return (
    <div className="page-shell">
      <Card className="card">
        <div className="page-header-row">
          <Button type="button" onClick={() => navigate(-1)}>
            ← Kembali
          </Button>
        </div>
        <h1>Pengaturan Server</h1>
        <p>IP Server: {ipAddress}</p>
        <form className="form-group" onSubmit={addJenis}>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Antrian" required />
          <Input value={kodeHuruf} onChange={(e) => setKodeHuruf(e.target.value)} placeholder="Kode Huruf" required maxLength={2} />
          <Button type="submit">Tambah Jenis</Button>
        </form>
        <div className="list-box">
          {jenis.map((item) => (
            <div key={item.id} className="list-item">
              <span>{item.nama} ({item.kode_huruf})</span>
              <Button variant="danger" type="button" onClick={() => hapusJenis(item.id)}>
                Hapus
              </Button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a href="/display" className="button">Buka Display</a>
        </div>
      </Card>
    </div>
  )
}
