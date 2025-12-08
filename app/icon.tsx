import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 32,
  height: 32,
}
 
export const contentType = 'image/png'
 
export default function Icon() {
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
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 60 10 L 85 20 L 110 45 L 110 75 L 85 100 L 35 100 L 10 75 L 10 45 L 35 20 Z"
            fill="white"
            opacity="0.2"
          />
          <path
            d="M 60 20 L 80 28 L 100 48 L 100 72 L 80 92 L 40 92 L 20 72 L 20 48 L 40 28 Z"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="2"
            opacity="0.8"
          />
          <g transform="translate(60, 60)">
            <path
              d="M 0,-20 L -4,-6 L -16,-8 L -6,-2 L -10,8 L 0,0 L 10,8 L 6,-2 L 16,-8 L 4,-6 Z"
              fill="white"
            />
            <path
              d="M 0,-6 L -6,0 L 0,6 L 6,0 Z"
              fill="#D4AF37"
            />
            <circle cx="0" cy="0" r="2" fill="white" />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
