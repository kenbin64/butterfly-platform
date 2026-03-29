from tools.file_read import read_file
from tools.file_write import write_file
from tools.run_command import run_command
from tools.ssh_exec import ssh_exec

class Agent:
    def __init__(self):
        pass

    def handle(self, action: str, **kwargs):
        if action == "read_file":
            return read_file(kwargs.get("path"))

        if action == "write_file":
            return write_file(kwargs.get("path"), kwargs.get("content"))

        if action == "run_command":
            return run_command(kwargs.get("cmd"))

        if action == "ssh_exec":
            return ssh_exec(kwargs.get("host"), kwargs.get("cmd"))

        return f"[ERROR] Unknown action: {action}"