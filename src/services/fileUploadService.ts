import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadResult {
  fileId: string;
  filePath: string;
  publicUrl?: string;
}

export interface UploadedFileInfo {
  id: string;
  filename: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  mimeType?: string;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: any;
  createdAt: string;
}

export class FileUploadService {
  private static instance: FileUploadService;

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Upload file to Supabase Storage and register in database
   */
  async uploadFile(
    file: File,
    caseId: string,
    fileType: string = 'document'
  ): Promise<FileUploadResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;
      const filePath = `${user.id}/${caseId}/${uniqueFilename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('case-files')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Register file in database
      const { data: fileRecord, error: dbError } = await supabase
        .from('uploaded_files')
        .insert({
          case_id: caseId,
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          analysis_status: 'pending',
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            fileExtension
          }
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('case-files').remove([filePath]);
        throw new Error(`Database registration failed: ${dbError.message}`);
      }

      return {
        fileId: fileRecord.id,
        filePath
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Get file download URL
   */
  async getFileUrl(filePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from('case-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (!data?.signedUrl) {
      throw new Error('Failed to get file URL');
    }

    return data.signedUrl;
  }

  /**
   * Get all files for a case
   */
  async getCaseFiles(caseId: string): Promise<UploadedFileInfo[]> {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch files: ${error.message}`);
    }

    return (data || []).map(file => ({
      id: file.id,
      filename: file.filename,
      filePath: file.file_path,
      fileType: file.file_type,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      analysisStatus: file.analysis_status as 'pending' | 'processing' | 'completed' | 'failed',
      metadata: file.metadata,
      createdAt: file.created_at
    }));
  }

  /**
   * Update file analysis status
   */
  async updateAnalysisStatus(
    fileId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    metadata?: any
  ): Promise<void> {
    const { error } = await supabase
      .from('uploaded_files')
      .update({
        analysis_status: status,
        metadata: metadata || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) {
      throw new Error(`Failed to update analysis status: ${error.message}`);
    }
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      // Get file info first
      const { data: fileInfo, error: fetchError } = await supabase
        .from('uploaded_files')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch file info: ${fetchError.message}`);
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('case-files')
        .remove([fileInfo.file_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('uploaded_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        throw new Error(`Failed to delete file record: ${dbError.message}`);
      }
    } catch (error) {
      console.error('File deletion error:', error);
      throw error;
    }
  }

  /**
   * Get file content as text (for text-based files)
   */
  async getFileContent(filePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('case-files')
        .download(filePath);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      return await data.text();
    } catch (error) {
      console.error('Error reading file content:', error);
      throw error;
    }
  }

  /**
   * Get file as blob (for binary files)
   */
  async getFileBlob(filePath: string): Promise<Blob> {
    try {
      const { data, error } = await supabase.storage
        .from('case-files')
        .download(filePath);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error reading file blob:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const fileUploadService = FileUploadService.getInstance();