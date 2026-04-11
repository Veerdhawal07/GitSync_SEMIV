import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [authMessage, setAuthMessage] = useState("Completing authentication...");

  useEffect(() => {
    let mounted = true;

    const handleAuth = async () => {
      console.log('AuthCallback: Starting authentication...');
      console.log('URL params:', Object.fromEntries(searchParams));
      
      const hashStr = window.location.hash ? window.location.hash.substring(1) : '';
      const hashParams = new URLSearchParams(hashStr);

      const error = searchParams.get('error') || hashParams.get('error');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      
      if (error) {
        console.error('AuthCallback: OAuth error detected:', 'Error:', error, 'Description:', errorDescription);
        toast({
          title: "Authentication Failed",
          description: errorDescription ? `${error}: ${errorDescription}` : `Error: ${error}`,
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (!supabase) {
        toast({
          title: "Error",
          description: "Authentication service is not configured.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // We set up a listener for the auth event. Supabase handles the URL token internally now.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('AuthCallback: Auth state changed:', event);
        if (event === 'SIGNED_IN' && session) {
          if (session.provider_token) {
            localStorage.setItem('github_token', session.provider_token);
          }
          if (mounted) {
            setAuthMessage("Authentication successful! Redirecting...");
            toast({
              title: "Success!",
              description: "You have been successfully authenticated.",
            });
            navigate("/dashboard", { replace: true });
          }
        }
      });

      // Also check getSession in case the event already fired, or we are just returning to the page
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          if (session.provider_token) {
            localStorage.setItem('github_token', session.provider_token);
          }
          if (mounted) {
            navigate("/dashboard", { replace: true });
          }
        } else if (!searchParams.get('code')) {
          // If there's no session and no code in URL, we shouldn't be here
          console.warn('AuthCallback: No session and no code, redirecting to login');
          if (mounted) {
            navigate("/login", { replace: true });
          }
        }
        // If there IS a code, we wait for onAuthStateChange to trigger SIGNED_IN.
      } catch (err) {
        console.error('AuthCallback: Error during session check:', err);
        if (mounted) {
          toast({
            title: "Authentication Error",
            description: "There was a problem verifying your session.",
            variant: "destructive",
          });
          navigate("/login");
        }
      }

      return () => {
        subscription.unsubscribe();
      };
    };

    const cleanup = handleAuth();

    return () => {
      mounted = false;
      cleanup.then(clean => clean && clean());
    };
  }, [navigate, toast, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-sm px-6 py-8 bg-card rounded-2xl border shadow-sm">
        <div className="mb-6 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <h2 className="text-lg font-medium text-foreground mb-2">Authenticating</h2>
        <p className="text-muted-foreground text-sm">{authMessage}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
