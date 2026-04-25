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
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
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

  return (
    <div
      style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "220px",
          minHeight: "100vh",
          backgroundColor: "#4A6CF7",
          color: "white",
          display: "flex",
          flexDirection: "column",
          padding: "20px",
        }}
      >
        <h2 style={{ marginBottom: "20px", fontSize: "1.2rem" }}>EPortal</h2>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#fff",
              margin: "0 auto 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            👤
          </div>
          <p
            style={{ fontWeight: "bold", fontSize: "0.9rem", margin: "4px 0" }}
          >
            {profile?.full_name}
          </p>
          <p style={{ fontSize: "0.75rem", opacity: 0.8, margin: 0 }}>
            {profile?.email}
          </p>
        </div>

        <div
          onClick={() => router.push("/employee/dashboard")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          📊 Dashboard
        </div>

        <div
          onClick={() => router.push("/employee/apply-leave")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
            backgroundColor: "rgba(255,255,255,0.2)",
          }}
        >
          📝 Apply Leave
        </div>

        <div
          onClick={() => router.push("/employee/attendance")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          📅 Check Attendance
        </div>
        <div
          onClick={() => router.push("/employee/notifications")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>🔔 Notifications</span>
        </div>

        <div
          onClick={handleLogout}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginTop: "auto",
          }}
        >
          🚪 Logout
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
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            padding: "30px",
            maxWidth: "700px",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "24px" }}>
            Leave Request Form
          </h2>

          {error && (
            <div
              style={{
                backgroundColor: "#ffebee",
                color: "#c62828",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                backgroundColor: "#e8f5e9",
                color: "#2e7d32",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              {success}
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
                  marginBottom: "6px",
                  fontWeight: "500",
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
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: "#f5f5f5",
                  boxSizing: "border-box",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            {/* Type of Leave */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
                }}
              >
                Type of Leave
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  backgroundColor: "#fff",
                }}
              >
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
              </select>
            </div>

            {/* Reason for Leave */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
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
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Date From */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
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
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Date To */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
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
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Days Count Preview */}
            {dateFrom && dateTo && (
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ color: "#4A6CF7", fontWeight: "600" }}>
                  Total Days: {calculateDays(dateFrom, dateTo)}
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "30px",
            }}
          >
            <button
              onClick={() => router.push("/employee/dashboard")}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                backgroundColor: "#fff",
                cursor: "pointer",
                fontSize: "0.95rem",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#4A6CF7",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
                fontWeight: "bold",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Submitting..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
