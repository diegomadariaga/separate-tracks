import React from 'react';
import { Button } from '@repo/ui';

export const App: React.FC = () => {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32 }}>
      <h1>Monorepo Vite + Nest + Turborepo</h1>
      <p>Componente compartido:</p>
      <Button onClick={() => alert('Hola')}>Click</Button>
    </div>
  );
};
