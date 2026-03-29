# file_write.py
# Deterministic file writer for ButterflyFX Agent.
# Location: C:\AI\tabby-server\agents\tools\file_write.py

import os
from typing import Optional

def write_file(path: str, content: str, mode: Optional[str] = "w", encoding: Optional[str] = "utf-8") -> str:
    """
    Write or overwrite a file on the local filesystem.

    Parameters:
        path: Path to the file to write (absolute or relative).
        content: Text content to write to the file.
        mode: File open mode. Defaults to "w" (overwrite). Use "a" to append.
        encoding: File encoding. Defaults to "utf-8".

    Returns:
        - "[OK] Wrote file: <path>" on success
        - "[ERROR] <message>" on failure
    """
    if not isinstance(path, str) or not path.strip():
        return "[ERROR] Missing parameter: path"
    if content is None:
        return "[ERROR] Missing parameter: content"
    if mode not in ("w", "a"):
        return "[ERROR] Invalid mode: must be 'w' or 'a'"

    try:
        # Ensure directory exists
        directory = os.path.dirname(os.path.abspath(path))
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)

        # Write file deterministically
        with open(path, mode, encoding=encoding) as f:
            f.write(content)

        return f"[OK] Wrote file: {os.path.abspath(path)}"
    except PermissionError:
        return f"[ERROR] Permission denied: {path}"
    except FileNotFoundError:
        return f"[ERROR] Path not found: {path}"
    except Exception as e:
        # Keep error message concise and deterministic
        return f"[ERROR] Unable to write file {path}: {e}"