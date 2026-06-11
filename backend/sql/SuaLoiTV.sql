-- ====================== VISITS ======================
-- Chuyển sang NVARCHAR để hỗ trợ tiếng Việt đầy đủ
ALTER TABLE Visits
ALTER COLUMN VisitorName NVARCHAR(100) NOT NULL;

ALTER TABLE Visits
ALTER COLUMN Notes NVARCHAR(500) NULL;     -- hoặc NVARCHAR(MAX) nếu muốn

ALTER TABLE Visits
ALTER COLUMN Status NVARCHAR(20) NOT NULL;

-- ====================== INCIDENTS ======================
ALTER TABLE Incidents
ALTER COLUMN IncidentType NVARCHAR(100) NULL;

ALTER TABLE Incidents
ALTER COLUMN Description NVARCHAR(500) NULL;   -- hoặc NVARCHAR(MAX)

ALTER TABLE Incidents
ALTER COLUMN Severity NVARCHAR(20) NULL;

-- (Tùy chọn) Nếu bạn muốn Notes/Description linh hoạt hơn:
-- ALTER TABLE Visits ALTER COLUMN Notes NVARCHAR(MAX) NULL;
-- ALTER TABLE Incidents ALTER COLUMN Description NVARCHAR(MAX) NULL;