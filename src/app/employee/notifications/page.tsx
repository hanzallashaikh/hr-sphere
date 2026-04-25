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

    // Realtime subscription
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
          onClick={() => router.push("/employee/dashboard")}
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
          onClick={() => router.push("/employee/apply-leave")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          📝 Apply Leave
        </div>

        <div
          onClick={() => router.push("/employee/attendance")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
          }}
        >
          📅 Check Attendance
        </div>

        <div
          onClick={() => router.push("/employee/notifications")}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "6px",
            backgroundColor: "rgba(255,255,255,0.2)",
          }}
        >
          🔔 Notifications
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: "8px",
                backgroundColor: "#f44336",
                color: "white",
                borderRadius: "50%",
                padding: "2px 7px",
                fontSize: "0.7rem",
                fontWeight: "bold",
              }}
            >
              {unreadCount}
            </span>
          )}
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
            <h2 style={{ margin: "0 0 4px" }}>Notifications</h2>
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
                border: "1px solid #4A6CF7",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.85rem",
              }}
            >
              Mark All Read
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

        {/* Notifications List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredNotifications.length === 0 ? (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "10px",
                padding: "40px",
                textAlign: "center",
                color: "#aaa",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🔔</div>
              <p style={{ margin: 0, fontSize: "1rem" }}>
                No notifications found
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  borderLeft: `4px solid ${
                    notif.type === "approved"
                      ? "#4CAF50"
                      : notif.type === "rejected"
                        ? "#f44336"
                        : "#4A6CF7"
                  }`,
                  opacity: notif.is_read ? 0.7 : 1,
                }}
              >
                {/* Icon */}
                <div style={{ fontSize: "1.8rem", marginTop: "2px" }}>
                  {notif.type === "approved" ? "✅" : "❌"}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontSize: "0.95rem",
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
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#aaa" }}>
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
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                        }}
                      >
                        New
                      </span>
                    )}
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "10px",
                        fontSize: "0.75rem",
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

                {/* Actions */}
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
                        padding: "6px 12px",
                        borderRadius: "6px",
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
                      padding: "6px 12px",
                      borderRadius: "6px",
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
    </div>
  );
}
