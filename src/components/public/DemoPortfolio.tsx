import { demoPortfolio } from "@/content/demo-media";
import { CmsImage } from "@/components/ui/CmsImage";

export function DemoPortfolio({ compact = false }: { compact?: boolean }) {
  return <section className={`demo-portfolio${compact ? " is-compact" : ""}`} aria-labelledby={compact ? "demo-portfolio-compact" : "demo-portfolio-title"}>
    <header>
      <span>SAMPLE WORK / CONCEPT PRESENTATION</span>
      <h2 id={compact ? "demo-portfolio-compact" : "demo-portfolio-title"}>{compact ? "A preview of the storytelling system." : "A visual standard ready for real work."}</h2>
      <p>These unbranded sample concepts demonstrate how published work will be presented. They are not client projects, and the first published CMS projects replace this showcase automatically.</p>
    </header>
    <div className="demo-portfolio-grid">
      {demoPortfolio.map((item) => <article key={item.title} data-public-reveal>
        <figure><CmsImage asset={item.asset} sizes="(max-width: 800px) 100vw, 55vw" /><span>CONCEPT</span></figure>
        <div><small>{item.category} · {item.scope}</small><h3>{item.title}</h3><p>{item.summary}</p></div>
      </article>)}
    </div>
  </section>;
}
