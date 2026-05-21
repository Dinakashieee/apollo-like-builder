/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandHeader } from '../email-templates/brand-header.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'EngageIQ'
const SITE_URL = 'https://engageiqlk.com'

interface WorkspaceInviteProps {
  workspaceName?: string
  inviterName?: string
  inviterEmail?: string
  role?: string
  inviteEmail?: string
}

const WorkspaceInviteEmail = ({
  workspaceName,
  inviterName,
  inviterEmail,
  role,
  inviteEmail,
}: WorkspaceInviteProps) => {
  const inviter = inviterName || inviterEmail || 'A teammate'
  const ws = workspaceName || 'their workspace'
  const signupUrl = `${SITE_URL}/auth?mode=signup${inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ''}`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{inviter} invited you to join {ws} on {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>You're invited to {ws}</Heading>
          <Text style={text}>
            <strong>{inviter}</strong>{inviterEmail && inviterName ? ` (${inviterEmail})` : ''} has invited you to collaborate on{' '}
            <strong>{ws}</strong> in {SITE_NAME}{role ? ` as a ${role}` : ''}.
          </Text>
          <Text style={text}>
            {SITE_NAME} helps sales teams turn intent into pipeline with AI-personalized
            outreach. Create your account with this email address ({inviteEmail || 'this address'}) and
            you'll automatically join the workspace.
          </Text>
          <Button style={button} href={signupUrl}>Accept invite & sign up</Button>
          <Text style={footer}>
            If you weren't expecting this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WorkspaceInviteEmail,
  subject: (data: Record<string, any>) =>
    `${data.inviterName || data.inviterEmail || 'A teammate'} invited you to ${data.workspaceName || 'their workspace'} on ${SITE_NAME}`,
  displayName: 'Workspace invite',
  previewData: {
    workspaceName: 'Acme Sales',
    inviterName: 'Dina',
    inviterEmail: 'dina@example.com',
    role: 'member',
    inviteEmail: 'teammate@company.com',
  },
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
