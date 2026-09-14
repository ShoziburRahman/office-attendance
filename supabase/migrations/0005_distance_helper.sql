-- ============================================================================
-- Distance Calculation Helper
-- ============================================================================

create or replace function fn_calculate_distance(
  p_lat1 numeric,
  p_lon1 numeric,
  p_lat2 numeric,
  p_lon2 numeric
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_phi1 numeric := radians(p_lat1);
  v_phi2 numeric := radians(p_lat2);
  v_delta_phi numeric := radians(p_lat2 - p_lat1);
  v_delta_lambda numeric := radians(p_lon2 - p_lon1);
  v_a numeric;
  v_c numeric;
  v_r numeric := 6371000; -- Earth radius in meters
begin
  v_a := sin(v_delta_phi / 2)^2 + cos(v_phi1) * cos(v_phi2) * sin(v_delta_lambda / 2)^2;
  v_c := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
  return v_r * v_c;
end;
$$;
