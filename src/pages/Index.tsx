import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FloatingInsights from "@/components/landing/FloatingInsights";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import Footer from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user just completed OAuth flow
    const checkSession = async () => {
      if (!supabase) {
        console.log('Index: Supabase not configured');
        return;
      }
      
      console.log('Index: Checking for existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Index: Session found:', !!session);
      
      if (session) {
        // User is authenticated, redirect to dashboard
        console.log('Index: Redirecting to dashboard');
        navigate("/dashboard");
      }
    };

    checkSession();

    // Listen for auth state changes (handles OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Index: Auth state changed:', event, 'Has session:', !!session);
      if (event === 'SIGNED_IN' && session) {
        console.log('Index: User signed in, redirecting to dashboard');
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <FloatingInsights />
      <HowItWorksSection />
      <Footer />
    </div>
  );
};

export default Index;
