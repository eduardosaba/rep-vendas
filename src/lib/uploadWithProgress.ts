/**
 * Helper genérico para fazer upload com progresso usando uma URL presignada.
 *
 * Observações:
 * - A API/servidor deve fornecer uma `uploadUrl` (pré-assinada) que aceite PUT/POST.
 * - Para Supabase Storage você pode gerar uma URL de upload no servidor (ou usar um endpoint que faça o upload usando o cliente do Supabase e exponha progresso).
 * - Este helper usa `XMLHttpRequest` para expor `onprogress` de upload.
 */

export function uploadFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ status: number; response?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, response: xhr.responseText });
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    // Ajuste de headers se necessário (ex: Content-Type)
    // xhr.setRequestHeader('Content-Type', file.type);

    xhr.send(file);
  });
}

export default uploadFileWithProgress;
