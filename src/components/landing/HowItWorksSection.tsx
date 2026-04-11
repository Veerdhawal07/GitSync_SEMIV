import { Github, FolderGit2, GitCommitHorizontal, GitMerge } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  { icon: Github, title: "Login with GitHub", description: "Authenticate securely with your GitHub account." },
  { icon: FolderGit2, title: "Select a Repository", description: "Choose which repositories to enable for auto-sync." },
  { icon: GitCommitHorizontal, title: "Push Code Normally", description: "Your team pushes code as they always do." },
  { icon: GitMerge, title: "Auto-Sync & Merge", description: "GitSync merges changes safely and alerts on conflicts." },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">How It Works</h2>
          <p className="mt-4 text-lg text-muted-foreground">Four simple steps to automated collaboration.</p>
        </motion.div>

        <div className="relative flex flex-col items-center gap-0 md:flex-row md:justify-between md:gap-0">
          {/* Connector line */}
          <div className="absolute top-12 left-[10%] right-[10%] hidden h-0.5 bg-border md:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative z-10 flex flex-col items-center text-center w-full md:w-1/4 mb-8 md:mb-0"
            >
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-background border-2 border-primary shadow-md shadow-primary/10">
                <step.icon className="h-10 w-10 text-primary" />
              </div>
              <div className="mb-1 text-sm font-bold text-primary">Step {i + 1}</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
