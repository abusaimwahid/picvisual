"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CmsImage } from "@/components/ui/CmsImage";
import { HomeSectionActions } from "@/components/admin/HomeSectionActions";
import { HomeSectionEditor } from "@/components/admin/HomeSectionEditor";
import { HomepagePublishActions } from "@/components/admin/HomepagePublishActions";
import { StatusBadge } from "@/components/admin/AdminPrimitives";
import type { PickerMedia } from "@/components/admin/MediaPicker";

type Option = { id: string; label: string; detail?: string };
type FormAction = (formData: FormData) => void | Promise<void>;
type Section = {
  id: string;
  type: string;
  order: number;
  enabled: boolean;
  content: unknown;
  canMoveUp: boolean;
  canMoveDown: boolean;
  deletable: boolean;
};
type Definition = { type: string; label: string; description: string; editor: "form" | "collection" | "media" };
type Revision = { id: string; state: "PUBLISHED" | "DRAFT"; createdAt: string; author: string };

function contentRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function sectionMediaIds(section: Section) {
  const content = contentRecord(section.content);
  return Object.entries(content).flatMap(([key, value]) => {
    if (!/(MediaId|MediaIds)$/.test(key)) return [];
    if (typeof value === "string" && value) return [value];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item)) : [];
  });
}

function hasUsefulCopy(section: Section) {
  const content = contentRecord(section.content);
  return ["headline", "heading", "body", "description", "label"].some((key) => typeof content[key] === "string" && String(content[key]).trim().length > 0);
}

