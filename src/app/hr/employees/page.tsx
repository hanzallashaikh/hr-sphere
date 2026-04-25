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

type Employee = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

type LeaveBalance = {
  annual_leave: number;
  sick_leave: number;
  casual_leave: number;
};

export default function EmployeesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [balances, setBalances] = useState<{ [key: string]: LeaveBalance }>({});

  // Edit state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        .select("*")
        .eq("role", "employee")
        .order("created_at", { ascending: false });

      setEmployees(emps || []);

      if (emps && emps.length > 0) {
        const { data: bals } = await supabase
          .from("leave_balances")
          .select("*")
          .in(
            "employee_id",
            emps.map((e: { id: string }) => e.id),
          );

        const balMap: { [key: string]: LeaveBalance } = {};
        bals?.forEach(
          (b: {
            employee_id: string;
            annual_leave: number;
            sick_leave: number;
            casual_leave: number;
          }) => {
            balMap[b.employee_id] = {
              annual_leave: b.annual_leave,
              sick_leave: b.sick_leave,
              casual_leave: b.casual_leave,
            };
          },
        );
        setBalances(balMap);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchEmployees = async () => {
    const { data: emps } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "employee")
      .order("created_at", { ascending: false });

    setEmployees(emps || []);

    if (emps && emps.length > 0) {
      const { data: bals } = await supabase
        .from("leave_balances")
        .select("*")
        .in(
          "employee_id",
          emps.map((e) => e.id),
        );

      const balMap: { [key: string]: LeaveBalance } = {};
      bals?.forEach(
        (b: {
          employee_id: string;
          annual_leave: number;
          sick_leave: number;
          casual_leave: number;
        }) => {
          balMap[b.employee_id] = {
            annual_leave: b.annual_leave,
            sick_leave: b.sick_leave,
            casual_leave: b.casual_leave,
          };
        },
      );
      setBalances(balMap);
    }
  };

  const handleAddEmployee = async () => {
    setError("");
    setSuccess("");

    if (!fullName || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
        options: { data: { full_name: fullName } },
      },
    );

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (!signUpData.user) {
      setError("Failed to create user. Please try again.");
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: signUpData.user.id,
      full_name: fullName,
      email: email,
      role: "employee",
    });

    if (profileError) {
      setError("Failed to create profile: " + profileError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(`Employee ${fullName} added successfully!`);
    setFullName("");
    setEmail("");
    setPassword("");
    setShowForm(false);
    setSubmitting(false);

    await fetchEmployees();
  };

  const handleDelete = async (employeeId: string, employeeName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employeeName}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(employeeId);

    // Delete from profiles table
    // (cascade will handle leave_balances, leave_requests, attendance, notifications)
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", employeeId);

    if (deleteError) {
      alert("Failed to delete employee: " + deleteError.message);
      setDeletingId(null);
      return;
    }

    // Remove from local state immediately
    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    setBalances((prev) => {
      const updated = { ...prev };
      delete updated[employeeId];
      return updated;
    });

    setSuccess(`Employee ${employeeName} deleted successfully.`);
    setDeletingId(null);
  };

  const handleEditOpen = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.full_name);
    setEditEmail(emp.email);
    setEditPassword("");
    setEditError("");
  };

  const handleEditClose = () => {
    setEditingEmployee(null);
    setEditName("");
    setEditEmail("");
    setEditPassword("");
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editName || !editEmail) {
      setEditError("Name and email are required");
      return;
    }

    setEditSubmitting(true);
    setEditError("");

    // Update profile in profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: editName,
        email: editEmail,
      })
      .eq("id", editingEmployee?.id);

    if (profileError) {
      setEditError("Failed to update profile: " + profileError.message);
      setEditSubmitting(false);
      return;
    }

    // Update local state
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === editingEmployee?.id
          ? { ...e, full_name: editName, email: editEmail }
          : e,
      ),
    );

    setSuccess(`Employee ${editName} updated successfully!`);
    setEditSubmitting(false);
    handleEditClose();
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
            backgroundColor: "rgba(255,255,255,0.2)",
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#fff",
            padding: "16px 24px",
            borderRadius: "10px",
            marginBottom: "24px",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 4px" }}>Employees</h2>
            <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
              {employees.length} employee{employees.length !== 1 ? "s" : ""}{" "}
              enrolled
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setSuccess("");
            }}
            style={{
              backgroundColor: "#4A6CF7",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem",
            }}
          >
            {showForm ? "Cancel" : "+ Add Employee"}
          </button>
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

        {/* Add Employee Form */}
        {showForm && (
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "10px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
              Add New Employee
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
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                    fontSize: "0.9rem",
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                    fontSize: "0.9rem",
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                    fontSize: "0.9rem",
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Set a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={handleAddEmployee}
                disabled={submitting}
                style={{
                  backgroundColor: "#4A6CF7",
                  color: "white",
                  border: "none",
                  padding: "10px 28px",
                  borderRadius: "8px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Adding..." : "Add Employee"}
              </button>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {editingEmployee && (
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
                width: "500px",
                maxWidth: "90vw",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
                Edit Employee
              </h3>

              {editError && (
                <div
                  style={{
                    backgroundColor: "#ffebee",
                    color: "#c62828",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  {editError}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "0.9rem",
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
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

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "0.9rem",
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
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

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "0.9rem",
                    }}
                  >
                    New Password
                    <span
                      style={{
                        color: "#aaa",
                        fontSize: "0.8rem",
                        marginLeft: "6px",
                      }}
                    >
                      (leave blank to keep current)
                    </span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
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
                  onClick={handleEditSave}
                  disabled={editSubmitting}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#4A6CF7",
                    color: "white",
                    cursor: editSubmitting ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    fontSize: "0.95rem",
                    opacity: editSubmitting ? 0.7 : 1,
                  }}
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employees Table */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            padding: "24px",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "16px" }}>All Employees</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                {[
                  "Name",
                  "Email",
                  "Annual Leave",
                  "Sick Leave",
                  "Casual Leave",
                  "Joined",
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
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#aaa",
                    }}
                  >
                    No employees found. Add your first employee above.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid #eee" }}>
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
                            fontSize: "1rem",
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
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          backgroundColor: "#e8f5e9",
                          color: "#2e7d32",
                          padding: "4px 10px",
                          borderRadius: "10px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                        }}
                      >
                        {balances[emp.id]?.annual_leave ?? 0} days
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          backgroundColor: "#fce4ec",
                          color: "#c62828",
                          padding: "4px 10px",
                          borderRadius: "10px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                        }}
                      >
                        {balances[emp.id]?.sick_leave ?? 0} days
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          backgroundColor: "#e3f2fd",
                          color: "#1565c0",
                          padding: "4px 10px",
                          borderRadius: "10px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                        }}
                      >
                        {balances[emp.id]?.casual_leave ?? 0} days
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.85rem",
                        color: "#888",
                      }}
                    >
                      {new Date(emp.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
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
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.full_name)}
                          disabled={deletingId === emp.id}
                          style={{
                            backgroundColor: "#ffebee",
                            color: "#c62828",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor:
                              deletingId === emp.id ? "not-allowed" : "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            opacity: deletingId === emp.id ? 0.6 : 1,
                          }}
                        >
                          {deletingId === emp.id ? "Deleting..." : "🗑️ Delete"}
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
