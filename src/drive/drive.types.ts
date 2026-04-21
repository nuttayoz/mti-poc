export interface DriveUploadInput {
  buffer: Buffer;
  description?: string;
  filename: string;
  mimeType: string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveFolderStatus {
  configured: boolean;
  exists: boolean;
  folderId: string;
  name?: string;
}
