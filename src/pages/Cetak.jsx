import { useSearchParams } from 'react-router-dom'
import { getApiUrl } from '../config'

function resolveLogoUrl(logo) {
  if (!logo) return ''
  if (logo.startsWith('http')) return logo
  return `${getApiUrl()}${logo.startsWith('/') ? '' : '/'}${logo}`
}

export default function Cetak() {
  const [searchParams] = useSearchParams()

  const toko = searchParams.get('toko') || ''
  const logo = searchParams.get('logo') || ''
  const nomor = searchParams.get('nomor') || '-'
  const nama = searchParams.get('nama') || ''
  const waktu = searchParams.get('waktu') || ''

  const logoUrl = resolveLogoUrl(logo)

  return (
    <div className="ticket-wrapper">
      <style>
        {`
          @page {
            margin: 0;
            size: auto;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
          }
          .ticket-wrapper {
            width: 264px;
            margin: 0;
            padding: 10px 5px;
            text-align: center;
            font-family: 'Courier New', Courier, monospace;
            color: #000000;
          }
          * {
            box-sizing: border-box;
          }
        `}
      </style>

      {logoUrl && (
        <img 
          src={logoUrl} 
          alt="Logo" 
          style={{ 
            maxHeight: '60px', 
            maxWidth: '120px', 
            objectFit: 'contain', 
            marginBottom: '6px',
            filter: 'grayscale(100%) contrast(150%)'
          }} 
        />
      )}

      <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#000' }}>{toko}</h2>
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <p style={{ fontSize: '14px', margin: '4px 0' }}>ANTRIAN</p>
      {nama && <p style={{ fontSize: '14px', margin: '4px 0', fontWeight: 'bold' }}>{nama}</p>}
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: '10px 0', color: '#000' }}>{nomor}</h1>
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <p style={{ fontSize: '12px', margin: '4px 0' }}>{waktu}</p>
      <p style={{ fontSize: '11px', margin: '6px 0 0 0' }}>Silakan menunggu sampai nomor Anda dipanggil.</p>
    </div>
  )
}