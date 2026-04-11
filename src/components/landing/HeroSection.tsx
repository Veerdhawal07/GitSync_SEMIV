import { Github, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-illustration-new.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden gradient-hero pt-32 pb-20">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Automate Git Collaboration with{" "}
              <span className="text-gradient">Intelligent Merging.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground max-w-xl">
              Connect your GitHub repositories, monitor team activity in real time, and resolve merge conflicts with AI assistance.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login">
                <Button size="lg" className="gradient-primary text-primary-foreground border-0 gap-2 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                  <Github className="h-5 w-5" />
                  Login with GitHub
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="gap-2 px-8 text-base font-semibold border-border text-foreground hover:bg-secondary">
                <Play className="h-4 w-4" />
                View Demo
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border">
              <img
                src={heroImage}
                alt="Developer collaboration pipeline showing automated merging workflow"
                className="w-full h-auto"
                loading="eager"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
