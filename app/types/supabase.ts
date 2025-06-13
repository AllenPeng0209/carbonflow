export interface SupabaseUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string;
}

export interface SupabaseProject {
  id: string;
  name: string;
  organization_id: string;
  region: string;
  created_at: string;
  status: string;
}

export interface SupabaseStats {
  projects: SupabaseProject[];
  totalProjects: number;
}

export interface SupabaseApiKey {
  name: string;
  api_key: string;
}

export interface SupabaseCredentials {
  anonKey?: string;
  supabaseUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  specification?: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  primary_workflow_id?: string;
}

export interface ProductFormData {
  name: string;
  specification?: string;
  description?: string;
  image_url?: string;
}
