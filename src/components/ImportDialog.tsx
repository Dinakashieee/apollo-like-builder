import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

type FieldKey = "company_name" | "contact_name" | "role" | "email" | "notes";
const FIELD_LABELS: Record<FieldKey, string> = {
  company_name: "Company name *",
  contact_name: "Contact name",
  role: "Role",
  email: "Email",
  notes: "Notes",
};
const REQUIRED: FieldKey[] = ["company_name"];

function autoMatch(header: string): FieldKey | "_skip" {
  const h = header.toLowerCase().trim();
  if (/(company|account|organization|org|business)/i.test(h)) return "company_name";
  if (/(contact|first ?name|last ?name|name)/i.test(h)) return "contact_name";
  if (/(role|title|position|job)/i.test(h)) return "role";
  if (/(email|e-?mail)/i.test(h)) return "email";
  if (/(note|comment|description)/i.test(h)) return "notes";
  return "_skip";
}

export function ImportDialog({ onImported }: { onImported?: () => void }) {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "_skip">>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: number }>({
    inserted: 0,
    errors: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult({ inserted: 0, errors: 0 });
  };

  const handleFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      if (json.length === 0) {
        toast({ title: "Empty file", description: "No rows found.", variant: "destructive" });
        return;
      }
      const cols = Object.keys(json[0]);
      const initial: Record<string, FieldKey | "_skip"> = {};
      cols.forEach((c) => {
        initial[c] = autoMatch(c);
      });
      setHeaders(cols);
      setRows(json);
      setMapping(initial);
      setStep("map");
    } catch (e: any) {
      toast({ title: "Could not read file", description: e?.message ?? "Invalid format", variant: "destructive" });
    }
  };

  const validateMapping = () => {
    const mapped = new Set(Object.values(mapping));
    return REQUIRED.every((r) => mapped.has(r));
  };

  const previewRows = rows.slice(0, 5).map((r) => {
    const out: Record<string, any> = {};
    Object.entries(mapping).forEach(([col, field]) => {
      if (field !== "_skip") out[field] = r[col];
    });
    return out;
  });

  const doImport = async () => {
    if (!current) return;
    setImporting(true);
    const inserts: any[] = [];
    let errorCount = 0;
    rows.forEach((r) => {
      const row: any = { workspace_id: current.id, status: "new", created_by: user?.id };
      Object.entries(mapping).forEach(([col, field]) => {
        if (field === "_skip") return;
        const val = String(r[col] ?? "").trim();
        if (val) row[field] = val;
      });
      if (!row.company_name) {
        errorCount++;
        return;
      }
      inserts.push(row);
    });
    if (inserts.length === 0) {
      setImporting(false);
      toast({ title: "Nothing to import", description: "No valid rows.", variant: "destructive" });
      return;
    }
    // chunked insert
    let inserted = 0;
    for (let i = 0; i < inserts.length; i += 500) {
      const chunk = inserts.slice(i, i + 500);
      const { error } = await supabase.from("leads").insert(chunk);
      if (error) {
        errorCount += chunk.length;
      } else {
        inserted += chunk.length;
      }
    }
    await logActivity(
      current.id,
      user?.id,
      "import_completed",
      `Imported ${inserted} leads (${errorCount} skipped)`
    );
    setResult({ inserted, errors: errorCount });
    setStep("done");
    setImporting(false);
    onImported?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import leads from CSV or Excel</DialogTitle>
          <DialogDescription>
            Upload a file, map your columns, preview, then import.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            }}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Click or drop a file</p>
            <p className="text-xs text-muted-foreground mt-1">.csv, .xlsx, .xls</p>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {step === "map" && (
          <div className="space-y-3 max-h-[400px] overflow-auto">
            <p className="text-sm text-muted-foreground">
              Found <strong>{rows.length}</strong> rows and {headers.length} columns. Map each column to a lead field.
            </p>
            {headers.map((h) => (
              <div key={h} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{h}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    e.g. {String(rows[0]?.[h] ?? "")}
                  </p>
                </div>
                <Select
                  value={mapping[h]}
                  onValueChange={(v) => setMapping({ ...mapping, [h]: v as FieldKey | "_skip" })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_skip">Skip column</SelectItem>
                    {(Object.keys(FIELD_LABELS) as FieldKey[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {FIELD_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Showing first 5 rows. {rows.length} total will be imported.
            </p>
            <div className="border rounded-lg overflow-auto max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(previewRows[0] ?? {}).map((k) => (
                      <th key={k} className="px-3 py-2 text-left font-semibold">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.map((r, i) => (
                    <tr key={i}>
                      {Object.values(r).map((v: any, j) => (
                        <td key={j} className="px-3 py-2">
                          {String(v).slice(0, 60)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="text-lg font-semibold">Import complete</p>
            <p className="text-sm text-muted-foreground mt-1">
              {result.inserted} leads added{result.errors > 0 && `, ${result.errors} skipped`}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "map" && (
            <>
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!validateMapping()) {
                    toast({
                      title: "Map company name",
                      description: "Company name is required.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setStep("preview");
                }}
                className="bg-gradient-primary"
              >
                Preview
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={doImport} disabled={importing} className="bg-gradient-primary">
                {importing ? "Importing..." : `Import ${rows.length} leads`}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="bg-gradient-primary"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
