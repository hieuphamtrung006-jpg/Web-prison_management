-- ============================================================
-- Prison Management - Audit Log System
-- File: backend/AuditLog.sql
-- Purpose: Create AuditLog table + AFTER triggers for key tables
-- Compatible with: SQL Server 2016+
-- ============================================================

-- 1. Create AuditLog table
IF OBJECT_ID('dbo.AuditLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLog
    (
        AuditID      INT IDENTITY(1,1) NOT NULL,
        TableName    NVARCHAR(100)     NOT NULL,
        RecordID     INT               NOT NULL,
        Action       NVARCHAR(10)      NOT NULL,
        OldValue     NVARCHAR(MAX)     NULL,           -- JSON of previous state
        NewValue     NVARCHAR(MAX)     NULL,           -- JSON of new state
        ChangedBy    INT               NULL,           -- UserID from Users table (set via SESSION_CONTEXT)
        ChangedAt    DATETIME2(3)      NOT NULL CONSTRAINT DF_AuditLog_ChangedAt DEFAULT (GETUTCDATE()),
        IPAddress    NVARCHAR(50)      NULL,

        CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (AuditID),
        CONSTRAINT CK_AuditLog_Action CHECK (Action IN ('INSERT', 'UPDATE', 'DELETE'))
    );

    -- Optional: Foreign key to Users (uncomment if Users table exists)
    -- ALTER TABLE dbo.AuditLog 
    --     ADD CONSTRAINT FK_AuditLog_Users 
    --     FOREIGN KEY (ChangedBy) REFERENCES dbo.Users(UserID);

    -- Recommended indexes for querying audit history
    CREATE INDEX IX_AuditLog_Table_Record 
        ON dbo.AuditLog (TableName, RecordID, ChangedAt DESC);

    CREATE INDEX IX_AuditLog_ChangedBy 
        ON dbo.AuditLog (ChangedBy, ChangedAt DESC);

    PRINT 'Table AuditLog created successfully.';
END
ELSE
BEGIN
    PRINT 'Table AuditLog already exists. Skipping creation.';
END
GO

-- ============================================================
-- Helper: How to set User context from application (Python/FastAPI)
-- Before running any DML that should be audited, execute:
--
--   EXEC sp_set_session_context @key = N'UserID',    @value = @CurrentUserID;
--   EXEC sp_set_session_context @key = N'IPAddress', @value = @ClientIPAddress;
--
-- In pyodbc (example):
--   cursor.execute("EXEC sp_set_session_context @key = N'UserID', @value = ?", user_id)
--   cursor.execute("EXEC sp_set_session_context @key = N'IPAddress', @value = ?", ip_address)
--
-- Then perform INSERT/UPDATE/DELETE on audited tables.
-- The triggers will read the values using SESSION_CONTEXT().
-- If not set, ChangedBy and IPAddress will be NULL.
-- ============================================================

-- ============================================================
-- TRIGGER: Prisoners
-- ============================================================
IF OBJECT_ID('dbo.trg_Prisoners_Audit', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Prisoners_Audit;
GO

CREATE TRIGGER dbo.trg_Prisoners_Audit
ON dbo.Prisoners
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserID INT = CAST(SESSION_CONTEXT(N'UserID') AS INT);
    DECLARE @IP NVARCHAR(50) = CAST(SESSION_CONTEXT(N'IPAddress') AS NVARCHAR(50));

    -- INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Prisoners',
            i.PrisonerID,
            'INSERT',
            NULL,
            (SELECT * FROM inserted i2 WHERE i2.PrisonerID = i.PrisonerID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            @UserID,
            @IP
        FROM inserted i;
    END

    -- UPDATE
    ELSE IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Prisoners',
            i.PrisonerID,
            'UPDATE',
            (SELECT * FROM deleted d WHERE d.PrisonerID = i.PrisonerID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            (SELECT * FROM inserted ins WHERE ins.PrisonerID = i.PrisonerID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            @UserID,
            @IP
        FROM inserted i;
    END

    -- DELETE
    ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Prisoners',
            d.PrisonerID,
            'DELETE',
            (SELECT * FROM deleted d2 WHERE d2.PrisonerID = d.PrisonerID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL,
            @UserID,
            @IP
        FROM deleted d;
    END
END;
GO

PRINT 'Trigger trg_Prisoners_Audit created.';

-- ============================================================
-- TRIGGER: Visits
-- ============================================================
IF OBJECT_ID('dbo.trg_Visits_Audit', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Visits_Audit;
GO

CREATE TRIGGER dbo.trg_Visits_Audit
ON dbo.Visits
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserID INT = CAST(SESSION_CONTEXT(N'UserID') AS INT);
    DECLARE @IP NVARCHAR(50) = CAST(SESSION_CONTEXT(N'IPAddress') AS NVARCHAR(50));

    -- INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Visits',
            i.VisitID,
            'INSERT',
            NULL,
            (SELECT * FROM inserted i2 WHERE i2.VisitID = i.VisitID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            @UserID,
            @IP
        FROM inserted i;
    END

    -- UPDATE
    ELSE IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Visits',
            i.VisitID,
            'UPDATE',
            (SELECT * FROM deleted d WHERE d.VisitID = i.VisitID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            (SELECT * FROM inserted ins WHERE ins.VisitID = i.VisitID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            @UserID,
            @IP
        FROM inserted i;
    END

    -- DELETE
    ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Visits',
            d.VisitID,
            'DELETE',
            (SELECT * FROM deleted d2 WHERE d2.VisitID = d.VisitID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL,
            @UserID,
            @IP
        FROM deleted d;
    END
END;
GO

PRINT 'Trigger trg_Visits_Audit created.';

-- ============================================================
-- TRIGGER: Incidents
-- ============================================================
IF OBJECT_ID('dbo.trg_Incidents_Audit', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Incidents_Audit;
GO

CREATE TRIGGER dbo.trg_Incidents_Audit
ON dbo.Incidents
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserID INT = CAST(SESSION_CONTEXT(N'UserID') AS INT);
    DECLARE @IP NVARCHAR(50) = CAST(SESSION_CONTEXT(N'IPAddress') AS NVARCHAR(50));

    -- INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Incidents',
            i.IncidentID,
            'INSERT',
            NULL,
            (SELECT * FROM inserted i2 WHERE i2.IncidentID = i.IncidentID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            @UserID,
            @IP
        FROM inserted i;
    END

    -- UPDATE
    ELSE IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Incidents',
            i.IncidentID,
            'UPDATE',
            (SELECT * FROM deleted d WHERE d.IncidentID = i.IncidentID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            (SELECT * FROM inserted ins WHERE ins.IncidentID = i.IncidentID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            @UserID,
            @IP
        FROM inserted i;
    END

    -- DELETE
    ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO dbo.AuditLog 
            (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 
            'Incidents',
            d.IncidentID,
            'DELETE',
            (SELECT * FROM deleted d2 WHERE d2.IncidentID = d.IncidentID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL,
            @UserID,
            @IP
        FROM deleted d;
    END
END;
GO

PRINT 'Trigger trg_Incidents_Audit created.';

-- ============================================================
-- USAGE INSTRUCTIONS
-- ============================================================
PRINT '
================================================================================
AUDIT LOG SETUP COMPLETE
================================================================================

HOW TO USE:

1. Run this script on your PRISON database:
   sqlcmd -S your_server -d PRISON -i AuditLog.sql
   (or open in SSMS and execute)

2. From the application (FastAPI + pyodbc), set context BEFORE any audited DML:

   Example in a service or dependency:
   ```python
   def set_audit_context(db: Session, user_id: int, ip_address: str = None):
       cursor = db.connection().connection.cursor()
       cursor.execute("EXEC sp_set_session_context @key = N''UserID'', @value = ?", user_id)
       if ip_address:
           cursor.execute("EXEC sp_set_session_context @key = N''IPAddress'', @value = ?", ip_address)

   # Then call before INSERT/UPDATE/DELETE
   set_audit_context(db, current_user.user_id, client_ip)
   ```

3. Query audit history example:
   SELECT * 
   FROM AuditLog 
   WHERE TableName = ''Prisoners'' 
     AND RecordID = 123 
   ORDER BY ChangedAt DESC;

4. To see changes in readable form, you can parse the JSON columns in application code
   or use SQL Server JSON functions:
   SELECT 
       AuditID,
       Action,
       JSON_VALUE(NewValue, ''$.FullName'') AS NewFullName,
       ChangedAt
   FROM AuditLog
   WHERE TableName = ''Prisoners'';

NOTES:
- ChangedBy will be NULL if sp_set_session_context was not called.
- Triggers are AFTER triggers → they fire after the DML succeeds.
- Multi-row INSERT/UPDATE/DELETE are fully supported (set-based).
- For very high volume, consider partitioning the AuditLog table by ChangedAt.

================================================================================
';

GO