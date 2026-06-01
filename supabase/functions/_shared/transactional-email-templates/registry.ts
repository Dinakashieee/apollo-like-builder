/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as leadAdded } from './lead-added.tsx'
import { template as senderVerify } from './sender-verify.tsx'
import { template as workspaceInvite } from './workspace-invite.tsx'
import { template as leadOutreach } from './lead-outreach.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'lead-added': leadAdded,
  'sender-verify': senderVerify,
  'workspace-invite': workspaceInvite,
  'lead-outreach': leadOutreach,
}
