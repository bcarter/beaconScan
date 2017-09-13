-- Install Beacon
--
-- Authors: Blaine Carter
--
-- 2017-09-04

--SET SERVEROUTPUT ON
--SET ECHO ON

WHENEVER SQLERROR EXIT

--CONNECT sys/dd

@@create_schema.sql

CONNECT beacon/dd
@@create_populate_tables.sql
@@create_rest_api.sql