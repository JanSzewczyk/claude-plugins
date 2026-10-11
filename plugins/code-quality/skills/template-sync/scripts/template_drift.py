#!/usr/bin/env python3
"""Inventory what a repository created from a template is missing from that template.

Read-only for the derived repository: it never adds remotes, fetches into it or
writes to it. The template is cloned (blob-less) into a scratch directory, or read
in place when it is a local path.

Usage:
    template_drift.py [--repo PATH] [--template URL|OWNER/NAME|PATH] [--ref BRANCH]
                      [--since SHA] [--workdir DIR]

Writes <workdir>/drift.json and <workdir>/patches/*.patch, prints a short summary.
Requires git; gh only when the template has to be discovered or cloned from GitHub.
Compatible with Python 3.9.
"""

import argparse
import datetime as dt
import fnmatch
import json
import os
import re
import subprocess
import sys
import tempfile
from typing import Dict, List, Optional, Tuple

MARKER = ".template-sync.json"

LOCKFILES = {
    "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml",
    "bun.lockb", "bun.lock", "poetry.lock", "uv.lock", "Pipfile.lock", "pdm.lock",
    "Cargo.lock", "go.sum", "composer.lock", "Gemfile.lock",
}

# First matching category wins. Patterns match the full path, then the basename.
CATEGORIES: List[Tuple[str, List[str]]] = [
    ("runtime-and-dependencies", [
        "package.json", "pyproject.toml", "requirements*.txt", "requirements/*.txt",
        "Pipfile", "setup.py", "setup.cfg", "go.mod", "Cargo.toml", "Gemfile",
        "composer.json", ".nvmrc", ".node-version", ".python-version",
        ".tool-versions", ".npmrc", ".yarnrc", ".yarnrc.yml", "pnpm-workspace.yaml",
        "lerna.json", "nx.json", "turbo.json",
    ]),
    ("generated-output", ["dist/*", "build/*", "out/*", "coverage/*", "*.map", "*.min.js",
                          "*.min.css"]),
    ("ci-cd", [
        ".github/workflows/*", ".github/actions/*", ".github/codeql/*", ".github/dependabot.yml",
        ".github/dependabot.yaml", "renovate.json", "renovate.json5", ".renovaterc*",
        ".gitlab-ci.yml", ".circleci/*", "azure-pipelines*.yml", "Jenkinsfile",
        "bitbucket-pipelines.yml", "action.yml", "action.yaml",
    ]),
    ("containers-and-environments", [
        "Dockerfile*", "*.Dockerfile", "docker-compose*", "compose.y*ml",
        "compose.*.y*ml", ".dockerignore", ".devcontainer/*", "*.env.example",
        ".env.example", ".env.sample",
    ]),
    ("ai-agent-config", ["CLAUDE.md", ".claude/*", "AGENTS.md", ".cursor/*", ".cursorrules",
                         ".github/copilot-instructions.md", ".github/prompts/*",
                         ".github/instructions/*", ".github/chatmodes/*", ".github/agents/*",
                         ".mcp.json", ".vscode/mcp.json"]),
    ("tooling-and-config", [
        "tsconfig*.json", "jsconfig*.json", "eslint.config.*", ".eslintrc*",
        ".eslintignore", ".prettierrc*", "prettier.config.*", ".prettierignore",
        ".stylelintrc*", "stylelint.config.*", "biome.json*", "vite.config.*",
        "vitest.config.*", "vitest.workspace.*", "jest.config.*", "babel.config.*",
        ".babelrc*", "rollup.config.*", "webpack.config.*", "tailwind.config.*",
        "postcss.config.*", "playwright.config.*", "cypress.config.*",
        "nuxt.config.*", "next.config.*", "svelte.config.*", "astro.config.*",
        ".editorconfig", ".husky/*", ".lintstagedrc*", "lint-staged.config.*",
        "commitlint.config.*", ".commitlintrc*", ".pre-commit-config.yaml",
        "ruff.toml", ".ruff.toml", "mypy.ini", ".mypy.ini", "pytest.ini", "tox.ini",
        "noxfile.py", ".flake8", ".pylintrc", ".coveragerc", "Makefile", "justfile",
        "Taskfile.y*ml", ".gitignore", ".gitattributes", ".vscode/*", ".idea/*",
        ".releaserc*", "release.config.*", ".changeset/*", ".github/linters/*",
        ".checkov.y*ml", "actionlint.y*ml", ".yamllint*", ".markdownlint*", "*.config.js",
        "*.config.ts", "*.config.mjs", "*.config.cjs",
    ]),
    ("repo-meta", [".github/*", "LICENSE*", "CONTRIBUTING*", "SECURITY*",
                   "CODE_OF_CONDUCT*", "CODEOWNERS"]),
    ("docs", ["*.md", "*.mdx", "*.rst", "docs/*"]),
]


