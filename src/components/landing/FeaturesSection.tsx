import { Webhook, Activity, Brain } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Webhook,
    title: "Automatic Repository Sync",
    description: "Detect pushes instantly using GitHub webhooks. Pull and merge changes automatically without manual intervention.",
  },
  {
    icon: Activity,
    title: "Real-Time Team Activity",
    description: "Live updates when developers push code. Merge progress is visible to the entire team in real time.",
  },
  {
    icon: Brain,
    title: "AI Conflict Assistance",
    description: "When merge conflicts occur, AI explains the issue in plain language and suggests safe resolution strategies.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Everything you need for seamless collaboration
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to eliminate the friction of Git collaboration.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
