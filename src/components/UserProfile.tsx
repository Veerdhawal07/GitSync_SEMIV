import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate('/login');
    }
  };

  if (!user) {
    return null;
  }

  const userEmail = user.email || 'No email';
  const userName = user.user_metadata?.full_name || user.user_metadata?.user_name || userEmail;
  const userAvatar = user.user_metadata?.avatar_url;

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={userAvatar} alt={userName} />
        <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{userName}</span>
        <span className="text-xs text-muted-foreground">{userEmail}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="ml-2"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
