UPDATE dbo.[Users]
SET CreatedAt = GETDATE(),
    UpdatedAt = GETDATE()
WHERE CreatedAt IS NULL;