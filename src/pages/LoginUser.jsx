import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button/Button'
import Card from '../components/Card/Card'
import Input from '../components/Input/Input'
import Section from '../components/Section/Section'
import { setSession, getSession } from '../services/session'

export default function LoginUser() {
  const [ip, setIp] = useState('localhost')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const session = getSession()
    if (session) {
      navigate('/loket')
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const baseURL = `http://${ip}:3000`
      const res = await fetch(`${baseURL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      
      if (data.success && data.role === 'user') {
        setSession({ name: data.name, ip: ip })
        navigate('/loket')
      } else {
        setError('Kredensial user tidak valid.')
      }
    } catch (err) {
      setError('Gagal terhubung ke server.')
    }
  }

  return (
    <Section>
      <Card>
        <div className="page-header-row">
          <Button type="button" onClick={() => navigate(-1)}>
            ← Kembali
          </Button>
        </div>
        <h1>Login Petugas</h1>
        <form className="form-group" onSubmit={handleSubmit}>
          <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="IP Server" required />
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />
          <Button type="submit">Masuk</Button>
        </form>
        {error && <p className="error">{error}</p>}
      </Card>
    </Section>
  )
}