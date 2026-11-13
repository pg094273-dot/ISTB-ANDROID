import React, { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  url: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  const [copied, setCopied] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(url)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-center">
      <div className="relative p-2 bg-white rounded-xl shadow-lg mb-3">
        <img
          src={qrImageUrl}
          alt={`QR Code para ${url}`}
          className="w-48 h-48 sm:w-56 sm:h-56 block object-contain"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-1 flex justify-center">
          <span className="bg-slate-900/80 text-sky-300 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full">
            Escanear con Android
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-300 mb-3 max-w-xs">
        Apunta con la cámara de tu móvil Android para abrir e instalar la app directamente.
      </p>

      <div className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
        <span className="font-mono text-slate-400 truncate max-w-[200px] text-left">
          {url}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition cursor-pointer"
            title="Copiar enlace"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
