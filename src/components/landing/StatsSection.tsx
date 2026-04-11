import { motion } from "framer-motion";
import { GitMerge, Users, Zap, Shield } from "lucide-react";

const stats = [
  { icon: GitMerge, value: "2.4M+", label: "Merges Automated" },
  { icon: Users, value: "12K+", label: "Developer Teams" },
  { icon: Zap, value: "99.9%", label: "Uptime Guaranteed" },
  { icon: Shield, value: "0", label: "Data Breaches" },
];

const StatsSection = () => {
  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
