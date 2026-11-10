-- KhelyIA V3-04 — notes par compte parent, sans identité d'enfant.
-- Migration de préparation uniquement : ne pas appliquer en production avant revue.
-- La gestion de plusieurs profils enfants appartient à V4.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS parent_notes (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('math','fr','en')),
  level TEXT NOT NULL CHECK (level IN (
    'CP','CE1','CE2','CM1','CM2','6e','5e','4e','3e','Seconde','Première','Terminale'
  )),
  score INTEGER NOT NULL CHECK (typeof(score)='integer' AND score BETWEEN 0 AND 20),
  max_score INTEGER NOT NULL DEFAULT 20 CHECK (max_score=20),
  recorded_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_parent_notes_owner_date ON parent_notes(parent_id,recorded_at DESC);
