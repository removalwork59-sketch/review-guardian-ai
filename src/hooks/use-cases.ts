import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listCases } from "@/lib/cases.functions";

/** The workspace's review cases, shared by the reviews and reports pages. */
export function useCases() {
  const fetchCases = useServerFn(listCases);
  return useQuery({ queryKey: ["cases"], queryFn: () => fetchCases({ data: undefined }) });
}
