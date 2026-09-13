import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getWorkspaceSummary } from "@/lib/cases.functions";

/** The signed-in user's workspace, role, members and server-verified super admin flag. */
export function useWorkspaceSummary() {
  const fetchSummary = useServerFn(getWorkspaceSummary);
  return useQuery({
    queryKey: ["workspace"],
    queryFn: () => fetchSummary({ data: undefined }),
    staleTime: 60_000,
  });
}
