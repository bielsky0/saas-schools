"use client";

import { useCallback, useEffect, useState } from "react";

type ClientInfo = {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
};

type ClientSessionResponse = {
  client: ClientInfo | null;
};

export function useClientSession() {
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/client-auth/session");
      if (!res.ok) {
        setClient(null);
        return;
      }
      const data: ClientSessionResponse = await res.json();
      setClient(data.client);
    } catch {
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { client, isLoading };
}
