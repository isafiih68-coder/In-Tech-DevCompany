# In.Tech - Authentication System

import os
import sqlite3
import secrets
import hmac
from functools import wraps

from flask import (
    Flask, render_template, request,
    redirect, url_for, session
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from database import (
    DATABASE,
    save_user,
    get_users,
    update_user,
    delete_user,
    save_contact_message,
    get_contact_messages,
    get_contact_message,
    delete_contact_message,
    save_learning_content,
    get_learning_contents,
    get_learning_content,
    update_learning_content,
    delete_learning_content
)

app = Flask(__name__)

SECRET_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "instance",
    "secret_key"
)

os.makedirs(os.path.dirname(SECRET_FILE), exist_ok=True)

if os.path.exists(SECRET_FILE):
    with open(SECRET_FILE, "r") as file:
        SECRET_KEY = file.read().strip()
else:
    SECRET_KEY = secrets.token_hex(32)

    with open(SECRET_FILE, "w") as file:
        file.write(SECRET_KEY)

    os.chmod(SECRET_FILE, 0o600)

ADMIN_USERNAME = os.environ.get("DEVCOMPANY_USERNAME")
ADMIN_PASSWORD = os.environ.get("DEVCOMPANY_PASSWORD")

if not ADMIN_USERNAME or not ADMIN_PASSWORD:
    raise RuntimeError("Login configuration is unavailable.")

if len(ADMIN_PASSWORD) < 12:
    raise RuntimeError("Demo password must contain at least 12 characters.")

COOKIE_SECURE = os.environ.get(
    "DEVCOMPANY_COOKIE_SECURE", "0"
).strip().lower() in ("1", "true", "yes", "on")

app.secret_key = SECRET_KEY
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=COOKIE_SECURE
)

# CSRF PROTECTION
@app.before_request
def protect_csrf():
    if "_csrf_token" not in session:
        session["_csrf_token"] = secrets.token_urlsafe(32)

    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        submitted_token = (
            request.headers.get("X-CSRF-Token")
            or request.form.get("csrf_token", "")
        )

        expected_token = session.get("_csrf_token", "")

        if not submitted_token or not hmac.compare_digest(
            submitted_token, expected_token
        ):
            return {"error": "Invalid CSRF token."}, 400


@app.context_processor
def inject_csrf_token():
    return {
        "csrf_token": session.get("_csrf_token", "")
    }


PASSWORD_HASH = generate_password_hash(ADMIN_PASSWORD)


# LOGIN PROTECTION
def login_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if "username" not in session:
            if request.path.startswith("/api/"):
                return {"error": "Login required"}, 401

            return redirect(url_for("login"))

        return function(*args, **kwargs)

    return wrapper


# HOME
@app.route("/")
def home():
    return render_template("index.html")


# LOGIN
@app.route("/login", methods=["GET", "POST"])
def login():
    if "username" in session:
        return redirect(url_for("dashboard"))

    error = None

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        if (
            username == ADMIN_USERNAME
            and check_password_hash(PASSWORD_HASH, password)
        ):
            session.clear()
            session["username"] = username

            return redirect(url_for("dashboard"))

        error = "Incorrect username or password."

    return render_template("login.html", error=error)


# LOGOUT
@app.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return redirect(url_for("login"))


# DASHBOARD
@app.route("/dashboard")
@login_required
def dashboard():
    return render_template(
        "dashboard.html",
        username=session["username"]
    )


