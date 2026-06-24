import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase URL or Service Role Key is not configured in environment variables.');
  }

  supabaseClient = createClient(supabaseUrl, serviceKey);
  return supabaseClient;
}

export async function uploadToSupabaseStorage(filename, mimeType, buffer) {
  const supabase = getSupabaseClient();
  const bucket = process.env.SUPABASE_BUCKET || 'media';

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteFromSupabaseStorage(filenames) {
  if (!filenames || filenames.length === 0) return { success: true };
  
  const supabase = getSupabaseClient();
  const bucket = process.env.SUPABASE_BUCKET || 'media';

  const { data, error } = await supabase.storage
    .from(bucket)
    .remove(filenames);

  if (error) {
    throw error;
  }

  return data;
}

export async function getSignedUploadUrl(filename) {
  const supabase = getSupabaseClient();
  const bucket = process.env.SUPABASE_BUCKET || 'media';

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(filename, 120); // Link valid for 2 minutes

  if (error) {
    throw error;
  }

  return data;
}
