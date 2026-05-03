import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { userInfo } from "os";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!supabase) {
      console.warn('ProtectedRoute: Supabase not configured');
      setLoading(false);
      return;
    }
    console.log('ProtectedRoute: Checking authentication...');

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('ProtectedRoute: Session check:', { hasSession: !!session, user: session?.user?.email });
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('ProtectedRoute: Auth state changed:', { event, hasSession: !!session });
        setIsAuthenticated(!!session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
