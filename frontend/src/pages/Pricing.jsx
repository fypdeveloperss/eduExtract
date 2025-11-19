import React, { useState } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import {
  CheckCircle2,
  Sparkles,
  Shield,
  Gauge,
  Zap,
  Users,
  Layers,
  Wand2,
  Lock,
  PhoneCall
} from "lucide-react";

const plans = [
  {
    name: "Starter",
    badge: "For Individuals",
    pricing: {
      monthly: 0,
      annual: 0
    },
    headline: "Launch your AI learning workflow in minutes.",
    description: "Perfect for students and independent creators testing EduExtract.",
    features: [
      "Up to 50 AI summaries / month",
      "YouTube + File ingestion",
      "Flashcards & quizzes generator",
      "Collaboration spaces (read-only)",
      "Community forum access",
      "Email support"
    ],
    cta: "Get Started",
    highlight: false
  },
  {
    name: "Growth",
    badge: "Most Popular",
    pricing: {
      monthly: 39,
      annual: 390
    },
    headline: "Scale high-quality content across your workspace.",
    description: "For teams that need workflows, governance, and smart collaboration.",
    features: [
      "Unlimited AI summaries & blogs",
      "Smart Mentor conversations",
      "Versioned collaboration spaces",
      "Advanced quiz & slide builder",
      "Marketplace publishing",
      "Priority in-app support"
    ],
    cta: "Start Growth Plan",
    highlight: true
  },
  {
    name: "Enterprise",
    badge: "Custom",
    pricing: {
      monthly: 0,
      annual: 0
    },
    headline: "Compliance, security, and tailored onboarding.",
    description: "Dedicated environment for universities and learning businesses.",
    features: [
      "Unlimited everything + APIs",
      "Dedicated Customer Success",
      "On-prem or private cloud",
      "Custom AI guardrails & prompts",
      "SLA-backed uptime guarantees",
      "Security reviews & SSO"
    ],
    cta: "Talk to Sales",
    highlight: false
  }
];

const valuePillars = [
  {
    title: "AI Done Right",
    description: "Transparent prompts, configurable guardrails, and audit-ready logs.",
    icon: Shield
  },
  {
    title: "Ingest Anything",
    description: "YouTube, PDFs, DOCX, slides—every workflow goes into EduExtract.",
    icon: Layers
  },
  {
    title: "Speed + Accuracy",
    description: "Groq-powered pipelines with post-processing to keep answers clean.",
    icon: Gauge
  },
  {
    title: "Team-Ready",
    description: "Spaces, approvals, and analytics help admins stay in control.",
    icon: Users
  }
];