def run(cmd: List[str], cwd: Optional[str] = None, check: bool = True) -> str:
    proc = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          universal_newlines=True)
    if check and proc.returncode != 0:
        raise RuntimeError("{} failed ({}): {}".format(" ".join(cmd), proc.returncode,
                                                         proc.stderr.strip()))
    return proc.stdout


def git(repo: str, *args: str, check: bool = True) -> str:
    return run(["git", "-C", repo] + list(args), check=check)


def category_of(path: str) -> str:
    base = os.path.basename(path)
    if base in LOCKFILES:
        return "lockfile"
    for name, patterns in CATEGORIES:
        for pattern in patterns:
            if fnmatch.fnmatch(path, pattern) or ("/" not in pattern and fnmatch.fnmatch(base, pattern)):
                return name
    return "source-and-scaffold"


def read_marker(repo: str) -> Optional[dict]:
    path = os.path.join(repo, MARKER)
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def discover_template(repo: str) -> Tuple[Optional[str], Optional[str]]:
    """Return (owner/name, createdAt) of the GitHub template the repo was made from."""
    try:
        out = run(["gh", "repo", "view", "--json", "templateRepository,createdAt"], cwd=repo)
    except (RuntimeError, FileNotFoundError):
        return None, None
    data = json.loads(out)
    tpl = data.get("templateRepository")
    if not tpl:
        return None, data.get("createdAt")
    return "{}/{}".format(tpl["owner"]["login"], tpl["name"]), data.get("createdAt")


def open_template(spec: str, workdir: str) -> Tuple[str, str]:
    """Return (local git dir, kind) for the template, cloning when it is remote."""
    expanded = os.path.expanduser(spec)
    if os.path.isdir(expanded):
        return os.path.abspath(expanded), "local"
    target = os.path.join(workdir, "template")
    if os.path.isdir(target):
        git(target, "fetch", "--quiet", "origin")
        return target, "cached-clone"
    if re.match(r"^[\w.-]+/[\w.-]+$", spec):
        run(["gh", "repo", "clone", spec, target, "--", "--quiet", "--filter=blob:none",
             "--no-checkout"])
    else:
        run(["git", "clone", "--quiet", "--filter=blob:none", "--no-checkout", spec, target])
    return target, "clone"


def web_url(spec: str, gh_template: Optional[str]) -> Optional[str]:
    """GitHub page of the template, for commit and pull-request links in the plan."""
    if re.match(r"^[\w.-]+/[\w.-]+$", spec):
        return "https://github.com/" + spec
    match = re.search(r"github\.com[:/]([\w.-]+/[\w.-]+?)(?:\.git)?/?$", spec)
    if match:
        return "https://github.com/" + match.group(1)
    return "https://github.com/" + gh_template if gh_template else None


def template_ref(tpl: str, kind: str, ref: Optional[str]) -> str:
    if kind == "local":
        return ref or "HEAD"
    if ref:
        return "origin/" + ref
    head = git(tpl, "symbolic-ref", "--short", "refs/remotes/origin/HEAD", check=False).strip()
    return head or "origin/HEAD"


def find_anchor(der: str, tpl: str, ref: str, since: Optional[str], marker: Optional[dict],
                created_at: Optional[str]) -> Dict[str, str]:
    """Find the template commit the derived repo last matched, and say how it was found."""
    if since:
        return {"sha": git(tpl, "rev-parse", since).strip(), "method": "explicit --since",
                "confidence": "high"}
    if marker and marker.get("last_synced_sha"):
        return {"sha": git(tpl, "rev-parse", marker["last_synced_sha"]).strip(),
                "method": "marker file " + MARKER, "confidence": "high"}

    tpl_commits = git(tpl, "log", "--format=%H %T", ref).split("\n")
    tpl_commits = [line.split() for line in tpl_commits if line.strip()]
    tpl_shas = {sha for sha, _ in tpl_commits}

    # A clone or fork of the template shares history: the newest shared commit is the anchor.
    for sha in git(der, "rev-list", "--first-parent", "HEAD").split():
        if sha in tpl_shas:
            return {"sha": sha, "method": "shared history (repo is a clone or fork of the template)",
                    "confidence": "high"}

    # "Use this template" copies the template tree into a fresh root commit, so the root
    # commit's tree hash equals the tree of the template commit it was cut from.
    roots = git(der, "rev-list", "--max-parents=0", "HEAD").split()
    root_trees = {git(der, "rev-parse", root + "^{tree}").strip(): root for root in roots}
    first_parent = set(git(tpl, "rev-list", "--first-parent", ref).split())
    matches = [sha for sha, tree in tpl_commits if tree in root_trees]
    if matches:
        preferred = [sha for sha in matches if sha in first_parent] or matches
        return {"sha": preferred[0], "method": "root tree hash matches a template commit",
                "confidence": "high"}

    # Fallback: the newest template commit on the default branch older than the derived
    # repo. --first-parent matters: without it, commits merged later but authored earlier win.
    when = created_at or git(der, "log", "-1", "--format=%cI", roots[-1]).strip()
    sha = git(tpl, "rev-list", "-1", "--first-parent", "--before=" + when, ref).strip()
    if not sha:
        raise RuntimeError("no template commit predates the derived repo ({}); pass --since".format(when))
    return {"sha": sha, "method": "date fallback (template default branch before {})".format(when),
            "confidence": "low"}


