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

    // Check existing attendance for this date
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
        // Update existing record
        await supabase
          .from("attendance")
          .update({ status, marked_by: profile?.id })
          .eq("employee_id", emp.id)
          .eq("date", selectedDate);
      } else {
        // Insert new record
        await supabase.from("attendance").insert({
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
            backgroundColor: "rgba(255,255,255,0.2)",
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
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            padding: "30px",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "24px" }}>
            Mark Attendance
          </h2>

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

          {success && (
            <div
              style={{
                backgroundColor: "#e8f5e9",
                color: "#2e7d32",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              {success}
            </div>
          )}

          {/* Date Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "16px",
              marginBottom: "30px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
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
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleEdit}
              style={{
                padding: "10px 28px",
                backgroundColor: "#4A6CF7",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.95rem",
              }}
            >
              Edit
            </button>
          </div>

          {/* Employee Attendance List */}
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
                  <tr style={{ borderBottom: "2px solid #eee" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        color: "#555",
                      }}
                    >
                      Employee Name
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        color: "#555",
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        color: "#555",
                      }}
                    >
                      Attendance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: "20px",
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
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "12px", fontWeight: "500" }}>
                          {emp.full_name}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "#666",
                            fontSize: "0.9rem",
                          }}
                        >
                          {emp.email}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button
                              onClick={() => handleMark(emp.id, "present")}
                              style={{
                                padding: "8px 18px",
                                borderRadius: "6px",
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
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                              }}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMark(emp.id, "absent")}
                              style={{
                                padding: "8px 18px",
                                borderRadius: "6px",
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
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                              }}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Save Button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "12px 32px",
                    backgroundColor: "#4A6CF7",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    fontSize: "0.95rem",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
