import { motion } from "framer-motion";
import { GitMerge, Zap, CheckCircle2, Users, TrendingUp } from "lucide-react";

const insights = [
  { icon: GitMerge, text: "Auto-merged 47 PRs today", color: "text-primary" },
  { icon: Zap, text: "95% faster conflict resolution", color: "text-primary" },
  { icon: CheckCircle2, text: "Zero downtime deployments", color: "text-success" },
  { icon: Users, text: "Teams ship 3x faster with GitSync", color: "text-primary" },
  { icon: TrendingUp, text: "Trusted by 12,000+ teams worldwide", color: "text-primary" },
];

const FloatingInsights = () => {
  return (
    <section className="py-16 bg-background overflow-hidden">
      <div className="container mx-auto px-4 mb-8 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl font-bold text-foreground sm:text-3xl"
        >
          Why developers love GitSync
        </motion.h2>
      </div>

      {/* Scrolling ticker */}
      <div className="relative">
        <div className="flex animate-scroll-left gap-6">
          {[...insights, ...insights, ...insights].map((insight, i) => (
            <div
              key={i}
              className="flex shrink-0 items-center gap-3 rounded-full border border-border bg-card px-5 py-3 shadow-sm"
            >
              <insight.icon className={`h-4 w-4 shrink-0 ${insight.color}`} />
              <span className="text-sm font-medium text-card-foreground whitespace-nowrap">
                {insight.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FloatingInsights;
