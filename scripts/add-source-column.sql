-- Add source column to contacts (Lead Source for Dashboard)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR;

-- Add is_won column to stages (Dashboard - won opportunities)
ALTER TABLE stages ADD COLUMN IF NOT EXISTS is_won BOOLEAN DEFAULT false;
