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
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activePage] = useState("employees");
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
      setError("Failed to create user.");
      setSubmitting(false);
      return;
    }
    const { error: profileError } = await supabase.from("profiles").insert({
      id: signUpData.user.id,
      full_name: fullName,
      email,
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
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", employeeId);
    if (deleteError) {
      alert("Failed to delete employee: " + deleteError.message);
      setDeletingId(null);
      return;
    }
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
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: editName, email: editEmail })
      .eq("id", editingEmployee?.id);
    if (profileError) {
      setEditError("Failed to update: " + profileError.message);
      setEditSubmitting(false);
      return;
    }
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#fff",
            padding: "18px 28px",
            borderRadius: "14px",
            marginBottom: "24px",
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
              Employees 👥
            </h2>
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
              background: "linear-gradient(135deg, #4A6CF7, #3451d1)",
              color: "white",
              border: "none",
              padding: "10px 22px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.9rem",
              boxShadow: "0 4px 12px rgba(74,108,247,0.3)",
            }}
          >
            {showForm ? "✕ Cancel" : "+ Add Employee"}
          </button>
        </div>

        {/* Success Message */}
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

        {/* Add Employee Form */}
        {showForm && (
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "28px",
              marginBottom: "24px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              style={{ marginTop: 0, marginBottom: "20px", color: "#1a1a2e" }}
            >
              Add New Employee
            </h3>

            {error && (
              <div
                style={{
                  backgroundColor: "#ffebee",
                  border: "1px solid #ffcdd2",
                  color: "#c62828",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {[
                {
                  label: "Full Name",
                  value: fullName,
                  onChange: setFullName,
                  type: "text",
                  placeholder: "Enter full name",
                },
                {
                  label: "Email Address",
                  value: email,
                  onChange: setEmail,
                  type: "email",
                  placeholder: "Enter email address",
                },
                {
                  label: "Password",
                  value: password,
                  onChange: setPassword,
                  type: "password",
                  placeholder: "Set a password",
                },
              ].map((field) => (
                <div key={field.label}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      color: "#333",
                    }}
                  >
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: "1.5px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                    onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
                  />
                </div>
              ))}
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
                  background: submitting
                    ? "#a0aec0"
                    : "linear-gradient(135deg, #4A6CF7, #3451d1)",
                  color: "white",
                  border: "none",
                  padding: "11px 28px",
                  borderRadius: "10px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                  boxShadow: submitting
                    ? "none"
                    : "0 4px 12px rgba(74,108,247,0.3)",
                }}
              >
                {submitting ? "Adding..." : "Add Employee"}
              </button>
            </div>
          </div>
        )}

        {/* Edit Modal */}
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
                borderRadius: "16px",
                padding: "32px",
                width: "500px",
                maxWidth: "90vw",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              }}
            >
              <h3
                style={{ marginTop: 0, marginBottom: "20px", color: "#1a1a2e" }}
              >
                Edit Employee ✏️
              </h3>

              {editError && (
                <div
                  style={{
                    backgroundColor: "#ffebee",
                    border: "1px solid #ffcdd2",
                    color: "#c62828",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    marginBottom: "16px",
                    fontSize: "0.875rem",
                  }}
                >
                  ⚠️ {editError}
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
                    label: "Full Name",
                    value: editName,
                    onChange: setEditName,
                    type: "text",
                  },
                  {
                    label: "Email Address",
                    value: editEmail,
                    onChange: setEditEmail,
                    type: "email",
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        fontSize: "0.875rem",
                        color: "#333",
                      }}
                    >
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "1.5px solid #e0e0e0",
                        borderRadius: "10px",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                      onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
                    />
                  </div>
                ))}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      color: "#333",
                    }}
                  >
                    New Password{" "}
                    <span style={{ color: "#aaa", fontSize: "0.8rem" }}>
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
                      padding: "11px 14px",
                      border: "1.5px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                    onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
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
                  onClick={handleEditSave}
                  disabled={editSubmitting}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "10px",
                    border: "none",
                    background: editSubmitting
                      ? "#a0aec0"
                      : "linear-gradient(135deg, #4A6CF7, #3451d1)",
                    color: "white",
                    cursor: editSubmitting ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "0.9rem",
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
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#1a1a2e" }}>
            All Employees
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9ff" }}>
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
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#aaa",
                    }}
                  >
                    <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>
                      👥
                    </div>
                    No employees found. Add your first employee above.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
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
                            fontSize: "1rem",
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
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          backgroundColor: "#e8f5e9",
                          color: "#2e7d32",
                          padding: "4px 10px",
                          borderRadius: "10px",
                          fontSize: "0.8rem",
                          fontWeight: "700",
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
                          fontWeight: "700",
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
                          fontWeight: "700",
                        }}
                      >
                        {balances[emp.id]?.casual_leave ?? 0} days
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "0.82rem",
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
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "700",
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
                            borderRadius: "8px",
                            cursor:
                              deletingId === emp.id ? "not-allowed" : "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "700",
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
