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

  echo "Syncing database schema with force reset..."
  npx prisma db push --force-reset --accept-data-loss

  echo "Seeding database..."
  npm run db:seed
fi

if [ -n "$OPENSEARCH_URL" ]; then
  echo "Parsing OpenSearch connection details..."
  OPENSEARCH_HOST=$(node -e "try { const u = new URL(process.env.OPENSEARCH_URL); console.log(u.hostname); } catch(e) { console.log('opensearch'); }")
  OPENSEARCH_PORT=$(node -e "try { const u = new URL(process.env.OPENSEARCH_URL); console.log(u.port || 9200); } catch(e) { console.log(9200); }")

  echo "Waiting for OpenSearch at $OPENSEARCH_HOST:$OPENSEARCH_PORT..."
  until nc -z "$OPENSEARCH_HOST" "$OPENSEARCH_PORT"; do
    sleep 1
  done
  echo "OpenSearch is ready."
fi

exec "$@"
