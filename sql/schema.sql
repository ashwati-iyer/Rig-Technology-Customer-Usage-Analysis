-- Reference schema for a real build. Table and column names are assumptions:
-- map them to the actual source systems before use.

CREATE TABLE dim_customer (customer_id VARCHAR PRIMARY KEY, customer_name VARCHAR, segment VARCHAR, home_region VARCHAR, parent_id VARCHAR);
CREATE TABLE dim_rig (rig_id VARCHAR PRIMARY KEY, customer_id VARCHAR REFERENCES dim_customer, rig_type VARCHAR, region VARCHAR, commission_date DATE, status VARCHAR);
CREATE TABLE dim_unit (unit_serial VARCHAR PRIMARY KEY, rig_id VARCHAR REFERENCES dim_rig, family VARCHAR, model VARCHAR, install_date DATE, overhaul_interval_hours INT, monitored_flag BOOLEAN);
CREATE TABLE dim_part (part_no VARCHAR PRIMARY KEY, family VARCHAR, description VARCHAR, part_class VARCHAR, unit_price NUMERIC, superseded_by VARCHAR, lead_time_days INT);
CREATE TABLE dim_service_center (center_id VARCHAR PRIMARY KEY, name VARCHAR, region VARCHAR);
CREATE TABLE dim_date (date DATE PRIMARY KEY, month_start DATE, month_end DATE);

CREATE TABLE fact_order_line (order_id VARCHAR, line_no INT, customer_id VARCHAR, product_group VARCHAR, plant VARCHAR,
  order_date DATE, scheduled_ship_date DATE, actual_ship_date DATE, value_usd NUMERIC);
CREATE TABLE fact_rig_status_daily (rig_id VARCHAR, date DATE, status VARCHAR);
CREATE TABLE fact_unit_hours_daily (unit_serial VARCHAR, date DATE, operating_hours NUMERIC, source VARCHAR);
CREATE TABLE fact_work_order (wo_id VARCHAR PRIMARY KEY, unit_serial VARCHAR, wo_type VARCHAR, failure_code VARCHAR,
  open_date DATE, close_date DATE, center_id VARCHAR, parts_usd NUMERIC, labour_usd NUMERIC);
CREATE TABLE fact_parts_demand (txn_id VARCHAR, part_no VARCHAR, unit_serial VARCHAR, customer_id VARCHAR, wo_id VARCHAR,
  txn_date DATE, qty NUMERIC, net_usd NUMERIC, demand_type VARCHAR);
CREATE TABLE fact_inventory_snapshot (snapshot_date DATE, part_no VARCHAR, location VARCHAR, on_hand NUMERIC, on_order NUMERIC);

-- Every forecast ever published. Never overwrite: accuracy is measured by joining this to actuals later.
CREATE TABLE fact_forecast_snapshot (run_id VARCHAR, run_date DATE, grain VARCHAR, entity_id VARCHAR,
  target_month DATE, p10 NUMERIC, p50 NUMERIC, p90 NUMERIC, model_version VARCHAR);
