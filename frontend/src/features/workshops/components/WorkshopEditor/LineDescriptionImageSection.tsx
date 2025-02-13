import React from "react";
import { ImageData, LineDescription } from "../../types/workshop";
import { ImageUpload } from "../ImageUpload";
import { imageService } from "../../services/imageService";

interface LineDescriptionImageSectionProps {
  lineDescription: LineDescription;
  onImageChange: (image: ImageData | undefined) => void;
  className?: string;
}

export const LineDescriptionImageSection: React.FC<
  LineDescriptionImageSectionProps
> = ({ lineDescription, onImageChange, className = "" }) => {
  const handleImageUpload = (image: ImageData) => {
    onImageChange(image);
  };

  const handleImageDelete = async () => {
    if (lineDescription.image?.url) {
      try {
        await imageService.deleteImage(lineDescription.image.url);
        onImageChange(undefined);
      } catch (error) {
        console.error("Failed to delete line description image:", error);
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          {lineDescription.image ? (
            <div className="relative group">
              <img
                src={lineDescription.image.url}
                alt={
                  lineDescription.image.altText ||
                  "Line description illustration"
                }
                className="max-h-48 w-full object-contain bg-base-200 rounded-lg"
              />
              <div className="absolute inset-0 bg-base-300 bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <button
                  className="btn btn-error btn-sm"
                  onClick={handleImageDelete}
                >
                  Remove Image
                </button>
              </div>
            </div>
          ) : (
            <ImageUpload
              onImageUploaded={handleImageUpload}
              onError={(error) => console.error(error)}
              showPreview={true}
              allowCaption={true}
              allowAltText={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};
