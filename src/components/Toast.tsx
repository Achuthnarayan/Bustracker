'use client';
import { useEffect, useState } from 'react';

interface Props { message: string; type?: 'success' | 'error'; onDone: () => void; }

export default function Toast({ message, type = 'success', onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`toast ${type === 'error' ? 'toast-error' : ''}`}>{message}</div>
  );
}
