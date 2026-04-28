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

type Notification = {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function EmployeeNotifications() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "unread" | "approved" | "rejected"
  >("all");
  const [activePage] = useState("notifications");
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

      if (prof?.role === "hr") {
        router.push("/hr/dashboard");
        return;
      }
      setProfile(prof);

      const { data: notifs } = await supabase
        .from("employee_notifications")
        .select("*")
        .eq("employee_id", authData.user.id)
        .order("created_at", { ascending: false });

      setNotifications(notifs || []);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("notifications_page")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "employee_notifications",
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    await supabase
      .from("employee_notifications")
      .update({ is_read: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await supabase
      .from("employee_notifications")
      .update({ is_read: true })
      .eq("employee_id", profile?.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDelete = async (id: string) => {
    await supabase.from("employee_notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.is_read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navItems = [
    { label: "📊 Dashboard", href: "/employee/dashboard", key: "dashboard" },
    {
      label: "📝 Apply Leave",
      href: "/employee/apply-leave",
      key: "apply-leave",
    },
    {
      label: "📅 Check Attendance",
      href: "/employee/attendance",
      key: "attendance",
    },
    {
      label: "🔔 Notifications",
      href: "/employee/notifications",
      key: "notifications",
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
          padding: "0",
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
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (activePage !== item.key) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "rgba(255,255,255,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (activePage !== item.key) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "transparent";
                }
              }}
            >
              <span>{item.label}</span>
              {item.key === "notifications" && unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#f44336",
                    color: "white",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    fontSize: "0.7rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  {unreadCount}
                </span>
              )}
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "rgba(244,67,54,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "rgba(244,67,54,0.15)";
            }}
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
              Notifications 🔔
            </h2>
            <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                backgroundColor: "#f0f4ff",
                color: "#4A6CF7",
                border: "1.5px solid #c7d7ff",
                padding: "9px 18px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.85rem",
              }}
            >
              ✓ Mark All Read
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          {(["all", "unread", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 20px",
                borderRadius: "20px",
                border: "1.5px solid #4A6CF7",
                cursor: "pointer",
                background:
                  filter === f
                    ? "linear-gradient(135deg, #4A6CF7, #3451d1)"
                    : "#fff",
                color: filter === f ? "white" : "#4A6CF7",
                fontWeight: "600",
                fontSize: "0.85rem",
                textTransform: "capitalize",
                boxShadow:
                  filter === f ? "0 4px 12px rgba(74,108,247,0.3)" : "none",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredNotifications.length === 0 ? (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                padding: "50px",
                textAlign: "center",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🔔</div>
              <p style={{ margin: 0, fontSize: "1rem", color: "#aaa" }}>
                No notifications found
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "14px",
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  borderLeft: `4px solid ${notif.type === "approved" ? "#4CAF50" : "#f44336"}`,
                  opacity: notif.is_read ? 0.75 : 1,
                  boxShadow: notif.is_read
                    ? "0 1px 6px rgba(0,0,0,0.04)"
                    : "0 4px 16px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    backgroundColor:
                      notif.type === "approved" ? "#e8f5e9" : "#ffebee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                    flexShrink: 0,
                  }}
                >
                  {notif.type === "approved" ? "✅" : "❌"}
                </div>

                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontSize: "0.9rem",
                      fontWeight: notif.is_read ? "normal" : "600",
                      color: "#333",
                    }}
                  >
                    {notif.message}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "0.78rem", color: "#aaa" }}>
                      {new Date(notif.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!notif.is_read && (
                      <span
                        style={{
                          backgroundColor: "#4A6CF7",
                          color: "white",
                          borderRadius: "10px",
                          padding: "2px 8px",
                          fontSize: "0.68rem",
                          fontWeight: "bold",
                        }}
                      >
                        NEW
                      </span>
                    )}
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "10px",
                        fontSize: "0.72rem",
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        backgroundColor:
                          notif.type === "approved" ? "#e8f5e9" : "#ffebee",
                        color:
                          notif.type === "approved" ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {notif.type}
                    </span>
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      style={{
                        backgroundColor: "#f0f4ff",
                        color: "#4A6CF7",
                        border: "none",
                        padding: "7px 14px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                      }}
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    style={{
                      backgroundColor: "#ffebee",
                      color: "#f44336",
                      border: "none",
                      padding: "7px 14px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
