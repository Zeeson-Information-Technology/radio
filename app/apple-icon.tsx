import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 180,
  height: 180,
}
 
export const contentType = 'image/png'
 
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
          borderRadius: '20%',
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 60 10 L 85 20 L 110 45 L 110 75 L 85 100 L 35 100 L 10 75 L 10 45 L 35 20 Z"
            fill="white"
            opacity="0.15"
          />
          <path
            d="M 60 15 L 82 24 L 105 47 L 105 73 L 82 96 L 38 96 L 15 73 L 15 47 L 38 24 Z"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="3"
            opacity="0.7"
          />
          <path
            d="M 60 20 L 80 28 L 100 48 L 100 72 L 80 92 L 40 92 L 20 72 L 20 48 L 40 28 Z"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="2"
            opacity="0.9"
          />
          <g transform="translate(60, 60)">
            <path
              d="M 0,-25 L -5,-8 L -20,-10 L -8,-3 L -12,10 L 0,0 L 12,10 L 8,-3 L 20,-10 L 5,-8 Z"
              fill="white"
              opacity="0.95"
            />
            <path
              d="M 0,-8 L -8,0 L 0,8 L 8,0 Z"
              fill="#D4AF37"
            />
            <circle cx="0" cy="0" r="3" fill="white" />
          </g>
          <circle cx="60" cy="15" r="2" fill="#D4AF37" opacity="0.7" />
          <circle cx="105" cy="60" r="2" fill="#D4AF37" opacity="0.7" />
          <circle cx="60" cy="105" r="2" fill="#D4AF37" opacity="0.7" />
          <circle cx="15" cy="60" r="2" fill="#D4AF37" opacity="0.7" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
