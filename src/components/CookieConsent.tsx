import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Cookie } from 'lucide-react';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md z-[100] animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#f0e7ec] p-6 md:p-8 overflow-hidden relative group">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#f8a4b9]/5 rounded-full blur-3xl transition-all group-hover:bg-[#f8a4b9]/10" />
        
        <div className="flex items-start gap-4 relative">
          <div className="w-12 h-12 bg-[#ffeef2] rounded-2xl flex items-center justify-center shrink-0">
            <Cookie className="w-6 h-6 text-[#f8a4b9]" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-lg">Cookie Settings</h3>
              <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleAccept}
                className="flex-1 bg-[#f8a4b9] hover:bg-[#e88aa3] text-white rounded-xl h-11 font-semibold transition-all active:scale-[0.98]"
              >
                Accept All
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleDecline}
                className="flex-1 text-gray-500 hover:bg-gray-50 rounded-xl h-11 font-medium"
              >
                Reject All
              </Button>
            </div>
            
            <div className="mt-4 text-center">
              <a href="/privacy" className="text-[10px] text-[#f8a4b9] hover:underline uppercase tracking-widest font-bold">
                Read Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
