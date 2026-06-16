-- ============================================================
-- File: 02_Create_AuditLog_and_Triggers.sql
-- Mục đích: Tạo bảng AuditLog + 4 Triggers
-- ============================================================

USE PRISON;
GO

PRINT '=== Bắt đầu tạo AuditLog và Triggers ===';
GO

-- ============================================================
-- TẠO BẢNG AUDIT LOG
-- ============================================================
CREATE TABLE dbo.AuditLog
(
    AuditID      INT IDENTITY(1,1) NOT NULL,
    TableName    NVARCHAR(100)     NOT NULL,
    RecordID     INT               NOT NULL,
    Action       NVARCHAR(10)      NOT NULL,
    OldValue     NVARCHAR(MAX)     NULL,
    NewValue     NVARCHAR(MAX)     NULL,
    ChangedBy    INT               NULL,
    ChangedAt    DATETIME2(3)      NOT NULL DEFAULT GETUTCDATE(),
    IPAddress    NVARCHAR(50)      NULL,
    CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (AuditID),
    CONSTRAINT CK_AuditLog_Action CHECK (Action IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX IX_AuditLog_Table_Record ON AuditLog(TableName, RecordID, ChangedAt DESC);
CREATE INDEX IX_AuditLog_ChangedBy ON AuditLog(ChangedBy, ChangedAt DESC);

PRINT '=== Đã tạo bảng AuditLog ===';
GO

-- ============================================================
-- TRIGGER CHO BẢNG PRISONERS
-- ============================================================
CREATE TRIGGER dbo.trg_Prisoners_Audit
ON dbo.Prisoners
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @UserID INT = CAST(SESSION_CONTEXT(N'UserID') AS INT);
    DECLARE @IP NVARCHAR(50) = CAST(SESSION_CONTEXT(N'IPAddress') AS NVARCHAR(50));

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, NewValue, ChangedBy, IPAddress)
        SELECT 'Prisoners', i.PrisonerID, 'INSERT', 
               (SELECT * FROM inserted i2 WHERE i2.PrisonerID = i.PrisonerID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM inserted i;

    ELSE IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 'Prisoners', i.PrisonerID, 'UPDATE',
               (SELECT * FROM deleted d WHERE d.PrisonerID = i.PrisonerID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               (SELECT * FROM inserted ins WHERE ins.PrisonerID = i.PrisonerID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM inserted i;

    ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, OldValue, ChangedBy, IPAddress)
        SELECT 'Prisoners', d.PrisonerID, 'DELETE',
               (SELECT * FROM deleted d2 WHERE d2.PrisonerID = d.PrisonerID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM deleted d;
END;
GO


-- ============================================================
-- TRIGGER CHO BẢNG VISITS
-- ============================================================
CREATE TRIGGER dbo.trg_Visits_Audit
ON dbo.Visits
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @UserID INT = CAST(SESSION_CONTEXT(N'UserID') AS INT);
    DECLARE @IP NVARCHAR(50) = CAST(SESSION_CONTEXT(N'IPAddress') AS NVARCHAR(50));

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, NewValue, ChangedBy, IPAddress)
        SELECT 'Visits', i.VisitID, 'INSERT', 
               (SELECT * FROM inserted i2 WHERE i2.VisitID = i.VisitID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM inserted i;

    ELSE IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 'Visits', i.VisitID, 'UPDATE',
               (SELECT * FROM deleted d WHERE d.VisitID = i.VisitID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               (SELECT * FROM inserted ins WHERE ins.VisitID = i.VisitID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM inserted i;

    ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, OldValue, ChangedBy, IPAddress)
        SELECT 'Visits', d.VisitID, 'DELETE',
               (SELECT * FROM deleted d2 WHERE d2.VisitID = d.VisitID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM deleted d;
END;
GO

-- ============================================================
-- TRIGGER CHO BẢNG INCIDENTS
-- ============================================================
CREATE TRIGGER dbo.trg_Incidents_Audit
ON dbo.Incidents
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @UserID INT = CAST(SESSION_CONTEXT(N'UserID') AS INT);
    DECLARE @IP NVARCHAR(50) = CAST(SESSION_CONTEXT(N'IPAddress') AS NVARCHAR(50));

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, NewValue, ChangedBy, IPAddress)
        SELECT 'Incidents', i.IncidentID, 'INSERT', 
               (SELECT * FROM inserted i2 WHERE i2.IncidentID = i.IncidentID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM inserted i;

    ELSE IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, OldValue, NewValue, ChangedBy, IPAddress)
        SELECT 'Incidents', i.IncidentID, 'UPDATE',
               (SELECT * FROM deleted d WHERE d.IncidentID = i.IncidentID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               (SELECT * FROM inserted ins WHERE ins.IncidentID = i.IncidentID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM inserted i;

    ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
        INSERT INTO dbo.AuditLog (TableName, RecordID, Action, OldValue, ChangedBy, IPAddress)
        SELECT 'Incidents', d.IncidentID, 'DELETE',
               (SELECT * FROM deleted d2 WHERE d2.IncidentID = d.IncidentID FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
               @UserID, @IP FROM deleted d;
END;
GO

PRINT '=== Đã tạo xong AuditLog và 4 Triggers ===';
GO