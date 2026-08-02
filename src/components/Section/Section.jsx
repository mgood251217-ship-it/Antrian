import './Section.css'
export default function Section({ children }) {
  return (
    <section>
      <div style={{ width: '100%', maxWidth: '420px', boxSizing: 'border-box' }}>
        {children}
      </div>
    </section>
  )
}