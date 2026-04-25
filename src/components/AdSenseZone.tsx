import { useEffect } from 'react';

interface AdSenseZoneProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  style?: React.CSSProperties;
  className?: string;
}

const AdSenseZone = ({ slot, format = 'auto', style, className }: AdSenseZoneProps) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className={`ad-zone my-8 flex justify-center items-center bg-gray-50 rounded-xl border border-dashed border-gray-200 overflow-hidden min-h-[100px] ${className}`}>
      <ins
        className="adsbygoogle"
        style={style || { display: 'block', width: '100%' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // USER will replace this with their actual client ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Advertisement Space</span>
      </div>
    </div>
  );
};

export default AdSenseZone;
