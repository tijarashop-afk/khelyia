-- KhelyIA V3 — schéma préliminaire de l'authentification parent.
-- À appliquer uniquement à une base D1 de test après validation de la configuration.
-- Aucun compte d'enfant n'est créé par cette migration (fonction V4).
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  password_digest TEXT NOT NULL,
  email_verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS parent_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_parent ON parent_sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON parent_sessions(expires_at);

-- Table des tentatives d'authentification pour préparer la limitation du bruteforce.
-- Le détail des seuils et des garanties vie privée est à valider avant activation.
CREATE TABLE IF NOT EXISTS parent_auth_attempts (
  opaque_bucket TEXT PRIMARY KEY NOT NULL,
  started_at INTEGER NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER
);
