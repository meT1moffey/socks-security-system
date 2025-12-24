import React from 'react';
import { createRoot } from 'react-dom/client';
import SockTable from './components/SockTable';

declare global {
  interface Window {
    initialSocks: any[];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const sockTableContainer = document.getElementById('react-sock-table');
  if (sockTableContainer) {
    const initialSocks = window.initialSocks || [];
    const root = createRoot(sockTableContainer);
    root.render(<SockTable initialSocks={initialSocks} />);
  }

  const statsModalContainer = document.getElementById('react-stats-modal');
  if (statsModalContainer) {
    // pass
  }
});