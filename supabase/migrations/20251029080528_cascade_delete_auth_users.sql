/*
  # Cascade delete auth users when deleting from users table

  1. Changes
    - Create function to delete from auth.users when user is deleted
    - Create trigger to automatically cascade the deletion
    - Clean up orphaned auth.users entries that don't have a users record

  2. Security
    - Only affects deletion operations
    - Ensures auth and profile data stay in sync
*/

-- Create function to delete from auth.users
CREATE OR REPLACE FUNCTION delete_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Create trigger on users table
DROP TRIGGER IF EXISTS cascade_delete_auth_user ON users;
CREATE TRIGGER cascade_delete_auth_user
  AFTER DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION delete_auth_user();

-- Clean up orphaned auth.users (users that exist in auth.users but not in users table)
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM users);