const enterpriseAssurances = [
  {
    title: "Enterprise Security",
    description: "SSO, SCIM, data residency options, least-privilege roles.",
    icon: Lock
  },
  {
    title: "Dedicated Support",
    description: "24/7 incident desk, onboarding specialists, custom success plans.",
    icon: PhoneCall
  },
  {
    title: "AI Governance",
    description: "Custom prompts, usage caps, compliance-ready audit logs.",
    icon: Wand2
  }
];

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState("monthly");

  const formatPrice = (plan) => {
    if (plan.name === "Enterprise") return "Custom";
    const value =
      billingCycle === "monthly"
        ? plan.pricing.monthly
        : plan.pricing.annual;
    return `$${value.toLocaleString()}`;
  };

  const billingSuffix = billingCycle === "monthly" ? "/month" : "/year";

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white dark:bg-[#0F0F0F] text-[#171717] dark:text-[#fafafa]">
        <div className="pt-32 pb-16 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f1f1f1] dark:bg-[#1f1f1f] text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-6">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              AI-native pricing built for learning teams
            </span>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Choose the plan that turns raw content into curated knowledge
            </h1>
            <p className="text-lg text-[#171717cc] dark:text-[#fafafacc]">
              Every plan taps into EduExtract&apos;s Groq-powered pipeline, smart preferences,
              and modular admin controls. Upgrade as your learning ecosystem scales.
            </p>
          </motion.div>

          <motion.div
            className="flex justify-center mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="inline-flex border border-gray-200 dark:border-[#2E2E2E] rounded-full p-1 bg-white dark:bg-[#121212] shadow-sm">
              {["monthly", "annual"].map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-5 py-2 text-sm font-semibold rounded-full transition-all ${
                    billingCycle === cycle
                      ? "bg-[#171717] text-white dark:bg-white dark:text-[#171717]"
                      : "text-[#171717cc] dark:text-[#fafafacc]"
                  }`}
                >
                  {cycle === "monthly" ? "Monthly" : "Annual (2 months free)"}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className={`relative rounded-3xl border p-8 flex flex-col h-full ${
                  plan.highlight
                    ? "bg-[#171717] text-white border-[#171717]"
                    : "bg-white dark:bg-[#141414] border-gray-200 dark:border-[#1f1f1f]"
                } shadow-lg`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc]">
                      {plan.badge}
                    </p>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                  </div>
                  {plan.highlight && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/10 border border-white/30">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  <p className={`text-sm ${plan.highlight ? "text-white/70" : "text-[#171717cc] dark:text-[#fafafacc]"}`}>
                    {plan.headline}
                  </p>
                  <div className="flex items-end gap-2 mt-4">
                    <span className="text-4xl font-bold">
                      {formatPrice(plan)}
                    </span>
                    {plan.name !== "Enterprise" && (
                      <span className={`text-sm font-medium ${plan.highlight ? "text-white/70" : "text-[#17171799] dark:text-[#fafafacc]"}`}>
                        {billingSuffix}
                      </span>
                    )}
                  </div>
                  <p className={`mt-3 text-sm ${plan.highlight ? "text-white/70" : "text-[#171717cc] dark:text-[#fafafacc]"}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          plan.highlight ? "text-emerald-300" : "text-emerald-500"
                        }`}
                      />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`mt-8 py-3 rounded-xl font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-white text-[#171717]"
                      : "bg-[#171717] text-white dark:bg-white dark:text-[#171717]"
                  }`}
                >
                  {plan.cta}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-[#F7F7F7] dark:bg-[#141414] py-20 px-4 sm:px-6 lg:px-10">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valuePillars.map((pillar) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4 }}
                className="p-6 rounded-2xl bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2E2E2E] shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-[#171717] dark:bg-white flex items-center justify-center mb-4">
                  <pillar.icon className="w-6 h-6 text-white dark:text-[#171717]" />
                </div>
                <h4 className="text-xl font-semibold mb-2">{pillar.title}</h4>
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="py-20 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="p-8 rounded-3xl bg-[#171717] text-white"
            >
              <h3 className="text-3xl font-bold mb-4">Need to justify the ROI?</h3>
              <p className="text-white/80 mb-6">
                Teams replacing their manual note taking with EduExtract save 8+ hours per course,
                generate structured study packs instantly, and unlock governance in one dashboard.
              </p>
              <ul className="space-y-3 text-white/80 text-sm">
                <li className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-emerald-300" />
                  3x faster content creation across summaries, slides, and quizzes
                </li>
                <li className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-emerald-300" />
                  Centralized review + approvals via Content Quality Hub
                </li>
                <li className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  Personalized outputs via preference-driven prompt builder
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="p-8 rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#121212]"
            >
              <h3 className="text-3xl font-bold mb-4">Enterprise grade from day one</h3>
              <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">
                The same governance layers that power Admin Hub analytics, mentor oversight,
                and flagged content review are included in our Enterprise offering.
              </p>
              <div className="space-y-4">
                {enterpriseAssurances.map((assurance) => (
                  <div key={assurance.title} className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F1F1F1] dark:bg-[#1c1c1c] flex items-center justify-center">
                      <assurance.icon className="w-5 h-5 text-[#171717] dark:text-[#fafafa]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{assurance.title}</h4>
                      <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        {assurance.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 w-full py-3 rounded-xl bg-[#171717] text-white dark:bg-white dark:text-[#171717] font-semibold"
              >
                Book an enterprise walkthrough
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pricing;

