"""Tests SQLite sans dépendance externe du schéma D1 KhelyIA V3.

Tests sur données fictives uniquement. Ne déploie pas et n'initialise pas D1.
"""
import sqlite3
import re
import unittest
from pathlib import Path

MIGRATION = Path(__file__).resolve().parents[1] / "migrations/0001_auth_v3.sql"
NOTES_MIGRATION = Path(__file__).resolve().parents[1] / "migrations/0002_parent_notes.sql"


class ParentSchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(MIGRATION.read_text(encoding="utf-8"))
        self.db.executescript(NOTES_MIGRATION.read_text(encoding="utf-8"))

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


    def test_throttle_upsert_is_valid_sqlite_and_resets_after_window(self):
        api = (Path(__file__).resolve().parents[1] / "src/server/parent-api.mjs").read_text(encoding="utf-8")
        sql = re.search(r"const sql=`([^`]+)`", api, re.DOTALL)
        self.assertIsNotNone(sql, "requête de limitation des tentatives introuvable")
        query = sql.group(1)
        stamp = 10000000
        cutoff = stamp - 900000
        for attempt in range(1, 6):
            self.db.execute(query, ("bucket-test-fictif", stamp, cutoff, cutoff, cutoff, stamp+900000))
            count, blocked = self.db.execute(
                "SELECT failed_count,blocked_until FROM parent_auth_attempts WHERE opaque_bucket=?",
                ("bucket-test-fictif",)
            ).fetchone()
            self.assertEqual(count, attempt)
            self.assertEqual(blocked, stamp+900000 if attempt >= 5 else None)
        later = stamp+900001
        expiry = later-900000
        self.db.execute(query, ("bucket-test-fictif", later, expiry, expiry, expiry, later+900000))
        self.assertEqual(
            self.db.execute("SELECT failed_count,blocked_until FROM parent_auth_attempts").fetchone(),
            (1, None),
        )


    def test_notes_are_owned_by_parent_and_deleted_on_account_removal(self):
        self.create_parent()
        self.create_parent("p2", "parent2@example.invalid")
        sql = (
            "INSERT INTO parent_notes(id,parent_id,subject,level,score,max_score,recorded_at)"
            " VALUES(?,?,?,?,?,?,?)"
        )
        self.db.execute(sql, ("n1", "p1", "math", "CM1", 17, 20, 12345))
        self.db.execute(sql, ("n2", "p2", "fr", "6e", 13, 20, 12346))
        rows = self.db.execute(
            "SELECT id,subject,level,score,max_score,recorded_at "
            "FROM parent_notes WHERE parent_id=? ORDER BY recorded_at DESC, id DESC LIMIT 100",
            ("p1",)
        ).fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][0], "n1")
        self.db.execute("DELETE FROM parents WHERE id=?", ("p1",))
        self.assertEqual(self.db.execute(
            "SELECT count(*) FROM parent_notes WHERE parent_id=?", ("p1",)
        ).fetchone()[0], 0)
        self.assertEqual(self.db.execute(
            "SELECT count(*) FROM parent_notes WHERE parent_id=?", ("p2",)
        ).fetchone()[0], 1)

    def test_notes_cannot_reference_unknown_parent_or_invalid_subject_score(self):
        self.create_parent()
        sql = (
            "INSERT INTO parent_notes(id,parent_id,subject,level,score,max_score,recorded_at)"
            " VALUES(?,?,?,?,?,?,?)"
        )
        invalid_rows = [
            ("bad1", "unknown", "math", "CM1", 12, 20, 100),
            ("bad2", "p1", "science", "CM1", 12, 20, 100),
            ("bad3", "p1", "math", "invented", 12, 20, 100),
            ("bad4", "p1", "math", "CM1", 21, 20, 100),
            ("bad5", "p1", "math", "CM1", -2, 20, 100),
            ("bad6", "p1", "math", "CM1", 10, 30, 100),
            ("bad7", "p1", "math", "CM1", 10.5, 20, 100),
        ]
        for row in invalid_rows:
            with self.subTest(id=row[0]):
                with self.assertRaises(sqlite3.IntegrityError):
                    self.db.execute(sql, row)
        self.assertEqual(self.db.execute("SELECT count(*) FROM parent_notes").fetchone()[0], 0)

if __name__ == "__main__":
    unittest.main()
