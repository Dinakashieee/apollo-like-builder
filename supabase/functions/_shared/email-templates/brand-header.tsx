/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Section } from 'npm:@react-email/components@0.0.22'

/**
 * EngageIQ branded email header.
 * Uses inline styles + table-friendly markup so it renders consistently
 * across Gmail, Outlook, Apple Mail, etc.
 */
export const BrandHeader = () => (
  <Section style={headerWrap}>
    <table cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'middle', paddingRight: '12px' }}>
            <div style={logoBadge}>
              {/* Speech bubble glyph (matches in-app Logo) */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M21 12a8 8 0 0 1-11.6 7.13L4 21l1.87-5.4A8 8 0 1 1 21 12Z"
                  stroke="#ffffff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="9" cy="12" r="1.2" fill="#ffffff" />
                <circle cx="13" cy="12" r="1.2" fill="#ffffff" />
                <circle cx="17" cy="12" r="1.2" fill="#ffffff" />
              </svg>
              <span style={dotIndicator} />
            </div>
          </td>
          <td style={{ verticalAlign: 'middle' }}>
            <span style={wordmark}>
              Engage<span style={{ color: '#1d4ed8' }}>IQ</span>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </Section>
)

export default BrandHeader

const headerWrap: React.CSSProperties = {
  padding: '24px 25px 8px',
  borderBottom: '1px solid #e5edf7',
  marginBottom: '24px',
}

const logoBadge: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  width: '36px',
  height: '36px',
  lineHeight: '36px',
  textAlign: 'center',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #1d4ed8, #4f7dff)',
  boxShadow: '0 4px 12px rgba(29,78,216,0.35)',
  verticalAlign: 'middle',
}

const dotIndicator: React.CSSProperties = {
  position: 'absolute',
  bottom: '-2px',
  right: '-2px',
  width: '10px',
  height: '10px',
  borderRadius: '999px',
  background: '#f59e0b',
  border: '2px solid #ffffff',
  display: 'inline-block',
}

const wordmark: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: '#0c2340',
  verticalAlign: 'middle',
}
