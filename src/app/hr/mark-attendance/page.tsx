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
};

type AttendanceMap = {
  [employeeId: string]: "present" | "absent";
};

export default function MarkAttendance() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [existingRecords, setExistingRecords] = useState<string[]>([]);
  const [activePage] = useState("mark-attendance");
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
        .eq("role", "employee");
      setEmployees(emps || []);
    };
    fetchData();
  }, []);

  const handleEdit = async () => {
    if (!selectedDate) {
      setError("Please select a date first");
      return;
    }
    setError("");
    setSuccess("");

    const { data: existing } = await supabase
      .from("attendance")
      .select("employee_id, status")
      .eq("date", selectedDate);

    const map: AttendanceMap = {};
    const existingIds: string[] = [];

    if (existing && existing.length > 0) {
      existing.forEach(
        (rec: { employee_id: string; status: "present" | "absent" }) => {
          map[rec.employee_id] = rec.status;
          existingIds.push(rec.employee_id);
        },
      );
    }

    setAttendanceMap(map);
    setExistingRecords(existingIds);
    setIsEditing(true);
  };

  const handleMark = (employeeId: string, status: "present" | "absent") => {
    setAttendanceMap((prev) => ({ ...prev, [employeeId]: status }));
  };

  const handleSave = async () => {
    if (employees.some((emp) => !attendanceMap[emp.id])) {
      setError("Please mark attendance for all employees");
      return;
    }
    setSaving(true);
    setError("");

    for (const emp of employees) {
      const status = attendanceMap[emp.id];
      const alreadyExists = existingRecords.includes(emp.id);

      if (alreadyExists) {
        await supabase
          .from("attendance")
          .update({ status, marked_by: profile?.id })
          .eq("employee_id", emp.id)
          .eq("date", selectedDate);
      } else {
        await supabase
          .from("attendance")
          .insert({
            employee_id: emp.id,
            date: selectedDate,
            status,
            marked_by: profile?.id,
          });
      }
    }

    setSaving(false);
    setSuccess("Attendance saved successfully!");
    setIsEditing(false);
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
            Mark Attendance 📅
          </h2>
          <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
            Select a date and mark attendance for all employees
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
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

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "16px",
              marginBottom: "28px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "#333",
                }}
              >
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setIsEditing(false);
                  setSuccess("");
                  setError("");
                  setAttendanceMap({});
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  outline: "none",
                  color: "#333",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            <button
              onClick={handleEdit}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg, #4A6CF7, #3451d1)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.95rem",
                boxShadow: "0 4px 12px rgba(74,108,247,0.3)",
              }}
            >
              Edit Attendance
            </button>
          </div>

          {isEditing && (
            <>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "24px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8f9ff" }}>
                    {["Employee", "Email", "Mark Attendance"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "12px",
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
                        colSpan={3}
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
                        <td
                          style={{
                            padding: "14px 12px",
                            fontWeight: "600",
                            fontSize: "0.9rem",
                          }}
                        >
                          {emp.full_name}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            color: "#666",
                            fontSize: "0.85rem",
                          }}
                        >
                          {emp.email}
                        </td>
                        <td style={{ padding: "14px 12px" }}>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button
                              onClick={() => handleMark(emp.id, "present")}
                              style={{
                                padding: "8px 20px",
                                borderRadius: "8px",
                                border: "2px solid #4CAF50",
                                cursor: "pointer",
                                backgroundColor:
                                  attendanceMap[emp.id] === "present"
                                    ? "#4CAF50"
                                    : "#fff",
                                color:
                                  attendanceMap[emp.id] === "present"
                                    ? "white"
                                    : "#4CAF50",
                                fontWeight: "700",
                                fontSize: "0.85rem",
                                transition: "all 0.2s",
                              }}
                            >
                              ✓ Present
                            </button>
                            <button
                              onClick={() => handleMark(emp.id, "absent")}
                              style={{
                                padding: "8px 20px",
                                borderRadius: "8px",
                                border: "2px solid #f44336",
                                cursor: "pointer",
                                backgroundColor:
                                  attendanceMap[emp.id] === "absent"
                                    ? "#f44336"
                                    : "#fff",
                                color:
                                  attendanceMap[emp.id] === "absent"
                                    ? "white"
                                    : "#f44336",
                                fontWeight: "700",
                                fontSize: "0.85rem",
                                transition: "all 0.2s",
                              }}
                            >
                              ✗ Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "12px 32px",
                    background: saving
                      ? "#a0aec0"
                      : "linear-gradient(135deg, #4A6CF7, #3451d1)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "0.95rem",
                    boxShadow: saving
                      ? "none"
                      : "0 4px 12px rgba(74,108,247,0.3)",
                  }}
                >
                  {saving ? "Saving..." : "💾 Save Attendance"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
