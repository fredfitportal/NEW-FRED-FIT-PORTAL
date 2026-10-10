-- Locations, resources, services
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  address text,
  timezone text NOT NULL DEFAULT 'America/New_York',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'room',
  capacity integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  default_duration_minutes integer NOT NULL DEFAULT 60,
  participant_capacity integer NOT NULL DEFAULT 1,
  is_class boolean NOT NULL DEFAULT false,
  makeup_eligible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Staff
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  job_title text,
  department text,
  employment_type text,
  employment_status text NOT NULL DEFAULT 'active',
  hire_date date,
  primary_location_id uuid REFERENCES public.locations(id),
  weekly_hours numeric,
  is_bookable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE TABLE public.staff_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  UNIQUE (staff_id, location_id)
);
CREATE TABLE public.staff_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  is_approved boolean NOT NULL DEFAULT true,
  credential text,
  credential_expires_on date,
  UNIQUE (staff_id, service_id)
);
CREATE TABLE public.staff_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id),
  weekday smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.staff_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  kind text NOT NULL DEFAULT 'time_off',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE TABLE public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  cancelled_at timestamptz
);
CREATE TABLE public.permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  toggle_key text NOT NULL,
  granted boolean NOT NULL,
  set_by uuid,
  set_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, toggle_key)
);

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  status text NOT NULL DEFAULT 'active',
  primary_location_id uuid REFERENCES public.locations(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE TABLE public.client_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'trainer',
  UNIQUE (client_id, staff_id, relationship)
);
CREATE TABLE public.client_service_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  started_on date,
  ended_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Scheduling
CREATE TABLE public.recurring_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  service_id uuid NOT NULL REFERENCES public.services(id),
  provider_staff_id uuid REFERENCES public.staff(id),
  location_id uuid REFERENCES public.locations(id),
  resource_id uuid REFERENCES public.resources(id),
  frequency text NOT NULL,
  start_date date NOT NULL,
  anchor_date date,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  pause_start_date date,
  resume_date date,
  generated_through_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  service_id uuid NOT NULL REFERENCES public.services(id),
  provider_staff_id uuid REFERENCES public.staff(id),
  location_id uuid REFERENCES public.locations(id),
  resource_id uuid REFERENCES public.resources(id),
  recurring_series_id uuid REFERENCES public.recurring_series(id) ON DELETE SET NULL,
  series_pattern_date date,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled',
  attendance_status text,
  appointment_type text,
  is_makeup boolean NOT NULL DEFAULT false,
  notes text,
  cancellation_reason text,
  rescheduled_from_date date,
  rescheduled_from_start_time time,
  rescheduled_at timestamptz,
  rescheduled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE INDEX appointments_date_idx ON public.appointments (appointment_date);
CREATE INDEX appointments_provider_date_idx ON public.appointments (provider_staff_id, appointment_date);
CREATE INDEX appointments_series_idx ON public.appointments (recurring_series_id);

CREATE TABLE public.appointment_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'scheduled',
  paused_from date,
  paused_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, client_id)
);
CREATE TABLE public.appointment_status_history (
  id bigserial PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  from_status text,
  to_status text NOT NULL,
  reason text,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.series_changes (
  id bigserial PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES public.recurring_series(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  scope text NOT NULL,
  field text NOT NULL,
  previous_value text,
  new_value text,
  reason text,
  effective_date date,
  occurrences_affected integer,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.blocked_time (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id),
  resource_id uuid REFERENCES public.resources(id),
  block_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  title text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id),
  provider_staff_id uuid REFERENCES public.staff(id),
  location_id uuid REFERENCES public.locations(id),
  resource_id uuid REFERENCES public.resources(id),
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer NOT NULL DEFAULT 8,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.class_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_session_id uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'booked',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_session_id, client_id)
);
CREATE TABLE public.scheduling_overrides (
  id bigserial PRIMARY KEY,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  reason text NOT NULL,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.locations, public.resources, public.services, public.staff,
  public.staff_locations, public.staff_services, public.staff_availability,
  public.staff_schedule_exceptions, public.staff_invitations, public.permission_overrides,
  public.clients, public.client_staff_assignments, public.client_service_enrollments,
  public.recurring_series, public.appointments, public.appointment_participants,
  public.appointment_status_history, public.series_changes, public.blocked_time,
  public.class_sessions, public.class_participants, public.scheduling_overrides
TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE
  public.appointment_status_history_id_seq, public.series_changes_id_seq,
  public.scheduling_overrides_id_seq TO authenticated;
GRANT ALL ON
  public.locations, public.resources, public.services, public.staff,
  public.staff_locations, public.staff_services, public.staff_availability,
  public.staff_schedule_exceptions, public.staff_invitations, public.permission_overrides,
  public.clients, public.client_staff_assignments, public.client_service_enrollments,
  public.recurring_series, public.appointments, public.appointment_participants,
  public.appointment_status_history, public.series_changes, public.blocked_time,
  public.class_sessions, public.class_participants, public.scheduling_overrides
TO service_role;
GRANT ALL ON SEQUENCE
  public.appointment_status_history_id_seq, public.series_changes_id_seq,
  public.scheduling_overrides_id_seq TO service_role;

-- RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_service_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_overrides ENABLE ROW LEVEL SECURITY;

-- Reference/config: all staff read, executives and leadership manage.
CREATE POLICY "staff read locations" ON public.locations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "leaders write locations" ON public.locations FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['executive','leadership']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['executive','leadership']::public.app_role[]));
CREATE POLICY "staff read resources" ON public.resources FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "leaders write resources" ON public.resources FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['executive','leadership']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['executive','leadership']::public.app_role[]));
CREATE POLICY "staff read services" ON public.services FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "leaders write services" ON public.services FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['executive','leadership']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['executive','leadership']::public.app_role[]));

