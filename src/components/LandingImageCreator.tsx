import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export function LandingImageCreator({ workspaceId, onCreated }: { workspaceId?: string; onCreated: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1536x1024');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const generate = async () => {
    if (!workspaceId || busy) return;
    setBusy(true); setError('');
    try {
      const { data, error: failure } = await supabase.functions.invoke('landing-image', { body: { workspace_id: workspaceId, prompt, size } });
      if (failure) {
        let message = 'Image creation failed. Please try later.';
        if (failure.context instanceof Response) {
          const body = await failure.context.json().catch(() => null);
          if (typeof body?.error === 'string') message = body.error;
        }
        throw new Error(message);
      }
      if (!data?.url) throw new Error(data?.error || 'No image was returned.');
      setImage(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Image creation failed.'); }
    finally { setBusy(false); }
  };
  return <>
    <Button type="button" size="sm" variant="outline" aria-label="Create image with OpenAI" disabled={!workspaceId} onClick={() => setOpen(true)}><ImagePlus className="h-4 w-4" /><span>Create image</span></Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Create image with OpenAI</DialogTitle></DialogHeader>
        <Label htmlFor="landing-image-prompt">Image description</Label>
        <Textarea id="landing-image-prompt" value={prompt} maxLength={2000} rows={4} disabled={busy} onChange={e => setPrompt(e.target.value)} placeholder="A bright product photo of our industrial sensor on a factory workbench…" />
        <Label>Format</Label>
        <Select value={size} onValueChange={setSize} disabled={busy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1536x1024">Landscape</SelectItem><SelectItem value="1024x1024">Square</SelectItem></SelectContent></Select>
        <p className="text-xs text-muted-foreground">Each request uses one credit from your monthly AI allowance, including unsuccessful requests.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {image && <img src={image} alt={prompt} className="max-h-64 w-full rounded-md object-contain" />}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy || prompt.trim().length < 5} onClick={generate}>{busy ? 'Creating…' : image ? 'Create another' : 'Generate image'}</Button>
          {image && <Button type="button" disabled={busy} onClick={() => { onCreated(image); setOpen(false); toast({ title: 'Image added', description: 'Save your page to keep it.' }); }}>Use image</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}