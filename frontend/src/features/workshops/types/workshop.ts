export interface LineDescription {
  lines: number[]; // Multiple lines this description applies to
  content: string; // Markdown content explaining these lines
}

export interface WorkshopStep {
  id: string;
  title: string;
  description: string; // Overall step description
  sourceCode: string;
  highlightedLines: number[];
  lineDescriptions: LineDescription[]; // Line-specific descriptions
  diffWithPreviousStep: boolean;
}

export interface Workshop {
  id: string;
  title: string;
  description: string; // Markdown supported
  author: string;
  createdAt: number;
  updatedAt: number;
  steps: WorkshopStep[];
}
