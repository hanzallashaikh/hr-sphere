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

type EmployeeBalance = {
  employee_id: string;
  full_name: string;
  email: string;
  annual_leave: number;
  sick_leave: number;
  casual_leave: number;
};

export default function LeaveBalances() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balances, setBalances] = useState<EmployeeBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAnnual, setEditAnnual] = useState(0);
  const [editSick, setEditSick] = useState(0);
  const [editCasual, setEditCasual] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
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

      // Fetch balances inline
      const { data: emps } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "employee")
        .order("full_name", { ascending: true });

      if (!emps || emps.length === 0) {
        setBalances([]);
        setLoading(false);
        return;
      }

      const { data: bals } = await supabase
        .from("leave_balances")
        .select("*")
        .in(
          "employee_id",
          emps.map((e) => e.id),
        );

      const combined: EmployeeBalance[] = emps.map((emp) => {
        const bal = bals?.find((b) => b.employee_id === emp.id);
        return {
          employee_id: emp.id,
          full_name: emp.full_name,
          email: emp.email,
          annual_leave: bal?.annual_leave ?? 0,
          sick_leave: bal?.sick_leave ?? 0,
          casual_leave: bal?.casual_leave ?? 0,
        };
      });

      setBalances(combined);
      setLoading(false);
    };
    fetchData();
  }, []);
  const fetchBalances = async () => {
    const { data: emps } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "employee")
      .order("full_name", { ascending: true });

    if (!emps || emps.length === 0) {
      setBalances([]);
      return;
    }

    const { data: bals } = await supabase
      .from("leave_balances")
      .select("*")
      .in(
        "employee_id",
        emps.map((e) => e.id),
      );

    const combined: EmployeeBalance[] = emps.map((emp) => {
      const bal = bals?.find((b) => b.employee_id === emp.id);
      return {
        employee_id: emp.id,
        full_name: emp.full_name,
        email: emp.email,
        annual_leave: bal?.annual_leave ?? 0,
        sick_leave: bal?.sick_leave ?? 0,
        casual_leave: bal?.casual_leave ?? 0,
      };
    });

    setBalances(combined);
  };

  const handleEditOpen = (emp: EmployeeBalance) => {
    setEditingId(emp.employee_id);
    setEditAnnual(emp.annual_leave);
    setEditSick(emp.sick_leave);
    setEditCasual(emp.casual_leave);
    setError("");
    setSuccess("");
  };

  const handleEditClose = () => {
    setEditingId(null);
    setEditAnnual(0);
    setEditSick(0);
    setEditCasual(0);
    setError("");
  };

  const handleSave = async (employeeId: string, employeeName: string) => {
    if (editAnnual < 0 || editSick < 0 || editCasual < 0) {
      setError("Leave balances cannot be negative");
      return;
    }

    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("leave_balances")
      .update({
        annual_leave: editAnnual,
        sick_leave: editSick,
        casual_leave: editCasual,
        updated_at: new Date().toISOString(),
      })
      .eq("employee_id", employeeId);

    if (updateError) {
      setError("Failed to update: " + updateError.message);
      setSaving(false);
      return;
    }

    // Update local state
    setBalances((prev) =>
      prev.map((b) =>
        b.employee_id === employeeId
          ? {
              ...b,
              annual_leave: editAnnual,
              sick_leave: editSick,
              casual_leave: editCasual,
            }
          : b,
      ),
    );

    setSuccess(`Leave balance for ${employeeName} updated successfully!`);
    setSaving(false);
    handleEditClose();
  };

  const handleReset = async (employeeId: string, employeeName: string) => {
    const confirmed = window.confirm(
      `Reset all leave balances for ${employeeName} to 10 days each?`,
    );
    if (!confirmed) return;

    const { error: resetError } = await supabase
      .from("leave_balances")
      .update({
        annual_leave: 10,
        sick_leave: 10,
        casual_leave: 10,
        updated_at: new Date().toISOString(),
      })
      .eq("employee_id", employeeId);

    if (resetError) {
      setError("Failed to reset: " + resetError.message);
      return;
    }

    setBalances((prev) =>
      prev.map((b) =>
        b.employee_id === employeeId
          ? { ...b, annual_leave: 10, sick_leave: 10, casual_leave: 10 }
          : b,
      ),
    );

    setSuccess(`Leave balance for ${employeeName} reset to 10 days each!`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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
            backgroundColor: "rgba(255,255,255,0.2)",
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
          <h2 style={{ margin: "0 0 4px" }}>Leave Balances</h2>
          <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
            Manage and adjust employee leave balances
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div
            style={{
              backgroundColor: "#e8f5e9",
              color: "#2e7d32",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontWeight: "500",
            }}
          >
            ✅ {success}
          </div>
        )}

        {/* Error Message */}
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

        {/* Edit Modal */}
        {editingId && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "12px",
                padding: "30px",
                width: "440px",
                maxWidth: "90vw",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
                Edit Leave Balance
              </h3>

              {error && (
                <div
                  style={{
                    backgroundColor: "#ffebee",
                    color: "#c62828",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Annual Leave */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "0.9rem",
                      color: "#4CAF50",
                    }}
                  >
                    Annual Leave (days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={editAnnual}
                    onChange={(e) => setEditAnnual(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "2px solid #4CAF50",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Sick Leave */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "0.9rem",
                      color: "#e91e8c",
                    }}
                  >
                    Sick Leave (days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={editSick}
                    onChange={(e) => setEditSick(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "2px solid #e91e8c",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Casual Leave */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "0.9rem",
                      color: "#2196F3",
                    }}
                  >
                    Casual Leave (days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={editCasual}
                    onChange={(e) => setEditCasual(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "2px solid #2196F3",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  onClick={handleEditClose}
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
                  onClick={() => {
                    const emp = balances.find(
                      (b) => b.employee_id === editingId,
                    );
                    if (emp) handleSave(editingId, emp.full_name);
                  }}
                  disabled={saving}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#4A6CF7",
                    color: "white",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    fontSize: "0.95rem",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Balances Table */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            padding: "24px",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
            All Employee Leave Balances
          </h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                {[
                  "Employee",
                  "Email",
                  "Annual Leave",
                  "Sick Leave",
                  "Casual Leave",
                  "Actions",
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
              {balances.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#aaa",
                    }}
                  >
                    No employees found
                  </td>
                </tr>
              ) : (
                balances.map((emp) => (
                  <tr
                    key={emp.employee_id}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td style={{ padding: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            backgroundColor: "#e0e0e0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          👤
                        </div>
                        <span style={{ fontWeight: "500", fontSize: "0.9rem" }}>
                          {emp.full_name}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.85rem",
                        color: "#666",
                      }}
                    >
                      {emp.email}
                    </td>

                    {/* Annual Leave */}
                    <td style={{ padding: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: "#e8f5e9",
                            color: "#2e7d32",
                            padding: "4px 12px",
                            borderRadius: "10px",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                          }}
                        >
                          {emp.annual_leave} days
                        </span>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: "#e8f5e9",
                            borderRadius: "10px",
                            height: "6px",
                            minWidth: "60px",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#4CAF50",
                              borderRadius: "10px",
                              height: "6px",
                              width: `${Math.min((emp.annual_leave / 10) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Sick Leave */}
                    <td style={{ padding: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: "#fce4ec",
                            color: "#c62828",
                            padding: "4px 12px",
                            borderRadius: "10px",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                          }}
                        >
                          {emp.sick_leave} days
                        </span>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: "#fce4ec",
                            borderRadius: "10px",
                            height: "6px",
                            minWidth: "60px",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#e91e8c",
                              borderRadius: "10px",
                              height: "6px",
                              width: `${Math.min((emp.sick_leave / 10) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Casual Leave */}
                    <td style={{ padding: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1565c0",
                            padding: "4px 12px",
                            borderRadius: "10px",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                          }}
                        >
                          {emp.casual_leave} days
                        </span>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: "#e3f2fd",
                            borderRadius: "10px",
                            height: "6px",
                            minWidth: "60px",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#2196F3",
                              borderRadius: "10px",
                              height: "6px",
                              width: `${Math.min((emp.casual_leave / 10) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleEditOpen(emp)}
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1565c0",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() =>
                            handleReset(emp.employee_id, emp.full_name)
                          }
                          style={{
                            backgroundColor: "#fff8e1",
                            color: "#f57f17",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                          }}
                        >
                          🔄 Reset
                        </button>
                      </div>
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
