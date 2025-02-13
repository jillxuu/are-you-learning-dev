import { Workshop } from "../types/workshop.ts";

const STORAGE_KEY = "aptos_workshops";

// Get all workshops from storage
export function getWorkshops(): Workshop[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to get workshops:", error);
    return [];
  }
}

// Get a specific workshop by ID
export function getWorkshopById(id: string): Workshop | undefined {
  const workshops = getWorkshops();
  return workshops.find((w) => w.id === id);
}

// Save a workshop (create or update)
export function saveWorkshop(workshop: Workshop): void {
  try {
    const workshops = getWorkshops();
    const index = workshops.findIndex((w) => w.id === workshop.id);

    if (index >= 0) {
      workshops[index] = workshop;
    } else {
      workshops.push(workshop);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(workshops));
  } catch (error) {
    console.error("Failed to save workshop:", error);
    throw new Error("Failed to save workshop");
  }
}

// Delete a workshop
export function deleteWorkshop(id: string): void {
  try {
    const workshops = getWorkshops();
    const filtered = workshops.filter((w) => w.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete workshop:", error);
    throw new Error("Failed to delete workshop");
  }
}

// Export workshop to JSON file
export function exportWorkshop(workshop: Workshop): string {
  return JSON.stringify(workshop, null, 2);
}

// Import workshop from JSON
export function importWorkshop(json: string): Workshop {
  try {
    const workshop = JSON.parse(json);

    // Validate required fields
    if (!workshop.id || !workshop.title || !Array.isArray(workshop.steps)) {
      throw new Error("Invalid workshop format");
    }

    // Validate each step
    workshop.steps.forEach((step: any, index: number) => {
      if (!step.id || !step.title || typeof step.sourceCode !== "string") {
        throw new Error(`Invalid step format at index ${index}`);
      }
    });

    return workshop;
  } catch (error) {
    console.error("Failed to import workshop:", error);
    throw new Error("Failed to import workshop");
  }
}

// Generate a shareable URL for a workshop
export function generateWorkshopUrl(id: string): string {
  return `${window.location.origin}/workshops/${id}`;
}

// Parse a workshop ID from a URL
export function parseWorkshopUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/");
    const workshopId = pathParts[pathParts.indexOf("workshops") + 1];
    return workshopId || null;
  } catch {
    return null;
  }
}
