"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type TabKey =
  | "dashboard"
  | "exams"
  | "corrections"
  | "submissions"
  | "students"
  | "reports"
  | "settings";

type Submission = {
  id: string;
  student_name?: string | null;
  student_email?: string | null;
  protocol?: string | null;
  exam_name?: string | null;
  book_name?: string | null;
  final_score?: number | null;
  correction_completed?: boolean | null;
  created_at?: string | null;
};

export default function TeacherDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);

    const { data, error } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    setLoading(false);

    if (error) {
      console.warn(error.message);
      return;
    }

    setSubmissions((data || []) as Submission[]);
  }

  function goTo(path: string) {
    window.location.href = path;
  }

  const stats = useMemo(() => {
    const totalSubmissions = submissions.length;

    const uniqueStudents = new Set(
      submissions
        .map((item) => item.student_email || item.student_name)
        .filter(Boolean)
    ).size;

    const completed = submissions.filter((item) => item.correction_completed).length;

    const scores = submissions
      .map((item) => item.final_score)
      .filter((score) => typeof score === "number") as number[];

    const averageScore =
      scores.length > 0
        ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
        : 0;

    return {
      totalSubmissions,
      uniqueStudents,
      completed,
      averageScore,
    };
  }, [submissions]);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brandBox}>
          <img src="/logo.jpg" alt="Marcos Private English Lessons" style={styles.logo} />
          <div>
            <h1 style={styles.title}>Teacher Dashboard</h1>
            <p style={styles.subtitle}>
              Marcos Private English Lessons · Learn English Since 2011
            </p>
          </div>
        </div>

        <button onClick={loadDashboardData} style={styles.refreshButton}>
          Refresh
        </button>
      </header>

      <nav style={styles.tabs}>
        <TabButton label="Dashboard" tab="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Exams" tab="exams" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Corrections" tab="corrections" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Submissions" tab="submissions" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Students" tab="students" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Reports" tab="reports" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Settings" tab="settings" activeTab={activeTab} setActiveTab={setActiveTab} />
      </nav>

      {activeTab === "dashboard" && (
        <section>
          <div style={styles.statsGrid}>
            <StatCard label="Total Submissions" value={stats.totalSubmissions} />
            <StatCard label="Unique Students" value={stats.uniqueStudents} />
            <StatCard label="Completed Corrections" value={stats.completed} />
            <StatCard label="Average Score" value={`${stats.averageScore}/10`} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.cardTitle}>Recent Activity</h2>
                <p style={styles.muted}>Latest student submissions and corrections.</p>
              </div>

              <button onClick={() => goTo("/admin/corrections")} style={styles.primaryButton}>
                Open Corrections
              </button>
            </div>

            {loading && <p style={styles.muted}>Loading...</p>}
            {!loading && submissions.length === 0 && <p style={styles.muted}>No submissions yet.</p>}

            {submissions.slice(0, 8).map((submission) => (
              <div key={submission.id} style={styles.activityItem}>
                <div>
                  <strong>{submission.student_name || "Unnamed Student"}</strong>
                  <p style={styles.muted}>
                    {submission.exam_name || submission.book_name || "Exam"} ·{" "}
                    {submission.protocol || submission.id}
                  </p>
                </div>

                <div style={styles.activityRight}>
                  {submission.correction_completed ? (
                    <span style={styles.completedBadge}>
                      Score {submission.final_score ?? "-"} / 10
                    </span>
                  ) : (
                    <span style={styles.pendingBadge}>Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "exams" && (
        <SectionCard
          title="Exams"
          description="Create exams, manage collections, books, folders, slots, PDFs, answer keys, and student links."
          actions={[
            {
              label: "Open Exams Manager",
              description: "Collections → Books → Folders → Slots → Exams.",
              onClick: () => goTo("/admin/exams"),
            },
            {
              label: "PDF and Answer Key Importer",
              description: "OCR, paste text, import Student PDF, and import Teacher PDF.",
              onClick: () => goTo("/admin/exams"),
            },
          ]}
        />
      )}

      {activeTab === "corrections" && (
        <SectionCard
          title="Corrections"
          description="Review student answers, add teacher comments, AI feedback, final scores, result links, PDF reports, and WhatsApp sharing."
          actions={[
            {
              label: "Open Intelligent Corrections",
              description: "Correct submissions, finalize scores, generate PDF, and copy result links.",
              onClick: () => goTo("/admin/corrections"),
            },
            {
              label: "View All Submissions",
              description: "Open the submissions list.",
              onClick: () => goTo("/admin/submissions"),
            },
          ]}
        />
      )}

      {activeTab === "submissions" && (
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Submissions</h2>
              <p style={styles.muted}>Recent student submissions.</p>
            </div>

            <button onClick={() => goTo("/admin/submissions")} style={styles.primaryButton}>
              Open Submissions Page
            </button>
          </div>

          {submissions.map((submission) => (
            <div key={submission.id} style={styles.activityItem}>
              <div>
                <strong>{submission.student_name || "Unnamed Student"}</strong>
                <p style={styles.muted}>Email: {submission.student_email || "Not provided"}</p>
                <p style={styles.muted}>Protocol: {submission.protocol || submission.id}</p>
              </div>

              <button onClick={() => goTo("/admin/corrections")} style={styles.secondaryButton}>
                Review
              </button>
            </div>
          ))}
        </section>
      )}

      {activeTab === "students" && (
        <SectionCard
          title="Students"
          description="Student records and history will be centralized here. For now, use submissions and corrections to view student activity."
          actions={[
            {
              label: "Open Corrections",
              description: "View students through submitted exams.",
              onClick: () => goTo("/admin/corrections"),
            },
          ]}
        />
      )}

      {activeTab === "reports" && (
        <SectionCard
          title="Reports"
          description="Performance reports, PDF reports, result links, and study recommendations."
          actions={[
            {
              label: "Generate Reports from Corrections",
              description: "Finalize corrections and generate PDF reports.",
              onClick: () => goTo("/admin/corrections"),
            },
          ]}
        />
      )}

      {activeTab === "settings" && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Settings</h2>

          <div style={styles.settingsGrid}>
            <div style={styles.settingBox}>
              <strong>Official Language</strong>
              <p>English (US)</p>
            </div>

            <div style={styles.settingBox}>
              <strong>Brand Name</strong>
              <p>Marcos Private English Lessons</p>
            </div>

            <div style={styles.settingBox}>
              <strong>Report Style</strong>
              <p>No Pass/Fail status. Use performance-focused feedback.</p>
            </div>

            <div style={styles.settingBox}>
              <strong>PDF Report</strong>
              <p>Logo, header, final score, QR/result link, teacher signature.</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function TabButton({
  label,
  tab,
  activeTab,
  setActiveTab,
}: {
  label: string;
  tab: TabKey;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}) {
  return (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        ...styles.tabButton,
        ...(activeTab === tab ? styles.activeTabButton : {}),
      }}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.statCard}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SectionCard({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: Array<{
    label: string;
    description: string;
    onClick: () => void;
  }>;
}) {
  return (
    <section style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      <p style={styles.muted}>{description}</p>

      <div style={styles.actionGrid}>
        {actions.map((action) => (
          <button key={action.label} onClick={action.onClick} style={styles.actionCard}>
            <strong>{action.label}</strong>
            <span>{action.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },

  header: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },

  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  logo: {
    width: "72px",
    height: "72px",
    objectFit: "contain",
    borderRadius: "12px",
    background: "#fff",
  },

  title: {
    margin: 0,
    fontSize: "30px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
  },

  refreshButton: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  tabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "18px",
  },

  tabButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    padding: "11px 14px",
    borderRadius: "999px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  activeTabButton: {
    background: "#2563eb",
    color: "#fff",
    border: "1px solid #2563eb",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginBottom: "18px",
  },

  statCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    marginBottom: "18px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    marginBottom: "12px",
  },

  cardTitle: {
    margin: "0 0 8px",
  },

  muted: {
    color: "#64748b",
    margin: "4px 0",
  },

  primaryButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "11px 14px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  secondaryButton: {
    background: "#475569",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  activityItem: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    alignItems: "center",
    background: "#f9fafb",
  },

  activityRight: {
    whiteSpace: "nowrap",
  },

  completedBadge: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "999px",
    padding: "8px 10px",
    fontWeight: "bold",
  },

  pendingBadge: {
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "999px",
    padding: "8px 10px",
    fontWeight: "bold",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
    marginTop: "16px",
  },

  actionCard: {
    textAlign: "left",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#111827",
  },

  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "14px",
  },

  settingBox: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "16px",
  },
};
