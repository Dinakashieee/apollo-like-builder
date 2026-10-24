import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { CAMPAIGN_STYLES, campaignBlocks } from '@/lib/landingCampaignDesign';
import type { Block } from '@/lib/landingBlocks';

export function LandingCampaignPicker({ workspaceId, sequences, onApply }: {
  workspaceId: string; sequences: { id: string; name: string }[];
  onApply: (value: { template: string; blocks: Block[]; campaign_id: string | null }) => void;
}) {
  const [campaign, setCampaign] = useState('none');
  const [style, setStyle] = useState('outreach');
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    if (!confirm('Replace current page sections with this campaign layout?')) return;
    setBusy(true);
    try {
      let subject = '', body = '';
      if (campaign !== 'none') {
        const { data, error } = await supabase.from('sequence_steps').select('subject_template,body_template')
          .eq('workspace_id', workspaceId).eq('sequence_id', campaign).order('step_order').limit(1).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('This campaign has no email steps yet.');
        subject = data.subject_template; body = data.body_template;
      }
      const selected = CAMPAIGN_STYLES.find(s => s.id === style) ?? CAMPAIGN_STYLES[0];
      onApply({ template: selected.template, blocks: campaignBlocks(subject, body, style), campaign_id: campaign === 'none' ? null : campaign });
    } catch (error) { toast({ title: 'Campaign unavailable', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3 border-b pb-4">
    <Label>Email campaign</Label>
    <Select value={campaign} onValueChange={setCampaign}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
      <SelectItem value="none">New campaign layout</SelectItem>
      {sequences.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
    </SelectContent></Select>
    <Label>Campaign style</Label>
    <Select value={style} onValueChange={setStyle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
      {CAMPAIGN_STYLES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
    </SelectContent></Select>
    <Button variant="outline" onClick={apply} disabled={busy}>{busy ? 'Applying…' : 'Apply campaign layout'}</Button>
  </div>;
}