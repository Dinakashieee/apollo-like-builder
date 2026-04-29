/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandHeader } from '../email-templates/brand-header.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'EngageIQ'
const SITE_URL = 'https://engageiqlk.com'

interface LeadAddedProps {
  recipientName?: string
  leadName?: string
  leadCompany?: string
  leadRole?: string
}

const LeadAddedEmail = ({ recipientName, leadName, leadCompany, leadRole }: LeadAddedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New lead added to your {SITE_NAME} workspace</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>{recipientName ? `Hi ${recipientName},` : 'A new lead is ready'}</Heading>
        <Text style={text}>
          A new lead was just added to your {SITE_NAME} workspace:
        </Text>
        <Text style={card}>
          <strong style={{ color: '#0c2340' }}>{leadName ?? 'New contact'}</strong><br />
          {leadRole ? `${leadRole} · ` : ''}{leadCompany ?? ''}
        </Text>
        <Text style={text}>
          Open the Composer to generate a hyper-personalized first email — we'll map their
          existing tech stack and likely pain points to your positioning.
        </Text>
        <Button style={button} href={`${SITE_URL}/app/composer`}>Draft email</Button>
        <Text style={footer}>You're receiving this because you're a member of this workspace.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadAddedEmail,
  subject: (d: Record<string, any>) =>
    d.leadName ? `New lead: ${d.leadName}${d.leadCompany ? ` (${d.leadCompany})` : ''}` : 'New lead added',
  displayName: 'New lead added',
  previewData: { recipientName: 'Alex', leadName: 'Konrad Schmidt', leadCompany: 'Majis', leadRole: 'CFO' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0c2340', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 18px' }
const card = {
  fontSize: '15px', color: '#55575d', lineHeight: '1.5',
  background: '#f5f8fc', border: '1px solid #dbe6f3', borderRadius: '12px',
  padding: '14px 18px', margin: '0 0 22px',
}
const button = {
  backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '14px',
  borderRadius: '14px', padding: '12px 22px', textDecoration: 'none',
  fontWeight: 'bold' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
