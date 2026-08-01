import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../config'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import './PageStyles.css'

export default function LoginServer() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch(`${getApiUrl()}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (data.success && data.role === 'server') {
        navigate('/pengaturan')
      } else {
        setError('Kredensial server tidak valid.')
      }
    } catch (err) {
      setError('Gagal terhubung ke server.')
    }
  }

  return (
    <div className="page-shell">
      <Card className="card">
        <div className="page-header-row">
          <Button type="button" onClick={() => navigate(-1)}>
            ← Kembali
          </Button>
        </div>
        <h1>Login Server</h1>
        <form onSubmit={handleSubmit}>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />
          <Button type="submit">Masuk</Button>
        </form>
        {error && <p className="error">{error}</p>}
      </Card>
    </div>
  )
}
