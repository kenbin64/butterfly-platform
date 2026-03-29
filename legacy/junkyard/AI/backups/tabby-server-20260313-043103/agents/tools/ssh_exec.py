# ssh_exec.py
# Deterministic SSH executor for ButterflyFX Agent.
# Location: C:\AI\tabby-server\agents\tools\ssh_exec.py

import subprocess
import shlex
from typing import Optional

DEFAULT_TIMEOUT = 30  # seconds

def ssh_exec(host: str, command: str, user: Optional[str] = None, port: Optional[int] = None, timeout: Optional[int] = None, identity_file: Optional[str] = None) -> str:
    """
    Execute a command on a remote host via SSH and return plain-text output.

    Parameters:
        host: hostname or IP address (required)
        command: command string to run on the remote host (required)
        user: optional username to connect as (e.g., "ubuntu")
        port: optional SSH port (e.g., 22)
        timeout: optional timeout in seconds (defaults to DEFAULT_TIMEOUT)
        identity_file: optional path to an SSH private key file

    Returns:
        - remote stdout if successful
        - combined stderr/stdout if remote returned errors
        - an [ERROR] message on failure
    """
    if not host:
        return "[ERROR] Missing parameter: host"
    if not command:
        return "[ERROR] Missing parameter: cmd"

    try:
        to = timeout if timeout is not None else DEFAULT_TIMEOUT

        # Build SSH command list safely
        ssh_parts = ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no"]

        if port:
            ssh_parts += ["-p", str(port)]
        if identity_file:
            ssh_parts += ["-i", identity_file]
        target = host if not user else f"{user}@{host}"

        # Use shlex to ensure the remote command is passed as a single argument
        # On Windows, subprocess with list and shell=False is preferred.
        ssh_parts.append(target)
        ssh_parts.append(command)

        result = subprocess.run(
            ssh_parts,
            capture_output=True,
            text=True,
            timeout=to
        )

        stdout = result.stdout.strip()
        stderr = result.stderr.strip()

        if result.returncode != 0:
            if stderr:
                return f"[SSH-ERROR]\n{stderr}\n\n[SSH-OUTPUT]\n{stdout}"
            return f"[ERROR] SSH command exited with code {result.returncode}\n\n[SSH-OUTPUT]\n{stdout}"

        return stdout if stdout else "[OK] (no output)"
    except subprocess.TimeoutExpired:
        return f"[ERROR] SSH command timed out after {to} seconds"
    except FileNotFoundError:
        return "[ERROR] SSH client not found on this system"
    except Exception as e:
        # Keep message short and deterministic
        return f"[ERROR] SSH execution failed: {e}"