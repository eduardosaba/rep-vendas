import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import SmartImageUpload from '../src/components/SmartImageUpload';

// Mock Image so onload is called synchronously in jsdom
const OriginalImage = global.Image as any;
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 100;
  height = 100;
  set src(_src: string) {
    if (this.onload) this.onload();
  }
}

let originalToBlob: any;
let originalGetContext: any;

beforeAll(() => {
  (global as any).Image = MockImage;
  // Mock canvas.toBlob
  originalToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (
    callback: BlobCallback | null
  ) {
    if (callback) callback(new Blob(['fake'], { type: 'image/webp' }));
  };
  // Mock getContext to avoid jsdom not implemented error
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (_: string) {
    return {
      drawImage: () => {},
      fillRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => ({}),
    } as any;
  };
});

afterAll(() => {
  (global as any).Image = OriginalImage;
  if (originalToBlob) HTMLCanvasElement.prototype.toBlob = originalToBlob;
  if (originalGetContext)
    HTMLCanvasElement.prototype.getContext = originalGetContext;
});

test('SmartImageUpload calls onUploadReady with a File/blob when a file is selected', async () => {
  const onUploadReady = jest.fn();
  const { container } = render(
    <SmartImageUpload onUploadReady={onUploadReady} />
  );

  const input = container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  expect(input).toBeTruthy();

  const file = new File(['dummy'], 'test.png', { type: 'image/png' });

  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => {
    expect(onUploadReady).toHaveBeenCalled();
    const arg = onUploadReady.mock.calls[0][0];
    expect(arg).toBeTruthy();
    // should be a File or Blob
    expect(typeof (arg as Blob).size).toBe('number');
  });
});
