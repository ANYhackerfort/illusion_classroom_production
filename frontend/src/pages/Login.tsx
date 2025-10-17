import React, { useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../hooks/auth/useAuth";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";
import "./Login.css";

const LoginCard: React.FC = () => {
  const { loginWithGoogle, loading, error, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse: any) => {
      try {
        const accessToken = tokenResponse.access_token;
        if (accessToken) {
          await loginWithGoogle(accessToken);
        } else {
          console.error("No access token received");
        }
      } catch (e) {
        console.error("Login error:", e);
      }
    },
    onError: () => {
      console.error("Google login failed");
    },
  });

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/home");
    }
  }, [isLoggedIn, navigate]);

  return (
    <Box className="login-background">
      {/* Animated blobs */}
      <Box className="psychedelic-art">
        {Array.from({ length: 50 }).map((_, i) => (
          <Box
            key={i}
            className={`blob ${i < 20 ? "blob-large" : "blob-small"}`}
            style={
              {
                "--x": Math.random().toString(),
                "--y": Math.random().toString(),
              } as React.CSSProperties
            }
          />
        ))}
      </Box>

      {/* Card */}
      <Box className="login-card">
        <Typography variant="h4" className="login-title">
          Login / Sign In
        </Typography>

        <Typography variant="subtitle1" className="login-description">
          Explore the future of behavioral learning experimentation
        </Typography>

        <Button
          className="custom-google-button"
          onClick={() => login()}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in with Google"}
        </Button>

        {error && <Typography className="login-error">{error}</Typography>}

        <Typography variant="body2" className="login-footer">
          Illusion Classroom © Richard Meyer Labs
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginCard;
