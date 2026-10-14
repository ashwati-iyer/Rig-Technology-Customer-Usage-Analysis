-- 1. Backlog at each month end
SELECT d.month_end, SUM(o.value_usd) AS backlog_usd
FROM dim_date d
JOIN fact_order_line o ON o.order_date <= d.month_end AND (o.actual_ship_date IS NULL OR o.actual_ship_date > d.month_end)
WHERE d.date = d.month_end
GROUP BY d.month_end;

-- 2. Book-to-bill and on-time shipment rate, trailing 12 months
SELECT SUM(CASE WHEN order_date >= DATEADD(month,-12,CURRENT_DATE) THEN value_usd END)
     / NULLIF(SUM(CASE WHEN actual_ship_date >= DATEADD(month,-12,CURRENT_DATE) THEN value_usd END),0) AS book_to_bill,
       AVG(CASE WHEN actual_ship_date >= DATEADD(month,-12,CURRENT_DATE)
                THEN (actual_ship_date <= DATEADD(month,1,scheduled_ship_date))::int END) AS on_time_rate
FROM fact_order_line;

-- 3. Life used per unit since last overhaul
WITH last_overhaul AS (
  SELECT unit_serial, MAX(close_date) AS last_ovh_date FROM fact_work_order WHERE wo_type='overhaul' GROUP BY unit_serial)
SELECT u.unit_serial, u.family, r.customer_id, r.region, r.rig_type,
       SUM(h.operating_hours) AS hours_since_overhaul,
       SUM(h.operating_hours) / u.overhaul_interval_hours AS life_used
FROM dim_unit u
JOIN dim_rig r ON r.rig_id = u.rig_id
LEFT JOIN last_overhaul lo ON lo.unit_serial = u.unit_serial
JOIN fact_unit_hours_daily h ON h.unit_serial = u.unit_serial AND h.date > COALESCE(lo.last_ovh_date, u.install_date)
GROUP BY u.unit_serial, u.family, r.customer_id, r.region, r.rig_type, u.overhaul_interval_hours;

-- 4. Repair turnaround and overflow routing by service centre
SELECT w.center_id, AVG(DATEDIFF(day, w.open_date, w.close_date)) AS avg_tat_days,
       AVG((r.region <> sc.region)::int) AS overflow_share
FROM fact_work_order w
JOIN dim_unit u ON u.unit_serial = w.unit_serial
JOIN dim_rig r ON r.rig_id = u.rig_id
JOIN dim_service_center sc ON sc.center_id = w.center_id
WHERE w.close_date >= DATEADD(month,-12,CURRENT_DATE)
GROUP BY w.center_id;

-- 5. Modelling table at unit x month grain.
-- Aggregate each fact to month level first, then join. Joining daily and event tables directly multiplies rows.
CREATE TABLE ml_unit_month AS
WITH hrs AS (SELECT unit_serial, DATE_TRUNC('month', date) AS month_start, SUM(operating_hours) AS hours_m
             FROM fact_unit_hours_daily GROUP BY 1,2),
     wo  AS (SELECT unit_serial, DATE_TRUNC('month', close_date) AS month_start,
                    COUNT(*) FILTER (WHERE wo_type='repair') AS repairs_m,
                    MAX((wo_type='overhaul')::int) AS overhaul_m
             FROM fact_work_order GROUP BY 1,2),
     dem AS (SELECT pd.unit_serial, DATE_TRUNC('month', pd.txn_date) AS month_start,
                    SUM(pd.net_usd) FILTER (WHERE p.part_class='wear') AS wear_usd,
                    SUM(pd.net_usd) FILTER (WHERE p.part_class='kit')  AS kit_usd
             FROM fact_parts_demand pd JOIN dim_part p ON p.part_no = pd.part_no GROUP BY 1,2)
SELECT u.unit_serial, d.month_start, u.family, r.rig_type, r.region,
       COALESCE(h.hours_m,0) AS hours_m, COALESCE(w.repairs_m,0) AS repairs_m, COALESCE(w.overhaul_m,0) AS overhaul_m,
       COALESCE(m.wear_usd,0) AS wear_usd, COALESCE(m.kit_usd,0) AS kit_usd
FROM dim_unit u
JOIN dim_rig r ON r.rig_id = u.rig_id
JOIN (SELECT DISTINCT month_start FROM dim_date) d ON d.month_start >= DATE_TRUNC('month', u.install_date)
LEFT JOIN hrs h ON h.unit_serial=u.unit_serial AND h.month_start=d.month_start
LEFT JOIN wo  w ON w.unit_serial=u.unit_serial AND w.month_start=d.month_start
LEFT JOIN dem m ON m.unit_serial=u.unit_serial AND m.month_start=d.month_start;
