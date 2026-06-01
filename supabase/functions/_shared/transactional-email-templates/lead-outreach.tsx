/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface LeadOutreachProps {
  subject?: string
  body?: string
  signature?: string
}

const LeadOutreachEmail = ({ subject, body, signature }: LeadOutreachProps) => {
  const paragraphs = (body ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject ?? ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={text}>
              {p.split('\n').map((line, j, arr) => (
                <React.Fragment key={j}>
                  {line}
                  {j < arr.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </Text>
          ))}
          {signature ? (
            <Text style={sig}>
              {signature.split('\n').map((line, j, arr) => (
                <React.Fragment key={j}>
                  {line}
                  {j < arr.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: LeadOutreachEmail,
  subject: (data: Record<string, any>) => (data?.subject as string) || '(no subject)',
  displayName: 'Lead outreach',
  previewData: {
    subject: 'Quick idea for your team',
    body: 'Hi there,\n\nNoticed your team recently expanded — congrats! Wanted to share a quick idea.\n\nBest,',
    signature: 'John Perera\nDirector of Sales',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const text = { fontSize: '15px', color: '#1f2937', lineHeight: '1.6', margin: '0 0 16px' }
const sig = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '24px 0 0', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }
