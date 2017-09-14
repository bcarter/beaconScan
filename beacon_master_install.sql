-- Install Beacon
--
-- Authors: Blaine Carter
--
-- 2017-09-04

--SET SERVEROUTPUT ON
--SET ECHO ON

WHENEVER SQLERROR EXIT

@@create_schema.sql

CONNECT beacon/dd
@@beacon_actions.tbl
@@beacon_alerts.tbl
@@beacon_alert_actions.tbl
@@beacon_readings.tbl

@@load_data.sql

@@create_rest_api.sql