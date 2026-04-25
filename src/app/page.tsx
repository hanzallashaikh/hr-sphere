"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    // Get role from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "hr") {
      router.push("/hr/dashboard");
    } else {
      router.push("/employee/dashboard");
    }

    setLoading(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* Left Panel */}
      <div
        style={{
          width: "30%",
          backgroundColor: "#4A6CF7",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "40px",
          color: "white",
        }}
      >
        <h1
          style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "20px" }}
        >
          EPortal
        </h1>
        <p style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
          Leave portal is designed to apply leave and check the status of your
          application
        </p>
      </div>

      {/* Right Panel */}
      <div
        style={{
          width: "70%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
          padding: "40px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {/* Avatar placeholder */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "#e0e0e0",
              margin: "0 auto 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
            }}
          >
            👤
          </div>

          <h2
            style={{
              textAlign: "center",
              marginBottom: "30px",
              fontWeight: "600",
            }}
          >
            Log into your account
          </h2>

          {error && (
            <p
              style={{
                color: "red",
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              {error}
            </p>
          )}

          {/* Email */}
          <label
            style={{ fontWeight: "500", display: "block", marginBottom: "6px" }}
          >
            Email Address
          </label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "0.95rem",
              boxSizing: "border-box",
            }}
          />

          {/* Password */}
          <label
            style={{ fontWeight: "500", display: "block", marginBottom: "6px" }}
          >
            Password
          </label>
          <div style={{ position: "relative", marginBottom: "24px" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "0.95rem",
                boxSizing: "border-box",
              }}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                fontSize: "1.1rem",
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#4A6CF7",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}
