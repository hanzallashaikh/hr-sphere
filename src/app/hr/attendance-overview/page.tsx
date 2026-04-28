"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [activePage] = useState("attendance-overview");
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

  const getStatus = (employeeId: string, date: string) => {
    const record = attendanceData.find(
      (r) => r.employee_id === employeeId && r.date === date,
    );
    return record?.status || null;
  };

  const getPresentCount = (employeeId: string) =>
    attendanceData.filter(
      (r) => r.employee_id === employeeId && r.status === "present",
    ).length;

  const getAbsentCount = (employeeId: string) =>
    attendanceData.filter(
      (r) => r.employee_id === employeeId && r.status === "absent",
    ).length;

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("landscape");
    const monthName = format(currentMonth, "MMMM yyyy");
    doc.setFontSize(18);
    doc.setTextColor(74, 108, 247);
    doc.text("HR Sphere — Monthly Attendance Report", 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Month: ${monthName}`, 14, 28);
    doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy")}`, 14, 36);
    doc.text(`Total Employees: ${employees.length}`, 14, 44);
    const totalPresent = attendanceData.filter(
      (r) => r.status === "present",
    ).length;
    const totalAbsent = attendanceData.filter(
      (r) => r.status === "absent",
    ).length;
    doc.text(`Total Present Records: ${totalPresent}`, 100, 36);
    doc.text(`Total Absent Records: ${totalAbsent}`, 100, 44);
    const tableHead = [
      [
        "Employee",
        "Email",
        ...daysInMonth.map((d) => format(d, "d")),
        "P",
        "A",
      ],
    ];
    const tableBody = employees.map((emp) => {
      const dayStatuses = daysInMonth.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const status = getStatus(emp.id, dateStr);
        if (status === "present") return "P";
        if (status === "absent") return "A";
        return "-";
      });
      return [
        emp.full_name,
        emp.email,
        ...dayStatuses,
        String(getPresentCount(emp.id)),
        String(getAbsentCount(emp.id)),
      ];
    });
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 52,
      styles: { fontSize: 7, cellPadding: 2, halign: "center" },
      headStyles: {
        fillColor: [74, 108, 247],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7,
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 30 },
        1: { halign: "left", cellWidth: 35 },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const val = data.cell.raw;
          if (val === "P") {
            data.cell.styles.textColor = [46, 125, 50];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "A") {
            data.cell.styles.textColor = [198, 40, 40];
            data.cell.styles.fontStyle = "bold";
          }
        }
        const lastTwoCol = data.column.index >= data.table.columns.length - 2;
        if (lastTwoCol && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          if (data.column.index === data.table.columns.length - 2)
            data.cell.styles.textColor = [46, 125, 50];
          else data.cell.styles.textColor = [198, 40, 40];
        }
      },
      foot: [
        [
          {
            content: `Report generated by HR Sphere — ${monthName}`,
            colSpan: daysInMonth.length + 4,
            styles: {
              halign: "center",
              fontSize: 7,
              textColor: [150, 150, 150],
            },
          },
        ],
      ],
      footStyles: { fillColor: [245, 246, 250] },
    });
    doc.save(`Attendance_Report_${monthName.replace(" ", "_")}.pdf`);
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
            Attendance Overview 📋
          </h2>
          <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
            Monthly attendance records for all employees
          </p>
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
          {[
            {
              label: "Total Employees",
              value: employees.length,
              gradient: "linear-gradient(135deg, #4A6CF7, #3451d1)",
              icon: "👥",
              shadow: "rgba(74,108,247,0.3)",
            },
            {
              label: "Total Present Records",
              value: attendanceData.filter((r) => r.status === "present")
                .length,
              gradient: "linear-gradient(135deg, #4CAF50, #2e7d32)",
              icon: "✅",
              shadow: "rgba(76,175,80,0.3)",
            },
            {
              label: "Total Absent Records",
              value: attendanceData.filter((r) => r.status === "absent").length,
              gradient: "linear-gradient(135deg, #f44336, #c62828)",
              icon: "❌",
              shadow: "rgba(244,67,54,0.3)",
            },
            {
              label: "Days in Month",
              value: daysInMonth.length,
              gradient: "linear-gradient(135deg, #FF9800, #e65100)",
              icon: "📅",
              shadow: "rgba(255,152,0,0.3)",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: card.gradient,
                color: "white",
                padding: "20px 24px",
                borderRadius: "14px",
                flex: 1,
                boxShadow: `0 6px 20px ${card.shadow}`,
              }}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: "8px" }}>
                {card.icon}
              </div>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontSize: "2rem",
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

        {/* Table Card */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            padding: "24px",
            overflowX: "auto",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          {/* Navigation Header */}
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
                borderRadius: "10px",
                padding: "9px 18px",
                cursor: "pointer",
                color: "#4A6CF7",
                fontWeight: "700",
                fontSize: "0.9rem",
              }}
            >
              ← Prev
            </button>

            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                color: "#1a1a2e",
                fontWeight: "700",
              }}
            >
              {format(currentMonth, "MMMM yyyy")}
            </h3>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={handleExportPDF}
                style={{
                  background: "linear-gradient(135deg, #4A6CF7, #3451d1)",
                  color: "white",
                  border: "none",
                  padding: "9px 20px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                  boxShadow: "0 4px 12px rgba(74,108,247,0.3)",
                }}
              >
                📥 Export PDF
              </button>
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
                  borderRadius: "10px",
                  padding: "9px 18px",
                  cursor: "pointer",
                  color: "#4A6CF7",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          {employees.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#aaa" }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>👥</div>
              <p style={{ margin: 0 }}>No employees found</p>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "800px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8f9ff" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      color: "#555",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      borderBottom: "2px solid #eee",
                      minWidth: "140px",
                      position: "sticky",
                      left: 0,
                      backgroundColor: "#f8f9ff",
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
                        fontSize: "0.72rem",
                        textAlign: "center",
                        minWidth: "34px",
                        borderBottom: "2px solid #eee",
                        fontWeight: "600",
                      }}
                    >
                      <div>{format(day, "d")}</div>
                      <div style={{ color: "#aaa", fontSize: "0.62rem" }}>
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
                      borderBottom: "2px solid #eee",
                      fontWeight: "700",
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
                      borderBottom: "2px solid #eee",
                      fontWeight: "700",
                    }}
                  >
                    A
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
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
                        padding: "10px 12px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
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
                          style={{ padding: "5px 3px", textAlign: "center" }}
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
                                fontSize: "0.68rem",
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
                                fontSize: "0.68rem",
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
                                fontSize: "0.68rem",
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
                        fontWeight: "700",
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
                        fontWeight: "700",
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
              paddingTop: "16px",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            {[
              { color: "#4CAF50", label: "P = Present" },
              { color: "#f44336", label: "A = Absent" },
              { color: "#f0f0f0", label: "- = Not Marked" },
            ].map((item) => (
              <div
                key={item.label}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    backgroundColor: item.color,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "#555",
                    fontWeight: "500",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
