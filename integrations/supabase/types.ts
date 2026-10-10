export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_participants: {
        Row: {
          appointment_id: string
          client_id: string
          created_at: string
          id: string
          paused_from: string | null
          paused_until: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          client_id: string
          created_at?: string
          id?: string
          paused_from?: string | null
          paused_until?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          client_id?: string
          created_at?: string
          id?: string
          paused_from?: string | null
          paused_until?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_participants_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_history: {
        Row: {
          actor_id: string | null
          appointment_id: string
          client_id: string | null
          from_status: string | null
          id: number
          occurred_at: string
          reason: string | null
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          appointment_id: string
          client_id?: string | null
          from_status?: string | null
          id?: number
          occurred_at?: string
          reason?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string | null
          appointment_id?: string
          client_id?: string | null
          from_status?: string | null
          id?: number
          occurred_at?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: string | null
          attendance_status: string | null
          cancellation_reason: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          end_time: string
          id: string
          is_makeup: boolean
          location_id: string | null
          notes: string | null
          provider_staff_id: string | null
          recurring_series_id: string | null
          rescheduled_at: string | null
          rescheduled_by: string | null
          rescheduled_from_date: string | null
          rescheduled_from_start_time: string | null
          resource_id: string | null
          series_pattern_date: string | null
          service_id: string
          start_time: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_date: string
          appointment_type?: string | null
          attendance_status?: string | null
          cancellation_reason?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          end_time: string
          id?: string
          is_makeup?: boolean
          location_id?: string | null
          notes?: string | null
          provider_staff_id?: string | null
          recurring_series_id?: string | null
          rescheduled_at?: string | null
          rescheduled_by?: string | null
          rescheduled_from_date?: string | null
          rescheduled_from_start_time?: string | null
          resource_id?: string | null
          series_pattern_date?: string | null
          service_id: string
          start_time: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_type?: string | null
          attendance_status?: string | null
          cancellation_reason?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          end_time?: string
          id?: string
          is_makeup?: boolean
          location_id?: string | null
          notes?: string | null
          provider_staff_id?: string | null
          recurring_series_id?: string | null
          rescheduled_at?: string | null
          rescheduled_by?: string | null
          rescheduled_from_date?: string | null
          rescheduled_from_start_time?: string | null
          resource_id?: string | null
          series_pattern_date?: string | null
          service_id?: string
          start_time?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_staff_id_fkey"
            columns: ["provider_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_recurring_series_id_fkey"
            columns: ["recurring_series_id"]
            isOneToOne: false
            referencedRelation: "recurring_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          id: number
          new_value: Json | null
          occurred_at: string
          previous_value: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          id?: number
          new_value?: Json | null
          occurred_at?: string
          previous_value?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          id?: number
          new_value?: Json | null
          occurred_at?: string
          previous_value?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      blocked_time: {
        Row: {
          block_date: string
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          location_id: string | null
          reason: string | null
          resource_id: string | null
          staff_id: string | null
          start_time: string
          title: string | null
        }
        Insert: {
          block_date: string
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          location_id?: string | null
          reason?: string | null
          resource_id?: string | null
          staff_id?: string | null
          start_time: string
          title?: string | null
        }
        Update: {
          block_date?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          location_id?: string | null
          reason?: string | null
          resource_id?: string | null
          staff_id?: string | null
          start_time?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_time_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_time_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_time_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      class_participants: {
        Row: {
          class_session_id: string
          client_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          class_session_id: string
          client_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          class_session_id?: string
          client_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_participants_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          capacity: number
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          location_id: string | null
          provider_staff_id: string | null
          resource_id: string | null
          service_id: string
          session_date: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          location_id?: string | null
          provider_staff_id?: string | null
          resource_id?: string | null
          service_id: string
          session_date: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          location_id?: string | null
          provider_staff_id?: string | null
          resource_id?: string | null
          service_id?: string
          session_date?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_provider_staff_id_fkey"
            columns: ["provider_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_enrollments: {
        Row: {
          client_id: string
          created_at: string
          ended_on: string | null
          id: string
          service_id: string
          started_on: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          ended_on?: string | null
          id?: string
          service_id: string
          started_on?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          ended_on?: string | null
          id?: string
          service_id?: string
          started_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_service_enrollments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_enrollments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_staff_assignments: {
        Row: {
          client_id: string
          id: string
          relationship: string
          staff_id: string
        }
        Insert: {
          client_id: string
          id?: string
          relationship?: string
          staff_id: string
        }
        Update: {
          client_id?: string
          id?: string
          relationship?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_staff_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          primary_location_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          primary_location_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          primary_location_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_primary_location_id_fkey"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          short_name: string | null
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          short_name?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      permission_overrides: {
        Row: {
          granted: boolean
          id: string
          set_at: string
          set_by: string | null
          staff_id: string
          toggle_key: string
        }
        Insert: {
          granted: boolean
          id?: string
          set_at?: string
          set_by?: string | null
          staff_id: string
          toggle_key: string
        }
        Update: {
          granted?: boolean
          id?: string
          set_at?: string
          set_by?: string | null
          staff_id?: string
          toggle_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_overrides_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurring_series: {
        Row: {
          anchor_date: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          end_date: string | null
          frequency: string
          generated_through_date: string | null
          id: string
          location_id: string | null
          pause_start_date: string | null
          provider_staff_id: string | null
          resource_id: string | null
          resume_date: string | null
          service_id: string
          start_date: string
          start_time: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anchor_date?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          end_date?: string | null
          frequency: string
          generated_through_date?: string | null
          id?: string
          location_id?: string | null
          pause_start_date?: string | null
          provider_staff_id?: string | null
          resource_id?: string | null
          resume_date?: string | null
          service_id: string
          start_date: string
          start_time: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anchor_date?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          end_date?: string | null
          frequency?: string
          generated_through_date?: string | null
          id?: string
          location_id?: string | null
          pause_start_date?: string | null
          provider_staff_id?: string | null
          resource_id?: string | null
          resume_date?: string | null
          service_id?: string
          start_date?: string
          start_time?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_series_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_provider_staff_id_fkey"
            columns: ["provider_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          kind: string
          location_id: string
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          location_id: string
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          location_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_overrides: {
        Row: {
          actor_id: string | null
          appointment_id: string | null
          id: number
          occurred_at: string
          reason: string
          rule_key: string
        }
        Insert: {
          actor_id?: string | null
          appointment_id?: string | null
          id?: number
          occurred_at?: string
          reason: string
          rule_key: string
        }
        Update: {
          actor_id?: string | null
          appointment_id?: string | null
          id?: number
          occurred_at?: string
          reason?: string
          rule_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_overrides_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      series_changes: {
        Row: {
          actor_id: string | null
          appointment_id: string | null
          effective_date: string | null
          field: string
          id: number
          new_value: string | null
          occurred_at: string
          occurrences_affected: number | null
          previous_value: string | null
          reason: string | null
          scope: string
          series_id: string
        }
        Insert: {
          actor_id?: string | null
          appointment_id?: string | null
          effective_date?: string | null
          field: string
          id?: number
          new_value?: string | null
          occurred_at?: string
          occurrences_affected?: number | null
          previous_value?: string | null
          reason?: string | null
          scope: string
          series_id: string
        }
        Update: {
          actor_id?: string | null
          appointment_id?: string | null
          effective_date?: string | null
          field?: string
          id?: number
          new_value?: string | null
          occurred_at?: string
          occurrences_affected?: number | null
          previous_value?: string | null
          reason?: string | null
          scope?: string
          series_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_changes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_changes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "recurring_series"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          default_duration_minutes: number
          id: string
          is_active: boolean
          is_class: boolean
          makeup_eligible: boolean
          name: string
          participant_capacity: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_duration_minutes?: number
          id?: string
          is_active?: boolean
          is_class?: boolean
          makeup_eligible?: boolean
          name: string
          participant_capacity?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_duration_minutes?: number
          id?: string
          is_active?: boolean
          is_class?: boolean
          makeup_eligible?: boolean
          name?: string
          participant_capacity?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          display_order: number | null
          email: string | null
          employment_status: string
          employment_type: string | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          is_bookable: boolean
          job_title: string | null
          last_name: string
          phone: string | null
          primary_location_id: string | null
          profile_id: string | null
          updated_at: string
          updated_by: string | null
          weekly_hours: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          display_order?: number | null
          email?: string | null
          employment_status?: string
          employment_type?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          is_bookable?: boolean
          job_title?: string | null
          last_name: string
          phone?: string | null
          primary_location_id?: string | null
          profile_id?: string | null
          updated_at?: string
          updated_by?: string | null
          weekly_hours?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          display_order?: number | null
          email?: string | null
          employment_status?: string
          employment_type?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          is_bookable?: boolean
          job_title?: string | null
          last_name?: string
          phone?: string | null
          primary_location_id?: string | null
          profile_id?: string | null
          updated_at?: string
          updated_by?: string | null
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_primary_location_id_fkey"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          created_at: string
          end_time: string
          id: string
          location_id: string | null
          staff_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          location_id?: string | null
          staff_id: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          location_id?: string | null
          staff_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          email: string
          expires_at: string
          id: string
          sent_at: string
          sent_by: string | null
          staff_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          email: string
          expires_at: string
          id?: string
          sent_at?: string
          sent_by?: string | null
          staff_id: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          sent_at?: string
          sent_by?: string | null
          staff_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_locations: {
        Row: {
          id: string
          location_id: string
          staff_id: string
        }
        Insert: {
          id?: string
          location_id: string
          staff_id: string
        }
        Update: {
          id?: string
          location_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_locations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedule_exceptions: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          kind: string
          note: string | null
          staff_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          kind?: string
          note?: string | null
          staff_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          kind?: string
          note?: string | null
          staff_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedule_exceptions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          credential: string | null
          credential_expires_on: string | null
          id: string
          is_approved: boolean
          service_id: string
          staff_id: string
        }
        Insert: {
          credential?: string | null
          credential_expires_on?: string | null
          id?: string
          is_approved?: boolean
          service_id: string
          staff_id: string
        }
        Update: {
          credential?: string | null
          credential_expires_on?: string | null
          id?: string
          is_approved?: boolean
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_scheduling: { Args: { _user_id: string }; Returns: boolean }
      can_see_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_appointment: {
        Args: { _provider_staff_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "executive"
        | "leadership"
        | "operations"
        | "trainer"
        | "clinical"
        | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "executive",
        "leadership",
        "operations",
        "trainer",
        "clinical",
        "client",
      ],
    },
  },
} as const
