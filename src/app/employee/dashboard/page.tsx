"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

type LeaveBalance = {
  annual_leave: number;
  sick_leave: number;
  casual_leave: number;
};

type LeaveRequest = {
  id: string;
  leave_type: string;
  date_from: string;
  date_to: string;
  days_count: number;
  status: string;
};

type Notification = {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balances, setBalances] = useState<LeaveBalance | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
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

      const { data: bal } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", authData.user.id)
        .single();
      setBalances(bal);

      const { data: leavesData } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", authData.user.id)
        .order("created_at", { ascending: false });
      setLeaves(leavesData || []);

      const { data: notifs } = await supabase
        .from("employee_notifications")
        .select("*")
        .eq("employee_id", authData.user.id)
        .order("created_at", { ascending: false });
      setNotifications(notifs || []);

      setLoading(false);
    };

    fetchData();

    // Realtime subscription for notifications
    const channel = supabase
      .channel("employee_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "employee_notifications",
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleMarkAllRead = async () => {
    await supabase
      .from("employee_notifications")
      .update({ is_read: true })
      .eq("employee_id", profile?.id);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const pieData = [
    {
      name: "Annual Leave",
      value: balances?.annual_leave ?? 0,
      color: "#4CAF50",
    },
    {
      name: "Sick Leave",
      value: balances?.sick_leave ?? 0,
      color: "#e91e8c",
    },
    {
      name: "Casual Leave",
      value: balances?.casual_leave ?? 0,
      color: "#2196F3",
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
          fontSize: "1.1rem",
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
            backgroundColor: "rgba(255,255,255,0.2)",
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
          }}
        >
          📅 Check Attendance
        </div>

        {/* Notifications Link */}
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
          {unreadCount > 0 && (
            <span
              style={{
                backgroundColor: "#f44336",
                color: "white",
                borderRadius: "50%",
                padding: "2px 7px",
                fontSize: "0.7rem",
                fontWeight: "bold",
              }}
            >
              {unreadCount}
            </span>
          )}
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            backgroundColor: "#fff",
            padding: "16px 24px",
            borderRadius: "10px",
          }}
        >
          <h2 style={{ margin: 0 }}>Welcome to Leave Portal</h2>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Notification Bell */}
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  cursor: "pointer",
                  fontSize: "1.5rem",
                  position: "relative",
                  display: "inline-block",
                }}
              >
                🔔
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      backgroundColor: "#f44336",
                      color: "white",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      fontSize: "0.7rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "36px",
                    width: "320px",
                    backgroundColor: "#fff",
                    borderRadius: "10px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    zIndex: 100,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <strong>Notifications</strong>
                    {unreadCount > 0 && (
                      <span
                        onClick={handleMarkAllRead}
                        style={{
                          fontSize: "0.8rem",
                          color: "#4A6CF7",
                          cursor: "pointer",
                        }}
                      >
                        Mark all read
                      </span>
                    )}
                  </div>

                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <p
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "#aaa",
                          margin: 0,
                        }}
                      >
                        No notifications yet
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid #f5f5f5",
                            backgroundColor: notif.is_read ? "#fff" : "#f0f4ff",
                          }}
                        >
                          <p style={{ margin: "0 0 4px", fontSize: "0.85rem" }}>
                            {notif.type === "approved" ? "✅" : "❌"}{" "}
                            {notif.message}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.75rem",
                              color: "#aaa",
                            }}
                          >
                            {new Date(notif.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* View All Link */}
                  <div
                    onClick={() => router.push("/employee/notifications")}
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      color: "#4A6CF7",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      borderTop: "1px solid #eee",
                      fontWeight: "600",
                    }}
                  >
                    View All Notifications →
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push("/employee/apply-leave")}
              style={{
                backgroundColor: "#4A6CF7",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Apply Leave
            </button>
          </div>
        </div>

        {/* Leave Balance Cards */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Annual Leave",
              value: balances?.annual_leave ?? 0,
              total: 10,
              color: "#4CAF50",
            },
            {
              label: "Sick Leave",
              value: balances?.sick_leave ?? 0,
              total: 10,
              color: "#e91e8c",
            },
            {
              label: "Casual Leave",
              value: balances?.casual_leave ?? 0,
              total: 10,
              color: "#2196F3",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                backgroundColor: card.color,
                color: "white",
                padding: "24px",
                borderRadius: "12px",
                flex: 1,
                minWidth: "150px",
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: "600" }}>
                {card.label}
              </p>
              <h1 style={{ margin: "0 0 8px", fontSize: "2.5rem" }}>
                {card.value}
              </h1>
              <p style={{ margin: "0 0 8px", fontSize: "0.85rem" }}>
                Available
              </p>
              {/* Progress Bar */}
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.3)",
                  borderRadius: "10px",
                  height: "6px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "10px",
                    height: "6px",
                    width: `${(card.value / card.total) * 100}%`,
                  }}
                />
              </div>
              <p
                style={{ margin: "4px 0 0", fontSize: "0.75rem", opacity: 0.9 }}
              >
                {card.total - card.value} used of {card.total}
              </p>
            </div>
          ))}
        </div>

        {/* Charts + Table Row */}
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {/* Pie Chart */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "10px",
              padding: "24px",
              flex: 1,
              minWidth: "280px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Leave Balance Overview</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Applied Leaves Table */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "10px",
              padding: "24px",
              flex: 2,
              minWidth: "300px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Applied Leaves</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      color: "#555",
                    }}
                  >
                    Leave Type
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      color: "#555",
                    }}
                  >
                    Duration
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      color: "#555",
                    }}
                  >
                    Count
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      color: "#555",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#aaa",
                      }}
                    >
                      No leave requests yet
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr
                      key={leave.id}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td
                        style={{ padding: "12px", textTransform: "capitalize" }}
                      >
                        {leave.leave_type} Leave
                      </td>
                      <td style={{ padding: "12px" }}>
                        {leave.date_from} – {leave.date_to}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {leave.days_count} Days
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            textTransform: "capitalize",
                            backgroundColor:
                              leave.status === "approved"
                                ? "#e8f5e9"
                                : leave.status === "rejected"
                                  ? "#ffebee"
                                  : "#fff8e1",
                            color:
                              leave.status === "approved"
                                ? "#2e7d32"
                                : leave.status === "rejected"
                                  ? "#c62828"
                                  : "#f57f17",
                          }}
                        >
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
