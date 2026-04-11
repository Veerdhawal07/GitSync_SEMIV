import { FolderGit2, Activity, AlertTriangle, GitMerge } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { label: "Repositories", value: "12", icon: FolderGit2, change: "+2 this week" },
  { label: "Active Merges", value: "3", icon: GitMerge, change: "In progress" },
  { label: "Conflicts", value: "1", icon: AlertTriangle, change: "Needs attention" },
  { label: "Push Events Today", value: "24", icon: Activity, change: "+8 from yesterday" },
];

const recentActivity = [
  { text: "Anita pushed to feature-login", repo: "team-project", time: "2 min ago", type: "push" },
  { text: "Merge completed successfully", repo: "api-service", time: "15 min ago", type: "success" },
  { text: "Conflict detected in auth.py", repo: "team-project", time: "30 min ago", type: "conflict" },
  { text: "Dev created branch ui-update", repo: "frontend-app", time: "1 hour ago", type: "push" },
  { text: "Rahul merged feature-auth", repo: "team-project", time: "2 hours ago", type: "success" },
];

const DashboardHome = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your Git collaboration activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold text-card-foreground">{stat.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-card-foreground">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 px-6 py-4"
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${
                item.type === "success" ? "bg-success" : item.type === "conflict" ? "bg-destructive" : "bg-primary"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-card-foreground">{item.text}</p>
                <p className="text-xs text-muted-foreground">{item.repo}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
