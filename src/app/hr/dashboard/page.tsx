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

      // Total employees
      const { data: emps } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "employee");
      setTotalEmployees(emps?.length || 0);

      // Total pending requests
      const { data: pending } = await supabase
        .from("leave_requests")
        .select("id")
        .eq("status", "pending");
      setTotalPending(pending?.length || 0);

      // Total absences this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: absences } = await supabase
        .from("attendance")
        .select("id")
        .eq("status", "absent")
        .gte("date", startOfMonth.toISOString().split("T")[0]);
      setTotalAbsences(absences?.length || 0);

      // Employees on leave this week
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

      // Approval requests
      const { data: requests } = await supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_employee_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(5);
      setApprovalRequests((requests as LeaveRequest[]) || []);

      // HR notifications
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

  // Build bar chart data from approval requests
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
          onClick={() => router.push("/hr/dashboard")}
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
          onClick={() => router.push("/hr/approval-request")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          ✅ Approval Request
        </div>

        <div
          onClick={() => router.push("/hr/mark-attendance")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          📅 Mark Attendance
        </div>

        <div
          onClick={() => router.push("/hr/employees")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          👥 Employees
        </div>

        <div
          onClick={() => router.push("/hr/attendance-overview")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          📋 Attendance Overview
        </div>

        <div
          onClick={() => router.push("/hr/leave-balances")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          ⚖️ Leave Balances
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
            backgroundColor: "#fff",
            padding: "16px 24px",
            borderRadius: "10px",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: 0 }}>Welcome to Leave Portal</h2>
        </div>

        {/* HR Notifications */}
        {notifications.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "8px",
                  padding: "14px 20px",
                  marginBottom: "10px",
                  color: "#856404",
                }}
              >
                ⚠️ <strong>{notif.profiles?.full_name}</strong>: {notif.message}
              </div>
            ))}
          </div>
        )}

        {/* Summary Cards */}
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
              label: "Total Employees",
              value: totalEmployees,
              color: "#4A6CF7",
              icon: "👥",
            },
            {
              label: "Pending Requests",
              value: totalPending,
              color: "#FF9800",
              icon: "⏳",
            },
            {
              label: "Absences This Month",
              value: totalAbsences,
              color: "#f44336",
              icon: "❌",
            },
            {
              label: "On Leave This Week",
              value: employeesOnLeave.length,
              color: "#4CAF50",
              icon: "🏖️",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                backgroundColor: card.color,
                color: "white",
                padding: "20px 24px",
                borderRadius: "12px",
                flex: 1,
                minWidth: "150px",
              }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: "8px" }}>
                {card.icon}
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: "2rem" }}>
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
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          {/* Bar Chart */}
          <div
            style={{
              flex: 2,
              minWidth: "300px",
              backgroundColor: "#fff",
              borderRadius: "10px",
              padding: "24px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Leave Requests Overview</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leaveChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Pending" fill="#FF9800" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Approved" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rejected" fill="#f44336" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Employees on Leave This Week */}
          <div
            style={{
              flex: 1,
              minWidth: "260px",
              backgroundColor: "#fff",
              borderRadius: "10px",
              padding: "24px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>On Leave This Week</h3>
            {employeesOnLeave.length === 0 ? (
              <p style={{ color: "#aaa" }}>No employees on leave this week</p>
            ) : (
              employeesOnLeave.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "#e0e0e0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    👤
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "600",
                        fontSize: "0.9rem",
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
                      fontSize: "0.75rem",
                      color: "#555",
                      textTransform: "capitalize",
                      backgroundColor: "#f0f4ff",
                      padding: "3px 8px",
                      borderRadius: "10px",
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
            borderRadius: "10px",
            padding: "24px",
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
            <h3 style={{ margin: 0 }}>Recent Approval Requests</h3>
            <span
              onClick={() => router.push("/hr/approval-request")}
              style={{
                color: "#4A6CF7",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
              }}
            >
              View All →
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
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
                      padding: "10px",
                      color: "#555",
                      fontSize: "0.85rem",
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
                      padding: "20px",
                      textAlign: "center",
                      color: "#aaa",
                    }}
                  >
                    No requests yet
                  </td>
                </tr>
              ) : (
                approvalRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px", fontSize: "0.85rem" }}>
                      {req.profiles?.full_name}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        fontSize: "0.85rem",
                        textTransform: "capitalize",
                      }}
                    >
                      {req.leave_type}
                    </td>
                    <td style={{ padding: "10px", fontSize: "0.85rem" }}>
                      {req.date_from}
                    </td>
                    <td style={{ padding: "10px", fontSize: "0.85rem" }}>
                      {req.date_to}
                    </td>
                    <td style={{ padding: "10px", fontSize: "0.85rem" }}>
                      {req.days_count}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
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
                    <td style={{ padding: "10px" }}>
                      {req.status === "pending" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleApprove(req.id)}
                            style={{
                              backgroundColor: "#4CAF50",
                              color: "white",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            style={{
                              backgroundColor: "#f44336",
                              color: "white",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                            }}
                          >
                            Reject
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
    </div>
  );
}
