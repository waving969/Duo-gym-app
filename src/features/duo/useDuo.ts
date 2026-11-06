import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Message, PartnerData } from "../../../shared/types";
import { api } from "../../lib/api";
import { enqueue } from "../../lib/outbox";
import { fetchAfterSync, QK, queryClient } from "../../lib/queryClient";

export function usePartner() {
  return useQuery({ queryKey: QK.partner, queryFn: () => api<PartnerData | null>("GET", "/partner"), staleTime: 60_000, refetchInterval: 120_000 });
}

export function useMessages(enabled: boolean) {
  return useQuery({
    queryKey: QK.messages,
    queryFn: fetchAfterSync(() => api<Message[]>("GET", "/messages")),
    enabled,
    refetchInterval: enabled ? 5_000 : false, // solo mientras tienes la conversación abierta
    staleTime: 3_000,
  });
}

export function useUnread() {
  return useQuery({
    queryKey: QK.unread,
    queryFn: async () => (await api<{ count: number }>("GET", "/messages/unread")).count,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export async function markRead() {
  await api("POST", "/messages/read");
  queryClient.setQueryData(QK.unread, 0);
}

/** Enviar es instantáneo: aparece ya en la conversación y se manda en cuanto hay cobertura. */
export function useSendMessage() {
  return useCallback((kind: "text" | "nudge", body: string) => {
    const id = crypto.randomUUID();
    const message: Message = { id, fromMe: true, kind, body, createdAt: Date.now(), readAt: null };
    queryClient.setQueryData<Message[]>(QK.messages, (list = []) => [...list, message]);
    enqueue({ key: `message:${id}`, method: "POST", path: "/messages", body: { id, kind, body } });
  }, []);
}
