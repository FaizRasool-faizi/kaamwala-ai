"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, X, ImageIcon } from "lucide-react";

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  optionalLabel?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

/** Drag-and-drop or click to upload a single image */
export function ImageUploadField({
  label,
  hint,
  required = false,
  optionalLabel,
  value,
  onChange,
  error,
}: ImageUploadFieldProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) return;

      onChange(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    multiple: false,
  });

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {optionalLabel && <span className="text-gray-500 font-normal ml-1">({optionalLabel})</span>}
      </label>

      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-orange-500 bg-orange-500/10"
            : error
              ? "border-red-500/50"
              : "border-white/10 hover:border-orange-500/50"
        }`}
      >
        <input {...getInputProps()} />

        {preview || value ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview || ""}
              alt="Preview"
              className="mx-auto max-h-40 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <Camera className="w-10 h-10 mx-auto mb-2 text-gray-500" />
            <p className="text-sm text-gray-400">
              {isDragActive ? "Drop image here" : "Tap or drag to upload"}
            </p>
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
          </>
        )}
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
