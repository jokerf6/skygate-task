#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Parsing database connection details..."
  DB_HOST=$(node -e "try { const u = new URL(process.env.DATABASE_URL); console.log(u.hostname); } catch(e) { console.log('db'); }")
  DB_PORT=$(node -e "try { const u = new URL(process.env.DATABASE_URL); console.log(u.port || 3306); } catch(e) { console.log(3306); }")

  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  until nc -z "$DB_HOST" "$DB_PORT"; do
    sleep 1
  done
  echo "Database is ready."

  echo "Syncing database schema..."
  npm run db:sync

  echo "Seeding database..."
  npm run db:seed
fi

exec "$@"
