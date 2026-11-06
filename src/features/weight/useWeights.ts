import { useMutation, useQuery } from "@tanstack/react-query";
import type { WeightEntry } from "../../../shared/types";
import { api } from "../../lib/api";
import { queryClient } from "../../lib/queryClient";

const KEY = ["weights"] as const;

export function useWeights() {
  return useQuery({ queryKey: KEY, queryFn: () => api<WeightEntry[]>("GET", "/weights") });
}

const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

export function useSaveWeight() {
  return useMutation({
    mutationFn: (entry: WeightEntry) => api<WeightEntry>("PUT", `/weights/${entry.date}`, { kg: entry.kg }),
    onSuccess: (saved) => {
      queryClient.setQueryData<WeightEntry[]>(KEY, (list = []) =>
        [...list.filter((e) => e.date !== saved.date), saved].sort((a, b) => a.date.localeCompare(b.date))
      );
    },
    onSettled: refresh,
  });
}

export function useDeleteWeight() {
  return useMutation({
    mutationFn: (date: string) => api("DELETE", `/weights/${date}`),
    onMutate: async (date) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<WeightEntry[]>(KEY);
      queryClient.setQueryData<WeightEntry[]>(KEY, (list = []) => list.filter((e) => e.date !== date));
      return { previous };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(KEY, ctx?.previous),
    onSettled: refresh,
  });
}
