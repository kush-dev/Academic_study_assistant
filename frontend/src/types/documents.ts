
export interface Folder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  folder_id: string | null;
  processing_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  created_at: string;
}

export interface FolderCreateRequest {
  name: string;
}

export interface DocumentUploadResponse {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  folder_id: string | null;
  processing_status: string;
  created_at: string;
}
