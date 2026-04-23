'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool } from 'lucide-react';

type SignaturePadProps = {
  primaryColor?: string;
  onChange?: (dataUrl: string | null) => void;
};

export default function SignaturePad({ primaryColor = '#2563eb', onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width));
    canvas.height = Math.max(1, Math.floor(rect.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = primaryColor;
  }, [primaryColor]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getPos(e);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvas.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSignature) setHasSignature(true);
  };

  const stop = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = false;
    canvas.releasePointerCapture(e.pointerId);
    if (hasSignature) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange?.(dataUrl);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange?.(null);
  };

  return (
    <div className="space-y-4 bg-slate-50 p-6 rounded-[2.5rem] border border-dashed border-slate-200">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <PenTool size={14} /> Assinatura do Cliente (Opcional)
        </label>
        {hasSignature ? (
          <button onClick={clear} type="button" className="text-red-500 flex items-center gap-1 text-[10px] font-bold">
            <Eraser size={14} /> LIMPAR
          </button>
        ) : null}
      </div>

      <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-inner h-40">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerLeave={stop}
        />
      </div>
      <p className="text-[10px] text-center text-slate-400">Use o dedo ou caneta touch para assinar no campo acima</p>
    </div>
  );
}
