import { useMutation, useQuery } from "@tanstack/react-query";
import type { ProfilePatch, User } from "../../../shared/types";
import { api, ApiError } from "../../lib/api";
import { disablePush } from "../../lib/pwa";
import { ME_KEY, queryClient, wipeDeviceData } from "../../lib/queryClient";

export function useMe() {
  return useQuery<User | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api<User>("GET", "/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
}

let lastUser: User | null = null;

/**
 * Solo se usa dentro de pantallas protegidas. Mantiene el último usuario para el instante
 * en que, al cerrar sesión, los datos ya se han borrado y la pantalla aún se está desmontando.
 */
export function useUser(): User {
  const { data } = useMe();
  if (data) lastUser = data;
  return lastUser!;
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api<User>("PATCH", "/me", patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ME_KEY });
      const previous = queryClient.getQueryData<User>(ME_KEY);
      if (previous) queryClient.setQueryData<User>(ME_KEY, { ...previous, ...patch });
      return { previous };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(ME_KEY, ctx?.previous),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  });
}

export async function logout() {
  // Este móvil deja de recibir notificaciones de la cuenta antes de cerrar la sesión.
  await disablePush().catch(() => {});
  await api("POST", "/auth/logout");
  wipeDeviceData();
  queryClient.setQueryData(ME_KEY, null);
}
