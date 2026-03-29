# file_read.py
# Deterministic file reader for ButterflyFX Agent.
# Location: C:\AI\tabby-server\agents\tools\file_read.py

import os
from typing import Optional

def read_file(path: str, encoding: Optional[str] = "utf-8") -> str:
    """
    Read the contents of a file and return as plain text.

    Parameters:
        path: Absolute or relative path to the file.
        encoding: File encoding to use. Defaults to "utf-8".

    Returns:
        - file contents as text on success
        - "[ERROR] Missing parameter: path" if path is empty
        - "[ERROR] File not found: <path>" if the file does not exist
        - "[ERROR] Permission denied: <path>" on permission errors
        - "[ERROR] Unable to read file <path>: <message>" on other failures
    """
    if not isinstance(path, str) or not path.strip():
        return "[ERROR] Missing parameter: path"

    try:
        abs_path = os.path.abspath(path)
    except Exception:
        abs_path = path

    if not os.path.exists(abs_path):
        return f"[ERROR] File not found: {abs_path}"

    try:
        with open(abs_path, "r", encoding=encoding, errors="ignore") as f:
            return f.read()
    except PermissionError:
        return f"[ERROR] Permission denied: {abs_path}"
    except FileNotFoundError:
        return f"[ERROR] File not found: {abs_path}"
    except Exception as e:
        return f"[ERROR] Unable to read file {abs_path}: {e}"


def read_lines(path: str, encoding: Optional[str] = "utf-8", max_lines: Optional[int] = None) -> str:
    """
    Read a file and return its lines joined by newline.
    Optionally limit to max_lines for large files.

    Parameters:
        path: Path to the file.
        encoding: Encoding to use.
        max_lines: If provided, read at most this many lines.

    Returns:
        - joined lines as text on success
        - an [ERROR] message on failure
    """
    if not isinstance(path, str) or not path.strip():
        return "[ERROR] Missing parameter: path"

    try:
        abs_path = os.path.abspath(path)
    except Exception:
        abs_path = path

    if not os.path.exists(abs_path):
        return f"[ERROR] File not found: {abs_path}"

    try:
        if max_lines is None:
            with open(abs_path, "r", encoding=encoding, errors="ignore") as f:
                return f.read()
        lines = []
        with open(abs_path, "r", encoding=encoding, errors="ignore") as f:
            for i, ln in enumerate(f):
                if max_lines is not None and i >= max_lines:
                    break
                lines.append(ln.rstrip("\n"))
        return "\n".join(lines)
    except PermissionError:
        return f"[ERROR] Permission denied: {abs_path}"
    except FileNotFoundError:
        return f"[ERROR] File not found: {abs_path}"
    except Exception as e:
        return f"[ERROR] Unable to read file {abs_path}: {e}"


# Minimal CLI for quick testing (prints plain text only)
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("[ERROR] Missing parameter: path")
        sys.exit(1)
    path = sys.argv[1]
    max_lines = None
    if len(sys.argv) >= 3:
        try:
            max_lines = int(sys.argv[2])
        except Exception:
            max_lines = None
    out = read_lines(path, max_lines=max_lines)
    print(out)