import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { companyEmailContext } from "@/lib/emailContext";
import { usePersonalSignatures } from "@/hooks/usePersonalSignatures";

export function useCompanyEmailContext(leadId?: string) {
  const { current } = useWorkspace();
  const [meetingAttendees, setMeetingAttendees] = useState("");
  const [meetingType, setMeetingType] = useState("not_specified");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [awards, setAwards] = useState("");
  const [signatureOverride, setSignatureOverride] = useState("");
  const [signatureId, setSignatureId] = useState("legacy");
  const initialized = useRef("");
  const signatures = usePersonalSignatures();
  const company = useQuery({
    queryKey: ["company-email-context", current?.id], enabled: !!current,
    queryFn: async () => {
      if (!current) return null;
      const { data, error } = await supabase.from("company_profiles").select("email_context,positioning").eq("workspace_id", current.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!company.isSuccess) return;
    const context = companyEmailContext(company.data?.email_context, company.data?.positioning ?? "");
    setMeetingAttendees(context.meeting_attendees); setMeetingType(context.meeting_type);
    setMeetingDescription(context.meeting_description); setAwards(context.awards);
  }, [current?.id, leadId, company.data, company.isSuccess]);
  useEffect(() => {
    if (!signatures.data) return;
    const key = `${current?.id}:${signatures.data.defaultId}`;
    if (initialized.current === key) return;
    initialized.current = key;
    const signature = signatures.data.signatures.find(s => s.id === signatures.data.defaultId);
    setSignatureId(signature?.id ?? "legacy");
    setSignatureOverride(signature?.content ?? signatures.data.legacy);
  }, [signatures.data, current?.id]);
  return { meetingAttendees, setMeetingAttendees, meetingType, setMeetingType, meetingDescription, setMeetingDescription,
    awards, setAwards, signatureOverride, setSignatureOverride, signatureId, setSignatureId };
}