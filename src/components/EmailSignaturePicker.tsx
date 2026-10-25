import { Link } from "react-router-dom";
import { usePersonalSignatures } from "@/hooks/usePersonalSignatures";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function EmailSignaturePicker({ value, onChange }: { value: string; onChange: (id: string, content: string) => void }) {
  const { data } = usePersonalSignatures();
  return <div className="space-y-1">
    <div className="flex items-center justify-between gap-2"><Label className="text-xs">Saved signature</Label><Link to="/app/company#email-signatures" className="text-xs text-primary">Manage signatures</Link></div>
    <Select value={value} onValueChange={id => onChange(id, id === "none" ? "" : id === "legacy" ? data?.legacy ?? "" : data?.signatures.find(s => s.id === id)?.content ?? "")}>
      <SelectTrigger aria-label="Saved signature"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="legacy">Profile signature</SelectItem><SelectItem value="none">No signature</SelectItem>
        {data?.signatures.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{data.defaultId === s.id ? " · Default" : ""}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}