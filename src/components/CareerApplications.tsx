import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CV_BUCKET } from "@/lib/careerCv";

export function CareerApplications() {
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  async function downloadCv(path: string, name: string) {
    setDownloadError(""); setDownloading(path);
    try {
      const result = await supabase.storage.from(CV_BUCKET).download(path);
      if (result.error || !result.data) throw result.error;
      const url = URL.createObjectURL(result.data);
      const link = document.createElement("a"); link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setDownloadError("Could not download the CV. Please try again."); }
    finally { setDownloading(null); }
  }
  const { data, isLoading, error } = useQuery({ queryKey: ["career-applications"], queryFn: async () => {
    const result = await supabase.from("career_applications").select("*").order("created_at", { ascending: false }).limit(100);
    if (result.error) throw result.error;
    return result.data;
  }});
  if (isLoading) return <p>Loading applications…</p>;
  if (error) return <p role="alert" className="text-destructive">Could not load applications. Please try again.</p>;
  return <div className="space-y-4">{downloadError && <p role="alert" className="text-destructive">{downloadError}</p>}{!data?.length && <p className="text-muted-foreground">No applications yet.</p>}{data?.map(a => <article key={a.id} className="border rounded-lg p-5 space-y-2 break-words">
    <h3 className="font-semibold">{a.full_name}</h3><p className="text-sm text-muted-foreground">{a.role} · {a.location} · {new Date(a.created_at).toLocaleDateString()}</p>
    <p className="text-sm"><a className="text-primary underline" href={`mailto:${a.email}`}>{a.email}</a> · {a.phone}</p>
    {a.profile_url && <a className="text-primary underline text-sm" href={a.profile_url} target="_blank" rel="noopener noreferrer">Applicant profile / CV</a>}
    {a.cv_path && a.cv_name && <Button variant="outline" size="sm" disabled={downloading === a.cv_path} onClick={() => { if (a.cv_path && a.cv_name) void downloadCv(a.cv_path, a.cv_name); }}><Download className="mr-2 h-4 w-4 shrink-0" /><span className="truncate max-w-64">{downloading === a.cv_path ? "Downloading…" : "Download CV"}</span></Button>}
    <p className="whitespace-pre-wrap text-sm">{a.introduction}</p>
  </article>)}</div>;
}