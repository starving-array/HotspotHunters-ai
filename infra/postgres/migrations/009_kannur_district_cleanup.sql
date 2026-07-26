-- Migration 009: Remove Kannur (Kerala district) from Karnataka district table

-- Kannur is a Kerala district that incorrectly appears in the Karnataka
-- district data — likely a seed data error. The District table references
-- are cascade-safe since no FIRs reference a non-existent district code
-- (Kannur has no associated unit or police station in the Karnataka schema).

UPDATE District SET active = FALSE
WHERE districtname ILIKE '%kannur%'
  AND active = TRUE;
