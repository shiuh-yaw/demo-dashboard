"use client";

/**
 * Single source for the Logo control, shared by AppearanceForm's Branding
 * subsection and any host that owns the logo field in its own section (e.g.
 * prospect Basic Info). Three input paths in one control: drag-and-drop,
 * click-to-upload, and paste-a-URL. Encodes uploads as a data: URL (no blob
 * store) - bounded to keep the stored payload small; the server normalizes
 * and re-hosts on save (see lib/normalize-logo.ts).
 */

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { Input } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";
import { Field } from "@/app/(operator)/checkouts/components/editor/form-components";
import { suppressAutofill } from "@/lib/suppress-autofill";
import { validateLogoFile } from "@/components/shared/logo-field-validation";
import { LogoOptions } from "@/components/shared/logo-options";

export interface LogoFieldProps {
  /** Current logo value - a URL or a data: URL from a prior upload. */
  value: string;
  onChange: (logo: string) => void;
  setToast: (message: string) => void;
  /** Preview swatch background - matches the theme's page background. */
  previewBackground?: string;
  /** Company website. Enables the candidate picker; omit to hide it. */
  websiteUrl?: string;
}

export function LogoField({
  value,
  onChange,
  setToast,
  previewBackground,
  websiteUrl,
}: LogoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  // A new value (upload, drop, or URL edit) may load fine even if the prior
  // one didn't - give it a fresh chance to render.
  useEffect(() => setThumbnailFailed(false), [value]);

  function processFile(file: File) {
    const error = validateLogoFile(file);
    if (error) {
      setToast(error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.onerror = () => setToast("Could not read logo file");
    reader.readAsDataURL(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (file) processFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={handleFileInput}
    />
  );

  return (
    <div>
      <Field label="Logo">
        {value ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-input bg-background p-2 transition-colors",
              isDragOver && "border-primary bg-accent/50",
            )}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
              style={{ backgroundColor: previewBackground || "#f6f8fa" }}
            >
              {thumbnailFailed ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={value}
                  alt="Logo thumbnail"
                  className="max-h-full max-w-full object-contain"
                  onError={() => setThumbnailFailed(true)}
                />
              )}
            </div>
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {value.startsWith("data:") ? "Uploaded image" : value}
            </p>
            <button
              type="button"
              onClick={openFilePicker}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Remove logo"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {hiddenFileInput}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop an image or click to upload a logo"
            onClick={openFilePicker}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFilePicker();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-background px-4 py-6 text-center transition-colors hover:bg-accent/50",
              isDragOver && "border-primary bg-accent/50",
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">
              Drag and drop a logo, or click to upload
            </p>
            <p className="text-[11px] text-muted-foreground">
              PNG, JPG, or SVG, up to 512 KB
            </p>
            {hiddenFileInput}
          </div>
        )}
      </Field>
      <Input
        type="url"
        value={value.startsWith("data:") ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="or paste an image URL"
        className="mt-2"
        {...suppressAutofill}
      />
      {websiteUrl ? (
        <LogoOptions
          websiteUrl={websiteUrl}
          value={value}
          onSelect={onChange}
        />
      ) : null}
    </div>
  );
}
