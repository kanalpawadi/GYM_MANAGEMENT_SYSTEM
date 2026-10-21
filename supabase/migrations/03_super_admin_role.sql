-- Adds the platform-level Super Admin role (above the gym owner).
-- Kept in its own migration: Postgres cannot use a new enum value in the
-- same transaction that adds it.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
