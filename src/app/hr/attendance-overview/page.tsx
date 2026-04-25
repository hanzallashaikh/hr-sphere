"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

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

type AttendanceRecord = {
  employee_id: string;
  date: string;
  status: "present" | "absent";
};

export default function AttendanceOverview() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

      const { data: emps } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "employee")
        .order("full_name", { ascending: true });

      setEmployees(emps || []);
      setLoading(false);
    };
    fetchData();
  }, []);
  useEffect(() => {
    if (employees.length === 0) return;

    const fetchAttendance = async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data } = await supabase
        .from("attendance")
        .select("employee_id, date, status")
        .gte("date", start)
        .lte("date", end);

      setAttendanceData(data || []);
    };

    fetchAttendance();
  }, [currentMonth, employees]);

  const fetchAttendance = async () => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data } = await supabase
      .from("attendance")
      .select("employee_id, date, status")
      .gte("date", start)
      .lte("date", end);

    setAttendanceData(data || []);
  };

  const getStatus = (employeeId: string, date: string) => {
    const record = attendanceData.find(
      (r) => r.employee_id === employeeId && r.date === date,
    );
    return record?.status || null;
  };

  const getPresentCount = (employeeId: string) => {
    return attendanceData.filter(
      (r) => r.employee_id === employeeId && r.status === "present",
    ).length;
  };

  const getAbsentCount = (employeeId: string) => {
    return attendanceData.filter(
      (r) => r.employee_id === employeeId && r.status === "absent",
    ).length;
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

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
            backgroundColor: "rgba(255,255,255,0.2)",
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
          <h2 style={{ margin: 0 }}>Attendance Overview</h2>
        </div>

        {/* Summary Cards */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              backgroundColor: "#4A6CF7",
              color: "white",
              padding: "20px 28px",
              borderRadius: "12px",
              flex: 1,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
              Total Employees
            </p>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>{employees.length}</h2>
          </div>
          <div
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "20px 28px",
              borderRadius: "12px",
              flex: 1,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
              Total Present Records
            </p>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>
              {attendanceData.filter((r) => r.status === "present").length}
            </h2>
          </div>
          <div
            style={{
              backgroundColor: "#f44336",
              color: "white",
              padding: "20px 28px",
              borderRadius: "12px",
              flex: 1,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
              Total Absent Records
            </p>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>
              {attendanceData.filter((r) => r.status === "absent").length}
            </h2>
          </div>
          <div
            style={{
              backgroundColor: "#FF9800",
              color: "white",
              padding: "20px 28px",
              borderRadius: "12px",
              flex: 1,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
              Days in Month
            </p>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>
              {daysInMonth.length}
            </h2>
          </div>
        </div>

        {/* Month Navigation */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            padding: "24px",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                  ),
                )
              }
              style={{
                backgroundColor: "#f0f4ff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                color: "#4A6CF7",
                fontWeight: "bold",
              }}
            >
              ← Prev
            </button>

            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
              {format(currentMonth, "MMMM yyyy")}
            </h3>

            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                  ),
                )
              }
              style={{
                backgroundColor: "#f0f4ff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                color: "#4A6CF7",
                fontWeight: "bold",
              }}
            >
              Next →
            </button>
          </div>

          {/* Attendance Table */}
          {employees.length === 0 ? (
            <p style={{ textAlign: "center", color: "#aaa" }}>
              No employees found
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "800px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #eee" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      color: "#555",
                      fontSize: "0.85rem",
                      minWidth: "140px",
                      position: "sticky",
                      left: 0,
                      backgroundColor: "#fff",
                    }}
                  >
                    Employee
                  </th>
                  {daysInMonth.map((day) => (
                    <th
                      key={day.toISOString()}
                      style={{
                        padding: "8px 4px",
                        color: "#555",
                        fontSize: "0.75rem",
                        textAlign: "center",
                        minWidth: "36px",
                      }}
                    >
                      <div>{format(day, "d")}</div>
                      <div style={{ color: "#aaa", fontSize: "0.65rem" }}>
                        {format(day, "EEE")}
                      </div>
                    </th>
                  ))}
                  <th
                    style={{
                      padding: "10px 12px",
                      color: "#4CAF50",
                      fontSize: "0.8rem",
                      textAlign: "center",
                    }}
                  >
                    P
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      color: "#f44336",
                      fontSize: "0.8rem",
                      textAlign: "center",
                    }}
                  >
                    A
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#fff",
                      }}
                    >
                      {emp.full_name}
                    </td>
                    {daysInMonth.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const status = getStatus(emp.id, dateStr);
                      return (
                        <td
                          key={dateStr}
                          style={{
                            padding: "6px 4px",
                            textAlign: "center",
                          }}
                        >
                          {status === "present" ? (
                            <span
                              style={{
                                display: "inline-block",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: "#4CAF50",
                                color: "white",
                                fontSize: "0.7rem",
                                lineHeight: "24px",
                                textAlign: "center",
                              }}
                            >
                              P
                            </span>
                          ) : status === "absent" ? (
                            <span
                              style={{
                                display: "inline-block",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: "#f44336",
                                color: "white",
                                fontSize: "0.7rem",
                                lineHeight: "24px",
                                textAlign: "center",
                              }}
                            >
                              A
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: "#f0f0f0",
                                fontSize: "0.7rem",
                                lineHeight: "24px",
                                textAlign: "center",
                                color: "#ccc",
                              }}
                            >
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: "#2e7d32",
                        fontSize: "0.9rem",
                      }}
                    >
                      {getPresentCount(emp.id)}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: "#c62828",
                        fontSize: "0.9rem",
                      }}
                    >
                      {getAbsentCount(emp.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "20px",
              flexWrap: "wrap",
            }}
          >
            {[
              { color: "#4CAF50", label: "P = Present" },
              { color: "#f44336", label: "A = Absent" },
              { color: "#f0f0f0", label: "- = Not Marked" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: item.color,
                  }}
                />
                <span style={{ fontSize: "0.85rem", color: "#555" }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
