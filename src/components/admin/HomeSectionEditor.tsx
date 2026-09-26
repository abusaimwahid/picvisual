"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { MediaPicker, type PickerMedia } from "@/components/admin/MediaPicker";

type Value = Record<string, unknown>;
type Option = { id: string; label: string; detail?: string };
type Field = { key: string; label: string; multiline?: boolean; optional?: boolean };
type MediaField = { key: string; label: string; accept: "IMAGE" | "VIDEO"; slots?: number };

const textFields: Record<string, Field[]> = {
  hero: [{ key: "eyebrow", label: "Eyebrow" }, { key: "headline", label: "Heading" }, { key: "secondaryHeadline", label: "Secondary heading", optional: true }, { key: "description", label: "Description", multiline: true }],
  positioning: [{ key: "eyebrow", label: "Eyebrow", optional: true }, { key: "headline", label: "Heading" }, { key: "highlight", label: "Highlight text", optional: true }, { key: "body", label: "Body", multiline: true }],
  capabilities: [{ key: "eyebrow", label: "Eyebrow", optional: true }, { key: "heading", label: "Heading", optional: true }, { key: "description", label: "Description", multiline: true, optional: true }],
  beforeAfter: [{ key: "eyebrow", label: "Eyebrow", optional: true }, { key: "heading", label: "Heading" }, { key: "description", label: "Description", multiline: true, optional: true }, { key: "beforeLabel", label: "Before label" }, { key: "afterLabel", label: "After label" }],
  selectedWork: [{ key: "heading", label: "Heading" }, { key: "description", label: "Description", multiline: true, optional: true }, { key: "ctaLabel", label: "CTA label", optional: true }, { key: "ctaHref", label: "CTA link", optional: true }],
  productionWorkflow: [{ key: "eyebrow", label: "Eyebrow", optional: true }, { key: "heading", label: "Heading" }, { key: "description", label: "Description", multiline: true, optional: true }],
  whyPicVisual: [{ key: "eyebrow", label: "Eyebrow", optional: true }, { key: "heading", label: "Heading" }, { key: "description", label: "Description", multiline: true, optional: true }],
  faq: [{ key: "heading", label: "Heading" }, { key: "description", label: "Description", multiline: true, optional: true }],
  cta: [{ key: "eyebrow", label: "Eyebrow" }, { key: "heading", label: "Heading" }, { key: "body", label: "Body", multiline: true }, { key: "ctaLabel", label: "CTA label" }, { key: "ctaHref", label: "CTA link" }],
  motionShowcase: [{ key: "heading", label: "Heading" }],
  textMedia: [{ key: "heading", label: "Heading" }, { key: "body", label: "Body", multiline: true }],
  richText: [{ key: "heading", label: "Heading", optional: true }, { key: "body", label: "Body", multiline: true }],
};

for (const type of ["imagePost", "videoEdit", "motion", "product", "jewelry", "creative", "development"]) {
  textFields[type] = [{ key: "label", label: "Label" }, { key: "heading", label: "Heading" }, { key: "description", label: "Description", multiline: true }];
}

