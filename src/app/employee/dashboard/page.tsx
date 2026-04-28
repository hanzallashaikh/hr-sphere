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
  const [activePage, setActivePage] = useState("dashboard");
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
    { name: "Sick Leave", value: balances?.sick_leave ?? 0, color: "#e91e8c" },
    {
      name: "Casual Leave",
      value: balances?.casual_leave ?? 0,
      color: "#2196F3",
    },
  ];

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
        {/* Sidebar Header */}
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
            <span
              style={{
                fontWeight: "700",
                fontSize: "1.1rem",
                letterSpacing: "-0.3px",
              }}
            >
              HR Sphere
            </span>
          </div>

          {/* Profile */}
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

        {/* Nav Items */}
        <div style={{ padding: "16px 12px", flex: 1 }}>
          {navItems.map((item) => (
            <div
              key={item.key}
              onClick={() => {
                setActivePage(item.key);
                router.push(item.href);
              }}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s",
                fontSize: "0.9rem",
                fontWeight: activePage === item.key ? "600" : "400",
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
              <span>{item.label}</span>
              {item.key === "notifications" && unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#f44336",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
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
          ))}
        </div>

        {/* Logout */}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
            backgroundColor: "#fff",
            padding: "18px 28px",
            borderRadius: "14px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div>
            <h2
              style={{
                margin: "0 0 4px",
                fontSize: "1.3rem",
                color: "#1a1a2e",
              }}
            >
              Welcome back, {profile?.full_name?.split(" ")[0]} 👋
            </h2>
            <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
              Here is your leave summary for today
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Notification Bell */}
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  backgroundColor: "#f0f4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  position: "relative",
                  border: "1.5px solid #e0e8ff",
                }}
              >
                🔔
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      backgroundColor: "#f44336",
                      color: "white",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      fontSize: "0.65rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      border: "2px solid white",
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
                    top: "50px",
                    width: "340px",
                    backgroundColor: "#fff",
                    borderRadius: "14px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    zIndex: 100,
                    overflow: "hidden",
                    border: "1px solid #eee",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 18px",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <strong style={{ fontSize: "0.95rem", color: "#1a1a2e" }}>
                      Notifications
                    </strong>
                    {unreadCount > 0 && (
                      <span
                        onClick={handleMarkAllRead}
                        style={{
                          fontSize: "0.8rem",
                          color: "#4A6CF7",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Mark all read
                      </span>
                    )}
                  </div>

                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: "30px", textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "8px" }}>
                          🔔
                        </div>
                        <p
                          style={{
                            color: "#aaa",
                            margin: 0,
                            fontSize: "0.85rem",
                          }}
                        >
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          style={{
                            padding: "12px 18px",
                            borderBottom: "1px solid #f5f5f5",
                            backgroundColor: notif.is_read ? "#fff" : "#f0f4ff",
                            display: "flex",
                            gap: "10px",
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{ fontSize: "1.1rem", marginTop: "1px" }}
                          >
                            {notif.type === "approved" ? "✅" : "❌"}
                          </span>
                          <div>
                            <p
                              style={{
                                margin: "0 0 4px",
                                fontSize: "0.83rem",
                                color: "#333",
                              }}
                            >
                              {notif.message}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.72rem",
                                color: "#aaa",
                              }}
                            >
                              {new Date(notif.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div
                    onClick={() => router.push("/employee/notifications")}
                    style={{
                      padding: "12px 18px",
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
                background: "linear-gradient(135deg, #4A6CF7, #3451d1)",
                color: "white",
                border: "none",
                padding: "10px 22px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.9rem",
                boxShadow: "0 4px 12px rgba(74,108,247,0.3)",
              }}
            >
              + Apply Leave
            </button>
          </div>
        </div>

        {/* Leave Balance Cards */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Annual Leave",
              value: balances?.annual_leave ?? 0,
              total: 10,
              color: "#4CAF50",
              gradient: "linear-gradient(135deg, #4CAF50, #2e7d32)",
              icon: "🌴",
            },
            {
              label: "Sick Leave",
              value: balances?.sick_leave ?? 0,
              total: 10,
              color: "#e91e8c",
              gradient: "linear-gradient(135deg, #e91e8c, #ad1457)",
              icon: "🏥",
            },
            {
              label: "Casual Leave",
              value: balances?.casual_leave ?? 0,
              total: 10,
              color: "#2196F3",
              gradient: "linear-gradient(135deg, #2196F3, #1565c0)",
              icon: "☀️",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: card.gradient,
                color: "white",
                padding: "24px",
                borderRadius: "16px",
                flex: 1,
                minWidth: "160px",
                boxShadow: `0 8px 24px ${card.color}40`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-10px",
                  right: "-10px",
                  fontSize: "4rem",
                  opacity: 0.15,
                }}
              >
                {card.icon}
              </div>
              <p
                style={{
                  margin: "0 0 6px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  opacity: 0.9,
                }}
              >
                {card.label}
              </p>
              <h1
                style={{
                  margin: "0 0 4px",
                  fontSize: "2.8rem",
                  fontWeight: "800",
                }}
              >
                {card.value}
              </h1>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "0.8rem",
                  opacity: 0.85,
                }}
              >
                days available
              </p>
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.25)",
                  borderRadius: "10px",
                  height: "5px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.9)",
                    borderRadius: "10px",
                    height: "5px",
                    width: `${(card.value / card.total) * 100}%`,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "0.72rem",
                  opacity: 0.85,
                }}
              >
                {card.total - card.value} of {card.total} days used
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
              borderRadius: "16px",
              padding: "24px",
              flex: 1,
              minWidth: "280px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "4px",
                fontSize: "1rem",
                color: "#1a1a2e",
              }}
            >
              Leave Balance Overview
            </h3>
            <p
              style={{ margin: "0 0 16px", color: "#888", fontSize: "0.8rem" }}
            >
              Remaining days by leave type
            </p>
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
              borderRadius: "16px",
              padding: "24px",
              flex: 2,
              minWidth: "300px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "4px",
                fontSize: "1rem",
                color: "#1a1a2e",
              }}
            >
              Applied Leaves
            </h3>
            <p
              style={{ margin: "0 0 16px", color: "#888", fontSize: "0.8rem" }}
            >
              Your recent leave requests
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9ff" }}>
                  {["Leave Type", "Duration", "Days", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        color: "#555",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        borderBottom: "2px solid #eee",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "30px",
                        textAlign: "center",
                        color: "#aaa",
                      }}
                    >
                      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>
                        📋
                      </div>
                      No leave requests yet
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr
                      key={leave.id}
                      style={{ borderBottom: "1px solid #f5f5f5" }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.backgroundColor = "#f8f9ff";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.backgroundColor = "transparent";
                      }}
                    >
                      <td
                        style={{
                          padding: "12px",
                          textTransform: "capitalize",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        {leave.leave_type} Leave
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "0.8rem",
                          color: "#666",
                        }}
                      >
                        {leave.date_from} – {leave.date_to}
                      </td>
                      <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                        {leave.days_count}d
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
