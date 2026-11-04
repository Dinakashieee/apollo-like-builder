import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateCv } from "@/lib/careerCv";

export function CareerCvUpload({ file, onChange, disabled }: { file: File | null; onChange: (file: File | null) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  function select(files: FileList | null) {
    setDragging(false);
    if (!files?.length) return;
    if (files.length !== 1) { setError("Please choose one CV."); return; }
    const chosen = files[0];
    const problem = validateCv(chosen);
    setError(problem ?? "");
    if (!problem) onChange(chosen);
    if (input.current) input.current.value = "";
  }
  return <div className="space-y-2">
    <Label htmlFor="cv-upload">Upload your CV (optional)</Label>
    <div onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); if (!disabled) select(event.dataTransfer.files); }} className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${dragging ? "border-primary bg-accent" : "border-border bg-muted/30"}`}>
      <input ref={input} id="cv-upload" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" disabled={disabled} onChange={event => select(event.target.files)} aria-describedby="cv-types" />
      {file ? <div className="flex items-center gap-3 text-left min-w-0"><FileText className="h-6 w-6 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-medium break-all">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p></div><Button type="button" size="icon" variant="ghost" title="Remove CV" aria-label="Remove CV" disabled={disabled} onClick={() => { onChange(null); setError(""); }}><X className="h-4 w-4" /></Button></div> : <><Upload className="h-7 w-7 text-primary mx-auto mb-3" /><p className="text-sm font-medium mb-3">Drag and drop your CV here</p><Button type="button" variant="outline" disabled={disabled} onClick={() => input.current?.click()}>Choose file</Button></>}
      <p id="cv-types" className="text-xs text-muted-foreground mt-3">PDF or Word (.doc, .docx) · Up to 5 MB</p>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}