const mediaFields: Record<string, MediaField[]> = {
  hero: [{ key: "primaryMediaId", label: "Hero image", accept: "IMAGE" }, { key: "secondaryMediaId", label: "Secondary image", accept: "IMAGE" }, { key: "backgroundMediaId", label: "Background image", accept: "IMAGE" }, { key: "videoMediaId", label: "Hero video", accept: "VIDEO" }, { key: "posterMediaId", label: "Video poster", accept: "IMAGE" }, { key: "mobileMediaId", label: "Mobile image override", accept: "IMAGE" }],
  motionShowcase: [{ key: "mediaId", label: "Motion media", accept: "VIDEO" }],
  gallery: [{ key: "mediaIds", label: "Gallery images", accept: "IMAGE", slots: 20 }],
  positioning: [{ key: "mediaId", label: "Optional media", accept: "IMAGE" }],
  capabilities: [{ key: "mediaId", label: "Supporting media", accept: "IMAGE" }],
  beforeAfter: [{ key: "beforeMediaId", label: "Before image", accept: "IMAGE" }, { key: "afterMediaId", label: "After image", accept: "IMAGE" }, { key: "detailMediaId", label: "Detail image", accept: "IMAGE" }],
  textMedia: [{ key: "mediaId", label: "Media", accept: "IMAGE" }],
  video: [{ key: "mediaId", label: "Video", accept: "VIDEO" }, { key: "posterMediaId", label: "Poster", accept: "IMAGE" }],
  imagePost: [{ key: "rawMediaId", label: "Raw image", accept: "IMAGE" }, { key: "finishedMediaId", label: "Finished image", accept: "IMAGE" }, { key: "detailMediaIds", label: "Detail crops", accept: "IMAGE", slots: 3 }, { key: "mobileMediaId", label: "Mobile override", accept: "IMAGE" }],
  videoEdit: [{ key: "videoMediaId", label: "Main video", accept: "VIDEO" }, { key: "posterMediaId", label: "Poster", accept: "IMAGE" }, { key: "timelineMediaIds", label: "Timeline thumbnails", accept: "IMAGE", slots: 3 }, { key: "finalFrameMediaId", label: "Final frame", accept: "IMAGE" }, { key: "mobileVideoMediaId", label: "Mobile video override", accept: "VIDEO" }],
  motion: [{ key: "reelMediaIds", label: "Reel videos", accept: "VIDEO", slots: 3 }, { key: "posterMediaIds", label: "Reel posters", accept: "IMAGE", slots: 3 }, { key: "mobileMediaId", label: "Mobile override", accept: "IMAGE" }],
  product: [{ key: "sourceMediaId", label: "Source / raw", accept: "IMAGE" }, { key: "cutoutMediaId", label: "Cutout", accept: "IMAGE" }, { key: "shadowMediaId", label: "Shadow", accept: "IMAGE" }, { key: "finalMediaId", label: "Final PDP", accept: "IMAGE" }, { key: "campaignMediaId", label: "Campaign image", accept: "IMAGE" }, { key: "mobileMediaId", label: "Mobile override", accept: "IMAGE" }],
  jewelry: [{ key: "primaryMediaId", label: "Primary jewelry image", accept: "IMAGE" }, { key: "macroMediaId", label: "Macro / detail", accept: "IMAGE" }, { key: "supportingMediaId", label: "Supporting image", accept: "IMAGE" }, { key: "mobileMediaId", label: "Mobile override", accept: "IMAGE" }],
  creative: [{ key: "backgroundMediaId", label: "Background layer", accept: "IMAGE" }, { key: "subjectMediaId", label: "Subject layer", accept: "IMAGE" }, { key: "shadowMediaId", label: "Shadow layer", accept: "IMAGE" }, { key: "lightMediaId", label: "Light layer", accept: "IMAGE" }, { key: "textureMediaId", label: "Texture layer", accept: "IMAGE" }, { key: "finalMediaId", label: "Final composite", accept: "IMAGE" }, { key: "mobileMediaId", label: "Mobile composite", accept: "IMAGE" }],
  development: [{ key: "interfaceMediaId", label: "Main interface", accept: "IMAGE" }, { key: "fragmentMediaId", label: "Secondary fragment", accept: "IMAGE" }, { key: "screenshotMediaId", label: "Screenshot", accept: "IMAGE" }, { key: "backgroundMediaId", label: "Background visual", accept: "IMAGE" }, { key: "mobileMediaId", label: "Mobile fallback", accept: "IMAGE" }],
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="admin-primary-action" type="submit" disabled={pending}>{pending ? "Saving…" : "Save section"}</button>;
}

function ItemList({ name, value, onChange }: { name: string; value: unknown; onChange: (next: unknown) => void }) {
  const items = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
  const update = (index: number, patch: Record<string, unknown>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const move = (index: number, direction: -1 | 1) => {
    const next = [...items]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return <div className="admin-repeat-list">
    <div className="admin-subsection-heading"><div><strong>{name === "steps" ? "Workflow steps" : "Value items"}</strong><small>{items.length} items · expand a row to edit</small></div><button type="button" onClick={() => onChange([...items, { title: "", description: "", enabled: true }])}>＋ Add {name === "steps" ? "step" : "item"}</button></div>
    {items.map((entry, index) => <details className="admin-repeat-item" key={`${name}-${index}`}>
      <summary><span className="admin-drag-handle" aria-hidden="true">⠿</span><i>{String(index + 1).padStart(2, "0")}</i><strong>{String(entry.title || `Untitled ${name === "steps" ? "step" : "item"}`)}</strong><small>{entry.enabled === false ? "Hidden" : "Visible"}</small></summary>
      <div className="admin-repeat-fields"><label>Title<input value={String(entry.title ?? "")} onChange={(event) => update(index, { title: event.target.value })} /></label><label>Description<textarea value={String(entry.description ?? "")} onChange={(event) => update(index, { description: event.target.value })} rows={3} /></label><label className="admin-check"><input type="checkbox" checked={entry.enabled !== false} onChange={(event) => update(index, { enabled: event.target.checked })} /> Visible</label><div className="admin-inline-actions"><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Move up</button><button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)}>Move down</button><button className="admin-danger-text" type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div></div>
    </details>)}
  </div>;
}

