"""
tool_router.py

Deterministic tool router for ButterflyFX Agent.

Location:
    C:\AI\tabby-server\agents\tool_router.py

Behavior:
- Loads a simple manifest file (tool_manifest.md) if present and parses
  action -> module.function mappings.
- Falls back to a built-in routing table if manifest is missing or unparsable.
- Validates required parameters are present before calling a tool.
- Dynamically imports the target function and calls it with keyword args.
- Never raises; always returns a plain-text result string.
- Logs minimal events to a local file (router.log) for auditability.

Usage (programmatic):
    from tool_router import ToolRouter
    router = ToolRouter(manifest_path="tool_manifest.md")
    result = router.route("read_file", path="C:/AI/tabby-server/config.env")

Usage (CLI):
    python tool_router.py read_file path="C:/AI/tabby-server/config.env"
"""

from typing import Callable, Dict, Tuple, Optional
import importlib
import inspect
import os
import sys
import traceback

MANIFEST_DEFAULT = "tool_manifest.md"
LOG_FILE = os.path.join(os.path.dirname(__file__), "router.log")


def _log(msg: str) -> None:
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(msg.rstrip() + "\n")
    except Exception:
        # Logging must never fail loudly
        pass


def _safe_str(obj) -> str:
    try:
        return str(obj)
    except Exception:
        return "<unstringable>"


class ToolRouter:
    def __init__(self, manifest_path: Optional[str] = None):
        self.manifest_path = manifest_path or os.path.join(os.path.dirname(__file__), MANIFEST_DEFAULT)
        self.routes: Dict[str, Tuple[str, str]] = {}
        self.signatures: Dict[str, inspect.Signature] = {}
        self._load_manifest_or_fallback()

    def _load_manifest_or_fallback(self) -> None:
        loaded = False
        try:
            if os.path.exists(self.manifest_path):
                self._parse_manifest(self.manifest_path)
                loaded = bool(self.routes)
                _log(f"[INFO] Loaded manifest from {self.manifest_path}")
        except Exception as e:
            _log(f"[WARN] Failed to load manifest: {_safe_str(e)}")

        if not loaded:
            # Fallback routing table (explicit, deterministic)
            self.routes = {
                "read_file": ("tools.file_read", "read_file"),
                "write_file": ("tools.file_write", "write_file"),
                "run_command": ("tools.run_command", "run_command"),
                "ssh_exec": ("tools.ssh_exec", "ssh_exec"),
            }
            _log("[INFO] Using fallback routing table")

        # Preload signatures for validation
        for action, (module_name, func_name) in self.routes.items():
            try:
                func = self._import_function(module_name, func_name)
                sig = inspect.signature(func)
                self.signatures[action] = sig
            except Exception as e:
                self.signatures[action] = None
                _log(f"[WARN] Could not load signature for {action}: {_safe_str(e)}")

    def _parse_manifest(self, path: str) -> None:
        """
        Very small manifest parser that looks for blocks like:

        ## 1. read_file
        action
        read_file

        module
        tools.file_read

        function
        read_file(path: str) -> str

        It extracts action -> (module, function) pairs.
        """
        routes = {}
        try:
            with open(path, "r", encoding="utf-8") as f:
                lines = [ln.rstrip() for ln in f]
        except Exception as e:
            raise RuntimeError(f"Cannot read manifest: {e}")

        current_action = None
        current_module = None
        current_function = None

        i = 0
        while i < len(lines):
            ln = lines[i].strip()
            if ln.lower() == "action":
                # next non-empty line is action name
                i += 1
                while i < len(lines) and not lines[i].strip():
                    i += 1
                if i < len(lines):
                    current_action = lines[i].strip()
            elif ln.lower() == "module":
                i += 1
                while i < len(lines) and not lines[i].strip():
                    i += 1
                if i < len(lines):
                    current_module = lines[i].strip()
            elif ln.lower() == "function":
                i += 1
                while i < len(lines) and not lines[i].strip():
                    i += 1
                if i < len(lines):
                    # function line may contain signature; extract function name before '('
                    fn_line = lines[i].strip()
                    fn_name = fn_line.split("(")[0].strip()
                    current_function = fn_name
            # when we have a full triple, record it
            if current_action and current_module and current_function:
                routes[current_action] = (current_module, current_function)
                current_action = None
                current_module = None
                current_function = None
            i += 1

        if not routes:
            raise RuntimeError("No routes parsed from manifest")

        self.routes = routes

    def _import_function(self, module_name: str, func_name: str) -> Callable:
        try:
            module = importlib.import_module(module_name)
            func = getattr(module, func_name)
            if not callable(func):
                raise RuntimeError(f"{module_name}.{func_name} is not callable")
            return func
        except Exception as e:
            raise

    def _validate_params(self, action: str, kwargs: Dict) -> Optional[str]:
        sig = self.signatures.get(action)
        if not sig:
            # If signature unknown, skip strict validation
            return None
        # Determine required parameters (no defaults and not VAR_POSITIONAL/VAR_KEYWORD)
        required = []
        for name, param in sig.parameters.items():
            if param.kind in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD):
                continue
            if param.default is inspect._empty:
                required.append(name)
        missing = [p for p in required if p not in kwargs or kwargs.get(p) is None]
        if missing:
            return f"[ERROR] Missing parameter(s): {', '.join(missing)}"
        return None

    def route(self, action: str, **kwargs) -> str:
        """
        Route an action to the appropriate tool.

        Returns:
            - tool output as text
            - or an [ERROR] message
        """
        try:
            if action not in self.routes:
                return f"[ERROR] Unknown action: {action}"

            # Validate parameters
            validation_err = self._validate_params(action, kwargs)
            if validation_err:
                return validation_err

            module_name, func_name = self.routes[action]
            try:
                func = self._import_function(module_name, func_name)
            except Exception as e:
                _log(f"[ERROR] Import failed for {module_name}.{func_name}: {_safe_str(e)}")
                return f"[ERROR] Unable to import tool: {module_name}.{func_name}"

            # Call function with only parameters that match its signature
            try:
                sig = inspect.signature(func)
                call_kwargs = {}
                if sig.parameters:
                    for name in sig.parameters:
                        if name in kwargs:
                            call_kwargs[name] = kwargs[name]
                # Execute
                result = func(**call_kwargs)
                # Ensure text output
                if result is None:
                    return "[OK] (no output)"
                return _safe_str(result)
            except Exception as e:
                # Capture traceback for log, but return safe error string
                tb = traceback.format_exc()
                _log(f"[ERROR] Exception during tool execution for action={action}: {tb}")
                return f"[ERROR] Tool execution failed: {e}"
        except Exception as e:
            _log(f"[FATAL] Router internal error: {_safe_str(e)}")
            return f"[ERROR] Router internal error: {e}"


# CLI support
def _parse_cli_args(argv):
    """
    Parse CLI args of the form:
        python tool_router.py action key="value" key2="value2"
    Returns (action, kwargs)
    """
    if len(argv) < 2:
        return None, {}
    action = argv[1]
    kwargs = {}
    for token in argv[2:]:
        if "=" not in token:
            continue
        k, v = token.split("=", 1)
        # strip surrounding quotes if present
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v = v[1:-1]
        kwargs[k] = v
    return action, kwargs


if __name__ == "__main__":
    router = ToolRouter()
    action, params = _parse_cli_args(sys.argv)
    if not action:
        print("[ERROR] No action provided")
        sys.exit(1)
    out = router.route(action, **params)
    print(out)