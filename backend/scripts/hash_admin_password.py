#!/usr/bin/env python3
"""Generate a hash for the admin panel password.

Run this yourself, locally — the password is entered via hidden input (getpass)
and never printed or logged. Paste the printed line into backend/.env.

Usage:
    cd backend && .venv/bin/python scripts/hash_admin_password.py
"""
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from app.core.admin_auth import hash_password  # noqa: E402

pw = getpass.getpass("New admin password: ")
pw2 = getpass.getpass("Confirm password: ")

if pw != pw2:
    print("Passwords don't match.", file=sys.stderr)
    sys.exit(1)
if len(pw) < 8:
    print("Warning: that's under 8 characters — consider something longer.", file=sys.stderr)

print("\nAdd this line to backend/.env (replacing any old ADMIN_TOKEN line):\n")
print(f"ADMIN_PASSWORD_HASH={hash_password(pw)}")