-- Staff directory: every staff member reads; executives manage.
CREATE POLICY "staff read staff" ON public.staff FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "executives write staff" ON public.staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'executive')) WITH CHECK (public.has_role(auth.uid(),'executive'));
CREATE POLICY "staff read staff_locations" ON public.staff_locations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "executives write staff_locations" ON public.staff_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'executive')) WITH CHECK (public.has_role(auth.uid(),'executive'));
CREATE POLICY "staff read staff_services" ON public.staff_services FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "executives write staff_services" ON public.staff_services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'executive')) WITH CHECK (public.has_role(auth.uid(),'executive'));
CREATE POLICY "staff read availability" ON public.staff_availability FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write availability" ON public.staff_availability FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid())) WITH CHECK (public.can_manage_scheduling(auth.uid()));
CREATE POLICY "staff read exceptions" ON public.staff_schedule_exceptions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write exceptions" ON public.staff_schedule_exceptions FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid())) WITH CHECK (public.can_manage_scheduling(auth.uid()));
CREATE POLICY "executives manage invitations" ON public.staff_invitations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'executive')) WITH CHECK (public.has_role(auth.uid(),'executive'));
CREATE POLICY "executives manage overrides" ON public.permission_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'executive')) WITH CHECK (public.has_role(auth.uid(),'executive'));
CREATE POLICY "staff read own overrides" ON public.permission_overrides FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Clients: leadership/operations see all; trainers and clinical see assigned.
CREATE OR REPLACE FUNCTION public.can_see_client(_user_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['executive','leadership','operations']::public.app_role[])
    OR EXISTS (
      SELECT 1 FROM public.client_staff_assignments a
      JOIN public.staff s ON s.id = a.staff_id
      JOIN public.profiles p ON p.id = s.profile_id
      WHERE a.client_id = _client_id AND p.id = _user_id
    )
$$;
CREATE POLICY "read permitted clients" ON public.clients FOR SELECT TO authenticated
  USING (public.can_see_client(auth.uid(), id));
CREATE POLICY "schedulers write clients" ON public.clients FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid())) WITH CHECK (public.can_manage_scheduling(auth.uid()));
CREATE POLICY "read client assignments" ON public.client_staff_assignments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write client assignments" ON public.client_staff_assignments FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid())) WITH CHECK (public.can_manage_scheduling(auth.uid()));
CREATE POLICY "read enrollments" ON public.client_service_enrollments FOR SELECT TO authenticated
  USING (public.can_see_client(auth.uid(), client_id));
CREATE POLICY "schedulers write enrollments" ON public.client_service_enrollments FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid())) WITH CHECK (public.can_manage_scheduling(auth.uid()));

-- Shared calendar: every staff member reads all scheduling rows at both locations.
CREATE OR REPLACE FUNCTION public.owns_appointment(_user_id uuid, _provider_staff_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = _provider_staff_id AND s.profile_id = _user_id
  )
$$;
CREATE POLICY "staff read series" ON public.recurring_series FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write series" ON public.recurring_series FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid()) OR public.owns_appointment(auth.uid(), provider_staff_id))
  WITH CHECK (public.can_manage_scheduling(auth.uid()) OR public.owns_appointment(auth.uid(), provider_staff_id));
CREATE POLICY "staff read appointments" ON public.appointments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid()) OR public.owns_appointment(auth.uid(), provider_staff_id))
  WITH CHECK (public.can_manage_scheduling(auth.uid()) OR public.owns_appointment(auth.uid(), provider_staff_id));
CREATE POLICY "staff read participants" ON public.appointment_participants FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write participants" ON public.appointment_participants FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid())) WITH CHECK (public.can_manage_scheduling(auth.uid()));
CREATE POLICY "staff read status history" ON public.appointment_status_history FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff append status history" ON public.appointment_status_history FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff read series changes" ON public.series_changes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff append series changes" ON public.series_changes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff read blocked time" ON public.blocked_time FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write blocked time" ON public.blocked_time FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid()) OR public.owns_appointment(auth.uid(), staff_id))
  WITH CHECK (public.can_manage_scheduling(auth.uid()) OR public.owns_appointment(auth.uid(), staff_id));
CREATE POLICY "staff read classes" ON public.class_sessions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write classes" ON public.class_sessions FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid()) OR public.owns_appointment(auth.uid(), provider_staff_id))
  WITH CHECK (public.can_manage_scheduling(auth.uid()) OR public.owns_appointment(auth.uid(), provider_staff_id));
CREATE POLICY "staff read class participants" ON public.class_participants FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "schedulers write class participants" ON public.class_participants FOR ALL TO authenticated
  USING (public.can_manage_scheduling(auth.uid())) WITH CHECK (public.can_manage_scheduling(auth.uid()));
CREATE POLICY "staff read overrides log" ON public.scheduling_overrides FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff append overrides log" ON public.scheduling_overrides FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Audit triggers on the operational tables
CREATE TRIGGER audit_appointments AFTER INSERT OR UPDATE OR DELETE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_participants AFTER INSERT OR UPDATE OR DELETE ON public.appointment_participants FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_series AFTER INSERT OR UPDATE OR DELETE ON public.recurring_series FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_blocked AFTER INSERT OR UPDATE OR DELETE ON public.blocked_time FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_classes AFTER INSERT OR UPDATE OR DELETE ON public.class_sessions FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_staff AFTER INSERT OR UPDATE OR DELETE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.write_audit();

CREATE TRIGGER touch_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_series BEFORE UPDATE ON public.recurring_series FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_staff BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime for the shared calendar
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_series;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_time;
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_sessions;