import { useNavigate } from 'react-router-dom'
import Button from '../components/Button/Button'
import Card from '../components/Card/Card'
import Section from '../components/Section/Section'

export default function Home() {
  const navigate = useNavigate()

  return (
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
  )
}