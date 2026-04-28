"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  date_from: string;
  date_to: string;
  reason: string;
  days_count: number;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
};

type Notification = {
  id: string;
  message: string;
  profiles: {
    full_name: string;
  };
};

export default function HRDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employeesOnLeave, setEmployeesOnLeave] = useState<LeaveRequest[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalAbsences, setTotalAbsences] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activePage] = useState("dashboard");
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
      if (prof?.role !== "hr") {
        router.push("/employee/dashboard");
        return;
      }
      setProfile(prof);

      const { data: emps } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "employee");
      setTotalEmployees(emps?.length || 0);

      const { data: pending } = await supabase
        .from("leave_requests")
        .select("id")
        .eq("status", "pending");
      setTotalPending(pending?.length || 0);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: absences } = await supabase
        .from("attendance")
        .select("id")
        .eq("status", "absent")
        .gte("date", startOfMonth.toISOString().split("T")[0]);
      setTotalAbsences(absences?.length || 0);

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { data: onLeave } = await supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_employee_id_fkey(full_name, email)")
        .eq("status", "approved")
        .gte("date_from", weekStart.toISOString().split("T")[0])
        .lte("date_to", weekEnd.toISOString().split("T")[0]);
      setEmployeesOnLeave((onLeave as LeaveRequest[]) || []);

      const { data: requests } = await supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_employee_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(5);
      setApprovalRequests((requests as LeaveRequest[]) || []);

      const { data: notifs } = await supabase
        .from("leave_notifications")
        .select("*, profiles(full_name)")
        .eq("is_read", false)
        .order("created_at", { ascending: false });
      setNotifications((notifs as Notification[]) || []);

      setLoading(false);
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleApprove = async (id: string) => {
    await supabase
      .from("leave_requests")
      .update({ status: "approved", reviewed_by: profile?.id })
      .eq("id", id);
    setApprovalRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
    );
  };

  const handleReject = async (id: string) => {
    await supabase
      .from("leave_requests")
      .update({ status: "rejected", reviewed_by: profile?.id })
      .eq("id", id);
    setApprovalRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
    );
  };

  const leaveChartData = [
    {
      name: "Annual",
      Pending: approvalRequests.filter(
        (r) => r.leave_type === "annual" && r.status === "pending",
      ).length,
      Approved: approvalRequests.filter(
        (r) => r.leave_type === "annual" && r.status === "approved",
      ).length,
      Rejected: approvalRequests.filter(
        (r) => r.leave_type === "annual" && r.status === "rejected",
      ).length,
    },
    {
      name: "Sick",
      Pending: approvalRequests.filter(
        (r) => r.leave_type === "sick" && r.status === "pending",
      ).length,
      Approved: approvalRequests.filter(
        (r) => r.leave_type === "sick" && r.status === "approved",
      ).length,
      Rejected: approvalRequests.filter(
        (r) => r.leave_type === "sick" && r.status === "rejected",
      ).length,
    },
    {
      name: "Casual",
      Pending: approvalRequests.filter(
        (r) => r.leave_type === "casual" && r.status === "pending",
      ).length,
      Approved: approvalRequests.filter(
        (r) => r.leave_type === "casual" && r.status === "approved",
      ).length,
      Rejected: approvalRequests.filter(
        (r) => r.leave_type === "casual" && r.status === "rejected",
      ).length,
    },
  ];

  const navItems = [
    { label: "📊 Dashboard", href: "/hr/dashboard", key: "dashboard" },
    {
      label: "✅ Approval Request",
      href: "/hr/approval-request",
      key: "approval-request",
    },
    {
      label: "📅 Mark Attendance",
      href: "/hr/mark-attendance",
      key: "mark-attendance",
    },
    { label: "👥 Employees", href: "/hr/employees", key: "employees" },
    {
      label: "📋 Attendance Overview",
      href: "/hr/attendance-overview",
      key: "attendance-overview",
    },
    {
      label: "⚖️ Leave Balances",
      href: "/hr/leave-balances",
      key: "leave-balances",
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
                if (activePage !== item.key)
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                if (activePage !== item.key)
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "transparent";
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
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLDivElement).style.backgroundColor =
                "rgba(244,67,54,0.3)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLDivElement).style.backgroundColor =
                "rgba(244,67,54,0.15)")
            }
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
            Welcome back, {profile?.full_name?.split(" ")[0]} 👋
          </h2>
          <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
            Here is your HR overview for today
          </p>
        </div>

        {/* HR Notifications */}
        {notifications.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  backgroundColor: "#fff8e1",
                  border: "1px solid #ffe082",
                  borderRadius: "12px",
                  padding: "14px 20px",
                  marginBottom: "10px",
                  color: "#856404",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 2px 8px rgba(255,193,7,0.15)",
                }}
              >
                <span style={{ fontSize: "1.3rem" }}>⚠️</span>
                <span>
                  <strong>{notif.profiles?.full_name}</strong>: {notif.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Summary Cards */}
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
              label: "Total Employees",
              value: totalEmployees,
              gradient: "linear-gradient(135deg, #4A6CF7, #3451d1)",
              icon: "👥",
              shadow: "rgba(74,108,247,0.3)",
            },
            {
              label: "Pending Requests",
              value: totalPending,
              gradient: "linear-gradient(135deg, #FF9800, #e65100)",
              icon: "⏳",
              shadow: "rgba(255,152,0,0.3)",
            },
            {
              label: "Absences This Month",
              value: totalAbsences,
              gradient: "linear-gradient(135deg, #f44336, #c62828)",
              icon: "❌",
              shadow: "rgba(244,67,54,0.3)",
            },
            {
              label: "On Leave This Week",
              value: employeesOnLeave.length,
              gradient: "linear-gradient(135deg, #4CAF50, #2e7d32)",
              icon: "🏖️",
              shadow: "rgba(76,175,80,0.3)",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: card.gradient,
                color: "white",
                padding: "22px 24px",
                borderRadius: "16px",
                flex: 1,
                minWidth: "150px",
                boxShadow: `0 8px 24px ${card.shadow}`,
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
              <div style={{ fontSize: "1.8rem", marginBottom: "8px" }}>
                {card.icon}
              </div>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontSize: "2.2rem",
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

        {/* Bar Chart + Employees on Leave */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              flex: 2,
              minWidth: "300px",
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "24px",
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
              Leave Requests Overview
            </h3>
            <p
              style={{ margin: "0 0 16px", color: "#888", fontSize: "0.8rem" }}
            >
              Breakdown by leave type and status
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leaveChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Pending" fill="#FF9800" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Approved" fill="#4CAF50" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Rejected" fill="#f44336" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: "260px",
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "24px",
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
              On Leave This Week
            </h3>
            <p
              style={{ margin: "0 0 16px", color: "#888", fontSize: "0.8rem" }}
            >
              Currently approved leave
            </p>
            {employeesOnLeave.length === 0 ? (
              <div
                style={{ textAlign: "center", padding: "20px", color: "#aaa" }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏖️</div>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>
                  No employees on leave this week
                </p>
              </div>
            ) : (
              employeesOnLeave.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 0",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #4A6CF7, #3451d1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "1rem",
                    }}
                  >
                    👤
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "600",
                        fontSize: "0.875rem",
                        color: "#333",
                      }}
                    >
                      {item.profiles?.full_name}
                    </p>
                    <p
                      style={{ margin: 0, fontSize: "0.75rem", color: "#888" }}
                    >
                      {item.date_from} – {item.date_to}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      textTransform: "capitalize",
                      padding: "3px 10px",
                      borderRadius: "10px",
                      backgroundColor: "#f0f4ff",
                      color: "#4A6CF7",
                    }}
                  >
                    {item.leave_type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Approval Requests */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: "1rem",
                  color: "#1a1a2e",
                }}
              >
                Recent Approval Requests
              </h3>
              <p style={{ margin: 0, color: "#888", fontSize: "0.8rem" }}>
                Latest 5 leave requests
              </p>
            </div>
            <span
              onClick={() => router.push("/hr/approval-request")}
              style={{
                color: "#4A6CF7",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "700",
              }}
            >
              View All →
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9ff" }}>
                {[
                  "Employee",
                  "Leave Type",
                  "From",
                  "To",
                  "Days",
                  "Status",
                  "Action",
                ].map((h) => (
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
              {approvalRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#aaa",
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>
                      📋
                    </div>
                    No requests yet
                  </td>
                </tr>
              ) : (
                approvalRequests.map((req) => (
                  <tr
                    key={req.id}
                    style={{ borderBottom: "1px solid #f5f5f5" }}
                    onMouseEnter={(e) =>
                      ((
                        e.currentTarget as HTMLTableRowElement
                      ).style.backgroundColor = "#f8f9ff")
                    }
                    onMouseLeave={(e) =>
                      ((
                        e.currentTarget as HTMLTableRowElement
                      ).style.backgroundColor = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                      }}
                    >
                      {req.profiles?.full_name}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.875rem",
                        textTransform: "capitalize",
                      }}
                    >
                      {req.leave_type}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.8rem",
                        color: "#666",
                      }}
                    >
                      {req.date_from}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.8rem",
                        color: "#666",
                      }}
                    >
                      {req.date_to}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                      {req.days_count}d
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
                            req.status === "approved"
                              ? "#e8f5e9"
                              : req.status === "rejected"
                                ? "#ffebee"
                                : "#fff8e1",
                          color:
                            req.status === "approved"
                              ? "#2e7d32"
                              : req.status === "rejected"
                                ? "#c62828"
                                : "#f57f17",
                        }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {req.status === "pending" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleApprove(req.id)}
                            style={{
                              backgroundColor: "#4CAF50",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "0.78rem",
                              fontWeight: "700",
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            style={{
                              backgroundColor: "#f44336",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "0.78rem",
                              fontWeight: "700",
                            }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
