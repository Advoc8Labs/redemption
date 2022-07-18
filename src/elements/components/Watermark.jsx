import React from 'react';
import { openTab } from '../../utils/network';

export default function Watermark({ addChin, width = 135, height = 40 }) {
  return (
    <div
      css={{
        position: 'absolute',
        bottom: addChin ? -60 : 0,
        right: 40
      }}
    >
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#FFFFFF',
          boxShadow: '0px 2px 10px rgba(151, 161, 172, 0.3)',
          borderRadius: '6px',
          color: '#6c7589',
          fontFamily: 'Axiforma, sans-serif',
          fontSmoothing: 'antialiased',
          fontWeight: 400,
          fontSize: '11px',
          gap: '8px',
          cursor: 'pointer'
        }}
        onClick={() => openTab('https://feathery.io')}
      >
        <span>Built on</span>
        <img
          style={{ maxWidth: '50%', maxHeight: '80%' }}
          src='https://feathery.s3.us-west-1.amazonaws.com/full-logo-1.png'
          alt='Feathery Logo'
        />
      </div>
    </div>
  );
}
