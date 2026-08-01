export const DEFAULT_API_URL = 'http://localhost:3000';

export function getApiUrl() {
  if (typeof window === 'undefined') return DEFAULT_API_URL;

  const storedIP = localStorage.getItem('serverIP');
  if (storedIP) {
    return `http://${storedIP}:3000`;
  }

  const currentHost = window.location.hostname;
  if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return `http://${currentHost}:3000`;
  }

  return DEFAULT_API_URL;
}
