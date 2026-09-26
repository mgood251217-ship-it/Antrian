import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button/Button'
import Card from '../components/Card/Card'
import Section from '../components/Section/Section'
import { getServerSession } from '../services/session'

export default function Home() {
  const navigate = useNavigate()
  const [hasSession] = useState(() => !!getServerSession())

  useEffect(() => {
    if (hasSession) {
      navigate('/display', { replace: true })
    }
  }, [hasSession, navigate])

  if (hasSession) {
    return null
  }

  return (
    <div style={{ background: 'var(--background)' }}>
      <Section >
        <Card>
          <h1>Aplikasi Antrian</h1>
          <p>Pilih mode berikut untuk melanjutkan.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => navigate('/login-server')} variant="danger">
              Login Server
            </Button>
            <Button onClick={() => navigate('/login-user')}>
              Login Petugas
            </Button>
          </div>
        </Card>
      </Section>
    </div>
  )
}