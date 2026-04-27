-- SQL Script to create Bonus Portal Database
-- Use this if pvs_user login already exists (e.g. from another PVS portal setup)
-- Run this script with SQL Server Management Studio or an administrator account

USE master;
GO

-- Create the Bonus database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'pvs_db')
BEGIN
    CREATE DATABASE pvs_db;
    PRINT 'Database pvs_db created successfully.';
END
ELSE
BEGIN
    PRINT 'Database pvs_db already exists.';
END
GO

-- Switch to the new database
USE pvs_db;
GO

-- Grant permissions to pvs_user
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'pvs_user')
BEGIN
    CREATE USER pvs_user FOR LOGIN pvs_user;
    EXEC sp_addrolemember 'db_owner', 'pvs_user';
    PRINT 'User pvs_user created and granted permissions.';
END
ELSE
BEGIN
    EXEC sp_addrolemember 'db_owner', 'pvs_user';
    PRINT 'User pvs_user already exists. Permissions granted.';
END
GO

PRINT 'Bonus Portal database setup completed successfully.';
PRINT 'Start the app — Sequelize will auto-create the Employees, Branches,';
PRINT 'and Notifications tables on first run.';
GO
