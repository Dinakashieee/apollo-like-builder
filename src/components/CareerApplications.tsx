import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function CareerApplications() {
  const { data, isLoading, error } = useQuery({ queryKey: ["career-applications"], queryFn: async () => {
    const result = await supabase.from("career_applications").select("*").order("created_at", { ascending: false }).limit(100);
    if (result.error) throw result.error;
    return result.data;
  }});
  if (isLoading) return <p>Loading applications…</p>;
  if (error) return <p role="alert" className="text-destructive">Could not load applications. Please try again.</p>;
  return <div className="space-y-4">{!data?.length && <p className="text-muted-foreground">No applications yet.</p>}{data?.map(a => <article key={a.id} className="border rounded-lg p-5 space-y-2 break-words">
    <h3 className="font-semibold">{a.full_name}</h3><p className="text-sm text-muted-foreground">{a.role} · {a.location} · {new Date(a.created_at).toLocaleDateString()}</p>
    <p className="text-sm"><a className="text-primary underline" href={`mailto:${a.email}`}>{a.email}</a> · {a.phone}</p>
    {a.profile_url && <a className="text-primary underline text-sm" href={a.profile_url} target="_blank" rel="noopener noreferrer">Applicant profile / CV</a>}
    <p className="whitespace-pre-wrap text-sm">{a.introduction}</p>
  </article>)}</div>;
}