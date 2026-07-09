import { useState } from "react";
import { motion } from "motion/react";
import { Dice5, Sparkles } from "lucide-react";
import { COUNTRIES } from "../../game/data";
import type { Gender } from "../../game/types";

export function StartScreen({
  onStart,
}: {
  onStart: (input: { name?: string; gender?: Gender; country?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | "random">("random");
  const [country, setCountry] = useState<string>("random");

  const begin = () =>
    onStart({
      name: name || undefined,
      gender: gender === "random" ? undefined : gender,
      country: country === "random" ? undefined : country,
    });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-strong w-full max-w-md rounded-3xl p-8"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> A choice-driven life
          </div>
          <h1 className="text-4xl font-bold">
            <span className="text-gradient">Life Legacy</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Live an entire life, one year at a time. Every decision shapes your legacy.
          </p>
        </div>

        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Leave blank for a random name"
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-primary/60"
        />

        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Gender</label>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(["male", "female", "random"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                gender === g
                  ? "border-primary/70 bg-primary/15 text-foreground"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Country</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mb-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-primary/60"
        >
          <option value="random">Random</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={begin}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <Dice5 className="h-4 w-4" /> Begin Life
        </button>
      </motion.div>
    </div>
  );
}
