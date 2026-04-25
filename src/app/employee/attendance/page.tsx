"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

type AttendanceRecord = {
  date: string;
  status: "present" | "absent";
};

export default function CheckAttendance() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const fetchAttendance = async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data } = await supabase
        .from("attendance")
        .select("date, status")
        .eq("employee_id", profile.id)
        .gte("date", start)
        .lte("date", end);

      setAttendanceData(data || []);
    };
    fetchAttendance();
  }, [profile, currentMonth]);

  const fetchAttendance = async () => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data } = await supabase
      .from("attendance")
      .select("date, status")
      .eq("employee_id", profile?.id)
      .gte("date", start)
      .lte("date", end);

    setAttendanceData(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getStatusForDate = (date: Date): "present" | "absent" | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    const record = attendanceData.find((r) => r.date === dateStr);
    return record ? record.status : null;
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const presentCount = attendanceData.filter(
    (r) => r.status === "present",
  ).length;
  const absentCount = attendanceData.filter(
    (r) => r.status === "absent",
  ).length;

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "sans-serif",
          color: "#4A6CF7",
        }}
      >
        Loading...
      </div>
    );
  }

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
            backgroundColor: "rgba(255,255,255,0.2)",
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
        {/* Summary Cards */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "20px 28px",
              borderRadius: "12px",
              flex: 1,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
              Present This Month
            </p>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>{presentCount}</h2>
          </div>
          <div
            style={{
              backgroundColor: "#f44336",
              color: "white",
              padding: "20px 28px",
              borderRadius: "12px",
              flex: 1,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
              Absent This Month
            </p>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>{absentCount}</h2>
          </div>
          <div
            style={{
              backgroundColor: "#4A6CF7",
              color: "white",
              padding: "20px 28px",
              borderRadius: "12px",
              flex: 1,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
              Total Marked
            </p>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>
              {presentCount + absentCount}
            </h2>
          </div>
        </div>

        {/* Calendar */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          {/* Calendar Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                  ),
                )
              }
              style={{
                backgroundColor: "#f0f4ff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                color: "#4A6CF7",
                fontWeight: "bold",
              }}
            >
              ← Prev
            </button>

            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
              {format(currentMonth, "MMMM yyyy")}
            </h3>

            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                  ),
                )
              }
              style={{
                backgroundColor: "#f0f4ff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                color: "#4A6CF7",
                fontWeight: "bold",
              }}
            >
              Next →
            </button>
          </div>

          {/* Day Labels */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
              marginBottom: "8px",
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  padding: "8px",
                  fontWeight: "600",
                  fontSize: "0.8rem",
                  color: "#888",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
            }}
          >
            {/* Empty cells for first day offset */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {daysInMonth.map((date) => {
              const status = getStatusForDate(date);
              const today = isToday(date);
              const inMonth = isSameMonth(date, currentMonth);

              return (
                <div
                  key={date.toISOString()}
                  style={{
                    padding: "10px 4px",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontSize: "0.85rem",
                    fontWeight: today ? "bold" : "normal",
                    backgroundColor:
                      status === "present"
                        ? "#e8f5e9"
                        : status === "absent"
                          ? "#ffebee"
                          : today
                            ? "#f0f4ff"
                            : "#fafafa",
                    border: today ? "2px solid #4A6CF7" : "1px solid #eee",
                    color: inMonth ? "#333" : "#ccc",
                    position: "relative",
                  }}
                >
                  <div>{format(date, "d")}</div>
                  {status && (
                    <div
                      style={{
                        fontSize: "0.65rem",
                        marginTop: "2px",
                        color: status === "present" ? "#2e7d32" : "#c62828",
                        fontWeight: "600",
                      }}
                    >
                      {status === "present" ? "✓ P" : "✗ A"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "20px",
              flexWrap: "wrap",
            }}
          >
            {[
              { color: "#e8f5e9", border: "#4CAF50", label: "Present" },
              { color: "#ffebee", border: "#f44336", label: "Absent" },
              { color: "#f0f4ff", border: "#4A6CF7", label: "Today" },
              { color: "#fafafa", border: "#eee", label: "Not Marked" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    backgroundColor: item.color,
                    border: `1px solid ${item.border}`,
                  }}
                />
                <span style={{ fontSize: "0.85rem", color: "#555" }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
