export const SHEPHERD_API_URL = import.meta.env.VITE_SHEPHERD_API_URL || 'http://localhost:3000';
export const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3001';
  
export const getHeaders = () => ({
  'Authorization': `Bearer ${import.meta.env.VITE_JWT_TOKEN || ''}`,
  'x-jwt-organization-id': import.meta.env.VITE_ORG_ID || '',
  'x-jwt-application-id': import.meta.env.VITE_APP_ID || '',
  'Content-Type': 'application/json'
}); 