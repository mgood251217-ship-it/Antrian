import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import LoginServer from './pages/LoginServer'
import LoginUser from './pages/LoginUser'
import Loket from './pages/Loket'
import Pengaturan from './pages/Pengaturan'
import Display from './pages/Display'
import Cetak from './pages/Cetak'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login-server" element={<LoginServer />} />
        <Route path="/login-user" element={<LoginUser />} />
        <Route path="/loket" element={<Loket />} />
        <Route path="/pengaturan" element={<Pengaturan />} />
        <Route path="/display" element={<Display />} />
        <Route path="/cetak" element={<Cetak />} />
      </Routes>
    </Router>
  )
}

export default App
