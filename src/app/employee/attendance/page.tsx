"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isSameMonth,
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
  const [activePage] = useState("attendance");
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

  if (loading) {
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
            Check Attendance 📅
          </h2>
          <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
            View your monthly attendance records
          </p>
        </div>

        {/* Summary Cards */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Present This Month",
              value: presentCount,
              color: "#4CAF50",
              gradient: "linear-gradient(135deg, #4CAF50, #2e7d32)",
              icon: "✅",
            },
            {
              label: "Absent This Month",
              value: absentCount,
              color: "#f44336",
              gradient: "linear-gradient(135deg, #f44336, #c62828)",
              icon: "❌",
            },
            {
              label: "Total Marked",
              value: presentCount + absentCount,
              color: "#4A6CF7",
              gradient: "linear-gradient(135deg, #4A6CF7, #3451d1)",
              icon: "📋",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: card.gradient,
                color: "white",
                padding: "20px 24px",
                borderRadius: "14px",
                flex: 1,
                boxShadow: `0 6px 20px ${card.color}40`,
              }}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: "8px" }}>
                {card.icon}
              </div>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontSize: "2rem",
                  fontWeight: "800",
                }}
              >
                {card.value}
              </h2>
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          {/* Calendar Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
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
                borderRadius: "10px",
                padding: "9px 18px",
                cursor: "pointer",
                color: "#4A6CF7",
                fontWeight: "700",
                fontSize: "0.9rem",
              }}
            >
              ← Prev
            </button>

            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                color: "#1a1a2e",
                fontWeight: "700",
              }}
            >
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
                borderRadius: "10px",
                padding: "9px 18px",
                cursor: "pointer",
                color: "#4A6CF7",
                fontWeight: "700",
                fontSize: "0.9rem",
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
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  padding: "8px",
                  fontWeight: "700",
                  fontSize: "0.78rem",
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
              gap: "6px",
            }}
          >
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {daysInMonth.map((date) => {
              const status = getStatusForDate(date);
              const today = isToday(date);
              const inMonth = isSameMonth(date, currentMonth);

              return (
                <div
                  key={date.toISOString()}
                  style={{
                    padding: "10px 4px",
                    borderRadius: "10px",
                    textAlign: "center",
                    fontSize: "0.85rem",
                    fontWeight: today ? "800" : "400",
                    backgroundColor:
                      status === "present"
                        ? "#e8f5e9"
                        : status === "absent"
                          ? "#ffebee"
                          : today
                            ? "#f0f4ff"
                            : "#fafafa",
                    border: today
                      ? "2px solid #4A6CF7"
                      : status === "present"
                        ? "1px solid #c8e6c9"
                        : status === "absent"
                          ? "1px solid #ffcdd2"
                          : "1px solid #eee",
                    color: inMonth ? "#333" : "#ccc",
                  }}
                >
                  <div>{format(date, "d")}</div>
                  {status && (
                    <div
                      style={{
                        fontSize: "0.65rem",
                        marginTop: "3px",
                        color: status === "present" ? "#2e7d32" : "#c62828",
                        fontWeight: "700",
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
              marginTop: "24px",
              flexWrap: "wrap",
              paddingTop: "20px",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            {[
              {
                color: "#e8f5e9",
                border: "#4CAF50",
                label: "Present",
                text: "#2e7d32",
              },
              {
                color: "#ffebee",
                border: "#f44336",
                label: "Absent",
                text: "#c62828",
              },
              {
                color: "#f0f4ff",
                border: "#4A6CF7",
                label: "Today",
                text: "#4A6CF7",
              },
              {
                color: "#fafafa",
                border: "#eee",
                label: "Not Marked",
                text: "#888",
              },
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
                    borderRadius: "5px",
                    backgroundColor: item.color,
                    border: `1.5px solid ${item.border}`,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: item.text,
                    fontWeight: "500",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
