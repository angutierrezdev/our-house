import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash screen for at least 1.5 seconds or until app is ready
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6">
        {/* Logo */}
        <div className="animate-bounce">
          <img 
            src="/our-house/icons/icon-192x192.png" 
            alt="Our House" 
            className="w-24 h-24 md:w-32 md:h-32 drop-shadow-lg"
          />
        </div>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 animate-fade-in">
            Our<span className="text-red-600">House</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-2 animate-fade-in-delay">
            Manage your home chores with ease
          </p>
        </div>

        {/* Loading indicator */}
        <div className="mt-6 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delay {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-fade-in-delay {
          animation: fade-in-delay 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
