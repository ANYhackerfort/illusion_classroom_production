import { useState } from "react";
import axiosClient from "../../api/axiosClient";

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ✅ new state

  const loginWithGoogle = async (googleToken: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axiosClient.post("/api/auth/google-login/", {
        token: googleToken,
      });

      console.log("✅ Logged in:", res.data);
      setIsLoggedIn(true); // ✅ set login state
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
      setIsLoggedIn(false); // ❌ make sure to reset if it fails
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loginWithGoogle,
    loading,
    error,
    isLoggedIn, // ✅ return it
  };
};
