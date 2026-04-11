import subprocess
import os
import shutil
from typing import List, Dict

class GitEngine:
    def __init__(self, work_dir: str = "/tmp/gitsync_workspaces"):
        self.work_dir = work_dir
        if not os.path.exists(self.work_dir):
            os.makedirs(self.work_dir, exist_ok=True)

    def _run_git(self, args: List[str], repo_path: str) -> Dict[str, any]:
        try:
            result = subprocess.run(
                ["git"] + args,
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True
            )
            return {"success": True, "output": result.stdout}
        except subprocess.CalledProcessError as e:
            return {"success": False, "output": e.stdout, "error": e.stderr}

    def clone_repo(self, repo_url: str, repo_name: str) -> str:
        repo_path = os.path.join(self.work_dir, repo_name)
        if os.path.exists(repo_path):
            return repo_path # Already cloned
        
        res = subprocess.run(
            ["git", "clone", repo_url, repo_path],
            capture_output=True,
            text=True
        )
        if res.returncode == 0:
            return repo_path
        raise Exception(f"Failed to clone repo: {res.stderr}")

    def fetch_and_pull(self, repo_path: str, branch: str = "main"):
        # ensure we have updates
        self._run_git(["fetch", "origin"], repo_path)
        return self._run_git(["pull", "origin", branch], repo_path)

    def checkout_branch(self, branch_name: str, repo_path: str):
        return self._run_git(["checkout", branch_name], repo_path)

    def merge_branch(self, source_branch: str, target_branch: str, repo_path: str):
        self.checkout_branch(target_branch, repo_path)
        res = self._run_git(["merge", source_branch], repo_path)
        return res

    def get_diff(self, repo_path: str):
        return self._run_git(["diff"], repo_path)

    def get_conflicted_file_content(self, repo_path: str, file_path_rel: str) -> str:
        file_path_abs = os.path.join(repo_path, file_path_rel)
        if os.path.exists(file_path_abs):
            with open(file_path_abs, 'r', encoding='utf-8') as f:
                return f.read()
        return ""

    def get_conflicting_files(self, repo_path: str) -> List[str]:
        res = self._run_git(["diff", "--name-only", "--diff-filter=U"], repo_path)
        if res["success"] and res["output"].strip():
            return [f for f in res["output"].strip().split("\n") if f]
        return []
        
    def abort_merge(self, repo_path: str):
        return self._run_git(["merge", "--abort"], repo_path)
        
    def apply_patch(self, file_path_rel: str, patched_content: str, repo_path: str):
        """Safe execution: Write merged code to the file directly and git add"""
        file_path_abs = os.path.join(repo_path, file_path_rel)
        with open(file_path_abs, "w", encoding='utf-8') as f:
            f.write(patched_content)
        
        # Add the file
        return self._run_git(["add", file_path_rel], repo_path)

    def commit_resolution(self, repo_path: str, message: str = "Merge conflict resolved by GitSync AI"):
        return self._run_git(["commit", "-m", message], repo_path)
