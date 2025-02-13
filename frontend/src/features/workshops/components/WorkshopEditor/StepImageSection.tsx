import React from "react";
import { ImageData } from "../../types/workshop";
import { ImageUpload } from "../ImageUpload";
import { imageService } from "../../services/imageService";

interface StepImageSectionProps {
  mainImage?: ImageData;
  onMainImageChange: (image: ImageData | undefined) => void;
  className?: string;
}

export const StepImageSection: React.FC<StepImageSectionProps> = ({
  mainImage,
  onMainImageChange,
  className = "",
}) => {
  const handleMainImageUpload = (image: ImageData) => {
    onMainImageChange(image);
  };

  const handleMainImageDelete = async () => {
    if (mainImage?.url) {
      try {
        await imageService.deleteImage(mainImage.url);
        onMainImageChange(undefined);
      } catch (error) {
        console.error("Failed to delete main image:", error);
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Image Section */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Main Step Image</h3>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <ImageUpload
              onImageUploaded={handleMainImageUpload}
              defaultImage={mainImage}
              onError={(error) => console.error(error)}
            />
          </div>
          {mainImage && (
            <button
              className="btn btn-error btn-sm"
              onClick={handleMainImageDelete}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
