export function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Traditional Islamic Green - Simple and Authentic */}
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        
        {/* Gold accent for traditional Islamic aesthetics */}
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#C9A227" />
        </linearGradient>
      </defs>

      {/* Outer Octagon - Traditional Islamic 8-pointed geometry */}
      <path
        d="M 60 10 L 85 20 L 110 45 L 110 75 L 85 100 L 35 100 L 10 75 L 10 45 L 35 20 Z"
        fill="url(#logoGradient)"
        stroke="url(#goldGradient)"
        strokeWidth="2"
      />
      
      {/* Inner Octagon Border - Layered traditional pattern */}
      <path
        d="M 60 20 L 80 28 L 100 48 L 100 72 L 80 92 L 40 92 L 20 72 L 20 48 L 40 28 Z"
        fill="none"
        stroke="url(#goldGradient)"
        strokeWidth="1.5"
        opacity="0.6"
      />
      
      {/* Central Islamic Star Pattern - 8-pointed star */}
      <g transform="translate(60, 60)">
        {/* Star points */}
        <path
          d="M 0,-25 L -5,-8 L -20,-10 L -8,-3 L -12,10 L 0,0 L 12,10 L 8,-3 L 20,-10 L 5,-8 Z"
          fill="white"
          opacity="0.95"
        />
        
        {/* Inner diamond */}
        <path
          d="M 0,-8 L -8,0 L 0,8 L 8,0 Z"
          fill="url(#goldGradient)"
        />
        
        {/* Center circle - represents unity (Tawhid) */}
        <circle cx="0" cy="0" r="3" fill="white" />
      </g>
      
      {/* Corner decorative elements - Traditional Islamic geometry */}
      <circle cx="60" cy="15" r="2" fill="url(#goldGradient)" opacity="0.7" />
      <circle cx="105" cy="60" r="2" fill="url(#goldGradient)" opacity="0.7" />
      <circle cx="60" cy="105" r="2" fill="url(#goldGradient)" opacity="0.7" />
      <circle cx="15" cy="60" r="2" fill="url(#goldGradient)" opacity="0.7" />
      
      {/* Subtle corner accents */}
      <path d="M 35 20 L 40 28 L 35 28 Z" fill="url(#goldGradient)" opacity="0.4" />
      <path d="M 85 20 L 80 28 L 85 28 Z" fill="url(#goldGradient)" opacity="0.4" />
      <path d="M 35 100 L 40 92 L 35 92 Z" fill="url(#goldGradient)" opacity="0.4" />
      <path d="M 85 100 L 80 92 L 85 92 Z" fill="url(#goldGradient)" opacity="0.4" />
    </svg>
  );
}

export function LogoWithText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo className="w-12 h-12" />
      <div className="flex flex-col">
        <span className="font-bold text-xl leading-tight text-emerald-800">
          Al-Manhaj Radio
        </span>
        <span 
          className="text-sm leading-tight" 
          style={{ 
            fontFamily: 'Traditional Arabic, Amiri, Arial, sans-serif', 
            direction: 'rtl',
            color: '#D4AF37',
            fontWeight: 600
          }}
        >
          إذاعة المنهج
        </span>
      </div>
    </div>
  );
}

export function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="iconGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#C9A227" />
        </linearGradient>
      </defs>
      
      <path
        d="M 60 10 L 85 20 L 110 45 L 110 75 L 85 100 L 35 100 L 10 75 L 10 45 L 35 20 Z"
        fill="url(#iconGradient)"
        stroke="url(#iconGold)"
        strokeWidth="2"
      />
      
      <g transform="translate(60, 60)">
        <path
          d="M 0,-25 L -5,-8 L -20,-10 L -8,-3 L -12,10 L 0,0 L 12,10 L 8,-3 L 20,-10 L 5,-8 Z"
          fill="white"
          opacity="0.95"
        />
        <path
          d="M 0,-8 L -8,0 L 0,8 L 8,0 Z"
          fill="url(#iconGold)"
        />
        <circle cx="0" cy="0" r="3" fill="white" />
      </g>
    </svg>
  );
}
