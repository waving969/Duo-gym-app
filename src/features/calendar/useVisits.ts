import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { api } from "../../lib/api";
import { enqueue } from "../../lib/outbox";
import { fetchAfterSync, QK, queryClient } from "../../lib/queryClient";

export function useVisits() {
  const query = useQuery({ queryKey: QK.visits, queryFn: fetchAfterSync(() => api<string[]>("GET", "/visits")) });
  const visits = useMemo(() => new Set(query.data ?? []), [query.data]);
  return { ...query, visits };
}

export function addVisitLocally(date: string) {
  queryClient.setQueryData<string[]>(QK.visits, (list = []) => [...new Set([...list, date])].sort());
}

/** Marca o desmarca un día. Cambia al instante y se envía cuando haya cobertura. */
export function useToggleVisit() {
  const mutate = useCallback(({ date, going }: { date: string; going: boolean }) => {
    queryClient.setQueryData<string[]>(QK.visits, (list = []) =>
      going ? [...new Set([...list, date])].sort() : list.filter((d) => d !== date)
    );
    enqueue({ key: `visit:${date}`, method: going ? "PUT" : "DELETE", path: `/visits/${date}` });
  }, []);
  return { mutate };
}
