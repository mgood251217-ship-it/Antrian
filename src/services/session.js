export const setSession = (data) => {
  localStorage.setItem('loketName', data.name)
  localStorage.setItem('serverIP', data.ip)
  localStorage.setItem('session_token', data.token || 'active')
}

export const getSession = () => {
  const name = localStorage.getItem('loketName')
  const ip = localStorage.getItem('serverIP')
  const token = localStorage.getItem('session_token')

  if (name && ip && token) {
    return { name, ip, token }
  }
  return null
}

export const clearSession = () => {
  localStorage.removeItem('loketName')
  localStorage.removeItem('serverIP')
  localStorage.removeItem('session_token')
}

export const setServerSession = (data) => {
  localStorage.setItem('server_role', data.role)
  localStorage.setItem('server_session_token', data.token || 'active')
}

export const getServerSession = () => {
  const role = localStorage.getItem('server_role')
  const token = localStorage.getItem('server_session_token')

  if (role === 'server' && token) {
    return { role, token }
  }
  return null
}

export const clearServerSession = () => {
  localStorage.removeItem('server_role')
  localStorage.removeItem('server_session_token')
}