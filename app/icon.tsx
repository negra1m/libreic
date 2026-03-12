import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          padding: '3px 6px',
          position: 'relative',
        }}
      >
        <span style={{ color: 'white', fontSize: 20, fontWeight: 'bold', fontFamily: 'serif', lineHeight: 1 }}>
          L
        </span>
        <div
          style={{
            position: 'absolute',
            bottom: 5,
            right: 6,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#f97316',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
