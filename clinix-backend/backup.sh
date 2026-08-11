#!/bin/bash
# Simple SQLite database backup script
# For PostgreSQL, replace with pg_dump command

# Directory where backups will be stored
BACKUP_DIR="/var/backups/clinix"
mkdir -p "$BACKUP_DIR"

# Current date
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# SQLite DB Path
DB_PATH="$(dirname "$0")/db.sqlite3"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sqlite3"

echo "Starting backup of $DB_PATH to $BACKUP_FILE..."
cp "$DB_PATH" "$BACKUP_FILE"

# Optional: keep only last 7 days of backups
# find "$BACKUP_DIR" -type f -name "*.sqlite3" -mtime +7 -exec rm {} \;

echo "Backup completed successfully."
