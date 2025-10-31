export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          license_type: 'free' | 'pro'
          license_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          license_type?: 'free' | 'pro'
          license_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          license_type?: 'free' | 'pro'
          license_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'super_admin' | 'admin' | 'consultant' | 'reader'
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'super_admin' | 'admin' | 'consultant' | 'reader'
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'super_admin' | 'admin' | 'consultant' | 'reader'
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sites: {
        Row: {
          id: string
          organization_id: string
          name: string
          industry_type: string
          location_country: string
          location_state: string
          location_city: string
          location_zone: string
          location_address: string
          location_type: 'office' | 'plant' | 'warehouse' | 'home' | 'transit'
          risk_zone_classification: 'high' | 'medium' | 'low' | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          industry_type: string
          location_country?: string
          location_state?: string
          location_city?: string
          location_zone?: string
          location_address?: string
          location_type: 'office' | 'plant' | 'warehouse' | 'home' | 'transit'
          risk_zone_classification?: 'high' | 'medium' | 'low' | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          industry_type?: string
          location_country?: string
          location_state?: string
          location_city?: string
          location_zone?: string
          location_address?: string
          location_type?: 'office' | 'plant' | 'warehouse' | 'home' | 'transit'
          risk_zone_classification?: 'high' | 'medium' | 'low' | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_site_access: {
        Row: {
          id: string
          user_id: string
          site_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          site_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          site_id?: string
          created_at?: string
        }
      }
      asset_catalog: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          is_global: boolean
          organization_id: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          category: string
          is_global?: boolean
          organization_id?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          is_global?: boolean
          organization_id?: string | null
          created_by?: string
          created_at?: string
        }
      }
      threat_catalog: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          is_global: boolean
          organization_id: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          category: string
          is_global?: boolean
          organization_id?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          is_global?: boolean
          organization_id?: string | null
          created_by?: string
          created_at?: string
        }
      }
      asset_threat_compatibility: {
        Row: {
          id: string
          asset_id: string
          threat_id: string
          is_global: boolean
          organization_id: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          threat_id: string
          is_global?: boolean
          organization_id?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          threat_id?: string
          is_global?: boolean
          organization_id?: string | null
          created_by?: string
          created_at?: string
        }
      }
      site_assets: {
        Row: {
          id: string
          site_id: string
          asset_catalog_id: string | null
          custom_name: string | null
          custom_description: string | null
          custom_category: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          site_id: string
          asset_catalog_id?: string | null
          custom_name?: string | null
          custom_description?: string | null
          custom_category?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          asset_catalog_id?: string | null
          custom_name?: string | null
          custom_description?: string | null
          custom_category?: string | null
          created_by?: string
          created_at?: string
        }
      }
      scenarios: {
        Row: {
          id: string
          site_id: string
          site_asset_id: string | null
          asset_id: string | null
          threat_id: string
          scenario_description: string
          vulnerabilities: string
          facilitators: string
          risk_factors: string
          suggested_measures: string
          status: 'pending' | 'in_evaluation' | 'evaluated'
          created_by: string | null
          analyzed_by: string | null
          analyzed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          site_asset_id?: string | null
          asset_id?: string | null
          threat_id: string
          scenario_description?: string
          vulnerabilities?: string
          facilitators?: string
          risk_factors?: string
          suggested_measures?: string
          status?: 'pending' | 'in_evaluation' | 'evaluated'
          created_by?: string | null
          analyzed_by?: string | null
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          site_asset_id?: string | null
          asset_id?: string | null
          threat_id?: string
          scenario_description?: string
          vulnerabilities?: string
          facilitators?: string
          risk_factors?: string
          suggested_measures?: string
          status?: 'pending' | 'in_evaluation' | 'evaluated'
          created_by?: string | null
          analyzed_by?: string | null
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
