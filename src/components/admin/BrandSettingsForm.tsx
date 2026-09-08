/* eslint-disable @next/next/no-img-element -- Admin previews must display configured SVG/CDN assets without transforming them. */
"use client";

import { useActionState } from "react";
import { selectBrandAsset, resetBrandAsset, uploadBrandAsset, type BrandActionState } from "@/app/admin/actions";
import type { BrandAsset, PublicBrandSettings } from "@/lib/brand/settings";
import { brandAssetKinds, getBrandAssetConfig, type BrandAssetKind } from "@/lib/media/brand-validation";

import { MediaPicker, type PickerMedia } from "./MediaPicker";

const initialState: BrandActionState = {};
const names: Record<BrandAssetKind, string> = { mainLogo: "Main Logo", compactLogo: "Compact Logo / Mark", favicon: "Favicon", socialLogo: "Social / OpenGraph Logo" };
const descriptions: Record<BrandAssetKind, string> = { mainLogo: "The primary logo used throughout the website.", compactLogo: "Optional compact mark for future square-brand placements.", favicon: "Browser tab and bookmark icon. A compact mark works best.", socialLogo: "Optional image used for social sharing previews." };

function AssetPreview({ asset, label }: { asset?: BrandAsset; label: string }) {
  if (!asset?.url) return <div className="brand-preview empty">Official static fallback<br />will be used</div>;
  return <div className="brand-preview"><img src={asset.url} alt={`${label} preview`} /></div>;
}

function BrandAssetCard({ kind, asset, media }: { kind: BrandAssetKind; asset?: BrandAsset; media: PickerMedia[] }) {
  const [selectionState, selectionAction, selecting] = useActionState(selectBrandAsset, initialState);
  const [state, action, pending] = useActionState(uploadBrandAsset, initialState); const [resetState, resetAction, resetting] = useActionState(resetBrandAsset, initialState); const config = getBrandAssetConfig(kind);
  return <section className="brand-asset-card"><div className="brand-asset-heading"><div><span>{kind === "mainLogo" ? "PRIMARY IDENTITY" : "OPTIONAL BRAND ASSET"}</span><h2>{names[kind]}</h2><p>{descriptions[kind]}</p></div></div><div className="brand-preview-grid"><div><small>ON WHITE</small><AssetPreview asset={asset} label={names[kind]} /></div>{kind === "mainLogo" && <div><small>ON DARK</small><div className="brand-preview dark">{asset?.url ? <img src={asset.url} alt="Main logo on dark background" /> : "Official static fallback will be used"}</div></div>}</div><form action={selectionAction} className="brand-upload-form"><input type="hidden" name="kind" value={kind} /><MediaPicker name="mediaId" label={names[kind]} items={media} accept="IMAGE" /><button disabled={selecting}>{selecting ? "Saving…" : "Use selected asset"}</button>{selectionState.error && <p role="alert">{selectionState.error}</p>}{selectionState.success && <p role="status">{selectionState.success}</p>}</form><form action={action} className="brand-upload-form"><input type="hidden" name="kind" value={kind} /><label className="brand-file-input"><span>Choose {names[kind]}</span><input name="file" type="file" accept={config.types.join(",")} required /></label><small>Accepted: {config.extensions.map((extension) => `.${extension}`).join(", ")} · Max {config.maxSize >= 1024 * 1024 ? `${config.maxSize / (1024 * 1024)} MB` : `${config.maxSize / 1024} KB`}</small><button type="submit" disabled={pending}>{pending ? "Uploading…" : asset ? "Replace asset" : "Upload asset"}</button>{state.error && <p className="admin-error" role="alert">{state.error}</p>}{state.success && <p className="brand-success" role="status">{state.success}</p>}</form>{asset && <form action={resetAction}><input type="hidden" name="kind" value={kind} /><button className="brand-reset" type="submit" disabled={resetting}>{resetting ? "Resetting…" : "Reset to official default"}</button>{resetState.error && <p className="admin-error" role="alert">{resetState.error}</p>}{resetState.success && <p className="brand-success" role="status">{resetState.success}</p>}</form>}</section>;
}

export function BrandSettingsForm({ settings, media }: { settings: PublicBrandSettings; media: PickerMedia[] }) { return <div className="brand-settings-grid">{brandAssetKinds.map((kind) => <BrandAssetCard key={kind} kind={kind} asset={settings[kind]} media={media} />)}</div>; }
