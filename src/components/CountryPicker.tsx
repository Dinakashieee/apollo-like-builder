import { useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, findCountry } from "@/lib/countries";

interface CountryPickerProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  showIcon?: boolean;
}

export function CountryPicker({
  value,
  onChange,
  placeholder = "Select country (drives compliance rules)",
  className,
  showIcon = true,
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = findCountry(value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {showIcon && <Globe className="h-3.5 w-3.5 text-primary shrink-0" />}
            {selected ? (
              <>
                <span className="truncate">{selected.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">· {selected.region}</span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        {/* shadcn Command: CommandInput stays pinned at the top, only the list scrolls */}
        <Command>
          <CommandInput placeholder="Search 200+ countries..." />
          <CommandList className="max-h-[260px]">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code} ${c.region}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c.code ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {c.region}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
