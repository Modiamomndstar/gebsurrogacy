import { useEffect, useState } from 'react';

interface AdSenseZoneProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  style?: React.CSSProperties;
  className?: string;
}

const AdSenseZone = ({ slot, format = 'auto', style, className }: AdSenseZoneProps) => {
  const [adClient, setAdClient] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setAdClient(data.settings?.adsense_client_id || null);
        }
      } catch (e) {
        console.error('Failed to fetch AdSense settings');
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!adClient || adClient.includes('XXX')) return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, [adClient]);

  if (!adClient || adClient.includes('XXX')) {
    return (
      <div className={`ad-zone my-8 flex justify-center items-center bg-gray-50 rounded-xl border border-dashed border-gray-200 overflow-hidden min-h-[100px] opacity-40 ${className}`}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ad Slot: {slot} (Awaiting Configuration)</span>
      </div>
    );
  }

  return (
    <div className={`ad-zone my-8 flex justify-center items-center bg-gray-50 rounded-xl border border-dashed border-gray-200 overflow-hidden min-h-[100px] ${className}`}>
      <ins
        className="adsbygoogle"
        style={style || { display: 'block', width: '100%' }}
        data-ad-client={adClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSenseZone;
