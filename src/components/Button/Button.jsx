import './Button.css'

export default function Button({
  children,
  variant = 'primary',
  className = '',
  marginBottom = '0',
  type = 'button',
  ...props }) {

  return (
    <button type={type} className={`btn btn-${variant} ${className}`.trim()} style={{ marginBottom: marginBottom }} {...props} >
      {children}
    </button>
  )
}
