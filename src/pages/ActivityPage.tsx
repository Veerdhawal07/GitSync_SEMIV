import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GitCommitHorizontal, GitMerge, AlertTriangle, CheckCircle2, Loader2, GitPullRequest, MessageSquare, Trash2, FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActivityItem {
  icon: any;
  text: string;
  repo: string;
  time: string;
  color: string;
}

const ActivityPage = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserActivity = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name || "";
        const token = localStorage.getItem('github_token');

        if (!token || !username) {
          toast({
            title: "Authentication Missing",
            description: "Please sign out and sign back in to fetch your activity.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        const response = await fetch(`https://api.github.com/users/${username}/events?per_page=30`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch events");

        const events = await response.json();
        
        const mappedActivities = events.map((event: any) => {
          let text = `${event.actor.login} performed an action`;
          let color = "text-primary";
          let icon = CheckCircle2;

          if (event.type === "PushEvent") {
            const commits = event.payload.commits?.length || 1;
            text = `You pushed ${commits} commit(s) to ${event.payload.ref?.replace('refs/heads/', '') || 'branch'}`;
            color = "text-primary";
            icon = GitCommitHorizontal;
          } else if (event.type === "PullRequestEvent") {
            text = `You ${event.payload.action} PR #${event.payload.number}`;
            if (event.payload.action === 'closed') {
              color = event.payload.pull_request.merged ? "text-success" : "text-destructive";
              icon = event.payload.pull_request.merged ? GitMerge : AlertTriangle;
            } else {
              color = "text-warning";
              icon = GitPullRequest;
            }
          } else if (event.type === "IssuesEvent") {
            text = `You ${event.payload.action} issue #${event.payload.issue.number}`;
            color = "text-warning";
            icon = AlertTriangle;
          } else if (event.type === "CreateEvent") {
            text = `You created ${event.payload.ref_type}`;
            color = "text-primary";
            icon = FolderPlus;
          } else if (event.type === "IssueCommentEvent") {
            text = `You commented on an issue`;
            color = "text-info";
            icon = MessageSquare;
          } else if (event.type === "DeleteEvent") {
            text = `You deleted ${event.payload.ref_type}`;
            color = "text-destructive";
            icon = Trash2;
          }

          const timeOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
          return {
            icon,
            text,
            repo: event.repo.name,
            time: new Date(event.created_at).toLocaleDateString(undefined, timeOptions),
            color
          };
        });

        setActivities(mappedActivities);
      } catch (err) {
        console.error("Error fetching activity:", err);
        toast({
          title: "Error fetching activity",
          description: "Could not load activity from GitHub.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserActivity();
  }, [toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your Recent Activity</h1>
        <p className="text-muted-foreground">Real-time updates of your latest actions across GitHub repositories.</p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!loading && <div className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />}
            <span className="text-sm font-medium text-card-foreground">
              {loading ? "Loading Activity..." : "Live Feed"}
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No recent activity found on your GitHub account.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors"
              >
                <div className={`h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span className="bg-secondary px-1.5 py-0.5 rounded-sm inline-block truncate max-w-[200px]">{item.repo}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
