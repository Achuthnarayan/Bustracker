'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth(role?: 'operator') {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('bus_tracker_token');
    const expiry = localStorage.getItem('bus_tracker_token_expiry');
    if (!token || !expiry || new Date() > new Date(expiry)) {
      router.push(role === 'operator' ? '/operator/login' : '/login');
      return;
    }
    if (role === 'operator') {
      const user = JSON.parse(localStorage.getItem('bus_tracker_user') || '{}');
      if (user.role !== 'operator') router.push('/operator/login');
    }
  }, []);
}

export function getToken() {
  return localStorage.getItem('bus_tracker_token');
}
