import React, { useState, useRef } from "react";
import { ImageData } from "../types/workshop";
import { imageService } from "../services/imageService";

interface ImageUploadProps {
  onImageUploaded: (image: ImageData) => void;
  onError?: (error: string) => void;
  className?: string;
  showPreview?: boolean;
  defaultImage?: ImageData;
  allowCaption?: boolean;
  allowAltText?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  onError,
  className = "",
  showPreview = true,
  defaultImage,
  allowCaption = true,
  allowAltText = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    defaultImage?.url || null,
  );
  const [caption, setCaption] = useState(defaultImage?.caption || "");
  const [altText, setAltText] = useState(defaultImage?.altText || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = imageService.validateImage(file);
    if (!validation.valid) {
      onError?.(validation.error || "Invalid file");
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      const uploadedImage = await imageService.uploadImage(
        file,
        caption,
        altText,
      );
      onImageUploaded(uploadedImage);
      // Clean up the object URL
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Failed to upload image",
      );
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const validation = imageService.validateImage(file);
    if (!validation.valid) {
      onError?.(validation.error || "Invalid file");
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      const uploadedImage = await imageService.uploadImage(
        file,
        caption,
        altText,
      );
      onImageUploaded(uploadedImage);
      // Clean up the object URL
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Failed to upload image",
      );
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div
        className="border-2 border-dashed border-base-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
        {showPreview && preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt={altText || "Preview"}
              className="max-h-48 mx-auto rounded-lg"
            />
            <div className="absolute inset-0 bg-base-300 bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-base-content">Click to change</span>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <p className="text-base-content/60">
              {uploading
                ? "Uploading..."
                : "Drop an image here or click to upload"}
            </p>
            <p className="text-xs text-base-content/40 mt-2">
              JPEG, PNG, GIF or WebP, max 5MB
            </p>
          </div>
        )}
      </div>

      {(allowCaption || allowAltText) && (
        <div className="space-y-2">
          {allowCaption && (
            <input
              type="text"
              placeholder="Image caption (optional)"
              className="input input-bordered w-full"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          )}
          {allowAltText && (
            <input
              type="text"
              placeholder="Alt text for accessibility (optional)"
              className="input input-bordered w-full"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
};
