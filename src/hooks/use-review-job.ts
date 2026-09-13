import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getReviewJob } from "@/lib/review-jobs.functions";
import { JOB_ACTIVE_STATUSES } from "@/lib/state-machines";

/**
 * Follows one review job live: Supabase Realtime pushes row changes (RLS-scoped to the workspace);
 * polling takes over automatically if the realtime channel isn't connected.
 */
export function useReviewJob(jobId: string | null) {
  const fetchJob = useServerFn(getReviewJob);
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  const query = useQuery({
    queryKey: ["review-job", jobId],
    queryFn: () => fetchJob({ data: { jobId: jobId as string } }),
    enabled: Boolean(jobId),
    refetchInterval: (state) => {
      const result = state.state.data;
      const active = result?.ok && JOB_ACTIVE_STATUSES.includes(result.job.status);
      if (!active) return false;
      return live ? 15_000 : 2_500;
    },
  });

  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`review-job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "review_jobs", filter: `id=eq.${jobId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["review-job", jobId] });
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      setLive(false);
      void supabase.removeChannel(channel);
    };
  }, [jobId, queryClient]);

  return { ...query, live };
}
