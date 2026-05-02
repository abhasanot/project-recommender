import { useState, useEffect } from 'react';

interface WelcomePageProps {
  onGetStarted: () => void;
}

// Floating particle data - reduced for better performance on mobile
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 8,
  duration: Math.random() * 6 + 8,
  opacity: Math.random() * 0.4 + 0.1,
}));

const ORBS = [
  { x: 15, y: 20, size: 320, color: 'rgba(79, 70, 229, 0.08)', delay: 0 },
  { x: 75, y: 60, size: 280, color: 'rgba(139, 92, 246, 0.06)', delay: 2 },
  { x: 50, y: 85, size: 240, color: 'rgba(99, 102, 241, 0.07)', delay: 4 },
  { x: 85, y: 15, size: 200, color: 'rgba(167, 139, 250, 0.05)', delay: 1 },
];

export default function WelcomePage({ onGetStarted }: WelcomePageProps) {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleGetStarted = () => {
    setLeaving(true);
    setTimeout(onGetStarted, 500);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap');

        .welcome-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .welcome-root.leaving {
          opacity: 0;
          transform: scale(1.02);
        }

        .welcome-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(70px);
          animation: orbFloat 14s ease-in-out infinite;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, -10px); }
        }

        .welcome-particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.5), rgba(139, 92, 246, 0.2));
          animation: particleFloat 10s ease-in-out infinite;
        }

        @keyframes particleFloat {
          0%, 100% { transform: translateY(0px); opacity: 0.2; }
          50% { transform: translateY(-10px); opacity: 0.4; }
        }

        .welcome-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .fade-in {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .fade-in.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Responsive logo - changed from fixed 380px */
        .welcome-logo {
          width: min(280px, 70vw);
          height: auto;
          object-fit: contain;
        }

        .cta-button {
          cursor: pointer;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border: none;
          border-radius: 50px;
          padding: 12px 36px;
          font-weight: 500;
          color: white;
          transition: 0.3s;
        }

        .cta-button:hover {
          transform: translateY(-2px);
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          padding: 12px 20px;
          border: 1px solid rgba(79, 70, 229, 0.15);
        }

        /* Responsive adjustments */
        @media (min-width: 640px) {
          .welcome-logo {
            width: min(340px, 60vw);
          }
        }

        @media (min-width: 768px) {
          .welcome-logo {
            width: min(380px, 50vw);
          }
        }

        @media (min-width: 1024px) {
          .welcome-logo {
            width: 380px;
          }
        }

        @media (max-width: 640px) {
          .cta-button {
            padding: 10px 28px;
            font-size: 14px;
          }
        }
      `}</style>

      <div className={`welcome-root ${leaving ? 'leaving' : ''}`}>
        <div className="welcome-grid" />

        {ORBS.map((orb, i) => (
          <div
            key={i}
            className="welcome-orb"
            style={{
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              width: orb.size,
              height: orb.size,
              background: orb.color,
              marginLeft: -orb.size / 2,
              marginTop: -orb.size / 2,
            }}
          />
        ))}

        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="welcome-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
          />
        ))}

        <div className="relative z-10 h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-4 overflow-auto">

          {/* Logo - responsive */}
          <div className={`fade-in ${mounted ? 'visible' : ''}`}>
            <img src="/logo.png" alt="Mu'een Logo" className="welcome-logo" />
          </div>

          {/* Tagline - responsive margin */}
          <div className={`fade-in ${mounted ? 'visible' : ''}`} style={{ marginTop: 'clamp(8px, 3vw, 16px)' }}>
            <span className="text-[8px] sm:text-[9px] md:text-[10px] text-indigo-500 uppercase tracking-wider font-medium">
              Academic Recommendation System
            </span>
          </div>

          {/* Title - responsive text sizes */}
          <div className={`fade-in ${mounted ? 'visible' : ''}`} style={{ marginTop: 'clamp(12px, 4vw, 16px)', textAlign: 'center' }}>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 px-4">
              Your Academic
              <span className="text-indigo-600"> Recommendation System</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-500 max-w-xl mx-auto mt-3 px-4">
              Explore previous projects, get personalized recommendations aligned with your interests, and analyze trends across different domains for deeper inspiration.
            </p>
          </div>

          {/* Features - commented out as in original */}
          {/* <div className={`fade-in ${mounted ? 'visible' : ''}`} style={{ marginTop: '24px' }}>
            <div className="flex flex-wrap justify-center gap-2">
              {['AI Matching', 'Collaboration', 'Smart Filtering', 'RDIA Ready'].map(f => (
                <div key={f} className="feature-card text-sm">{f}</div>
              ))}
            </div>
          </div> */}

          {/* Button - responsive margin */}
          <div className={`fade-in ${mounted ? 'visible' : ''}`} style={{ marginTop: 'clamp(20px, 5vw, 32px)' }}>
            <button onClick={handleGetStarted} className="cta-button">
              Get Started →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
