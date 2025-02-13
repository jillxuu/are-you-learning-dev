import { ImageData, ImageUploadResponse } from "../types/workshop";

interface CacheEntry {
  data: ImageData;
  timestamp: number;
}

class ImageService {
  private readonly API_URL = "/api/workshops/images";
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private addToCache(imageData: ImageData) {
    this.cache.set(imageData.url, {
      data: imageData,
      timestamp: Date.now(),
    });
  }

  private getFromCache(url: string): ImageData | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(url);
      return null;
    }

    return entry.data;
  }

  private clearExpiredCache() {
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(url);
      }
    }
  }

  async uploadImage(
    file: File,
    caption?: string,
    altText?: string,
  ): Promise<ImageData> {
    const formData = new FormData();
    formData.append("image", file);
    if (caption) formData.append("caption", caption);
    if (altText) formData.append("altText", altText);

    try {
      const response = await fetch(this.API_URL, {
        method: "POST",
        body: formData,
      });

      const data: ImageUploadResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      const imageData: ImageData = {
        url: data.url,
        caption,
        altText,
      };

      // Add to cache
      this.addToCache(imageData);

      return imageData;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.API_URL}?url=${encodeURIComponent(imageUrl)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Remove from cache
      this.cache.delete(imageUrl);
    } catch (error) {
      console.error("Error deleting image:", error);
      throw error;
    }
  }

  // Helper function to validate image file
  validateImage(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error:
          "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.",
      };
    }

    if (file.size > MAX_SIZE) {
      return {
        valid: false,
        error: "File too large. Maximum size is 5MB.",
      };
    }

    return { valid: true };
  }

  // Get image metadata with caching
  async getImageMetadata(url: string): Promise<ImageData | null> {
    // Check cache first
    const cachedData = this.getFromCache(url);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, fetch from server (you'll need to implement this endpoint)
    try {
      const response = await fetch(
        `${this.API_URL}/metadata?url=${encodeURIComponent(url)}`,
      );
      if (!response.ok) return null;

      const imageData: ImageData = await response.json();
      this.addToCache(imageData);
      return imageData;
    } catch (error) {
      console.error("Error fetching image metadata:", error);
      return null;
    }
  }

  // Clean up expired cache entries
  cleanupCache() {
    this.clearExpiredCache();
  }
}

export const imageService = new ImageService();

// Clean up expired cache entries periodically
setInterval(
  () => {
    imageService.cleanupCache();
  },
  60 * 60 * 1000,
); // Clean up every hour
