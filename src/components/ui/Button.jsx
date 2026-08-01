import './ui.css'

export default function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  const variantClass = variant === 'danger' ? 'ui-btn-danger' : 'ui-btn-primary'

  return (
    <button type={type} className={`ui-btn ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
