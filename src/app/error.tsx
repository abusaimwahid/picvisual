"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="inner-page status-page"><span className="eyebrow">PICVISUAL</span><h1>Let’s try that again.</h1><p>This page could not load. Please retry or email info@picvisual.com.</p><div className="hero-actions"><button className="button" onClick={reset}>Try again</button><Link href="/">Back to home ↗</Link></div></main>; }