def ls_tree(repo: str, rev: str) -> Dict[str, str]:
    out = git(repo, "ls-tree", "-r", "--full-tree", rev)
    entries = {}
    for line in out.splitlines():
        meta, path = line.split("\t", 1)
        entries[path] = meta.split()[2]
    return entries


def show(repo: str, rev: str, path: str) -> Optional[str]:
    out = subprocess.run(["git", "-C", repo, "show", "{}:{}".format(rev, path)],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
    return out.stdout if out.returncode == 0 else None


DEP_SECTIONS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies",
                "engines", "scripts"]


def package_json_delta(old: Optional[str], new: Optional[str], cur: Optional[str]) -> List[dict]:
    """Key-level diff of a package.json: what the template changed and where the repo stands."""
    def load(text: Optional[str]) -> dict:
        try:
            return json.loads(text) if text else {}
        except ValueError:
            return {}
    o, n, c = load(old), load(new), load(cur)
    rows = []
    for section in DEP_SECTIONS + ["packageManager", "type"]:
        os_, ns, cs = o.get(section), n.get(section), c.get(section)
        if not isinstance(ns, dict) and not isinstance(os_, dict):
            if os_ != ns:
                rows.append({"section": section, "key": None, "template_old": os_,
                             "template_new": ns, "repo": cs})
            continue
        os_, ns, cs = os_ or {}, ns or {}, cs if isinstance(cs, dict) else {}
        for key in sorted(set(os_) | set(ns)):
            if os_.get(key) != ns.get(key):
                rows.append({"section": section, "key": key, "template_old": os_.get(key),
                             "template_new": ns.get(key), "repo": cs.get(key)})
    for row in rows:
        if row["repo"] == row["template_new"]:
            row["state"] = "already-applied"
        elif row["repo"] == row["template_old"]:
            row["state"] = "missing"
        else:
            row["state"] = "diverged"
    return rows


