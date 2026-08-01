import { Link } from 'react-router-dom'
import './PageStyles.css'

export default function Home() {
  return (
    <div className="page-shell">
      <div className="card">
        <h1>Aplikasi Antrian</h1>
        <p>Pilih mode berikut untuk melanjutkan.</p>
        <div className="button-grid">
          <Link className="button" to="/login-server">Login Server</Link>
          <Link className="button" to="/login-user">Login Petugas</Link>
        </div>
      </div>
    </div>
  )
}
