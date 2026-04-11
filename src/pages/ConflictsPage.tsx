import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, AlertTriangle, Loader2, GitCommit, CheckCircle, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Repository {
  id: number;
  repo_name: string;
  github_repo_id: string;
}

interface Conflict {
  id: number;
  repository_id: number;
  file_path: string;
  conflict_diff: string;
  resolved: boolean;
  created_at: string;
}

interface AISuggestion {
  explanation: string;
  merged_code: string;
  confidence: number;
}

const ConflictsPage = () => {
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [session, setSession] = useState<any>(null);
  
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isGettingSuggestion, setIsGettingSuggestion] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setSession(session);

      try {
        const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name || "";
        const headers = {
          'x-supabase-user-id': session.user.id,
          'x-supabase-user-email': session.user.email || '',
          'x-github-username': username,
        };

        // Get connected repos
        const reposRes = await fetch('/api/repos/', { headers });
        if (!reposRes.ok) throw new Error("Failed to fetch repos");
        const reposData = await reposRes.json();
        setRepos(reposData.repositories);

        // For each repo, get conflicts
        let allConflicts: Conflict[] = [];
        for (const repo of reposData.repositories) {
          const confRes = await fetch(`/api/conflicts/${repo.id}`, { headers });
          if (confRes.ok) {
            const confData = await confRes.json();
            allConflicts = [...allConflicts, ...confData.conflicts];
          }
        }
        setConflicts(allConflicts);
      } catch (e) {
        console.error(e);
        toast({ title: "Error loading conflicts", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [toast]);

  useEffect(() => {
    if (conflicts.length > 0 && !selectedConflict) {
      setSelectedConflict(conflicts[0]);
    }
  }, [conflicts, selectedConflict]);

  const currentConflictIndex = selectedConflict ? conflicts.findIndex(c => c.id === selectedConflict.id) : -1;

  const handleSkip = () => {
    if (conflicts.length > 1) {
      setAiSuggestion(null);
      const nextIndex = (currentConflictIndex + 1) % conflicts.length;
      setSelectedConflict(conflicts[nextIndex]);
    }
  };

  const handleGetAiSuggestion = async () => {
    if (!selectedConflict || !session) return;
    setIsGettingSuggestion(true);
    try {
      const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name || "";
      const headers = {
        'x-supabase-user-id': session.user.id,
        'x-supabase-user-email': session.user.email || '',
        'x-github-username': username,
      };

      const res = await fetch(`/api/conflicts/resolve/${selectedConflict.id}`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error("Failed to get suggestion");
      const data = await res.json();
      setAiSuggestion(data.suggestion);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to query AI", description: "The AI agent encountered an error.", variant: "destructive" });
    } finally {
      setIsGettingSuggestion(false);
    }
  };

  const handleApplyResolution = async () => {
    if (!selectedConflict || !aiSuggestion || !session) return;
    setIsApplying(true);
    try {
      const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name || "";
      const headers = {
        'Content-Type': 'application/json',
        'x-supabase-user-id': session.user.id,
        'x-supabase-user-email': session.user.email || '',
        'x-github-username': username,
      };

      const res = await fetch(`/api/conflicts/apply/${selectedConflict.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ merged_code: aiSuggestion.merged_code })
      });
      if (!res.ok) throw new Error("Failed to apply fix");
      
      toast({ title: "Patch Applied!", description: "Conflict resolved successfully." });
      
      const newConflicts = conflicts.filter(c => c.id !== selectedConflict.id);
      setConflicts(newConflicts);
      setAiSuggestion(null);
      
      if (newConflicts.length > 0) {
         setSelectedConflict(newConflicts[Math.min(currentConflictIndex, newConflicts.length - 1)]);
      } else {
         setSelectedConflict(null);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to apply fix", description: "GitEngine error.", variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  };

  const getRepoName = (repoId: number) => {
    return repos.find(r => r.id === repoId)?.repo_name || "Unknown Repo";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Analyzing repositories for conflicts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conflict Resolution Queue</h1>
          <p className="text-muted-foreground">GitSync AI systematically pipelines your merge conflicts.</p>
        </div>
        {conflicts.length > 0 && (
          <div className="bg-secondary/50 px-4 py-2 rounded-lg border border-border flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-foreground">{currentConflictIndex + 1} of {conflicts.length}</span>
            <span className="text-muted-foreground ml-1">in queue</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedConflict ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed rounded-xl bg-card text-muted-foreground p-8"
          >
            <CheckCircle className="h-16 w-16 mb-4 text-success opacity-80" />
            <p className="font-semibold text-lg text-foreground mb-1">Queue is Empty!</p>
            <p className="text-sm text-center max-w-md">You're all caught up. No active merge conflicts detected across your connected repositories.</p>
          </motion.div>
        ) : (
          <motion.div
            key={selectedConflict.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-xl border border-border bg-card overflow-hidden flex flex-col shadow-lg shadow-card/50"
          >
            {/* Header */}
            <div className="border-b border-border px-6 py-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm bg-primary/20 text-primary tracking-wider border border-primary/20">
                    {getRepoName(selectedConflict.repository_id)}
                  </span>
                  <span className="text-xs text-muted-foreground">Merge Conflict</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  {selectedConflict.file_path}
                </h3>
              </div>
              {conflicts.length > 1 && (
                <Button variant="outline" size="sm" onClick={handleSkip} className="gap-2 shrink-0">
                  Skip for now <SkipForward className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Diff View */}
            <div className="p-4 bg-secondary/10 border-b border-border relative">
              <div className="absolute top-0 right-0 p-2">
                 <span className="text-[10px] font-mono text-muted-foreground bg-secondary/80 px-2 py-1 rounded-sm">RAW DIFF</span>
              </div>
              <pre className="p-4 text-xs text-secondary-foreground font-mono overflow-auto max-h-[250px] bg-secondary/30 rounded-md whitespace-pre-wrap border border-border/50">
                {selectedConflict.conflict_diff}
              </pre>
            </div>

            {/* AI Section */}
            <div className="p-6">
              {!aiSuggestion && !isGettingSuggestion && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center mb-4 shadow-md shadow-primary/20 hover:scale-105 transition-transform">
                    <Brain className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h4 className="font-semibold text-lg text-foreground mb-2">Analyze with GitSync AI</h4>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">Our contextual engine will analyze the logic branches above mapping domain knowledge to autonomously rewrite a structurally sound payload without git markers.</p>
                  <Button onClick={handleGetAiSuggestion} className="gradient-primary text-primary-foreground border-0 gap-2 px-8 h-11">
                    <Brain className="h-4 w-4" /> Start Resolution Process
                  </Button>
                </div>
              )}

              {isGettingSuggestion && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-primary">
                  <div className="relative mb-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-sm font-semibold">AI is contemplating code paths...</p>
                  <p className="text-xs text-muted-foreground mt-2">Checking syntax and logical integrity.</p>
                </div>
              )}

              {aiSuggestion && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-start gap-4 p-5 rounded-xl border border-primary/20 bg-primary/5 shadow-inner">
                    <div className="h-10 w-10 shrink-0 rounded-full gradient-primary flex items-center justify-center shadow-md">
                      <Brain className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-semibold text-foreground text-sm">AI Evaluation</h4>
                        <span className="text-[10px] uppercase font-bold bg-success/20 text-success px-2 py-0.5 rounded-sm border border-success/20">
                          {aiSuggestion.confidence}% Confidence
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {aiSuggestion.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="border border-border rounded-xl rounded-t-none border-t-0 overflow-hidden bg-card shadow-sm">
                    <div className="bg-secondary/40 px-4 py-2.5 text-xs font-mono font-semibold text-muted-foreground flex items-center justify-between border-y border-border">
                      <span>Proposed Merged Code</span>
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                    </div>
                    <pre className="p-4 text-xs text-card-foreground font-mono overflow-auto max-h-[300px] whitespace-pre-wrap">
                      {aiSuggestion.merged_code}
                    </pre>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-3">
                    <Button
                      onClick={handleApplyResolution}
                      disabled={isApplying}
                      className="gradient-primary text-primary-foreground border-0 flex-1 h-11 text-sm shadow-md hover:shadow-lg transition-all"
                    >
                      {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      {isApplying ? "Applying & Committing Patch..." : "Accept AI Merge & Advance"}
                    </Button>
                    <Button variant="outline" className="h-11 px-8 text-sm bg-secondary/50" onClick={() => setAiSuggestion(null)} disabled={isApplying}>
                      Discard Suggestion
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConflictsPage;
