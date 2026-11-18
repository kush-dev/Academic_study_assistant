
import api from "./client";
import type {
  Folder,
  FolderCreateRequest,
  Document,
  DocumentUploadResponse,
} from "../types/documents";

export async function getFolders(): Promise<Folder[]> {
  const response = await api.get("/folders");
  return response.data;
}

export async function createFolder(
  data: FolderCreateRequest
): Promise<Folder> {
  const response = await api.post("/folders", data);
  return response.data;
}

export async function getDocuments(): Promise<Document[]> {
  const response = await api.get("/documents");
  return response.data;
}

export async function uploadDocument(
  file: File,
  folderId: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("folder_id", folderId);

  const response = await api.post("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}`);
}
