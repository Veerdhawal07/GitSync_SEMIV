import { useState } from "react";
import { GitMerge, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Github } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGitHubLogin = async () => {
    if (!supabase) {
      toast({
        title: "Configuration Error",
        description: "Supabase is not configured. Please check your environment variables.",
        variant: "destructive",
      });
      return;
    }

    console.log('Login: Initiating GitHub OAuth...');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'user:email read:user',
      },
    });

    if (error) {
      console.error('Login: OAuth error:', error);
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log('Login: OAuth initiated successfully');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // TODO: Implement your custom authentication here
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    if (isSignUp) {
      toast({
        title: "Account created!",
        description: "Please sign in with your credentials.",
      });
      setIsSignUp(false);
    } else {
      localStorage.setItem('gitsync_user', JSON.stringify({ email }));
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      navigate("/dashboard");
    }
    
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4"
      >
        <div className="rounded-2xl border border-border bg-card p-10 shadow-xl shadow-primary/5">
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl gradient-primary">
              <GitMerge className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-card-foreground mb-2">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp ? "Create your account to get started." : "Sign in to continue."}
            </p>
          </div>

          {/* GitHub OAuth Button */}
          <Button
            onClick={handleGitHubLogin}
            size="lg"
            className="w-full bg-[#24292e] hover:bg-[#1c2024] text-white border-0 text-base font-semibold shadow-lg"
          >
            <Github className="h-5 w-5 mr-2" />
            Continue with GitHub
          </Button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground border-0 text-base font-semibold shadow-lg shadow-primary/25"
            >
              <Mail className="h-5 w-5 mr-2" />
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            By signing in, you agree to our Terms of Service.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
