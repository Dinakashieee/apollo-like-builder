import { useState } from "react";
import { LayoutGrid, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ALL_TILES, type TileKey } from "@/hooks/useDashboardPrefs";

interface Props {
  visible: TileKey[];
  onChange: (tiles: TileKey[]) => void;
}

export function DashboardCustomizer({ visible, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = (key: TileKey) => {
    const next = visible.includes(key)
      ? visible.filter((k) => k !== key)
      : [...visible, key];
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <LayoutGrid className="h-4 w-4" />
          Customize
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <p className="text-sm font-semibold text-primary-deep">Dashboard tiles</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pick which sections to show on your dashboard.
          </p>
        </div>
        <div className="p-2 max-h-[360px] overflow-y-auto">
          {ALL_TILES.map((t) => {
            const checked = visible.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggle(t.key)}
                className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(t.key)}
                  className="mt-0.5 pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-deep">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {t.description}
                  </p>
                </div>
                {checked && <Check className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
