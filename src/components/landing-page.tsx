"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const steps = [
  ["01", "Issue", "An authorized institution issues a signed credential to a verified student identity."],
  ["02", "Own", "The student holds the credential in their own wallet."],
  ["03", "Share", "The student presents a credential ID or signed JSON to a verifier."],
  ["04", "Verify", "Anyone can check the proof and current lifecycle status publicly."],
];

const security = [
  ["Server-side signing", "Issuer signing material stays outside the browser."],
  ["Role-based access", "Student, issuer, and admin permissions remain separate."],
  ["Institution scoping", "Privileged actions are restricted to the institution."],
  ["Tamper detection", "Signed content changes are detected during verification."],
  ["Lifecycle control", "Credentials can be revoked, superseded, or expired."],
  ["Audit records", "Privileged actions are recorded for later review."],
];

/* ------------------------------------------------------------------ */
/*  Decorative: animated node network, hero-scoped, traces a soft V   */
/*  and reaches toward the cursor. Colors are read from the project's */
/*  own theme tokens (--color-primary / --color-accent-foreground /   */
/*  --color-foreground) so it always matches the live palette.        */
/*  Purely visual — no pointer events, no effect on layout or links.  */
/* ------------------------------------------------------------------ */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  anchor: boolean;
  hue: "primary" | "accent" | "ink";
  phase: number;
};

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full || "172033", 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function NeuronField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const colorsRef = useRef({ primary: "#c8102e", accent: "#1c7c54", ink: "#172033" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pull live theme tokens so the network always matches the site's palette.
    const rootStyles = getComputedStyle(document.documentElement);
    colorsRef.current = {
      primary: rootStyles.getPropertyValue("--color-primary").trim() || "#c8102e",
      accent: rootStyles.getPropertyValue("--color-accent-foreground").trim() || "#1c7c54",
      ink: rootStyles.getPropertyValue("--color-foreground").trim() || "#172033",
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const buildParticles = (w: number, h: number) => {
      const particles: Particle[] = [];

      // Ambient floating nodes — quiet, neutral ink tone
      const count = Math.max(16, Math.min(38, Math.round((w * h) / 30000)));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          r: 1.1 + Math.random() * 1.4,
          anchor: false,
          hue: "ink",
          phase: Math.random() * Math.PI * 2,
        });
      }

      // Anchor nodes tracing a soft "V" — two arms converging near bottom-center,
      // echoing the red/green brand pair used in the diagram card and pills.
      const apexX = w * 0.52;
      const apexY = h * 0.92;
      const armPoints = 7;
      for (let i = 0; i < armPoints; i++) {
        const t = i / (armPoints - 1);
        particles.push({
          x: apexX - t * (w * 0.34),
          y: apexY - t * (h * 0.72),
          vx: 0,
          vy: 0,
          r: 2 + (1 - t) * 1.1,
          anchor: true,
          hue: "primary",
          phase: Math.random() * Math.PI * 2,
        });
        particles.push({
          x: apexX + t * (w * 0.3),
          y: apexY - t * (h * 0.72),
          vx: 0,
          vy: 0,
          r: 2 + (1 - t) * 1.1,
          anchor: true,
          hue: "accent",
          phase: Math.random() * Math.PI * 2,
        });
      }

      particlesRef.current = particles;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles(rect.width, rect.height);
    };

    const colorFor = (hue: Particle["hue"], alpha: number) => {
      const c = colorsRef.current;
      if (hue === "primary") return hexToRgba(c.primary, alpha);
      if (hue === "accent") return hexToRgba(c.accent, alpha);
      return hexToRgba(c.ink, alpha);
    };

    const drawFrame = (t: number) => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      if (!reduceMotion) {
        for (const p of particles) {
          if (p.anchor) {
            p.y += Math.sin(t / 1500 + p.phase) * 0.018;
            continue;
          }
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;

          if (mouse.active) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 140 && dist > 0.001) {
              p.vx += (dx / dist) * 0.0022;
              p.vy += (dy / dist) * 0.0022;
            }
          }
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 0.45) {
            p.vx = (p.vx / speed) * 0.45;
            p.vy = (p.vy / speed) * 0.45;
          }
        }
      }

      // faint ambient connective threads
      const maxDist = 112;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const bothAnchor = a.anchor && b.anchor;
            const alpha = (1 - dist / maxDist) * (bothAnchor ? 0.38 : 0.09);
            const hue = bothAnchor ? a.hue : "ink";
            ctx.strokeStyle = colorFor(hue, alpha);
            ctx.lineWidth = bothAnchor ? 1 : 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // cursor reach — soft threads from pointer to nearby nodes, red spark at tip
      if (mouse.active) {
        for (const p of particles) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.32;
            ctx.strokeStyle = colorFor("ink", alpha);
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
        const pulse = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 22);
        pulse.addColorStop(0, colorFor("primary", 0.35));
        pulse.addColorStop(1, colorFor("primary", 0));
        ctx.fillStyle = pulse;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // nodes
      for (const p of particles) {
        ctx.shadowBlur = p.anchor ? 7 : 0;
        ctx.shadowColor = colorFor(p.hue, 0.5);
        ctx.fillStyle = colorFor(p.hue, p.anchor ? 0.85 : 0.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    resize();

    if (reduceMotion) {
      drawFrame(0);
    } else {
      const loop = (t: number) => {
        drawFrame(t);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }

    const onResize = () => resize();
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("resize", onResize);
    canvas.parentElement?.addEventListener("mousemove", onMove);
    canvas.parentElement?.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.parentElement?.removeEventListener("mousemove", onMove);
      canvas.parentElement?.removeEventListener("mouseleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Decorative: a very soft warm light that follows the cursor. Reads */
/*  the brand red directly from your CSS so it never looks bolted on. */
/*  No blend mode needed on a light page — plain low-alpha overlay.   */
/* ------------------------------------------------------------------ */

function CursorGlow() {
  const [pos, setPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY, visible: true });
    const onLeave = () => setPos((p) => ({ ...p, visible: false }));
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 460,
        height: 460,
        marginLeft: -230,
        marginTop: -230,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        background:
          "radial-gradient(circle, rgba(200,16,46,0.05) 0%, rgba(28,124,84,0.03) 45%, rgba(0,0,0,0) 72%)",
        opacity: pos.visible ? 1 : 0,
        transition: "opacity 320ms ease",
        pointerEvents: "none",
        zIndex: 2147483000,
        willChange: "transform",
      }}
    />
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing-page">
      <header className={`landing-nav ${scrolled ? "landing-nav-scrolled" : ""}`}>
        <div className="landing-container landing-nav-inner">
          <a href="#top" className="landing-brand"><Image src="/v_logo.png" alt="VIGYAN.ID" width={150} height={41} priority /></a>
          <nav className="landing-links" aria-label="Primary navigation">
            <a href="#how-it-works">How it works</a><a href="#security">Security</a><a href="#students">For students</a><a href="#institutions">For institutions</a>
          </nav>
          <div className="landing-actions"><Link href="/verify" className="landing-btn landing-btn-ghost vg-btn-ghost">Verify credential</Link><Link href="/login" className="landing-btn landing-btn-primary vg-btn-primary">Sign in</Link></div>
        </div>
      </header>

      <main id="top">
        <section className="landing-hero" style={{ position: "relative", overflow: "hidden" }}>
          <NeuronField />
          <div className="landing-container landing-hero-grid" style={{ position: "relative", zIndex: 1 }}><div>
          <p className="landing-eyebrow vg-anim vg-anim-1">Decentralized academic identity</p>
          <h1 className="vg-anim vg-anim-2">Your credentials.<br />Your identity.<br />Your proof.</h1>
          <p className="landing-sub vg-anim vg-anim-3">VIGYAN.ID turns institutional credentials into cryptographically verifiable digital records — held by the student, not locked inside a registrar&apos;s database.</p>
          <p className="landing-tagline vg-anim vg-anim-4"><b>Issue.</b> Own. Share. Verify.</p>
          <div className="landing-cta-row vg-anim vg-anim-5"><Link href="/verify" className="landing-btn landing-btn-primary vg-btn-primary">Verify a credential</Link><Link href="/login" className="landing-btn landing-btn-ghost vg-btn-ghost">Student or issuer sign in</Link></div>
        </div><div className="landing-diagram vg-anim vg-anim-4"><div className="landing-diagram-card vg-card-glow"><div className="landing-diagram-center">V</div>{["DID identity", "Signed credential", "Student wallet", "Institution", "Public verifier"].map((label, i) => <div key={label} className={`landing-node landing-node-${i}`}><span>{label}</span></div>)}</div></div></div>
        </section>

        <section className="landing-trust"><div className="landing-container landing-trust-grid">{["Institution-backed", "Cryptographically verifiable", "Student-owned wallet", "Public verification"].map((item) => <span key={item}>● {item}</span>)}</div></section>

        <section className="landing-section" id="how-it-works"><div className="landing-container"><p className="landing-kicker">How it works</p><h2>Issue. Own. Share. Verify.</h2><p className="landing-lede">A credential moves from institution to student to verifier without losing its proof of authenticity.</p><div className="landing-steps">{steps.map(([number, title, body]) => <article key={number} className="vg-step-card"><div className="landing-step-number">{number}</div><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

        <section className="landing-section landing-section-soft" id="students"><div className="landing-container landing-two-col"><div><p className="landing-kicker">Public verification</p><h2>Verify the credential. Not the screenshot.</h2><p className="landing-lede">The verification flow checks cryptographic proof and current lifecycle state — not just what a document claims.</p><div className="landing-pills">{["Verified", "Revoked", "Superseded", "Expired", "Invalid"].map((s) => <span key={s} className="vg-pill">{s}</span>)}</div><Link href="/verify" className="landing-btn landing-btn-primary vg-btn-primary">Open verifier</Link></div><div className="landing-verification-card vg-card-glow"><div><span>CREDENTIAL</span><span>VIGYAN.ID</span></div><p><span>Holder</span><b>Student wallet</b></p><p><span>Issuer</span><b>Institution DID</b></p><p><span>Proof</span><b>Ed25519 signature</b></p><strong>✓ Verification checks passed</strong></div></div></section>

        <section className="landing-section" id="security"><div className="landing-container"><p className="landing-kicker">Security</p><h2>Security at every critical boundary.</h2><p className="landing-lede">The current prototype uses did:key identities, Ed25519 signing, server-side secrets, institution scoping, and auditable workflows.</p><div className="landing-security-grid">{security.map(([title, body]) => <article key={title} className="vg-step-card"><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

        <section className="landing-section landing-cta-section" id="institutions"><div className="landing-container landing-cta"><h2>Built for students, issuers, and verifiers.</h2><p>Students create accounts and hold credentials. Authorized university issuers sign and manage them. Anyone can verify a shared credential without an account.</p><div className="landing-cta-row"><Link href="/login" className="landing-btn landing-btn-primary vg-btn-primary">Student / issuer login</Link><Link href="/verify" className="landing-btn landing-btn-dark-ghost vg-btn-ghost">Verify publicly</Link></div></div></section>
      </main>
      <footer className="landing-footer"><div className="landing-container"><Image src="/v_logo.png" alt="VIGYAN.ID" width={130} height={36} /><p>Issue. Own. Share. Verify. · Hack2Innovate 2026 · Team Vigyan</p></div></footer>

      <CursorGlow />

      <style jsx global>{`
        .vg-anim {
          animation: vgRise 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .vg-anim-1 { animation-delay: 40ms; }
        .vg-anim-2 { animation-delay: 120ms; }
        .vg-anim-3 { animation-delay: 200ms; }
        .vg-anim-4 { animation-delay: 280ms; }
        .vg-anim-5 { animation-delay: 360ms; }

        @keyframes vgRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .vg-btn-primary {
          transition: box-shadow 220ms ease, transform 220ms ease;
        }
        .vg-btn-primary:hover {
          box-shadow: 0 10px 26px -10px rgba(200, 16, 46, 0.55);
        }
        .vg-btn-ghost {
          transition: box-shadow 220ms ease, transform 220ms ease;
        }
        .vg-btn-ghost:hover {
          transform: translateY(-1px);
        }

        .vg-pill {
          display: inline-block;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .vg-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px -8px rgba(23, 32, 51, 0.25);
        }

        .vg-step-card {
          transition: transform 220ms ease, box-shadow 220ms ease;
        }
        .vg-step-card:hover {
          transform: translateY(-3px);
        }

        .vg-card-glow {
          transition: box-shadow 260ms ease;
        }
        .vg-card-glow:hover {
          box-shadow: 0 24px 56px -26px rgba(200, 16, 46, 0.28);
        }

        @media (prefers-reduced-motion: reduce) {
          .vg-anim {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .vg-btn-primary:hover,
          .vg-btn-ghost:hover,
          .vg-pill:hover,
          .vg-step-card:hover,
          .vg-card-glow:hover {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}