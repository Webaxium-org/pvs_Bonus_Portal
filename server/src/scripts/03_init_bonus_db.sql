USE [master];
GO
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'pvs_db') CREATE DATABASE [pvs_db];
GO
USE [pvs_db];
GO

-- Drop existing Employees table to allow clean recreation
IF OBJECT_ID('dbo.Employees', 'U') IS NOT NULL 
    DROP TABLE [dbo].[Employees];
GO

-- Create Employees Table (Bonus Version)
CREATE TABLE [dbo].[Employees] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [employeeId] NVARCHAR(50) NOT NULL,
    [fullName] NVARCHAR(200) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [password] NVARCHAR(255) NOT NULL,
    [ssn] NVARCHAR(50) NULL,
    [position] NVARCHAR(100) NULL,
    [jobTitle] NVARCHAR(100) NULL,
    [department] NVARCHAR(100) NULL,
    [company] NVARCHAR(200) NULL,
    [companyCode] NVARCHAR(50) NULL,
    [location] NVARCHAR(200) NULL,
    [supervisorId] INT NULL,
    [supervisorName] NVARCHAR(200) NULL,
    [role] NVARCHAR(50) DEFAULT 'employee',
    [hireDate] DATETIMEOFFSET NULL,
    [lastHireDate] DATETIMEOFFSET NULL,
    [employeeType] NVARCHAR(50) NULL,
    [salaryType] NVARCHAR(50) NULL,
    [salary] DECIMAL(18, 2) DEFAULT 0,
    [annualSalary] DECIMAL(18, 2) DEFAULT 0,
    [hourlyPayRate] DECIMAL(18, 2) DEFAULT 0,
    [bonus2024] DECIMAL(18, 2) DEFAULT 0,
    [bonus2025] DECIMAL(18, 2) DEFAULT 0,
    [phone] NVARCHAR(50) NULL,
    [addressStreet] NVARCHAR(255) NULL,
    [addressCity] NVARCHAR(100) NULL,
    [addressState] NVARCHAR(50) NULL,
    [addressZipCode] NVARCHAR(20) NULL,
    [addressCountry] NVARCHAR(100) DEFAULT 'USA',
    [isApprover] BIT DEFAULT 0,
    [approverLevel] NVARCHAR(50) NULL,
    [level1ApproverId] INT NULL,
    [level1ApproverName] NVARCHAR(200) NULL,
    [level2ApproverId] INT NULL,
    [level2ApproverName] NVARCHAR(200) NULL,
    [level3ApproverId] INT NULL,
    [level3ApproverName] NVARCHAR(200) NULL,
    [level4ApproverId] INT NULL,
    [level4ApproverName] NVARCHAR(200) NULL,
    [level5ApproverId] INT NULL,
    [level5ApproverName] NVARCHAR(200) NULL,
    [approvalStatus] NVARCHAR(MAX) NULL,
    [isActive] BIT DEFAULT 1,
    [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    [updatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
PRINT '✅ Employees table created in Bonus DB.';

-- Insert Initial HR Admin (Pass: abc123xyz)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Employees] WHERE email = 'hr@pvschemicals.com')
BEGIN
    INSERT INTO [dbo].[Employees] ([employeeId], [fullName], [email], [password], [role], [isActive])
    VALUES ('HR001', 'Initial HR Admin', 'hr@pvschemicals.com', '$2b$10$zaKbaBM5IQmJaIOntObnMO6PWaNhPIz/nxThpN7RCeFQhzBHh5wJe', 'hr', 1);
    PRINT '✅ Initial HR User created in Bonus DB.';
END
GO
