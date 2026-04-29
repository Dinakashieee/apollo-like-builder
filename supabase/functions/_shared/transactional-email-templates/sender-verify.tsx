import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandHeader } from '../email-templates/brand-header.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'engageiqlk'

interface SenderVerifyProps {
  code?: string
  fromAddress?: string
  workspaceName?: string
}

const SenderVerifyEmail = ({ code, fromAddress, workspaceName }: SenderVerifyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Verify this address to send follow-ups from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Confirm your sending address</Heading>
        <Text style={text}>
          {workspaceName ? `${workspaceName} on ` : ''}{SITE_NAME} would like to send follow-up
          emails on your behalf from <strong>{fromAddress ?? 'your address'}</strong>.
        </Text>
        <Text style={text}>Enter this 6-digit code in the Sender settings to confirm:</Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code ?? '000000'}</Text>
        </Section>
        <Text style={muted}>
          If you didn't request this, you can ignore this email — no email will be sent from your address
          until it's verified.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SenderVerifyEmail,
  subject: 'Verify your sending address',
  displayName: 'Sender verification',
  previewData: { code: '482910', fromAddress: 'sales@acme.com', workspaceName: 'Acme' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 14px' }
const codeBox = { background: '#f1f5f9', borderRadius: '10px', padding: '18px', textAlign: 'center' as const, margin: '12px 0 18px' }
const codeText = { fontSize: '28px', fontWeight: 'bold', letterSpacing: '6px', color: '#0f172a', margin: 0 }
const muted = { fontSize: '12px', color: '#64748b', margin: '20px 0 0' }
