import { useState, useEffect } from "react";
import plantumlEncoder from "plantuml-encoder";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle2, Eye, ExternalLink, Loader2, GitGraph, Copy, Share2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Repo {
  name: string;
  owner: string;
  lastCommit: string;
  autoMerge: boolean;
  language: string;
  githubUrl: string;
}
const Repositories = () => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [githubUser, setGithubUser] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [addingRepo, setAddingRepo] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [viewActivity, setViewActivity] = useState<string | null>(null);
  const [repoActivities, setRepoActivities] = useState<Record<string, { text: string; time: string; type: string }[]>>({});
  const [activityLoading, setActivityLoading] = useState<string | null>(null);
  const [visibleActivitiesCount, setVisibleActivitiesCount] = useState<number>(10);
  
  const [umlData, setUmlData] = useState<{ code: string; summary: string; type: string } | null>(null);
  const [generatingUml, setGeneratingUml] = useState<string | null>(null);
  const [showUmlModal, setShowUmlModal] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }
        setSession(session);

        const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name || "";
        setGithubUser(username);

        const token = localStorage.getItem('github_token');
        if (!token) {
          toast({
            title: "Access Token Missing",
            description: "Please sign out and sign back in to fetch your repositories.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Fetch connected repos from backend
        let connected: string[] = [];
        try {
          const backendRes = await fetch('/api/repos/', {
            headers: {
              'x-supabase-user-id': session.user.id,
              'x-supabase-user-email': session.user.email || '',
              'x-github-username': username,
            }
          });
          if (backendRes.ok) {
            const data = await backendRes.json();
            connected = data.repositories.map((r: any) => r.repo_name);
            setConnectedRepos(connected);
          }
        } catch(e) {
          console.error("Backend fetch error:", e);
        }

        let allRepos: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}&affiliation=owner,collaborator,organization_member`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            }
          });

          if (!response.ok) throw new Error("Failed to fetch repositories");

          const data = await response.json();
          allRepos = [...allRepos, ...data];

          if (data.length < 100) {
            hasMore = false;
          } else {
            page++;
          }
        }

        const mappedRepos: Repo[] = allRepos.map((repo: any) => {
          const updatedDate = new Date(repo.updated_at);
          const timeOptions: Intl.DateTimeFormatOptions = {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          };
          const timeString = updatedDate.toLocaleDateString(undefined, timeOptions);

          return {
            name: repo.name,
            owner: repo.owner.login,
            lastCommit: timeString,
            autoMerge: connected.includes(repo.name),
            language: repo.language || "Markdown",
            githubUrl: repo.html_url,
            github_repo_id: repo.id.toString(),
            clone_url: repo.clone_url
          };
        });

        setRepos(mappedRepos);
      } catch (err) {
        console.error("Error fetching repos:", err);
        toast({
          title: "Error fetching repositories",
          description: "Could not load data from GitHub. Your token may have expired.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [toast]);

  const handleViewActivity = async (repoName: string, owner: string) => {
    if (viewActivity === repoName) {
      setViewActivity(null);
      setVisibleActivitiesCount(10);
      return;
    }

    setViewActivity(repoName);
    setVisibleActivitiesCount(10);

    if (repoActivities[repoName]) return; // Use cached version

    setActivityLoading(repoName);
    const token = localStorage.getItem('github_token');

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/events?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch events");

      const events = await response.json();
      const parsedActivities = events.map((event: any) => {
        let text = `${event.actor.login} performed an action`;
        let type = "primary";

        if (event.type === "PushEvent") {
          text = `${event.actor.login} pushed ${event.payload.commits?.length || 1} commit(s) to ${event.payload.ref?.replace('refs/heads/', '') || 'branch'}`;
          type = "push";
        } else if (event.type === "PullRequestEvent") {
          text = `${event.actor.login} ${event.payload.action} PR #${event.payload.number}`;
          type = event.payload.action === 'closed' ? (event.payload.pull_request.merged ? 'success' : 'destructive') : 'merge';
        } else if (event.type === "IssuesEvent") {
          text = `${event.actor.login} ${event.payload.action} issue #${event.payload.issue.number}`;
          type = "warning";
        } else if (event.type === "CreateEvent") {
          text = `${event.actor.login} created ${event.payload.ref_type}`;
          type = "primary";
        } else if (event.type === "IssueCommentEvent") {
          text = `${event.actor.login} commented on an issue`;
          type = "info";
        } else if (event.type === "DeleteEvent") {
          text = `${event.actor.login} deleted ${event.payload.ref_type}`;
          type = "destructive";
        }

        const timeOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return {
          text,
          time: new Date(event.created_at).toLocaleDateString(undefined, timeOptions),
          type
        };
      });

      setRepoActivities(prev => ({
        ...prev,
        [repoName]: parsedActivities.length > 0 ? parsedActivities : [{ text: "No recent public activity", time: "", type: "info" }]
      }));
    } catch (e) {
      console.error(e);
      setRepoActivities(prev => ({ ...prev, [repoName]: [{ text: "Failed to load activity", time: "", type: "destructive" }] }));
    } finally {
      setActivityLoading(null);
    }
  };

  const handleAddRepo = async () => {
    if (!newRepoName.trim() || !session) return;
    setAddingRepo(true);
    setAddSuccess(false);

    try {
      const res = await fetch('/api/repos/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-user-id': session.user.id,
          'x-supabase-user-email': session.user.email || '',
        },
        body: JSON.stringify({
          repo_name: newRepoName.trim(),
          github_repo_id: `manual-${Date.now()}`,
          clone_url: `https://github.com/${githubUser || "You"}/${newRepoName.trim()}.git`,
        })
      });
      
      if (!res.ok) {
        throw new Error("Failed to connect via backend");
      }
      
      // Artificial delay for UX
      await new Promise((r) => setTimeout(r, 1500));

      setRepos((prev) => [
        {
          name: newRepoName.trim(),
          owner: githubUser || "You",
          lastCommit: "Just now",
          autoMerge: true,
          language: "Unknown",
          githubUrl: `https://github.com/${githubUser || "You"}/${newRepoName.trim()}`,
        },
        ...prev,
      ]);
      setAddingRepo(false);
      setAddSuccess(true);
      toast({ title: "Repository connected!", description: `${newRepoName} has been hooked to GitSync AI.` });

      setTimeout(() => {
        setAddSuccess(false);
        setNewRepoName("");
        setShowAdd(false);
      }, 2000);
      
    } catch (error) {
      setAddingRepo(false);
      toast({ title: "Failed to add repo", description: "Could not sync with backend", variant: "destructive" });
    }
  };

  const handleToggleAutoMerge = async (repo: Repo) => {
    if (repo.autoMerge || !session) return;
    try {
      const res = await fetch('/api/repos/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-user-id': session.user.id,
          'x-supabase-user-email': session.user.email || '',
        },
        body: JSON.stringify({
          repo_name: repo.name,
          github_repo_id: (repo as any).github_repo_id || `github-${Date.now()}`,
          clone_url: (repo as any).clone_url || repo.githubUrl + ".git",
        })
      });
      if (res.ok) {
        setRepos(prev => prev.map(r => r.name === repo.name ? { ...r, autoMerge: true } : r));
        setConnectedRepos(prev => [...prev, repo.name]);
        toast({ title: "Repository connected!", description: `${repo.name} has been hooked to GitSync AI.` });
        window.open(`https://github.com/${repo.owner}/${repo.name}/settings/access`, "_blank");
      } else {
        toast({ title: "Connection Failed", description: "Repository might already be connected.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not connect repository to GitSync.", variant: "destructive" });
    }
  };

  const handleGenerateUML = async (repo: Repo, type: string = "Class") => {
    if (!repo.autoMerge) {
      toast({ title: "Enable Repository First", description: "Please enable GitSync for this repo to allow AI analysis." });
      return;
    }
    
    setGeneratingUml(repo.name);
    try {
      const backendRes = await fetch('/api/repos/', {
        headers: {
          'x-supabase-user-id': session?.user.id,
          'x-supabase-user-email': session?.user.email || '',
        }
      });
      const data = await backendRes.json();
      const internalRepo = data.repositories.find((r: any) => r.repo_name === repo.name);
      
      if (!internalRepo) {
        throw new Error("Repo mapping failed");
      }

      const res = await fetch(`/api/repos/${internalRepo.id}/generate-uml?type=${type}`, {
        method: 'POST',
        headers: {
          'x-supabase-user-id': session?.user.id,
        }
      });
      
      if (res.ok) {
        const result = await res.json();
        setUmlData({ code: result.plant_uml_code, summary: result.analysis_summary, type });
        setShowUmlModal(true);
        toast({ title: `${type} UML Generated!`, description: "Architecture analysis complete." });
      } else {
        throw new Error("Failed to generate UML");
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Analysis Failed", description: "Could not generate PlantUML for this repository.", variant: "destructive" });
    } finally {
      setGeneratingUml(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repositories</h1>
          <p className="text-muted-foreground">Manage your connected GitHub repositories. ({repos.length} total)</p>
        </div>
        <Button
          className="gradient-primary text-primary-foreground border-0 gap-2"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-4 w-4" /> Add Repository
        </Button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border bg-card p-5 overflow-hidden"
          >
            <label className="text-sm font-medium text-card-foreground mb-2 block">
              Repository name
            </label>
            <div className="flex gap-3">
              <Input
                placeholder="e.g. my-awesome-repo"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                disabled={addingRepo}
              />
              <Button
                onClick={handleAddRepo}
                disabled={addingRepo || !newRepoName.trim()}
                className="gradient-primary text-primary-foreground border-0 min-w-[120px]"
              >
                {addingRepo ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Adding...
                  </div>
                ) : addSuccess ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Added!
                  </div>
                ) : (
                  "Add Repo"
                )}
              </Button>
            </div>
            {addingRepo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3"
              >
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full gradient-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4.5, ease: "linear" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Connecting to repository and syncing data...
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewActivity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border bg-card overflow-hidden my-4"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-card-foreground">
                Live Activity — {viewActivity}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setViewActivity(null)}>
                Close
              </Button>
            </div>
            <div className="divide-y divide-border">
              {activityLoading === viewActivity ? (
                <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {(repoActivities[viewActivity] || []).slice(0, visibleActivitiesCount).map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (i % 10) * 0.05 }}
                      className="flex items-center gap-3 px-6 py-3"
                    >
                      <div
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.type === "success"
                            ? "bg-success"
                            : item.type === "destructive"
                              ? "bg-destructive"
                              : item.type === "warning"
                                ? "bg-warning"
                                : item.type === "push"
                                  ? "bg-primary"
                                  : "bg-blue-400"
                          }`}
                      />
                      <p className="text-sm text-card-foreground flex-1">{item.text}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                    </motion.div>
                  ))}
                  {(repoActivities[viewActivity] || []).length > visibleActivitiesCount && (
                    <div className="px-6 py-4 flex justify-center border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleActivitiesCount(prev => prev + 10)}
                        className="w-full max-w-[200px]"
                      >
                        Show More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Fetching all repositories from GitHub...</p>
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl bg-card">
          <p className="text-muted-foreground mb-4">No repositories found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo, i) => (
            <motion.div
              key={repo.name + repo.owner}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i % 20) * 0.05 }} // modulo batch animation so massive lists don't delay infinitely
              className="rounded-xl border border-border bg-card p-6 hover:shadow-md hover:border-primary/20 transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <a href={repo.githubUrl} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-card-foreground hover:text-primary transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">
                    {repo.name}
                    <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                  </a>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm tracking-wider ${repo.owner === githubUser ? 'bg-primary/20 text-primary' : 'bg-[#e2aa45]/20 text-[#e2aa45]'}`}>
                      {repo.owner === githubUser ? 'OWN' : 'TEAM'}
                    </span>
                    <p className="text-xs text-muted-foreground">by {repo.owner}</p>
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground truncate max-w-[80px] text-center">
                  {repo.language}
                </span>
              </div>

              <div className="flex-grow"></div>

              <p className="text-xs text-muted-foreground mb-4">Updated: {repo.lastCommit}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Auto Collaboration</span>
                <Switch defaultChecked={repo.autoMerge} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={viewActivity === repo.name ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1 min-w-[100px] text-[10px] h-8 gap-1"
                  onClick={() => handleViewActivity(repo.name, repo.owner)}
                >
                  <Eye className="h-3 w-3" />
                  {activityLoading === repo.name ? "..." : "Activity"}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[100px] text-[10px] h-8 gap-1 border-primary/20 hover:border-primary/50 text-primary"
                      disabled={generatingUml === repo.name}
                    >
                      {generatingUml === repo.name ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <GitGraph className="h-3 w-3" />
                      )}
                      {generatingUml === repo.name ? "Analyzing..." : "Gen UML"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0a0a0c] border-white/10 text-white">
                    {["Class", "Sequence", "Activity", "Use Case"].map((type) => (
                      <DropdownMenuItem 
                        key={type} 
                        onClick={() => handleGenerateUML(repo, type)}
                        className="text-xs hover:bg-primary/20 cursor-pointer"
                      >
                        {type} Diagram
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  className={`flex-1 min-w-[100px] text-[10px] h-8 ${repo.autoMerge ? "bg-success/20 text-success hover:bg-success/30 border-0" : "gradient-primary text-primary-foreground border-0"}`}
                  onClick={() => handleToggleAutoMerge(repo)}
                  disabled={repo.autoMerge}
                >
                  {repo.autoMerge ? "Connected" : "Enable"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <Dialog open={showUmlModal} onOpenChange={setShowUmlModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col p-0 border-primary/20 bg-[#0a0a0c]">
          <DialogHeader className="p-6 border-b border-white/5">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold tracking-widest uppercase">AI Architect</span>
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              {umlData?.type} Diagram
            </DialogTitle>
            <DialogDescription className="text-muted-foreground italic">
              Automatically generated architecture diagram based on repository analysis.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Analysis Summary
              </h3>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-muted-foreground leading-relaxed">
                {umlData?.summary}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  PlantUML Code
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs gap-1.5 hover:bg-white/10"
                    onClick={() => {
                      navigator.clipboard.writeText(umlData?.code || "");
                      toast({ title: "Copied!", description: "PlantUML code copied to clipboard." });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs gap-1.5 hover:bg-white/10"
                    onClick={() => {
                      if (umlData?.code) {
                        const encoded = plantumlEncoder.encode(umlData.code);
                        window.open(`http://www.plantuml.com/plantuml/uml/${encoded}`, "_blank");
                      }
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" /> View Online
                  </Button>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                <pre className="relative p-5 rounded-xl bg-black border border-white/10 text-xs font-mono text-primary/90 overflow-x-auto selection:bg-primary/20 leading-loose">
                  {umlData?.code}
                </pre>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-end">
            <Button onClick={() => setShowUmlModal(false)} className="gradient-primary text-white border-0">
              Close Analysis
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Repositories;
