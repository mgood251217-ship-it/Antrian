import './Input.css'

export default function Input({ className = '', ...props }) {
  return <input className={`input ${className}`.trim()} {...props} />
}