export function HomepageWorkspace({
  sections,
  definitions,
  media,
  services,
  projects,
  faqs,
  revisions,
  initialSectionId,
  pageStatus,
  publicationSummary,
  pending,
  addSection,
  saveSection,
  moveSection,
  duplicateSection,
  deleteSection,
  restoreRevision,
  publish,
}: {
  sections: Section[];
  definitions: Definition[];
  media: PickerMedia[];
  services: Option[];
  projects: Option[];
  faqs: Option[];
  revisions: Revision[];
  initialSectionId?: string;
  pageStatus: string;
  publicationSummary: string;
  pending: boolean;
  addSection: FormAction;
  saveSection: FormAction;
  moveSection: FormAction;
  duplicateSection: FormAction;
  deleteSection: FormAction;
  restoreRevision: FormAction;
  publish: () => Promise<void>;
}) {
  const validInitial = sections.some((section) => section.id === initialSectionId) ? initialSectionId : sections[0]?.id;
  const [selectedId, setSelectedId] = useState(validInitial);
  const [filter, setFilter] = useState("");
  const selected = sections.find((section) => section.id === selectedId) ?? sections[0];
  const definitionsByType = useMemo(() => new Map(definitions.map((definition) => [definition.type, definition])), [definitions]);
  const mediaById = useMemo(() => new Map(media.map((item) => [item.id, item])), [media]);
  const filtered = sections.filter((section) => (definitionsByType.get(section.type)?.label ?? section.type).toLowerCase().includes(filter.trim().toLowerCase()));
  const choose = (id: string) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("section", id);
    window.history.replaceState({}, "", url);
  };

  if (!selected) return null;
  const selectedDefinition = definitionsByType.get(selected.type);
  return <section className="admin-content admin-homepage-content">
    <header className="admin-workspace-heading">
      <div><span className="admin-kicker">CONTENT / HOME</span><h1>Homepage</h1><p>Organize the page, edit one scene at a time, then preview and publish the saved draft.</p></div>
      <div className="admin-workspace-state"><span><StatusBadge value={pageStatus} />{pending && <StatusBadge value="UNPUBLISHED CHANGES" />}</span><small>{publicationSummary}</small></div>
      <HomepagePublishActions publish={publish} />
    </header>
    <div className="admin-home-workspace">
      <aside className="admin-home-navigator" aria-label="Homepage sections">
        <div className="admin-home-nav-heading"><div><span className="admin-kicker">SECTIONS</span><strong>{sections.length} scenes</strong></div><span>{sections.filter((section) => section.enabled).length} visible</span></div>
        <label className="admin-section-search"><span className="sr-only">Filter homepage sections</span><input type="search" placeholder="Find a section…" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
        <div className="admin-section-list" role="listbox" aria-label="Select a homepage section">
          {filtered.map((section) => {
            const definition = definitionsByType.get(section.type);
            const ids = sectionMediaIds(section);
            const thumbnail = ids.map((id) => mediaById.get(id)).find((item) => item?.mediaType === "IMAGE");
            const mediaExpected = section.type === "hero" || definition?.editor === "media";
            const completeness = !section.enabled ? "Hidden" : !hasUsefulCopy(section) && definition?.editor !== "media" ? "Copy needed" : mediaExpected && !ids.length ? "Missing media" : "Complete";
            return <button key={section.id} type="button" role="option" aria-selected={section.id === selected.id} className="admin-section-row" onClick={() => choose(section.id)}>
              <span className="admin-section-grip" aria-hidden="true">⠿</span>
              <span className="admin-section-thumb">{thumbnail ? <CmsImage asset={thumbnail} sizes="42px" /> : <i>{String(section.order + 1).padStart(2, "0")}</i>}</span>
              <span className="admin-section-row-copy"><strong>{definition?.label ?? section.type}</strong><small>{definition?.editor === "media" ? "Media scene" : definition?.editor === "collection" ? "Collection" : "Content"}</small></span>
              <span className={`admin-completeness is-${completeness.toLowerCase().replaceAll(" ", "-")}`}>{completeness}</span>
            </button>;
          })}
        </div>
        <details className="admin-add-section"><summary>＋ Add section</summary><form action={addSection}><label>Section type<select name="type">{definitions.map((entry) => <option key={entry.type} value={entry.type}>{entry.label}</option>)}</select></label><button type="submit">Add to homepage</button></form></details>
      </aside>

      <main className="admin-selected-editor">
        <header className="admin-selected-section-heading">
          <div><span className="admin-kicker">SECTION {String(selected.order + 1).padStart(2, "0")}</span><h2>{selectedDefinition?.label ?? selected.type}</h2><p>{selectedDefinition?.description ?? "Edit this homepage section."}</p></div>
          <div><StatusBadge value={selected.enabled ? "VISIBLE" : "HIDDEN"} /><HomeSectionActions id={selected.id} label={selectedDefinition?.label ?? selected.type} deletable={selected.deletable} canMoveUp={selected.canMoveUp} canMoveDown={selected.canMoveDown} move={moveSection} duplicate={duplicateSection} remove={deleteSection} /></div>
        </header>
        <HomeSectionEditor key={selected.id} section={{ id: selected.id, type: selected.type, enabled: selected.enabled, content: selected.content }} media={media} services={services} projects={projects} faqs={faqs} action={saveSection} />
      </main>

      <aside className="admin-home-context">
        <section><span className="admin-kicker">PUBLISHING</span><h2>Saved workspace</h2><p>The live homepage changes only after Publish. Preview always opens the latest saved draft.</p><Link href="/admin/homepage/preview" target="_blank">Open draft preview ↗</Link><Link href="/" target="_blank">View live homepage ↗</Link></section>
        <details><summary>Revision history <span>{revisions.length}</span></summary><div className="admin-context-revisions">{revisions.length ? revisions.map((revision) => <article key={revision.id}><div><StatusBadge value={revision.state} /><strong>{revision.createdAt}</strong><small>{revision.author}</small></div><form action={restoreRevision}><input type="hidden" name="revisionId" value={revision.id} /><button type="submit">Restore to draft</button></form></article>) : <p>No homepage snapshots yet.</p>}</div></details>
      </aside>
    </div>
  </section>;
}
