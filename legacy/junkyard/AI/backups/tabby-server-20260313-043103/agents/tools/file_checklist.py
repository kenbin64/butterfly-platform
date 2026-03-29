# file_checklist.py
# Deterministic checklist validator for ButterflyFX repository.
# Location suggestion: C:\AI\tabby-server\agents\tools\file_checklist.py
#
# Purpose:
#   Run a suite of static runtime checks to verify that repository files
#   conform to the Agent Directive, Tool Manifest, scaffold, substrate,
#   and a pragmatic "Schwartz Diamond" compatibility heuristic.
#
# Behavior:
#   - Purely local, read-only checks (no network, no modifications).
#   - Always returns plain-text results.
#   - Never raises; returns [ERROR] messages on unexpected failures.
#
# Usage:
#   python file_checklist.py [root_path]
#   If root_path is omitted, the script assumes the parent of this file's directory
#   is the repository root (two levels up from this file).
#
# Output:
#   A plain-text checklist with PASS / FAIL / WARN lines and short explanations.

import os
import sys
import importlib.util
import inspect
import traceback

# --- Configuration: expected files and minimal contracts ---
EXPECTED_AT_ROOT = [
    "start_tabby.bat",
    "tabby.log",
    "tabby-server",
]

TABBY_SERVER_FILES = [
    "butterflyfx-system.txt",
    "config.env",
    "getmodels.ps1",
    "llama-server.exe",
    "scafold.md",
    "system.md",
    "tabby.exe",
    "config",
    "models",
    "agents",
]

REQUIRED_TOOL_MODULES = {
    "tools.file_read": ("read_file",),
    "tools.file_write": ("write_file",),
    "tools.run_command": ("run_command",),
    "tools.ssh_exec": ("ssh_exec",),
}

GOVERNANCE_FILES = [
    "agents/tool_manifest.md",
    "agents/agent_directive.md",
]

MODEL_EXTENSIONS = (".gguf", ".bin", ".pt", ".safetensors")

# Schwartz Diamond heuristic rules (pragmatic)
# - manifest exists and parsable
# - directive exists and parseable (basic)
# - tools folder exists and contains required modules
# - models folder contains at least one model file
# - system.md and scafold.md exist and are non-empty
# - agent files exist (agent.py, tool_router.py)
SCHWARTZ_RULES = [
    "manifest_present",
    "directive_present",
    "tools_present",
    "models_present",
    "scaffold_and_system_present",
    "agent_files_present",
]

# --- Helpers ---
def _log_line(status: str, name: str, msg: str = "") -> str:
    if msg:
        return f"{status} | {name} | {msg}"
    return f"{status} | {name}"

