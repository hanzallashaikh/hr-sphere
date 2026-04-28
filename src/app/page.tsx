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
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "hr") {
      router.replace("/hr/dashboard");
    } else {
      router.replace("/employee/dashboard");
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Segoe UI', sans-serif",
        backgroundColor: "#f5f6fa",
      }}
    >
      {/* Left Panel */}
      <div
        style={{
          width: "38%",
          background: "linear-gradient(135deg, #4A6CF7 0%, #3451d1 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 50px",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background circles for decoration */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-40px",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            right: "-30px",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />

        {/* Logo */}
        <div style={{ marginBottom: "40px", position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
              }}
            >
              🏢
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.8rem",
                fontWeight: "700",
                letterSpacing: "-0.5px",
              }}
            >
              HR Sphere
            </h1>
          </div>
          <div
            style={{
              width: "40px",
              height: "3px",
              backgroundColor: "rgba(255,255,255,0.4)",
              borderRadius: "2px",
              marginLeft: "56px",
            }}
          />
        </div>

        {/* Description */}
        <h2
          style={{
            fontSize: "1.6rem",
            fontWeight: "600",
            margin: "0 0 16px",
            lineHeight: "1.3",
            position: "relative",
          }}
        >
          Manage Your Team Effortlessly
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            lineHeight: "1.7",
            opacity: 0.85,
            margin: "0 0 40px",
            position: "relative",
          }}
        >
          A complete HR portal designed to streamline leave management,
          attendance tracking, and employee oversight — all in one place.
        </p>

        {/* Feature points */}
        {[
          "✓  Apply and track leave requests",
          "✓  Monitor attendance records",
          "✓  Role-based access control",
        ].map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
              fontSize: "0.9rem",
              opacity: 0.9,
              position: "relative",
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Right Panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px",
          backgroundColor: "#fff",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Avatar */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4A6CF7, #3451d1)",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              boxShadow: "0 8px 24px rgba(74,108,247,0.3)",
            }}
          >
            👤
          </div>

          <h2
            style={{
              textAlign: "center",
              margin: "0 0 8px",
              fontSize: "1.6rem",
              fontWeight: "700",
              color: "#1a1a2e",
            }}
          >
            Welcome Back
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "#888",
              fontSize: "0.9rem",
              margin: "0 0 32px",
            }}
          >
            Sign in to your account to continue
          </p>

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: "#ffebee",
                border: "1px solid #ffcdd2",
                color: "#c62828",
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "20px",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Email Field */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                fontSize: "0.875rem",
                color: "#333",
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "1rem",
                  color: "#aaa",
                }}
              >
                ✉️
              </span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: "100%",
                  padding: "13px 14px 13px 42px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.2s",
                  backgroundColor: "#fafafa",
                  color: "#333",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: "28px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                fontSize: "0.875rem",
                color: "#333",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "1rem",
                  color: "#aaa",
                }}
              >
                🔒
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: "100%",
                  padding: "13px 44px 13px 42px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.2s",
                  backgroundColor: "#fafafa",
                  color: "#333",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: "#aaa",
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading
                ? "#a0aec0"
                : "linear-gradient(135deg, #4A6CF7 0%, #3451d1 100%)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 15px rgba(74,108,247,0.4)",
              transition: "all 0.2s",
              letterSpacing: "0.3px",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.transform =
                  "translateY(-1px)";
                (e.target as HTMLButtonElement).style.boxShadow =
                  "0 6px 20px rgba(74,108,247,0.5)";
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 4px 15px rgba(74,108,247,0.4)";
            }}
          >
            {loading ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid white",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Footer */}
          <p
            style={{
              textAlign: "center",
              marginTop: "24px",
              fontSize: "0.8rem",
              color: "#aaa",
            }}
          >
            © 2025 HR Sphere. All rights reserved.
          </p>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
