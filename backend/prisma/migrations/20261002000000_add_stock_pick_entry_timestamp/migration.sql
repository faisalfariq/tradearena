-- Migration: 20261002000000_add_stock_pick_entry_timestamp
-- Ensure entry_timestamp exists on stock_picks table
ALTER TABLE "stock_picks" ADD COLUMN IF NOT EXISTS "entry_timestamp" TIMESTAMP(3);
