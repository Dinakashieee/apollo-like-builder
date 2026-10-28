import { useState } from "react";
import { Link } from "react-router-dom";
import { ListPlus, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeadLists } from "@/hooks/useLeadLists";
import { toast } from "@/hooks/use-toast";

export function LeadListToolbar({ value, onChange, selected, onSaved }: { value: string; onChange: (id: string) => void; selected: string[]; onSaved: () => void }) {
  const { lists, members, save, saving, error } = useLeadLists();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  async function run(action: Parameters<typeof save>[0]) {
    try {
      await save(action);
      if (action.kind === "create") setName("");
      if (action.kind === "delete") onChange("all");
      onSaved();
      toast({ title: action.kind === "create" ? "List created" : action.kind === "add" ? "Leads added to list" : action.kind === "remove" ? "Leads removed from list" : "List deleted" });
    } catch (e) { toast({ title: "Could not update list", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" }); }
  }
  return <section className="space-y-3 border-y py-4">
    <div className="flex items-center gap-3 flex-wrap">
      <h2 className="font-semibold">Lead lists</h2>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-64" aria-label="Filter by lead list"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All lists</SelectItem>{lists.map(list => <SelectItem key={list.id} value={list.id}>{list.name} · {members.filter(m => m.list_id === list.id).length}</SelectItem>)}</SelectContent>
      </Select>
      <Input aria-label="New lead list name" className="w-52" maxLength={120} placeholder="New list name" value={name} onChange={e => setName(e.target.value)} />
      <Button variant="outline" disabled={!name.trim() || saving} onClick={() => run({ kind: "create", name })}><ListPlus className="h-4 w-4 mr-2" />Create list</Button>
      {value !== "all" && <>
        <Button asChild><Link to={`/app/composer?list=${value}`}><Mail className="h-4 w-4 mr-2" />Email / landing page</Link></Button>
        <Button variant="ghost" size="icon" aria-label="Delete selected list" title="Delete list" disabled={saving} onClick={() => { if (window.confirm("Delete this list? Leads will stay in your workspace.")) run({ kind: "delete", id: value }); }}><Trash2 className="h-4 w-4" /></Button>
      </>}
    </div>
    {selected.length > 0 && <div className="flex gap-3 items-center flex-wrap">
      <span className="text-sm text-muted-foreground">{selected.length} selected</span>
      <Select value={destination} onValueChange={setDestination}><SelectTrigger className="w-52" aria-label="Destination lead list"><SelectValue placeholder="Choose a list" /></SelectTrigger><SelectContent>{lists.map(list => <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>)}</SelectContent></Select>
      <Button disabled={!destination || saving} onClick={() => run({ kind: "add", id: destination, leadIds: selected })}>Add to list</Button>
      {value !== "all" && <Button variant="outline" disabled={saving} onClick={() => run({ kind: "remove", id: value, leadIds: selected })}>Remove from list</Button>}
    </div>}
    {error && <p className="text-sm text-destructive">Could not load lead lists. Please refresh.</p>}
  </section>;
}