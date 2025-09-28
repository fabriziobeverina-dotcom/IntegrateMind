import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.status === 401) {
          return null; // User is not authenticated
        }
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
          return null; // User is not authenticated
        }
        throw error;
      }
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error: error && !error.message.includes('401') ? error : null,
  };
}