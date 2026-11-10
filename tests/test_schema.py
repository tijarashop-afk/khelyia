"""Tests SQLite sans dépendance externe du schéma D1 KhelyIA V3.

Tests sur données fictives uniquement. Ne déploie pas et n'initialise pas D1.
"""
import sqlite3
import unittest
from pathlib import Path

MIGRATION = Path(__file__).resolve().parents[1] / "migrations/0001_auth_v3.sql"


class ParentSchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))

    def tearDown(self):
        self.db.close()

    def create_parent(self, ident="p1", email="parent@example.invalid"):
        self.db.execute(
            "INSERT INTO parents(id,email_normalized,password_digest,created_at,updated_at)"
            " VALUES(?,?,?,?,?)",
            (ident, email, "pbkdf2-sha256$310000$example$example", 1700000000, 1700000000),
        )

    def test_structure_and_unique_email(self):
        tables = {
            row[0] for row in self.db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        self.assertTrue({"parents", "parent_sessions", "parent_auth_attempts"} <= tables)
        self.create_parent()
        with self.assertRaises(sqlite3.IntegrityError):
            self.create_parent("p2", "parent@example.invalid")

    def test_sessions_are_bound_to_an_existing_parent(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO parent_sessions(token_hash,parent_id,created_at,expires_at)"
                " VALUES(?,?,?,?)",
                ("fakehash", "unknown", 100, 200),
            )
        self.create_parent()
        self.db.execute(
            "INSERT INTO parent_sessions(token_hash,parent_id,created_at,expires_at)"
            " VALUES(?,?,?,?)",
            ("fakehash", "p1", 100, 200),
        )
        self.db.execute("DELETE FROM parents WHERE id=?", ("p1",))
        self.assertIsNone(self.db.execute(
            "SELECT token_hash FROM parent_sessions WHERE token_hash=?",
            ("fakehash",),
        ).fetchone())

    def test_revoked_or_expired_session_never_authorizes(self):
        self.create_parent()
        self.db.execute("UPDATE parents SET email_verified_at=? WHERE id=?", (100, "p1"))
        self.db.execute(
            "INSERT INTO parent_sessions(token_hash,parent_id,created_at,expires_at)"
            " VALUES(?,?,?,?)",
            ("fakehash", "p1", 100, 300),
        )
        sql = (
            "SELECT p.id FROM parent_sessions s JOIN parents p ON s.parent_id=p.id "
            "WHERE s.token_hash=? AND s.revoked_at IS NULL "
            "AND s.expires_at>? AND p.email_verified_at IS NOT NULL LIMIT 1"
        )
        self.assertEqual(self.db.execute(sql, ("fakehash", 200)).fetchone()[0], "p1")
        self.assertIsNone(self.db.execute(sql, ("fakehash", 400)).fetchone())
        self.db.execute(
            "UPDATE parent_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL",
            (250, "fakehash"),
        )
        self.assertIsNone(self.db.execute(sql, ("fakehash", 200)).fetchone())


if __name__ == "__main__":
    unittest.main()
