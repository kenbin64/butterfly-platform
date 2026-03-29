"""
agent_directive.py

Machine‑readable and enforceable representation of the ButterflyFX Agent Directive.

Location:
    C:\AI\tabby-server\agents\agent_directive.py

Purpose:
- Provide the canonical directive text (for human inspection).
- Provide deterministic helper functions to validate and enforce the directive
  when routing and executing actions.
- Return plain-text error messages exactly as specified by the directive.

Usage:
    from agent_directive import (
        DIRECTIVE_TEXT,
        parse_instruction,
        validate_instruction_format,
        validate_action_and_params,
        enforce_safety,
        apply_directive
    )

    instr = 'action=read_file path="C:/AI/tabby-server/config.env"'
    ok, payload_or_err = apply_directive(instr, allowed_actions=["read_file", ...])
    if ok:
        action, params = payload_or_err
        # call tool router with action, **params
    else:
        print(payload_or_err)  # prints an [ERROR] message
"""

from typing import Tuple, Dict, Optional
import shlex
import os

# Canonical directive text for human inspection
DIRECTIVE_TEXT = """
Agent Directive
Defines the reasoning rules, operational constraints, and routing behavior
for the ButterflyFX Single-Process Agent.

The agent is a deterministic interpreter.
It does not guess. It does not infer missing parameters.
It executes only what is explicitly declared.

Instruction format:
action=<action_name> key1="value1" key2="value2"

Errors and responses must be plain text and follow the directive's error strings.
"""

# Standard error messages used by the directive
ERR_INVALID_FORMAT = "[ERROR] Invalid instruction format"
ERR_UNKNOWN_ACTION = "[ERROR] Unknown action: {}"
ERR_MISSING_PARAM = "[ERROR] Missing parameter: {}"
ERR_AMBIGUOUS = "[ERROR] Ambiguous instruction; specify action and parameters"
ERR_UNSAFE = "[ERROR] Unsafe or disallowed operation"
ERR_MODIFY_GOVERNANCE = "[ERROR] Modification of governance files is disallowed"


def parse_instruction(instr: str) -> Optional[Tuple[str, Dict[str, str]]]:
    """
    Parse an instruction string of the canonical form:
        action=<action_name> key1="value1" key2="value2"

    Returns:
        (action, params) on success
        None on parse failure
    """
    if not isinstance(instr, str) or not instr.strip():
        return None

    # Use shlex to respect quoted values
    try:
        tokens = shlex.split(instr, posix=os.name != "nt")
    except Exception:
        return None

    if not tokens:
        return None

    # First token must be action=<name>
    first = tokens[0]
    if "=" not in first:
        return None
    k, v = first.split("=", 1)
    if k != "action" or not v:
        return None
    action = v

    params: Dict[str, str] = {}
    for token in tokens[1:]:
        if "=" not in token:
            # token without '=' is invalid in canonical form
            return None
        k, v = token.split("=", 1)
        # strip surrounding quotes if present (shlex already did this, but keep safe)
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v = v[1:-1]
        params[k] = v

    return action, params


def validate_instruction_format(instr: str) -> Tuple[bool, str]:
    """
    Validate the instruction format. Returns (True, "") if valid,
    otherwise (False, error_message).
    """
    parsed = parse_instruction(instr)
    if parsed is None:
        return False, ERR_INVALID_FORMAT
    return True, ""


def validate_action_and_params(
    action: str,
    params: Dict[str, str],
    manifest_required_params: Dict[str, Tuple[str, ...]],
    allowed_actions: Optional[Tuple[str, ...]] = None
) -> Tuple[bool, str]:
    """
    Validate that:
    - action is allowed (if allowed_actions provided)
    - required parameters for the action are present (manifest_required_params)

    manifest_required_params: mapping action -> tuple of required param names

    Returns:
        (True, "") if valid
        (False, error_message) otherwise
    """
    if allowed_actions is not None and action not in allowed_actions:
        return False, ERR_UNKNOWN_ACTION.format(action)

    required = manifest_required_params.get(action, ())
    missing = [p for p in required if p not in params or params.get(p) is None or params.get(p) == ""]
    if missing:
        # If multiple missing, return the first to match directive style
        return False, ERR_MISSING_PARAM.format(missing[0])
    return True, ""