def _safe_read(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return True, f.read()
    except Exception as e:
        return False, f"[ERROR] Unable to read {path}: {e}"

def _is_writable(path):
    try:
        # If path exists, test write permission; if not, test parent dir
        target = path if os.path.exists(path) else os.path.dirname(path) or "."
        return os.access(target, os.W_OK)
    except Exception:
        return False

def _import_module_from_path(module_name, file_path):
    try:
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        if spec is None:
            return None, f"[ERROR] Cannot create spec for {file_path}"
        mod = importlib.util.module_from_spec(spec)
        loader = spec.loader
        if loader is None:
            return None, f"[ERROR] No loader for {file_path}"
        loader.exec_module(mod)
        return mod, ""
    except Exception as e:
        tb = traceback.format_exc()
        return None, f"[ERROR] Import failed for {file_path}: {e}\n{tb}"

# --- Checks ---
def check_root(root):
    results = []
    for name in EXPECTED_AT_ROOT:
        path = os.path.join(root, name)
        if os.path.exists(path):
            results.append(_log_line("PASS", f"root:{name}", "exists"))
        else:
            results.append(_log_line("FAIL", f"root:{name}", "missing"))
    return results

def check_tabby_server(root):
    results = []
    base = os.path.join(root, "tabby-server")
    if not os.path.isdir(base):
        return [_log_line("FAIL", "tabby-server", "missing or not a directory")]
    for name in TABBY_SERVER_FILES:
        path = os.path.join(base, name)
        if os.path.exists(path):
            results.append(_log_line("PASS", f"tabby-server:{name}", "exists"))
        else:
            results.append(_log_line("FAIL", f"tabby-server:{name}", "missing"))
    return results

def check_tools(root):
    results = []
    tools_dir = os.path.join(root, "tabby-server", "agents", "tools")
    if not os.path.isdir(tools_dir):
        return [_log_line("FAIL", "tools", f"missing directory: {tools_dir}")]
    results.append(_log_line("PASS", "tools:directory", tools_dir))
    # For each required module, check file exists and functions present
    for module_path, funcs in REQUIRED_TOOL_MODULES.items():
        # module_path like "tools.file_read" -> file tools/file_read.py
        rel = module_path.replace(".", os.sep) + ".py"
        file_path = os.path.join(root, "tabby-server", "agents", rel)
        if not os.path.isfile(file_path):
            results.append(_log_line("FAIL", f"tool:{module_path}", f"file missing: {file_path}"))
            continue
        results.append(_log_line("PASS", f"tool:{module_path}:file", file_path))
        mod, err = _import_module_from_path(module_path, file_path)
        if mod is None:
            results.append(_log_line("FAIL", f"tool:{module_path}:import", err.splitlines()[0]))
            continue
        # check functions
        for fn in funcs:
            if hasattr(mod, fn) and callable(getattr(mod, fn)):
                results.append(_log_line("PASS", f"tool:{module_path}.{fn}", "callable"))
            else:
                results.append(_log_line("FAIL", f"tool:{module_path}.{fn}", "missing or not callable"))
    return results

def check_manifest_and_directive(root):
    results = []
    manifest_path = os.path.join(root, "tabby-server", "agents", "tool_manifest.md")
    directive_path = os.path.join(root, "tabby-server", "agents", "agent_directive.md")
    # manifest
    ok, content = _safe_read(manifest_path)
    if not ok:
        results.append(_log_line("FAIL", "manifest", f"missing or unreadable: {manifest_path}"))
    else:
        # basic parse: look for "action" and "module" tokens
        if "action" in content and "module" in content:
            results.append(_log_line("PASS", "manifest", "present and contains expected tokens"))
        else:
            results.append(_log_line("WARN", "manifest", "present but may be unparsable"))
    # directive
    ok, content = _safe_read(directive_path)
    if not ok:
        results.append(_log_line("FAIL", "directive", f"missing or unreadable: {directive_path}"))
    else:
        if "Instruction format" in content or "action=" in content or "Agent Directive" in content:
            results.append(_log_line("PASS", "directive", "present"))
        else:
            results.append(_log_line("WARN", "directive", "present but content unexpected"))
    return results

def check_models(root):
    results = []
    models_dir = os.path.join(root, "tabby-server", "models")
    if not os.path.isdir(models_dir):
        return [_log_line("FAIL", "models", f"missing directory: {models_dir}")]
    results.append(_log_line("PASS", "models:directory", models_dir))
    found = []
    try:
        for fn in os.listdir(models_dir):
            if fn.lower().endswith(MODEL_EXTENSIONS):
                found.append(fn)
    except Exception as e:
        return [_log_line("FAIL", "models", f"error listing models: {e}")]
    if not found:
        results.append(_log_line("WARN", "models", "no recognized model files found"))
    else:
        for m in found:
            results.append(_log_line("PASS", f"models:{m}", "recognized model file"))
    return results

def check_scaffold_and_system(root):
    results = []
    base = os.path.join(root, "tabby-server")
    for name in ("system.md", "scafold.md"):
        path = os.path.join(base, name)
        ok, content = _safe_read(path)
        if not ok:
            results.append(_log_line("FAIL", name, "missing or unreadable"))
            continue
        # basic content checks
        if len(content.strip()) < 20:
            results.append(_log_line("WARN", name, "file present but very small"))
        else:
            results.append(_log_line("PASS", name, "present and non-empty"))
    return results

def check_agent_files(root):
    results = []
    agents_dir = os.path.join(root, "tabby-server", "agents")
    if not os.path.isdir(agents_dir):
        return [_log_line("FAIL", "agents", f"missing directory: {agents_dir}")]
    results.append(_log_line("PASS", "agents:directory", agents_dir))
    expected = ["agent.py", "tool_router.py", "agent_directive.py", "tool_manifest.md"]
    for name in expected:
        path = os.path.join(agents_dir, name)
        if os.path.exists(path):
            results.append(_log_line("PASS", f"agents:{name}", "exists"))
        else:
            results.append(_log_line("FAIL", f"agents:{name}", "missing"))
    return results

def check_permissions(root):
    results = []
    # Check that governance files are not world-writable (best-effort)
    for rel in GOVERNANCE_FILES:
        path = os.path.join(root, "tabby-server", rel.replace("agents/", "agents/"))
        if not os.path.exists(path):
            results.append(_log_line("WARN", f"perm:{rel}", "file missing; cannot check"))
            continue
        writable = _is_writable(path)
        if writable:
            results.append(_log_line("WARN", f"perm:{rel}", "file is writable (consider locking)"))
        else:
            results.append(_log_line("PASS", f"perm:{rel}", "not writable by current user"))
    # Check agents/tools directory writability (should be writable for development)
    tools_dir = os.path.join(root, "tabby-server", "agents", "tools")
    if os.path.isdir(tools_dir):
        if _is_writable(tools_dir):
            results.append(_log_line("PASS", "perm:tools_dir", "writable (development OK)"))
        else:
            results.append(_log_line("WARN", "perm:tools_dir", "not writable (may hinder development)"))
    else:
        results.append(_log_line("WARN", "perm:tools_dir", "missing; cannot check"))
    return results

def check_schwartz_diamond(root):
    """
    Heuristic composite check returning PASS if most core rules satisfied.
    """
    results = []
    # Evaluate subchecks
    manifest_path = os.path.join(root, "tabby-server", "agents", "tool_manifest.md")
    directive_path = os.path.join(root, "tabby-server", "agents", "agent_directive.md")
    tools_dir = os.path.join(root, "tabby-server", "agents", "tools")
    models_dir = os.path.join(root, "tabby-server", "models")
    scaffold = os.path.join(root, "tabby-server", "scafold.md")
    system = os.path.join(root, "tabby-server", "system.md")
    agent_py = os.path.join(root, "tabby-server", "agents", "agent.py")
    router_py = os.path.join(root, "tabby-server", "agents", "tool_router.py")

    score = 0
    total = 6

    if os.path.isfile(manifest_path):
        score += 1
    if os.path.isfile(directive_path):
        score += 1
    if os.path.isdir(tools_dir):
        score += 1
    if os.path.isdir(models_dir) and any(fn.lower().endswith(MODEL_EXTENSIONS) for fn in os.listdir(models_dir)):
        score += 1
    if os.path.isfile(scaffold) and os.path.isfile(system):
        score += 1
    if os.path.isfile(agent_py) and os.path.isfile(router_py):
        score += 1

    pct = int((score / total) * 100)
    if pct == 100:
        results.append(_log_line("PASS", "schwartz_diamond", f"{pct}% - all heuristic checks passed"))
    elif pct >= 60:
        results.append(_log_line("WARN", "schwartz_diamond", f"{pct}% - partial compliance"))
    else:
        results.append(_log_line("FAIL", "schwartz_diamond", f"{pct}% - insufficient compliance"))
    return results

# --- Runner ---
def run_all_checks(root):
    out = []
    out.append(_log_line("INFO", "root_checked", root))
    out.extend(check_root(root))
    out.extend(check_tabby_server(root))
    out.extend(check_manifest_and_directive(root))
    out.extend(check_tools(root))
    out.extend(check_models(root))
    out.extend(check_scaffold_and_system(root))
    out.extend(check_agent_files(root))
    out.extend(check_permissions(root))
    out.extend(check_schwartz_diamond(root))
    return out

def find_repo_root(provided_root=None):
    if provided_root:
        return os.path.abspath(provided_root)
    # default: two levels up from this file (agents/tools/file_checklist.py -> repo root)
    here = os.path.abspath(os.path.dirname(__file__))
    # if script placed in agents/tools, go up two levels to repo root
    candidate = os.path.abspath(os.path.join(here, "..", ".."))
    return candidate

def main(argv):
    root = find_repo_root(argv[1] if len(argv) > 1 else None)
    results = run_all_checks(root)
    # Print deterministic plain-text output
    for line in results:
        print(line)

if __name__ == "__main__":
    try:
        main(sys.argv)
    except Exception as e:
        # Never raise; print a concise error
        print(f"[ERROR] file_checklist failed: {e}")
        sys.exit(1)