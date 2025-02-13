export interface ImageData {
  url: string;
  caption?: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface LineDescription {
  lines: number[]; // Multiple lines this description applies to
  content: string; // Markdown content explaining these lines
  image?: ImageData; // Optional image for this line description
}

export interface WorkshopStep {
  id: string;
  title: string;
  description: string; // Overall step description
  sourceCode: string;
  lineDescriptions: LineDescription[]; // Line-specific descriptions
  diffWithPreviousStep: boolean;
  mainImage?: ImageData; // Main image for the step
  images: ImageData[]; // Additional images for the step
}

export interface Workshop {
  id: string;
  title: string;
  description: string; // Markdown supported
  author: string;
  createdAt: number;
  updatedAt: number;
  steps: WorkshopStep[];
  coverImage?: ImageData; // Cover image for the workshop
}

// Image upload response from the backend
export interface ImageUploadResponse {
  url: string;
  success: boolean;
  error?: string;
}
