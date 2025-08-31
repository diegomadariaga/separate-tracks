import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@repo/ui';

export interface FileDropZoneProps {
  accept?: string;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  className?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  accept = 'audio/*',
  disabled = false,
  onFileSelected,
  className
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    const file = fileList[0];
    onFileSelected(file);
  }, [onFileSelected]);

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={e => handleFiles(e.target.files)}
      />
      <div
        className={dragging ? 'upload-area dragging' : 'upload-area'}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        aria-disabled={disabled}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Arrastra un archivo de audio o</p>
        <Button style={{ marginTop: 18 }} size="lg" disabled={disabled}>Selecciona</Button>
      </div>
    </div>
  );
};