def classify(old: Optional[str], new: Optional[str], cur: Optional[str]) -> str:
    if cur == new:
        return "already-applied"
    if new is None:
        return "delete-pending" if cur == old else "deleted-upstream-but-modified-here"
    if old is None:
        return "missing-new-file" if cur is None else "added-upstream-differs-here"
    if cur is None:
        return "removed-here"
    if cur == old:
        return "clean-apply"
    return "diverged"


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=".", help="derived repository (default: cwd)")
    parser.add_argument("--template", help="template: GitHub OWNER/NAME, git URL or local path")
    parser.add_argument("--ref", help="template branch (default: its default branch)")
    parser.add_argument("--since", help="template commit to diff from, overriding detection")
    parser.add_argument("--workdir", help="scratch directory for the clone and outputs")
    args = parser.parse_args()

    der = os.path.abspath(git(os.path.abspath(args.repo), "rev-parse", "--show-toplevel").strip())
    workdir = os.path.abspath(args.workdir) if args.workdir else tempfile.mkdtemp(prefix="template-sync-")
    os.makedirs(os.path.join(workdir, "patches"), exist_ok=True)

    marker = read_marker(der)
    gh_template, created_at = (None, None)
    spec = args.template or (marker or {}).get("template")
    source = "--template" if args.template else ("marker" if spec else None)
    if not spec or not args.since:
        gh_template, created_at = discover_template(der)
    if not spec:
        spec, source = gh_template, "github templateRepository"
    if not spec:
        print("ERROR: cannot tell which template this repo came from: GitHub reports no "
              "templateRepository and there is no {} marker. Re-run with "
              "--template OWNER/NAME|URL|PATH.".format(MARKER), file=sys.stderr)
        return 2

    tpl, kind = open_template(spec, workdir)
    ref = template_ref(tpl, kind, args.ref or (marker or {}).get("ref"))
    head = git(tpl, "rev-parse", ref).strip()
    anchor = find_anchor(der, tpl, ref, args.since, marker, created_at)

    commits = []
    log = git(tpl, "log", "--first-parent", "--format=%H%x1f%cI%x1f%an%x1f%s",
              "{}..{}".format(anchor["sha"], head))
    for line in log.splitlines():
        sha, date, author, subject = line.split("\x1f")
        files = git(tpl, "diff", "--name-only", sha + "^", sha, check=False).split()
        pr = re.search(r"(?:pull request |\(|^)#(\d+)", subject)
        commits.append({"sha": sha, "date": date, "author": author, "subject": subject,
                        "pr": int(pr.group(1)) if pr else None, "files": files})

    old_tree = ls_tree(tpl, anchor["sha"])
    new_tree = ls_tree(tpl, head)
    cur_tree = ls_tree(der, "HEAD")

    skipped: Dict[str, str] = {}
    for item in (marker or {}).get("skipped", []):
        for path in item.get("paths", []):
            skipped[path] = item.get("reason", "")

    files = []
    name_status =git(tpl, "diff", "--name-status", "-M", anchor["sha"], head)
    for index, line in enumerate(name_status.splitlines()):
        parts = line.split("\t")
        status = parts[0]
        old_path, new_path = (parts[1], parts[2]) if status.startswith("R") else (parts[1], parts[1])
        old, new = old_tree.get(old_path), new_tree.get(new_path)
        cur = cur_tree.get(new_path) or cur_tree.get(old_path)
        entry = {
            "path": new_path,
            "old_path": old_path if old_path != new_path else None,
            "template_status": status,
            "category": category_of(new_path),
            "state": classify(old, new, cur),
            "touched_by": [c["sha"][:10] for c in commits
                           if new_path in c["files"] or old_path in c["files"]],
        }
        if new_path in skipped or old_path in skipped:
            entry["previously_skipped"] = skipped.get(new_path, skipped.get(old_path))
        if entry["category"] != "lockfile" and entry["state"] != "already-applied":
            patch = git(tpl, "diff", "-M", anchor["sha"], head, "--", old_path, new_path)
            patch_path = os.path.join(workdir, "patches", "{:03d}-{}.patch".format(
                index, re.sub(r"[^\w.-]+", "_", new_path)))
            with open(patch_path, "w", encoding="utf-8") as handle:
                handle.write(patch)
            entry["template_patch"] = patch_path
            entry["patch_lines"] = patch.count("\n")
        if os.path.basename(new_path) == "package.json" and entry["state"] != "already-applied":
            entry["package_json_delta"] = package_json_delta(
                show(tpl, anchor["sha"], old_path), show(tpl, head, new_path),
                show(der, "HEAD", new_path) or show(der, "HEAD", old_path))
        files.append(entry)

    own_files = re.compile(r"^.. (template-sync-plan-[\d-]+\.md|{})$".format(re.escape(MARKER)))
    dirty = "\n".join(line for line in git(der, "status", "--porcelain").splitlines()
                      if not own_files.match(line))
    report = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "derived_repo": der,
        "derived_head": git(der, "rev-parse", "HEAD").strip(),
        "derived_has_uncommitted_changes": bool(dirty),
        "template": {"spec": spec, "found_via": source, "local_dir": tpl, "ref": ref,
                     "head": head, "github_template": gh_template,
                     "web_url": web_url(spec, gh_template)},
        "anchor": anchor,
        "commits": commits,
        "files": files,
        "workdir": workdir,
    }
    out_path = os.path.join(workdir, "drift.json")
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print("template   {} ({}) via {}".format(spec, ref, source))
    print("anchor     {} — {} [{} confidence]".format(anchor["sha"][:10], anchor["method"],
                                                     anchor["confidence"]))
    print("range      {}..{}  {} commits, {} files".format(anchor["sha"][:10], head[:10],
                                                          len(commits), len(files)))
    if dirty:
        print("WARNING    derived repo has uncommitted changes; states compare against HEAD")
    counts: Dict[str, int] = {}
    for entry in files:
        key = "{} / {}".format(entry["category"], entry["state"])
        counts[key] = counts.get(key, 0) + 1
    for key in sorted(counts):
        print("  {:>3}  {}".format(counts[key], key))
    print("report     " + out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