def enforce_safety(action: str, params: Dict[str, str], governance_paths: Tuple[str, ...] = ()) -> Tuple[bool, str]:
    """
    Enforce safety rules from the directive.

    - Disallow modification of governance files (manifest, directive).
    - Disallow operations that attempt to access system-critical paths.
    - Disallow obvious privilege escalation attempts (best-effort checks).

    governance_paths: tuple of absolute paths that are considered governance files.

    Returns:
        (True, "") if safe
        (False, error_message) otherwise
    """
    # If action is write_file, ensure path is not a governance file
    if action == "write_file":
        path = params.get("path", "")
        if not path:
            return False, ERR_MISSING_PARAM.format("path")
        # Normalize path
        try:
            norm = os.path.abspath(path)
        except Exception:
            norm = path
        for g in governance_paths:
            try:
                if os.path.abspath(g) == norm:
                    return False, ERR_MODIFY_GOVERNANCE
            except Exception:
                continue

        # Disallow writing to system-critical directories (best-effort)
        sys_critical_prefixes = (
            os.path.abspath(os.sep),  # root (we'll check more specific below)
        )
        # On Windows, disallow writing to C:\Windows or C:\Program Files
        windows_block = ["C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"]
        unix_block = ["/etc", "/bin", "/sbin", "/usr/bin", "/usr/sbin", "/boot", "/proc", "/sys"]

        lower_norm = norm.lower()
        for p in windows_block:
            if lower_norm.startswith(os.path.abspath(p).lower()):
                return False, ERR_UNSAFE
        for p in unix_block:
            if lower_norm.startswith(os.path.abspath(p)):
                return False, ERR_UNSAFE

    # If action is ssh_exec, ensure host param exists
    if action == "ssh_exec":
        host = params.get("host")
        cmd = params.get("cmd")
        if not host:
            return False, ERR_MISSING_PARAM.format("host")
        if not cmd:
            return False, ERR_MISSING_PARAM.format("cmd")
        # Additional network boundary checks could be added here (not implemented)
    # If action is run_command, ensure cmd param exists
    if action == "run_command":
        cmd = params.get("cmd")
        if not cmd:
            return False, ERR_MISSING_PARAM.format("cmd")
        # Disallow obvious privilege escalation tokens
        lower_cmd = cmd.lower()
        if "sudo" in lower_cmd or "su " in lower_cmd or "runas " in lower_cmd:
            return False, ERR_UNSAFE

    # read_file: ensure path param exists
    if action == "read_file":
        path = params.get("path")
        if not path:
            return False, ERR_MISSING_PARAM.format("path")
        # Disallow reading of system-critical files (best-effort)
        try:
            norm = os.path.abspath(path)
            lower_norm = norm.lower()
            windows_block = ["c:\\windows\\system32", "c:\\windows"]
            unix_block = ["/etc/shadow", "/etc/sudoers", "/root"]
            for p in windows_block:
                if lower_norm.startswith(os.path.abspath(p).lower()):
                    return False, ERR_UNSAFE
            for p in unix_block:
                if lower_norm.startswith(os.path.abspath(p)):
                    return False, ERR_UNSAFE
        except Exception:
            pass

    return True, ""


def apply_directive(
    instr: str,
    manifest_required_params: Optional[Dict[str, Tuple[str, ...]]] = None,
    allowed_actions: Optional[Tuple[str, ...]] = None,
    governance_paths: Optional[Tuple[str, ...]] = None
) -> Tuple[bool, object]:
    """
    High-level enforcement function.

    Steps:
    1. Validate instruction format.
    2. Parse instruction.
    3. Validate action is allowed and required params exist.
    4. Enforce safety rules.
    5. Return (True, (action, params)) on success or (False, error_message) on failure.

    manifest_required_params: mapping action -> tuple of required param names.
        Example: {"read_file": ("path",), "write_file": ("path", "content"), ...}

    allowed_actions: tuple/list of allowed action names. If None, no allowed-action check is performed.

    governance_paths: tuple/list of absolute paths that are governance files and must not be modified.
    """
    # Step 1: format
    ok, err = validate_instruction_format(instr)
    if not ok:
        return False, err

    # Step 2: parse
    parsed = parse_instruction(instr)
    if parsed is None:
        return False, ERR_INVALID_FORMAT
    action, params = parsed

    # Step 3: validate action and params
    manifest_required_params = manifest_required_params or {}
    ok, err = validate_action_and_params(action, params, manifest_required_params, allowed_actions)
    if not ok:
        return False, err

    # Step 4: safety
    governance_paths = governance_paths or ()
    ok, err = enforce_safety(action, params, governance_paths)
    if not ok:
        return False, err

    # All checks passed
    return True, (action, params)


# Example manifest of required params (used by agent runtime)
DEFAULT_MANIFEST_REQUIRED_PARAMS = {
    "read_file": ("path",),
    "write_file": ("path", "content"),
    "run_command": ("cmd",),
    "ssh_exec": ("host", "cmd"),
}

# Example allowed actions (tuple)
DEFAULT_ALLOWED_ACTIONS = tuple(DEFAULT_MANIFEST_REQUIRED_PARAMS.keys())

# Example governance files (do not allow modification)
DEFAULT_GOVERNANCE_PATHS = (
    os.path.abspath(os.path.join(os.path.dirname(__file__), "tool_manifest.md")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "agent_directive.md")),
)


# CLI helper for quick testing (keeps behavior deterministic and plain-text)
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print(ERR_INVALID_FORMAT)
        sys.exit(1)
    raw = " ".join(sys.argv[1:])
    ok, result = apply_directive(
        raw,
        manifest_required_params=DEFAULT_MANIFEST_REQUIRED_PARAMS,
        allowed_actions=DEFAULT_ALLOWED_ACTIONS,
        governance_paths=DEFAULT_GOVERNANCE_PATHS
    )
    if not ok:
        print(result)
        sys.exit(1)
    action, params = result
    # Print a deterministic confirmation (no extra decoration)
    print(f"[OK] Action validated: {action}")
    for k, v in params.items():
        print(f"{k}={v}")