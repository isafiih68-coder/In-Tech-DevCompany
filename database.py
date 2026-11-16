# In.Tech - SQLite Database

import sqlite3
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Store application data inside the private instance directory.
BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(parents=True, exist_ok=True)

DATABASE = str(INSTANCE_DIR / "devcompany.db")
JAKARTA_TIMEZONE = timezone(timedelta(hours=7), "WIB")

def get_connection():
    return sqlite3.connect(DATABASE)

def create_table():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


        connection.execute("""
            CREATE TABLE IF NOT EXISTS learning_contents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

def save_user(name):
    created_at = datetime.now(
        JAKARTA_TIMEZONE
    ).isoformat(timespec="seconds")

    with get_connection() as connection:
        connection.execute(
            "INSERT INTO users (name, created_at) VALUES (?, ?)",
            (name, created_at)
        )



def save_contact_message(name, email, subject, message):
    created_at = datetime.now(
        JAKARTA_TIMEZONE
    ).isoformat(timespec="seconds")

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO contact_messages
            (name, email, subject, message, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, email, subject, message, created_at)
        )


def get_users():
    with get_connection() as connection:
        return connection.execute(
            "SELECT id, name, created_at FROM users ORDER BY id DESC"
        ).fetchall()

def update_user(user_id, name):
    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE users SET name = ? WHERE id = ?",
            (name, user_id)
        )
        return cursor.rowcount > 0

def delete_user(user_id):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM users WHERE id = ?",
            (user_id,)
        )
        return cursor.rowcount > 0


def get_contact_messages(search_term=""):
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT id, name, email, subject, message, created_at
            FROM contact_messages
            WHERE name LIKE ? COLLATE NOCASE
               OR email LIKE ? COLLATE NOCASE
               OR subject LIKE ? COLLATE NOCASE
            ORDER BY id DESC
            """,
            (
                f"%{search_term}%",
                f"%{search_term}%",
                f"%{search_term}%"
            )
        ).fetchall()


def get_contact_message(message_id):
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT id, name, email, subject, message, created_at
            FROM contact_messages
            WHERE id = ?
            """,
            (message_id,)
        ).fetchone()


def delete_contact_message(message_id):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM contact_messages WHERE id = ?",
            (message_id,)
        )
        return cursor.rowcount > 0



def save_learning_content(category, title, content):
    now = datetime.now(JAKARTA_TIMEZONE).isoformat(timespec="seconds")
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO learning_contents
                (category, title, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (category, title, content, now, now)
        )
        return cursor.lastrowid


def get_learning_contents(category=None):
    with get_connection() as connection:
        if category:
            return connection.execute(
                """
                SELECT id, category, title, content, created_at, updated_at
                FROM learning_contents
                WHERE category = ?
                ORDER BY id DESC
                """,
                (category,)
            ).fetchall()

        return connection.execute(
            """
            SELECT id, category, title, content, created_at, updated_at
            FROM learning_contents
            ORDER BY id DESC
            """
        ).fetchall()


def get_learning_content(content_id):
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT id, category, title, content, created_at, updated_at
            FROM learning_contents
            WHERE id = ?
            """,
            (content_id,)
        ).fetchone()


def update_learning_content(content_id, category, title, content):
    updated_at = datetime.now(
        JAKARTA_TIMEZONE
    ).isoformat(timespec="seconds")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE learning_contents
            SET category = ?, title = ?, content = ?, updated_at = ?
            WHERE id = ?
            """,
            (category, title, content, updated_at, content_id)
        )
        return cursor.rowcount > 0


def delete_learning_content(content_id):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM learning_contents WHERE id = ?",
            (content_id,)
        )
        return cursor.rowcount > 0

create_table()
print("Database In.Tech siap.")
