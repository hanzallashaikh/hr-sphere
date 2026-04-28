"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export default function ApplyLeave() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaveType, setLeaveType] = useState("annual");
  const [reason, setReason] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activePage] = useState("apply-leave");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push("/");
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (prof?.role === "hr") {
        router.push("/hr/dashboard");
        return;
      }
      setProfile(prof);
      setPageLoading(false);
    };
    fetchProfile();
  }, []);

  const calculateDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    const diff =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!leaveType || !reason || !dateFrom || !dateTo) {
      setError("Please fill in all fields");
      return;
    }

    if (new Date(dateTo) < new Date(dateFrom)) {
      setError("End date cannot be before start date");
      return;
    }

    setLoading(true);
    const days = calculateDays(dateFrom, dateTo);

    const { error: insertError } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: profile?.id,
        leave_type: leaveType,
        reason: reason,
        date_from: dateFrom,
        date_to: dateTo,
        days_count: days,
        status: "pending",
      });

    if (insertError) {
      setError("Failed to submit leave request. Please try again.");
      setLoading(false);
      return;
    }

    setSuccess("Leave request submitted successfully!");
    setReason("");
    setDateFrom("");
    setDateTo("");
    setLeaveType("annual");
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems = [
    { label: "📊 Dashboard", href: "/employee/dashboard", key: "dashboard" },
    {
      label: "📝 Apply Leave",
      href: "/employee/apply-leave",
      key: "apply-leave",
    },
    {
      label: "📅 Check Attendance",
      href: "/employee/attendance",
      key: "attendance",
    },
    {
      label: "🔔 Notifications",
      href: "/employee/notifications",
      key: "notifications",
    },
  ];

  if (pageLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "sans-serif",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #e0e0e0",
            borderTopColor: "#4A6CF7",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "#4A6CF7", fontWeight: "600" }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "240px",
          minHeight: "100vh",
          background: "linear-gradient(180deg, #3451d1 0%, #4A6CF7 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          boxShadow: "4px 0 15px rgba(74,108,247,0.15)",
        }}
      >
        <div
          style={{
            padding: "28px 24px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
              }}
            >
              🏢
            </div>
            <span style={{ fontWeight: "700", fontSize: "1.1rem" }}>
              HR Sphere
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                flexShrink: 0,
              }}
            >
              👤
            </div>
            <div style={{ overflow: "hidden" }}>
              <p
                style={{
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  margin: "0 0 2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile?.full_name}
              </p>
              <p
                style={{
                  fontSize: "0.72rem",
                  opacity: 0.7,
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile?.email}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 12px", flex: 1 }}>
          {navItems.map((item) => (
            <div
              key={item.key}
              onClick={() => router.push(item.href)}
              style={{
                padding: "11px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                marginBottom: "4px",
                backgroundColor:
                  activePage === item.key
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                borderLeft:
                  activePage === item.key
                    ? "3px solid white"
                    : "3px solid transparent",
                fontSize: "0.9rem",
                fontWeight: activePage === item.key ? "600" : "400",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (activePage !== item.key) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "rgba(255,255,255,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (activePage !== item.key) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "transparent";
                }
              }}
            >
              {item.label}
            </div>
          ))}
        </div>

        <div style={{ padding: "12px" }}>
          <div
            onClick={handleLogout}
            style={{
              padding: "11px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(244,67,54,0.15)",
              color: "#ffcdd2",
              fontSize: "0.9rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "rgba(244,67,54,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "rgba(244,67,54,0.15)";
            }}
          >
            🚪 Logout
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: "30px",
          backgroundColor: "#f5f6fa",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#fff",
            padding: "18px 28px",
            borderRadius: "14px",
            marginBottom: "24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{ margin: "0 0 4px", fontSize: "1.3rem", color: "#1a1a2e" }}
          >
            Apply for Leave 📝
          </h2>
          <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
            Fill in the form below to submit a leave request
          </p>
        </div>

        {/* Form Card */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "760px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
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

          {success && (
            <div
              style={{
                backgroundColor: "#e8f5e9",
                border: "1px solid #c8e6c9",
                color: "#2e7d32",
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "20px",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              ✅ {success}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {/* Your Name */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "#333",
                }}
              >
                Your Name
              </label>
              <input
                type="text"
                value={profile?.full_name || ""}
                disabled
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "10px",
                  backgroundColor: "#f8f9ff",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  color: "#555",
                }}
              />
            </div>

            {/* Type of Leave */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "#333",
                }}
              >
                Type of Leave
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  backgroundColor: "#fff",
                  color: "#333",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              >
                <option value="annual">🌴 Annual Leave</option>
                <option value="sick">🏥 Sick Leave</option>
                <option value="casual">☀️ Casual Leave</option>
              </select>
            </div>

            {/* Reason */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "#333",
                }}
              >
                Reason for Leave
              </label>
              <input
                type="text"
                placeholder="Enter reason for leave"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  outline: "none",
                  color: "#333",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            {/* Date From */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "#333",
                }}
              >
                Date Requested From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  outline: "none",
                  color: "#333",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            {/* Date To */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "#333",
                }}
              >
                Date Requested To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  outline: "none",
                  color: "#333",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            {/* Days Preview */}
            {dateFrom && dateTo && calculateDays(dateFrom, dateTo) > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div
                  style={{
                    backgroundColor: "#f0f4ff",
                    border: "1.5px solid #c7d7ff",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>📅</span>
                  <span
                    style={{
                      color: "#4A6CF7",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                    }}
                  >
                    Total: {calculateDays(dateFrom, dateTo)} day
                    {calculateDays(dateFrom, dateTo) !== 1 ? "s" : ""} of leave
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <button
              onClick={() => router.push("/employee/dashboard")}
              style={{
                padding: "11px 24px",
                borderRadius: "10px",
                border: "1.5px solid #e0e0e0",
                backgroundColor: "#fff",
                cursor: "pointer",
                fontSize: "0.9rem",
                color: "#555",
                fontWeight: "500",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: "11px 28px",
                borderRadius: "10px",
                border: "none",
                background: loading
                  ? "#a0aec0"
                  : "linear-gradient(135deg, #4A6CF7, #3451d1)",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                fontWeight: "700",
                boxShadow: loading ? "none" : "0 4px 12px rgba(74,108,247,0.3)",
              }}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
