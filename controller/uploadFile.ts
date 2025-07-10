import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";
import { Request, Response } from "express";
import mongoose from "mongoose";
import attachment from "../models/attachment";

interface MulterFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

interface UploadedFileInfo {
  filename: string;
  url: string;
  filetype: string;
  type: "image" | "video" | "audio" | "application" | "text" | "other";
}

const getResourceType = (mimetype: string): "image" | "video" | "raw" => {
  const mainType = mimetype.split("/")[0];
  return mainType === "image" || mainType === "video" ? mainType : "raw";
};

async function uploadFilesToCloudinary(files: MulterFile[]): Promise<UploadedFileInfo[]> {
  const uploadPromises = files.map((file) => {
    return new Promise<UploadedFileInfo>((resolve, reject) => {
      const resourceType = getResourceType(file.mimetype);

      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType },
        (error: Error | undefined, result: any) => {
          if (error || !result) return reject(error);

          const mimeMainType = file.mimetype.split("/")[0] || "other";
          const normalizedType: UploadedFileInfo["type"] =
            ["image", "video", "audio", "application", "text"].includes(mimeMainType)
              ? (mimeMainType as UploadedFileInfo["type"])
              : "other";

          resolve({
            filename: file.originalname,
            url: result.secure_url,
            filetype: file.mimetype,
            type: normalizedType,
          });
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  });

  return Promise.all(uploadPromises);
}

export default uploadFilesToCloudinary;

export const uploadfile = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    const userId = req.body.userId;
    const groupId = req.body.groupId || null;
    const tags: string[] = req.body.tags ? JSON.parse(req.body.tags) : [];

    const formattedFiles = files.map((file) => ({
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
    }));

    const uploadedFiles = await uploadFilesToCloudinary(formattedFiles);

    const attachmentsArray: mongoose.Types.ObjectId[] = [];

    for (const file of uploadedFiles) {
      const newAttachment = new attachment({
        user: new mongoose.Types.ObjectId(userId),
        group: groupId ? new mongoose.Types.ObjectId(groupId) : undefined,
        fileName: file.filename,
        fileUrl: file.url,
        fileType: file.filetype,
        tags: tags, 
      });

      await newAttachment.save();
      attachmentsArray.push(newAttachment._id);
    }

    res.status(200).json({ attachmentsArray });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "File upload failed", error });
  }
};
