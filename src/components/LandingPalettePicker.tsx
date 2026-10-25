import { useState } from 'react';
import { Check, Loader2, LockKeyhole, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LANDING_PALETTES, matchingLandingPalette } from '@/lib/landingPalettes';
import { matchBrandColors } from '@/lib/landingBrandColors';
import type { BrandColors } from '@/lib/landingCampaignDesign';

export function LandingPalettePicker({ accent, colors, allowed, workspaceId, onChange }: {
  accent: string | null; colors?: BrandColors; allowed: boolean; workspaceId?: string;
  onChange: (accent: string, colors: BrandColors) => void;
}) {
  const selected = matchingLandingPalette(accent, colors);
  const { toast } = useToast();
  const [companyUrl, setCompanyUrl] = useState('');
  const [matching, setMatching] = useState(false);
  const aiMatch = async () => {
    if (!allowed || !workspaceId || matching) return;
    setMatching(true);
    try {
      const matched = await matchBrandColors(workspaceId, companyUrl);
      onChange(matched.accent, { ...matched.colors });
      toast({ title: 'Colors matched', description: 'Your landing page now uses the company\'s brand colors.' });
    } catch (error) {
      toast({ title: 'Color match failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setMatching(false);
    }
  };
  return <section aria-label="Color palette" className="space-y-3 border-b pb-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-medium">Color palette</h3>
      {!allowed && <Badge variant="secondary"><LockKeyhole className="mr-1 h-3 w-3" />Paid plans</Badge>}
    </div>
    <div className="grid grid-cols-2 gap-2">
      {LANDING_PALETTES.map(palette => <Button
        key={palette.id} type="button" variant="outline"
        aria-label={`Apply ${palette.name} palette`} aria-pressed={selected === palette.id}
        aria-disabled={!allowed} title={!allowed ? `${palette.name} · Paid plans` : palette.name}
        onClick={() => { if (allowed) onChange(palette.accent, { ...palette.colors }); }}
        className={`h-auto min-w-0 flex-col items-stretch gap-2 p-2 whitespace-normal ${selected === palette.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
      >
        <span className={`landing-palette-${palette.id} grid h-9 w-full grid-cols-4 overflow-hidden rounded-sm`} aria-hidden="true">
          <span className="landing-palette-background" /><span className="landing-palette-text" /><span className="landing-palette-surface" /><span className="landing-palette-accent" />
        </span>
        <span className="flex min-w-0 items-center justify-between gap-1 text-xs font-medium">
          {palette.name}{selected === palette.id ? <Check className="h-3 w-3 shrink-0 text-primary" /> : !allowed ? <LockKeyhole className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
        </span>
      </Button>)}
    </div>
    <div className="rounded-md border bg-muted/40 p-2.5 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        <Wand2 className="h-3.5 w-3.5" />Match the company's colors with AI
        {!allowed && <LockKeyhole className="h-3 w-3 text-muted-foreground" />}
      </p>
      <p className="text-xs text-muted-foreground">Enter the prospect company's website and we'll pick brand colors from their site.</p>
      <div className="flex gap-2">
        <Input
          aria-label="Company website" inputMode="url" className="h-9 min-w-0 flex-1"
          placeholder="acme.com" value={companyUrl}
          disabled={!allowed || matching}
          onChange={e => setCompanyUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void aiMatch(); } }}
        />
        <Button
          type="button" size="sm" className="h-9 shrink-0"
          disabled={!allowed || matching || !companyUrl.trim()}
          onClick={() => void aiMatch()}
        >
          {matching ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Matching…</> : 'Match colors'}
        </Button>
      </div>
    </div>
  </section>;
}
