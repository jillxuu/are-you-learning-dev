import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

const router = express.Router();

// Configuration
const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  path.join(__dirname, "../../uploads/workshop-images");
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5") * 1024 * 1024; // Default 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

// Helper function to get image metadata
async function getImageMetadata(
  imagePath: string,
): Promise<ImageMetadata | null> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
    };
  } catch (error) {
    console.error("Error getting image metadata:", error);
    return null;
  }
}

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log(`Upload directory ensured at ${UPLOAD_DIR}`);
  } catch (error) {
    console.error("Error creating upload directory:", error);
    throw error;
  }
}

// Initialize storage on startup
ensureUploadDir().catch(console.error);

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error as Error, UPLOAD_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const fileFilter = (
  _req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}`,
      ),
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Helper function to optimize image
async function optimizeImage(imagePath: string) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    // Only resize if image is too large
    if (metadata.width && metadata.width > 1920) {
      await image
        .resize(1920, undefined, { withoutEnlargement: true })
        .toBuffer()
        .then((buffer) => fs.writeFile(imagePath, buffer));
    }

    // Optimize based on format
    switch (metadata.format) {
      case "jpeg":
        await image.jpeg({ quality: 85 }).toFile(imagePath + ".opt");
        break;
      case "png":
        await image.png({ compressionLevel: 9 }).toFile(imagePath + ".opt");
        break;
      case "webp":
        await image.webp({ quality: 85 }).toFile(imagePath + ".opt");
        break;
    }

    // Replace original with optimized version if it exists
    try {
      await fs.access(imagePath + ".opt");
      await fs.unlink(imagePath);
      await fs.rename(imagePath + ".opt", imagePath);
    } catch (error) {
      // Optimization failed, keep original
      console.warn("Image optimization failed, keeping original:", error);
    }
  } catch (error) {
    console.error("Error optimizing image:", error);
    // Continue with original image if optimization fails
  }
}

// POST /api/workshops/images
router.post(
  "/",
  upload.single("image"),
  (req: Request & { file?: Express.Multer.File }, res: Response): void => {
    (async () => {
      try {
        if (!req.file) {
          res.status(400).json({
            success: false,
            error: "No image file provided",
          });
          return;
        }

        // Optimize image in background
        optimizeImage(path.join(UPLOAD_DIR, req.file.filename)).catch((error) =>
          console.error("Image optimization failed:", error),
        );

        const imageUrl = `/api/uploads/workshop-images/${req.file.filename}`;
        const metadata = await getImageMetadata(
          path.join(UPLOAD_DIR, req.file.filename),
        );

        res.json({
          success: true,
          url: imageUrl,
          width: metadata?.width,
          height: metadata?.height,
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).json({
          success: false,
          error: "Failed to upload image",
        });
      }
    })();
  },
);

// GET /api/workshops/images/metadata
router.get("/metadata", (req: Request, res: Response): void => {
  (async () => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        res.status(400).json({
          success: false,
          error: "No image URL provided",
        });
        return;
      }

      // Remove /api prefix from URL to get the file path
      const relativePath = imageUrl.replace(/^\/api/, "");
      const imagePath = path.join(__dirname, "../..", relativePath);
      const metadata = await getImageMetadata(imagePath);

      if (!metadata) {
        res.status(404).json({
          success: false,
          error: "Image not found or invalid",
        });
        return;
      }

      res.json({
        url: imageUrl,
        width: metadata.width,
        height: metadata.height,
      });
    } catch (error) {
      console.error("Error getting image metadata:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get image metadata",
      });
    }
  })();
});

// DELETE /api/workshops/images
router.delete("/", (req: Request, res: Response): void => {
  (async () => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        res.status(400).json({
          success: false,
          error: "No image URL provided",
        });
        return;
      }

      // Remove /api prefix from URL to get the file path
      const relativePath = imageUrl.replace(/^\/api/, "");
      const imagePath = path.join(__dirname, "../..", relativePath);

      await fs.unlink(imagePath);

      res.json({
        success: true,
      });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete image",
      });
    }
  })();
});

export default router;
