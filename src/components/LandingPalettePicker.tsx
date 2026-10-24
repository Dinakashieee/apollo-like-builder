import { Check, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LANDING_PALETTES, matchingLandingPalette } from '@/lib/landingPalettes';
import type { BrandColors } from '@/lib/landingCampaignDesign';

export function LandingPalettePicker({ accent, colors, allowed, onChange }: {
  accent: string | null; colors?: BrandColors; allowed: boolean;
  onChange: (accent: string, colors: BrandColors) => void;
}) {
  const selected = matchingLandingPalette(accent, colors);
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
  </section>;
}