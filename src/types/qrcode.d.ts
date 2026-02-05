declare module 'qrcode';
declare module 'qrcode' {
  const QRCode: {
    toDataURL(input: string, opts?: any): Promise<string>;
  };
  export default QRCode;
}
