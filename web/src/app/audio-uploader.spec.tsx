import { fireEvent, render, waitFor } from '@testing-library/react';
import { AudioUploader } from './AudioUploader';

function createFile(name: string, type: string) {
  return new File(['dummy'], name, { type });
}

describe('AudioUploader', () => {
  it('renders button and drop zone', () => {
    const { getByTestId } = render(<AudioUploader />);
    expect(getByTestId('select-audio-btn')).toBeTruthy();
    expect(getByTestId('drop-zone')).toBeTruthy();
  });

  it('rejects non-audio file', async () => {
    const { getByTestId, queryByTestId } = render(<AudioUploader />);
    const input = getByTestId('file-input') as HTMLInputElement;
    const file = createFile('test.txt', 'text/plain');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(queryByTestId('upload-error')).toBeTruthy();
    });
  });

  it('accepts audio file and attempts upload (placeholder)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { getByTestId, queryByTestId } = render(<AudioUploader />);
    const input = getByTestId('file-input') as HTMLInputElement;
    const file = createFile('sound.mp3', 'audio/mpeg');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(queryByTestId('upload-uploading') || queryByTestId('upload-success')).toBeTruthy();
    });
  });

  it('handles drag & drop audio file', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { getByTestId } = render(<AudioUploader />);
    const dropZone = getByTestId('drop-zone');
    const file = createFile('sound2.wav', 'audio/wav');
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    await waitFor(() => {
      expect(getByTestId('selected-file').textContent).toContain('sound2.wav');
    });
  });
});