export function HomeSectionEditor({ section, media, services, projects, faqs, action }: { section: { id: string; type: string; enabled: boolean; content: unknown }; media: PickerMedia[]; services: Option[]; projects: Option[]; faqs: Option[]; action: (formData: FormData) => void }) {
  const initial = useMemo(() => ({ ...((section.content && typeof section.content === "object" ? section.content : {}) as Value) }), [section.content]);
  const [content, setContent] = useState<Value>(initial);
  const update = (key: string, value: unknown) => setContent((current) => ({ ...current, [key]: value }));
  const type = section.type;
  const fields = textFields[type] ?? [];
  const choices = type === "capabilities" ? services : type === "selectedWork" ? projects : type === "faq" ? faqs : [];
  const choiceKey = type === "capabilities" ? "serviceIds" : type === "selectedWork" ? "projectIds" : "faqIds";
  const selectedChoices = Array.isArray(content[choiceKey]) ? content[choiceKey] as string[] : [];
  const toggleChoice = (id: string) => update(choiceKey, selectedChoices.includes(id) ? selectedChoices.filter((current) => current !== id) : [...selectedChoices, id]);
  const ctaValue = content.cta && typeof content.cta === "object" ? content.cta as Value : {};
  const payload = { ...content, ...(type === "selectedWork" ? { cta: content.ctaLabel || content.ctaHref || ctaValue.label ? { label: String(content.ctaLabel ?? ctaValue.label ?? ""), href: String(content.ctaHref ?? ctaValue.href ?? "") } : undefined } : {}), ...(type === "cta" ? { cta: { label: String(content.ctaLabel ?? ctaValue.label ?? ""), href: String(content.ctaHref ?? ctaValue.href ?? "") } } : {}) };
  delete (payload as Value).ctaLabel;
  delete (payload as Value).ctaHref;
  const displayControls = type === "hero" || type === "positioning" || type === "faq" || type === "textMedia";
  const fieldValue = (field: Field) => String(field.key === "ctaLabel" ? content[field.key] ?? ctaValue.label ?? "" : field.key === "ctaHref" ? content[field.key] ?? ctaValue.href ?? "" : content[field.key] ?? "");

  return <form action={action} className="admin-card admin-content-form admin-section-form">
    <input type="hidden" name="id" value={section.id} />
    <input type="hidden" name="type" value={type} />
    <input type="hidden" name="content" value={JSON.stringify(payload)} />

    {fields.length > 0 && <section className="admin-editor-group"><div className="admin-editor-group-title"><span>CONTENT</span><h3>Copy and messaging</h3><p>The text visitors see in this scene.</p></div><div className="admin-editor-field-grid">{fields.map((field) => <label className={field.multiline ? "is-wide" : ""} key={field.key}>{field.label}{field.optional && <small>Optional</small>}{field.multiline ? <textarea value={fieldValue(field)} onChange={(event) => update(field.key, event.target.value)} rows={4} /> : <input value={fieldValue(field)} onChange={(event) => update(field.key, event.target.value)} />}</label>)}</div>
      {type === "hero" && <div className="admin-editor-field-grid"><label>Primary CTA label<input value={String(((content.primaryCta ?? {}) as Value).label ?? "")} onChange={(event) => update("primaryCta", { ...((content.primaryCta ?? {}) as Value), label: event.target.value })} /></label><label>Primary CTA link<input value={String(((content.primaryCta ?? {}) as Value).href ?? "")} onChange={(event) => update("primaryCta", { ...((content.primaryCta ?? {}) as Value), href: event.target.value })} /></label><label>Secondary CTA label<input value={String(((content.secondaryCta ?? {}) as Value).label ?? "")} onChange={(event) => update("secondaryCta", { ...((content.secondaryCta ?? {}) as Value), label: event.target.value })} /></label><label>Secondary CTA link<input value={String(((content.secondaryCta ?? {}) as Value).href ?? "")} onChange={(event) => update("secondaryCta", { ...((content.secondaryCta ?? {}) as Value), href: event.target.value })} /></label></div>}
    </section>}

    {(mediaFields[type] ?? []).length > 0 && <section className="admin-editor-group"><div className="admin-editor-group-title"><span>MEDIA</span><h3>Assigned assets</h3><p>Choose approved media. Thumbnails and metadata confirm the current selection.</p></div><div className="admin-media-field-grid">{(mediaFields[type] ?? []).map((field) => {
      const selected = content[field.key];
      const values = Array.isArray(selected) ? selected as string[] : [];
      return field.slots ? <MediaPicker key={field.key} name={field.key} label={`${field.label} · up to ${field.slots}`} accept={field.accept} items={media} multiple selectedIds={values} onChangeMultiple={(ids) => update(field.key, ids.slice(0, field.slots))} /> : <MediaPicker key={field.key} name={field.key} label={field.label} accept={field.accept} items={media} selectedId={typeof selected === "string" ? selected : ""} onChange={(id) => update(field.key, id || undefined)} />;
    })}</div></section>}

    {choices.length > 0 && <section className="admin-editor-group"><div className="admin-editor-group-title"><span>COLLECTION</span><h3>{type === "selectedWork" ? "Selected projects" : type === "faq" ? "FAQ selection" : "Linked services"}</h3><p>Choose the records used by this homepage section.</p></div><div className="admin-choice-list">{choices.map((choice, index) => <label className="admin-choice-row" key={choice.id}><input type="checkbox" checked={selectedChoices.includes(choice.id)} onChange={() => toggleChoice(choice.id)} /><i>{String(index + 1).padStart(2, "0")}</i><span><strong>{choice.label}</strong>{choice.detail && <small>{choice.detail}</small>}</span></label>)}</div></section>}

    {(type === "capabilities" || type === "productionWorkflow" || type === "whyPicVisual") && <section className="admin-editor-group"><div className="admin-editor-group-title"><span>ITEMS</span><h3>Repeating content</h3><p>Expand only the item you need to update.</p></div><ItemList name={type === "productionWorkflow" ? "steps" : "items"} value={content[type === "productionWorkflow" ? "steps" : "items"]} onChange={(value) => update(type === "productionWorkflow" ? "steps" : "items", value)} /></section>}

    {displayControls && <details className="admin-advanced-settings"><summary><span><strong>Layout and display</strong><small>Theme, motion and presentation settings</small></span><i>⌄</i></summary><div className="admin-editor-field-grid">
      {type === "hero" && <><label>Hero type<select value={String(content.mediaMode ?? "AUTO")} onChange={(event) => update("mediaMode", event.target.value)}><option value="AUTO">Auto — video preferred</option><option value="IMAGE">Image</option><option value="VIDEO">Video</option></select></label><label>Overlay strength<select value={String(content.overlayStrength ?? "medium")} onChange={(event) => update("overlayStrength", event.target.value)}><option value="soft">Soft</option><option value="medium">Medium</option><option value="strong">Strong</option></select></label><label>Motion preset<select value={String(content.motionPreset ?? "standard")} onChange={(event) => update("motionPreset", event.target.value)}><option value="subtle">Subtle</option><option value="standard">Standard</option><option value="expressive">Expressive</option></select></label><label>Motion intensity<select value={String(content.motionIntensity ?? "medium")} onChange={(event) => update("motionIntensity", event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></>}
      {type === "positioning" && <label>Theme preset<select value={String(content.theme ?? "LIGHT")} onChange={(event) => update("theme", event.target.value)}><option value="LIGHT">Light</option><option value="DARK">Dark</option><option value="BRAND">Brand</option></select></label>}
      {type === "faq" && <label>Display mode<select value={String(content.displayMode ?? "ALL_ENABLED")} onChange={(event) => update("displayMode", event.target.value)}><option value="ALL_ENABLED">All enabled</option><option value="SELECTED">Selected FAQ items</option></select></label>}
      {type === "textMedia" && <label>Layout preset<select value={String(content.preset ?? "editorial")} onChange={(event) => update("preset", event.target.value)}><option value="media-left">Media left</option><option value="media-right">Media right</option><option value="full-bleed">Full bleed</option><option value="editorial">Editorial</option></select></label>}
    </div></details>}

    <footer className="admin-section-save"><div><input type="hidden" name="enabled" value="false" /><label className="admin-switch"><input name="enabled" type="checkbox" value="true" defaultChecked={section.enabled} /><span aria-hidden="true" /><b>Show section on homepage</b></label><small>Saving updates the draft only.</small></div><SubmitButton /></footer>
  </form>;
}
