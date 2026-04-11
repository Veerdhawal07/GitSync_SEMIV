import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

const SettingsPage = () => {
  const [githubUser, setGithubUser] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const username = session.user.user_metadata?.preferred_username || session.user.user_metadata?.user_name || "";
        setGithubUser(username);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your GitSync preferences.</p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="p-6">
          <h3 className="text-base font-semibold text-card-foreground mb-1">Notifications</h3>
          <p className="text-sm text-muted-foreground mb-4">Choose what events trigger notifications.</p>
          <div className="space-y-4">
            {[
              { label: "Push events", enabled: true },
              { label: "Merge completions", enabled: true },
              { label: "Conflict alerts", enabled: true },
              { label: "New collaborator joins", enabled: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-card-foreground">{item.label}</span>
                <Switch defaultChecked={item.enabled} />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-base font-semibold text-card-foreground mb-1">Auto-Merge</h3>
          <p className="text-sm text-muted-foreground mb-4">Default behavior for new repositories.</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-card-foreground">Enable auto-merge by default</span>
            <Switch defaultChecked />
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-base font-semibold text-card-foreground mb-1">GitHub Connection</h3>
          <p className="text-sm text-muted-foreground mb-4">Manage your GitHub account connection.</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-card-foreground font-medium">Connected as {githubUser ? `@${githubUser}` : "Unknown"}</p>
              <p className="text-xs text-muted-foreground">Active Session</p>
            </div>
            <Button variant="outline" size="sm" onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}>Sign Out</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
