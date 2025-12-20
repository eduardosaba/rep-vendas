import type { SupabaseClient } from '@supabase/supabase-js';

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  filePath?: string;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  error?: string;
}

export const uploadImage = async (
  supabase: SupabaseClient,
  file: File,
  bucket: string,
  userId: string,
  customFileName: string | null = null
): Promise<UploadResult> => {
  if (!supabase) {
    throw new Error(
      'uploadImage requires a Supabase client instance as first argument'
    );
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = customFileName || `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `${bucket}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: data.publicUrl,
      filePath: filePath,
    };
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

export const deleteImage = async (
  supabase: SupabaseClient,
  bucket: string,
  filePath: string
): Promise<DeleteResult> => {
  if (!supabase) {
    throw new Error(
      'deleteImage requires a Supabase client instance as first argument'
    );
  }

  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

export const getImageUrl = (
  supabase: SupabaseClient,
  bucket: string,
  filePath: string
): string => {
  if (!supabase) {
    throw new Error(
      'getImageUrl requires a Supabase client instance as first argument'
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return data.publicUrl;
};
