import React from 'react';
import { FileRecord } from '../types';

export interface FileTableProps {
  files: FileRecord[];
  emptyLabel?: string;
  className?: string;
}

export const FileTable: React.FC<FileTableProps> = ({ files, emptyLabel = 'Sin archivos', className }) => {
  return (
    <div className={['table-wrapper fade-in', className].filter(Boolean).join(' ')} style={{ marginTop: 12 }}>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f.id}>
              <td>{f.originalName}</td>
              <td>{f.status}</td>
              <td>{new Date(f.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {!files.length && (
            <tr><td colSpan={3} className="muted" style={{ textAlign: 'center', padding: 20, fontSize: 14 }}>{emptyLabel}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
