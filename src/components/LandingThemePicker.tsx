import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDING_THEMES, LEGACY_THEMES } from "@/lib/landingThemes";
import oceanImage from "@/assets/landing-ocean.jpg";

export function LandingThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return <div className="space-y-3">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {LANDING_THEMES.map((theme) => <Button key={theme.id} variant="outline" aria-label={`Choose ${theme.name}`} aria-pressed={value === theme.id} onClick={() => onChange(theme.id)} className={`h-auto min-w-0 flex-col items-stretch gap-0 overflow-hidden p-0 text-left whitespace-normal ${value === theme.id ? "border-primary ring-2 ring-primary/20" : ""}`}>
        <span className={`landing-theme landing-theme-${theme.id} theme-thumbnail relative block h-28 w-full overflow-hidden`}>
          {theme.id !== "tidal" && <img src={oceanImage} alt="" width={1536} height={1024} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
          <span className="theme-thumbnail-shade absolute inset-0" />
          <span className="relative block px-3 pt-5 font-display text-lg leading-tight">Your next<br />chapter.</span>
          <span className="theme-thumbnail-line relative ml-3 mt-3 block h-1 w-10" />
          <span className="theme-thumbnail-band absolute inset-x-0 bottom-0 h-4" />
        </span>
        <span className="flex items-center justify-between gap-1 px-3 py-2 text-xs font-semibold">{theme.name}{value === theme.id && <Check className="h-3 w-3 shrink-0 text-primary" />}</span>
      </Button>)}
    </div>
    <div className="flex flex-wrap gap-1">
      {LEGACY_THEMES.map((theme) => <Button key={theme.id} size="sm" variant={value === theme.id ? "secondary" : "ghost"} aria-pressed={value === theme.id} onClick={() => onChange(theme.id)} className="text-xs">{theme.name}</Button>)}
    </div>
  </div>;
}