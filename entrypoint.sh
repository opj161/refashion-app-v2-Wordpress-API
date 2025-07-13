#!/bin/sh
# Exit on error
set -e

# Run the user migration
echo "--- Running user migration ---"
node /app/dist/scripts/migrate-users-to-sqlite.js || echo "User migration completed or skipped"
echo "--- User migration check complete ---"

# Run the database migration
echo "--- Running database migration ---"
node /app/dist/scripts/migrate-json-to-sqlite.js || echo "Migration completed or skipped"
echo "--- Migration check complete ---"

# Run the new API key column migration
echo "--- Running API key column migration ---"
node /app/dist/scripts/add-api-key-columns-to-users.js || echo "API key column migration completed or skipped"
echo "--- API key column migration check complete ---"

# Run the new granular API key migration
echo "--- Running granular API key migration ---"
node /app/dist/scripts/add-granular-api-key-columns.js || echo "Granular API key migration completed or skipped"
echo "--- Granular API key migration check complete ---"

# Run the new API features migration
echo "--- Running API Features migration ---"
node /app/dist/scripts/migrate-api-features.js || echo "API features migration completed or skipped"
echo "--- API features migration check complete ---"

# Use PUID/PGID from environment, or default to 1000 (common for 'node' user in base images)
# Unraid should be passing PUID=99 and PGID=100
PUID_TO_USE=${PUID:-1000}
PGID_TO_USE=${PGID:-1000}

echo "--- Entrypoint ---"
echo "Effective PUID: $PUID_TO_USE"
echo "Effective PGID: $PGID_TO_USE"

# 1. Determine group name and ensure group exists with PGID_TO_USE
#    Check if a group already exists with the target PGID
EXISTING_GROUP_NAME=$(getent group "$PGID_TO_USE" | cut -d: -f1)

if [ -z "$EXISTING_GROUP_NAME" ]; then
    # PGID is free, create a new group named 'appgroup'
    TARGET_GROUP_NAME=appgroup
    echo "Creating new group '$TARGET_GROUP_NAME' with GID $PGID_TO_USE."
    addgroup -S -g "$PGID_TO_USE" "$TARGET_GROUP_NAME"
else
    # PGID is already in use by an existing group, use that existing group's name
    TARGET_GROUP_NAME="$EXISTING_GROUP_NAME"
    echo "Using existing group '$TARGET_GROUP_NAME' for GID $PGID_TO_USE."
fi

# 2. Determine user name and ensure user exists with PUID_TO_USE and is in TARGET_GROUP_NAME
#    Check if a user already exists with the target PUID
EXISTING_USER_NAME=$(getent passwd "$PUID_TO_USE" | cut -d: -f1)

if [ -z "$EXISTING_USER_NAME" ]; then
    # PUID is free, create a new user named 'appuser'
    TARGET_USER_NAME=appuser
    echo "Creating new user '$TARGET_USER_NAME' with UID $PUID_TO_USE and group '$TARGET_GROUP_NAME'."
    # -S: system user, -H: no home dir, -D: no password, -G: primary group
    adduser -S -H -D -u "$PUID_TO_USE" -G "$TARGET_GROUP_NAME" "$TARGET_USER_NAME"
else
    # PUID is already in use by an existing user, use that existing user's name
    TARGET_USER_NAME="$EXISTING_USER_NAME"
    echo "Using existing user '$TARGET_USER_NAME' for UID $PUID_TO_USE."

    # Ensure this existing user is effectively part of TARGET_GROUP_NAME
    # (it might be its primary group or need to be added as a supplementary group)
    CURRENT_PRIMARY_GID_OF_EXISTING_USER=$(getent passwd "$TARGET_USER_NAME" | cut -d: -f4)
    if [ "$CURRENT_PRIMARY_GID_OF_EXISTING_USER" != "$PGID_TO_USE" ]; then
        echo "User '$TARGET_USER_NAME' exists with primary GID $CURRENT_PRIMARY_GID_OF_EXISTING_USER."
        echo "Attempting to set primary group of '$TARGET_USER_NAME' to '$TARGET_GROUP_NAME' (GID $PGID_TO_USE)."
        # usermod can be risky if the user is a critical system user, but for app PUIDs it's usually fine.
        # The `|| true` prevents script exit if usermod fails (e.g. on root user)
        usermod -g "$PGID_TO_USE" "$TARGET_USER_NAME" || echo "Warning: usermod -g failed. This might be okay if already a member."

        # As a fallback or ensure, add to group if not already a member (primary or secondary)
        if ! id -Gn "$TARGET_USER_NAME" | grep -qw "$TARGET_GROUP_NAME"; then
            echo "Adding user '$TARGET_USER_NAME' to group '$TARGET_GROUP_NAME' as supplementary."
            addgroup "$TARGET_USER_NAME" "$TARGET_GROUP_NAME"
        fi
    else
        echo "User '$TARGET_USER_NAME' already has '$TARGET_GROUP_NAME' (GID $PGID_TO_USE) as primary group."
    fi
fi

echo "Final effective user: '$TARGET_USER_NAME' (UID $PUID_TO_USE)"
echo "Final effective group: '$TARGET_GROUP_NAME' (GID $PGID_TO_USE)"

# 3. Change ownership of application files *within the image*
#    Files copied during 'docker build' are owned by root.
#    The application (running as TARGET_USER_NAME) needs to access them.
#    DO NOT chown the volume mount point itself (/app/public/uploads) from here;
#    its permissions are managed on the host.
echo "Setting ownership for internal application files..."
if [ -d "/app/.next" ]; then
    chown -R "$TARGET_USER_NAME:$TARGET_GROUP_NAME" /app/.next
    echo "Owned /app/.next"
fi

# Set ownership for user_data directory for server-side history storage
if [ -d "/app/user_data" ]; then
    chown -R "$TARGET_USER_NAME:$TARGET_GROUP_NAME" /app/user_data
    echo "Owned /app/user_data (for server-side history storage)"
fi

# Add other directories here if your app uses them inside /app (not on a volume)
# e.g., if node_modules are bundled and need write access for some reason (uncommon for prod):
# if [ -d "/app/node_modules" ]; then
#   chown -R "$TARGET_USER_NAME:$TARGET_GROUP_NAME" /app/node_modules
#   echo "Owned /app/node_modules"
# fi
# If server.js or other specific files in /app need different ownership (usually read is enough for root-copied files)
# chown "$TARGET_USER_NAME:$TARGET_GROUP_NAME" /app/server.js # If needed

# 4. Execute the main container command (CMD) as the TARGET_USER_NAME
echo "Executing command: $@"
exec su-exec "$TARGET_USER_NAME:$TARGET_GROUP_NAME" "$@"