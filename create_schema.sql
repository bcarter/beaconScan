-- Create the beacon Schema
--
-- Author: Blaine Carter
--
-- 2017-08-18

SET SERVEROUTPUT ON
SET ECHO ON

WHENEVER SQLERROR EXIT

BEGIN
  EXECUTE IMMEDIATE 'DROP USER beacon CASCADE';
  EXCEPTION
  WHEN OTHERS
  THEN
  IF SQLCODE <> -1918
  THEN
    RAISE;
  END IF;
END;
/

CREATE USER beacon IDENTIFIED BY dd;
ALTER USER beacon DEFAULT TABLESPACE users QUOTA UNLIMITED ON users;
ALTER USER beacon TEMPORARY TABLESPACE temp;
ALTER USER beacon ENABLE EDITIONS;

GRANT CREATE SESSION, RESOURCE, UNLIMITED TABLESPACE TO beacon;

GRANT CREATE TABLE,
CREATE VIEW,
CREATE SEQUENCE,
CREATE PROCEDURE,
CREATE TYPE,
CREATE SYNONYM
TO beacon;

GRANT EXECUTE ON DBMS_LOCK TO beacon;