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
  const [activePage] = useState("leave-balances");
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
            Leave Balances ⚖️
          </h2>
          <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
            Manage and adjust employee leave balances
          </p>
        </div>

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
                borderRadius: "16px",
                padding: "32px",
                width: "440px",
                maxWidth: "90vw",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              }}
            >
              <h3
                style={{ marginTop: 0, marginBottom: "20px", color: "#1a1a2e" }}
              >
                Edit Leave Balance ⚖️
              </h3>

              {error && (
                <div
                  style={{
                    backgroundColor: "#ffebee",
                    color: "#c62828",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    marginBottom: "16px",
                    fontSize: "0.875rem",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {[
                  {
                    label: "Annual Leave (days)",
                    value: editAnnual,
                    onChange: setEditAnnual,
                    color: "#4CAF50",
                    border: "#4CAF50",
                  },
                  {
                    label: "Sick Leave (days)",
                    value: editSick,
                    onChange: setEditSick,
                    color: "#e91e8c",
                    border: "#e91e8c",
                  },
                  {
                    label: "Casual Leave (days)",
                    value: editCasual,
                    onChange: setEditCasual,
                    color: "#2196F3",
                    border: "#2196F3",
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        fontSize: "0.875rem",
                        color: field.color,
                      }}
                    >
                      {field.label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: `2px solid ${field.border}`,
                        borderRadius: "10px",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                ))}
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
                    borderRadius: "10px",
                    border: "1.5px solid #e0e0e0",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "#555",
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
                    borderRadius: "10px",
                    border: "none",
                    background: saving
                      ? "#a0aec0"
                      : "linear-gradient(135deg, #4A6CF7, #3451d1)",
                    color: "white",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "0.9rem",
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
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#1a1a2e" }}>
            All Employee Leave Balances
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9ff" }}>
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
              {balances.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#aaa",
                    }}
                  >
                    <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>
                      👥
                    </div>
                    No employees found
                  </td>
                </tr>
              ) : (
                balances.map((emp) => (
                  <tr
                    key={emp.employee_id}
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
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #4A6CF7, #3451d1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                          }}
                        >
                          👤
                        </div>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
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

                    {/* Annual */}
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
                            fontSize: "0.82rem",
                            fontWeight: "700",
                          }}
                        >
                          {emp.annual_leave} days
                        </span>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: "#e8f5e9",
                            borderRadius: "10px",
                            height: "5px",
                            minWidth: "50px",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#4CAF50",
                              borderRadius: "10px",
                              height: "5px",
                              width: `${Math.min((emp.annual_leave / 10) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Sick */}
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
                            fontSize: "0.82rem",
                            fontWeight: "700",
                          }}
                        >
                          {emp.sick_leave} days
                        </span>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: "#fce4ec",
                            borderRadius: "10px",
                            height: "5px",
                            minWidth: "50px",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#e91e8c",
                              borderRadius: "10px",
                              height: "5px",
                              width: `${Math.min((emp.sick_leave / 10) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Casual */}
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
                            fontSize: "0.82rem",
                            fontWeight: "700",
                          }}
                        >
                          {emp.casual_leave} days
                        </span>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: "#e3f2fd",
                            borderRadius: "10px",
                            height: "5px",
                            minWidth: "50px",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#2196F3",
                              borderRadius: "10px",
                              height: "5px",
                              width: `${Math.min((emp.casual_leave / 10) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleEditOpen(emp)}
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1565c0",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "700",
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
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "700",
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
