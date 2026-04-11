import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Save, User, Github, Users, BookOpen } from "lucide-react";

interface ProfileData {
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string;
  followers?: number;
  following?: number;
  public_repos?: number;
  html_url?: string;
  email?: string;
}

const ProfilePage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    username: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    const fetchGithubProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name || "";
        const token = localStorage.getItem('github_token');

        if (!token || !username) {
          setLoading(false);
          return;
        }

        const res = await fetch(`https://api.github.com/users/${username}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setProfile({
            display_name: data.name || username,
            username: data.login,
            bio: data.bio || "",
            avatar_url: data.avatar_url,
            followers: data.followers,
            following: data.following,
            public_repos: data.public_repos,
            html_url: data.html_url,
            email: session.user.email,
          });
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
        toast({ title: "Error", description: "Failed to load GitHub profile", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchGithubProfile();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    // Since this is fetching from GitHub, saving here might just mean saving to local GitSync db.
    // For now, we mock the local save.
    setTimeout(() => {
      toast({ title: "Profile preferences saved", description: "Your local settings have been updated." });
      setSaving(false);
    }, 800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto xl:mx-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Your GitHub identity and GitSync preferences.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6 space-y-8"
      >
        {/* Header Stats & Avatar */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <Avatar className="h-28 w-28 border-4 border-card shadow-sm">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-3xl">
              {profile.display_name?.[0]?.toUpperCase() || <User className="h-10 w-10" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1 mt-2">
            <h2 className="text-2xl font-bold text-card-foreground">{profile.display_name || "GitHub User"}</h2>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Github className="h-4 w-4" /> @{profile.username}
              </span>
              <span className="hidden sm:inline">•</span>
              <span>{profile.email}</span>
            </div>
            
            <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 pt-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{profile.followers} <span className="text-muted-foreground font-normal">followers</span></span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{profile.public_repos} <span className="text-muted-foreground font-normal">repos</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-5 pt-4 border-t border-border">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-card-foreground mb-1.5 block">Display Name</label>
              <Input
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                className="bg-secondary/30 border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground mb-1.5 block">GitHub Username</label>
              <Input
                value={profile.username}
                disabled
                className="bg-secondary/50 text-muted-foreground border-transparent cursor-not-allowed"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground mb-1.5 block">GitHub Bio</label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="bg-secondary/30 border-border"
              rows={4}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => window.open(profile.html_url, '_blank')} className="gap-2">
            <Github className="h-4 w-4" /> View on GitHub
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground border-0 gap-2 px-6">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
