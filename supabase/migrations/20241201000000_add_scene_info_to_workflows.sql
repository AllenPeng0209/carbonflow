/*
  # Add scene_info field to workflows table

  1. Changes
    - Add `scene_info` (jsonb) field to `workflows` table
    - This field will store the scene information for carbon footprint calculations
*/

-- Add scene_info column to workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS scene_info jsonb DEFAULT '{}'::jsonb;

-- Add index for scene_info queries
CREATE INDEX IF NOT EXISTS idx_workflows_scene_info ON workflows USING gin(scene_info); 