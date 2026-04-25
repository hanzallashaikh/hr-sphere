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

export default function ApprovalRequest() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
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

      const { data: reqs, error } = await supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_employee_id_fkey(full_name, email)")
        .order("created_at", { ascending: false });

      console.log("REQS:", reqs);
      console.log("ERROR:", error);

      setRequests((reqs as LeaveRequest[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    await supabase
      .from("leave_requests")
      .update({ status: "approved", reviewed_by: profile?.id })
      .eq("id", id);

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
    );
  };

  const handleReject = async (id: string) => {
    await supabase
      .from("leave_requests")
      .update({ status: "rejected", reviewed_by: profile?.id })
      .eq("id", id);

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  if (loading) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
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
            backgroundColor: "rgba(255,255,255,0.2)",
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
          <h2 style={{ margin: 0 }}>Approval Requests</h2>
        </div>

        {/* Filter Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 20px",
                borderRadius: "20px",
                border: "2px solid #4A6CF7",
                cursor: "pointer",
                backgroundColor: filter === f ? "#4A6CF7" : "#fff",
                color: filter === f ? "white" : "#4A6CF7",
                fontWeight: "bold",
                fontSize: "0.85rem",
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            padding: "24px",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                {[
                  "Employee",
                  "Leave Type",
                  "Date From",
                  "Date To",
                  "Reason",
                  "Days",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "12px",
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
              {filteredRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#aaa",
                    }}
                  >
                    No requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                      }}
                    >
                      {req.profiles?.full_name}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.85rem",
                        textTransform: "capitalize",
                      }}
                    >
                      {req.leave_type} Leave
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                      {req.date_from}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                      {req.date_to}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                      {req.reason}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                      {req.days_count} {req.days_count === 1 ? "Day" : "Days"}
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
                              padding: "6px 12px",
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