# DASHBOARD OVERVIEW API
@app.route("/api/dashboard-overview")
@login_required
def dashboard_overview():
    database_path = DATABASE

    learning_templates = [
        "web_development.html",
        "backend_development.html",
        "database_management.html",
        "software_engineering.html",
    ]

    learning_count = sum(
        os.path.isfile(
            os.path.join(app.root_path, "templates", filename)
        )
        for filename in learning_templates
    )

    try:
        with sqlite3.connect(database_path) as connection:
            connection.row_factory = sqlite3.Row

            total_users = connection.execute(
                "SELECT COUNT(*) FROM users"
            ).fetchone()[0]

            total_messages = connection.execute(
                "SELECT COUNT(*) FROM contact_messages"
            ).fetchone()[0]

            recent_messages = connection.execute(
                """
                SELECT id, name, subject, created_at
                FROM contact_messages
                ORDER BY id DESC
                LIMIT 5
                """
            ).fetchall()

            connection.execute("SELECT 1").fetchone()

        return {
            "statistics": {
                "total_users": total_users,
                "new_messages": total_messages,
                "learning_pages": learning_count,
                "system_status": "Active",
            },
            "recent_messages": [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "subject": row["subject"],
                    "created_at": row["created_at"],
                }
                for row in recent_messages
            ],
        }

    except sqlite3.Error:
        return {
            "error": "Dashboard data is temporarily unavailable."
        }, 503


# API STATUS
@app.route("/api/status")
def status():
    return {
        "company": "In.Tech",
        "backend": "Python Flask",
        "database": "SQLite",
        "status": "Active"
    }


# CONTACT
@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        subject = request.form.get("subject", "").strip()
        message = request.form.get("message", "").strip()

        if not name:
            return {"error": "Name is required."}, 400

        if len(name) > 100:
            return {"error": "Name must not exceed 100 characters."}, 400

        if not email or len(email) > 254:
            return {"error": "A valid email address is required."}, 400

        import re

        email_pattern = r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$"

        if not re.fullmatch(email_pattern, email):
            return {"error": "Please enter a valid email address."}, 400

        if not subject:
            return {"error": "Subject is required."}, 400

        if len(subject) > 150:
            return {"error": "Subject must not exceed 150 characters."}, 400

        if not message:
            return {"error": "Message is required."}, 400

        if len(message) > 5000:
            return {"error": "Message must not exceed 5000 characters."}, 400

        save_contact_message(name, email, subject, message)

        return {
            "message": "Thank you! Your message has been received."
        }, 201

    return {"message": "Contact endpoint ready"}


# CONTACT MESSAGE MANAGEMENT

@app.route("/api/messages")
@login_required
def list_contact_messages():
    search_term = request.args.get("q", "").strip()

    if len(search_term) > 100:
        return {"error": "Search query must not exceed 100 characters"}, 400

    records = get_contact_messages(search_term)

    return {
        "total": len(records),
        "messages": [
            {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "subject": row[3],
                "message": row[4],
                "created_at": row[5]
            }
            for row in records
        ]
    }


@app.route("/api/messages/<int:message_id>")
@login_required
def read_contact_message(message_id):
    row = get_contact_message(message_id)

    if row is None:
        return {"error": "Message not found"}, 404

    return {
        "id": row[0],
        "name": row[1],
        "email": row[2],
        "subject": row[3],
        "message": row[4],
        "created_at": row[5]
    }


@app.route("/api/messages/<int:message_id>", methods=["DELETE"])
@login_required
def remove_contact_message(message_id):
    if not delete_contact_message(message_id):
        return {"error": "Message not found"}, 404

    return {
        "message": "Contact message deleted successfully",
        "id": message_id
    }


# CREATE USER
@app.route("/api/users", methods=["POST"])
@login_required
def create_user():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "")

    if not isinstance(name, str) or not name.strip():
        return {"error": "Valid name is required"}, 400

    name = name.strip()

    if len(name) > 100:
        return {"error": "Name must not exceed 100 characters"}, 400

    save_user(name)

    return {
        "message": "User created successfully",
        "name": name
    }, 201


# READ USERS
@app.route("/api/users")
@login_required
def users():
    records = get_users()

    return {
        "total": len(records),
        "users": [
            {
                "id": row[0],
                "name": row[1],
                "created_at": row[2]
            }
            for row in records
        ]
    }


# UPDATE USER
@app.route("/api/users/<int:user_id>", methods=["PUT"])
@login_required
def edit_user(user_id):
    data = request.get_json(silent=True) or {}
    name = data.get("name", "")

    if not isinstance(name, str) or not name.strip():
        return {"error": "Valid name is required"}, 400

    name = name.strip()

    if len(name) > 100:
        return {"error": "Name is too long"}, 400

    if not update_user(user_id, name):
        return {"error": "User not found"}, 404

    return {
        "message": "User updated successfully",
        "id": user_id,
        "name": name
    }


