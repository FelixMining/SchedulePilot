import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: 5 * 60_000 });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(["me"], { user: null });
    },
  });
}
