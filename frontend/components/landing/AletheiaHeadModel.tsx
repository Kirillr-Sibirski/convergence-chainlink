"use client";

import { useEffect, useState } from "react";

export function AletheiaHeadModel() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const rotateY = Math.max(-35, Math.min(35, scrollY / 18 - 12));
  const rotateX = Math.max(-10, Math.min(10, 10 - scrollY / 80));

  return (
    <div className="relative mx-auto w-full max-w-[420px] aspect-square [perspective:1200px]">
      <div
        className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-white/90 via-gray-100 to-gray-200 border border-gray-300 shadow-[0_35px_80px_rgba(15,23,42,0.22)]"
        style={{
          transform: `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          transition: "transform 140ms linear",
        }}
      >
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden">
          <div className="absolute -top-16 -right-14 w-52 h-52 rounded-full bg-white/50 blur-2xl" />
          <div className="absolute -bottom-12 -left-10 w-40 h-40 rounded-full bg-black/8 blur-xl" />
        </div>

        <svg viewBox="0 0 320 320" className="absolute inset-0 w-full h-full p-8 text-gray-900">
          <path
            d="M170 34c56 0 93 46 93 108 0 52-26 97-68 121-20 11-44 17-70 17-34 0-56-12-56-31 0-14 10-24 24-31 15-8 22-18 22-35V110c0-42 26-76 55-76z"
            fill="url(#bustShade)"
          />
          <path
            d="M188 78c17 0 28 16 28 39 0 26-16 51-37 59-9 3-14 10-14 18v23c0 10-8 18-18 18-11 0-19-8-19-18V112c0-19 9-34 25-34h35z"
            fill="url(#faceShade)"
            opacity="0.95"
          />
          <path d="M188 122c6 0 10 5 10 11 0 7-5 12-11 12-6 0-11-5-11-12 0-6 5-11 12-11z" fill="#2a2a2a" />
          <path d="M198 166c-10 8-22 13-35 13" stroke="#2f2f2f" strokeWidth="4" strokeLinecap="round" fill="none" />
          <defs>
            <linearGradient id="bustShade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbfbfb" />
              <stop offset="45%" stopColor="#d7d9de" />
              <stop offset="100%" stopColor="#b8bcc5" />
            </linearGradient>
            <linearGradient id="faceShade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fdfdfd" />
              <stop offset="100%" stopColor="#c8ccd5" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute inset-x-12 -bottom-2 h-12 bg-black/20 blur-2xl rounded-full" />
    </div>
  );
}

