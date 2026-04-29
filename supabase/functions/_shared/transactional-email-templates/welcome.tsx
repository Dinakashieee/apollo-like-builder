/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandHeader } from '../email-templates/brand-header.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'EngageIQ'
const SITE_URL = 'https://engageiqlk.com'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — let's turn intent into pipeline</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>{name ? `Welcome, ${name}!` : `Welcome to ${SITE_NAME}!`}</Heading>
        <Text style={text}>
          Thanks for joining {SITE_NAME}. You now have access to AI-powered, hyper-personalized
          outreach that maps your prospect's existing systems and pain points to your solution —
          so every email reads like it was written just for them.
        </Text>
        <Text style={text}>
          To get the best results, complete these three quick steps:
        </Text>
        <Text style={text}>
          1. Add your company positioning and target systems<br />
          2. Save your email signature in Settings<br />
          3. Add a lead and generate your first AI draft
        </Text>
        <Button style={button} href={`${SITE_URL}/app`}>Open EngageIQ</Button>
        <Text style={footer}>
          Need help? Just reply to this email — a human reads every message.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: `Welcome to ${SITE_NAME}`,
  displayName: 'Welcome',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0c2340', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const button = {
  backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '14px',
  borderRadius: '14px', padding: '12px 22px', textDecoration: 'none',
  fontWeight: 'bold' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
