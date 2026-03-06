import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 px-6 pb-6">
      <div className="mx-auto max-w-6xl rounded-xl border border-gray-200/70 bg-white/35 backdrop-blur-xl shadow-[0_12px_28px_rgba(15,23,42,0.08)] py-4">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <a
            href="https://github.com/Kirillr-Sibirski/convergence-chainlink"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white/70 p-1.5 text-gray-700 hover:text-gray-900 hover:bg-white transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://github.com/Kirillr-Sibirski/convergence-chainlink"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-gray-800"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