# DELETE USER
@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@login_required
def remove_user(user_id):
    if not delete_user(user_id):
        return {"error": "User not found"}, 404

    return {
        "message": "User deleted successfully",
        "id": user_id
    }




# LEARNING CONTENT API
LEARNING_CATEGORIES = {
    "web-development",
    "backend-development",
    "database-management",
    "software-engineering"
}


def validate_learning_data(data):
    if not isinstance(data, dict):
        return None, None, None, "Valid JSON object is required"

    category = data.get("category")
    title = data.get("title")
    content = data.get("content")

    if not isinstance(category, str) or category not in LEARNING_CATEGORIES:
        return None, None, None, "Valid learning category is required"

    if not isinstance(title, str) or not title.strip():
        return None, None, None, "Valid title is required"

    if len(title.strip()) > 150:
        return None, None, None, "Title must not exceed 150 characters"

    if not isinstance(content, str) or not content.strip():
        return None, None, None, "Valid content is required"

    if len(content) > 20000:
        return None, None, None, "Content must not exceed 20000 characters"

    return category, title.strip(), content.strip(), None


def learning_content_response(row):
    return {
        "id": row[0],
        "category": row[1],
        "title": row[2],
        "content": row[3],
        "created_at": row[4],
        "updated_at": row[5]
    }


@app.route("/api/learning-contents", methods=["GET"])
@login_required
def list_learning_contents():
    category = request.args.get("category")

    if category and category not in LEARNING_CATEGORIES:
        return {"error": "Invalid learning category"}, 400

    records = get_learning_contents(category)

    return {
        "total": len(records),
        "contents": [
            learning_content_response(row)
            for row in records
        ]
    }


@app.route("/api/learning-contents", methods=["POST"])
@login_required
def create_learning_content():
    data = request.get_json(silent=True)
    category, title, content, error = validate_learning_data(data)

    if error:
        return {"error": error}, 400

    content_id = save_learning_content(category, title, content)

    return {
        "message": "Learning content created successfully",
        "id": content_id
    }, 201


@app.route("/api/learning-contents/<int:content_id>")
@login_required
def read_learning_content(content_id):
    row = get_learning_content(content_id)

    if row is None:
        return {"error": "Learning content not found"}, 404

    return learning_content_response(row)


@app.route("/api/learning-contents/<int:content_id>", methods=["PUT"])
@login_required
def edit_learning_content(content_id):
    data = request.get_json(silent=True)
    category, title, content, error = validate_learning_data(data)

    if error:
        return {"error": error}, 400

    if not update_learning_content(content_id, category, title, content):
        return {"error": "Learning content not found"}, 404

    return {
        "message": "Learning content updated successfully",
        "id": content_id
    }


@app.route("/api/learning-contents/<int:content_id>", methods=["DELETE"])
@login_required
def remove_learning_content(content_id):
    if not delete_learning_content(content_id):
        return {"error": "Learning content not found"}, 404

    return {
        "message": "Learning content deleted successfully",
        "id": content_id
    }


# LEARNING CENTER
@app.route("/learn/web-development")
def web_development():
    return render_template("web_development.html")


@app.route("/learn/backend-development")
def backend_development():
    return render_template("backend_development.html")

@app.route("/learn/database-management")
def database_management():
    return render_template("database_management.html")


@app.route("/learn/software-engineering")
def software_engineering():
    return render_template("software_engineering.html")



# HTTP ERROR HANDLERS
@app.errorhandler(404)
def page_not_found(error):
    return {
        "error": "Not Found",
        "message": "The requested page could not be found."
    }, 404


@app.errorhandler(500)
def internal_server_error(error):
    app.logger.error("HTTP 500: %s", error)

    return {
        "error": "Internal Server Error",
        "message": "A server error occurred. Please try again."
    }, 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
