-- SQL Script to create SQL Server Login and User for Bonus Portal
-- Run this script with SQL Server Management Studio as administrator (sa or sysadmin)

USE master;
GO

-- Check if login exists, if so drop it
IF EXISTS (SELECT * FROM sys.server_principals WHERE name = 'pvs_user')
BEGIN
    DROP LOGIN pvs_user;
    PRINT 'Existing login pvs_user dropped.';
END
GO

-- Create new login with password
CREATE LOGIN pvs_user WITH PASSWORD = 'PVSChemicals@2025Secure';
PRINT 'Login pvs_user created successfully.';
GO

-- Enable SQL Server Authentication (if not already enabled)
-- Note: You may need to restart SQL Server after this change
EXEC xp_instance_regwrite
    N'HKEY_LOCAL_MACHINE',
    N'Software\Microsoft\MSSQLServer\MSSQLServer',
    N'LoginMode',
    REG_DWORD,
    2;
PRINT 'SQL Server Authentication enabled (restart SQL Server if needed).';
GO

-- Create the database if it doesn't exist
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

-- Switch to the database
USE pvs_db;
GO

-- Create user in the database
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'pvs_user')
BEGIN
    CREATE USER pvs_user FOR LOGIN pvs_user;
    PRINT 'User pvs_user created in database.';
END
ELSE
BEGIN
    PRINT 'User pvs_user already exists in database.';
END
GO

-- Grant db_owner permissions
ALTER ROLE db_owner ADD MEMBER pvs_user;
PRINT 'db_owner role granted to pvs_user.';
GO

PRINT '';
PRINT '========================================';
PRINT 'SQL Server Setup Complete!';
PRINT '========================================';
PRINT 'Login: pvs_user';
PRINT 'Password: PVSChemicals@2025Secure';
PRINT 'Database: pvs_db';
PRINT '';
PRINT 'IMPORTANT: If you just enabled SQL Server Authentication,';
PRINT 'you need to RESTART SQL Server service for it to take effect.';
PRINT 'After restarting, start the app — Sequelize will auto-create';
PRINT 'the Employees, Branches, and Notifications tables on first run.';
PRINT '========================================';
GO
