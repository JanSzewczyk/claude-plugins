#!/usr/bin/env python3
"""Inventory what a repository created from a template is missing from that template.

Read-only for the derived repository: it never adds remotes, fetches into it or
writes to it. The template is cloned (blob-less) into a scratch directory, or read
in place when it is a local path.

The anchor — the template commit the project last matched — comes first from the
project's own history: a sync commit carrying a `Template-Sync: <sha>` trailer.
Only the template commits after that SHA are inventoried, so a repeat run costs
proportionally to what the template did since the last sync, not to its whole
history. Without a sync commit the anchor is detected from the two histories.

Usage:
    template_drift.py [--repo PATH] [--template URL|OWNER/NAME|PATH] [--ref BRANCH]
                      [--since SHA] [--workdir DIR]

Writes <workdir>/drift.json, <workdir>/patches/*.patch and
<workdir>/sync-commit-message.txt, prints a short summary.
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

# Trailers of the commit that closes a sync. TRAILER_SYNC is the pointer the next run
# starts from; the others let it skip template discovery.
TRAILER_SYNC = "Template-Sync"
TRAILER_SOURCE = "Template-Source"
TRAILER_REF = "Template-Ref"
TRAILER_SKIPPED = "Template-Skipped"  # "<path> -- <reason>", one per skipped file
SYNC_SUBJECT = "chore: sync with template {spec} @ {short}"

MARKER = ".template-sync.json"  # legacy pointer file, read when no sync commit exists

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


# --- pointers left by earlier syncs ------------------------------------------------


def read_sync_commits(repo: str) -> List[dict]:
    """Sync commits in HEAD's ancestry, newest first, with their trailers.

    `--grep` only narrows the candidates (it also matches prose that mentions the
    key); a commit counts when git's trailer parser finds the pointer.
    """
    out = git(repo, "log", "--grep=^{}: ".format(TRAILER_SYNC),
              "--format=%x1e%H%x1f%cI%x1f%s%x1f%(trailers:only,unfold)")
    commits = []
    for block in out.split("\x1e"):
        if not block.strip():
            continue
        sha, date, subject, trailers = block.split("\x1f", 3)
        fields: Dict[str, List[str]] = {}
        for line in trailers.splitlines():
            match = re.match(r"^([\w-]+):\s*(.*)$", line)
            if match:
                fields.setdefault(match.group(1), []).append(match.group(2).strip())
        if fields.get(TRAILER_SYNC):
            commits.append({"sha": sha, "date": date, "subject": subject, "trailers": fields})
    return commits


def skipped_from_syncs(sync_commits: List[dict]) -> Dict[str, str]:
    """path -> reason from every sync commit's Template-Skipped trailers; newest wins."""
    skipped: Dict[str, str] = {}
    for commit in reversed(sync_commits):
        for value in commit["trailers"].get(TRAILER_SKIPPED, []):
            path, _, reason = value.partition(" -- ")
            skipped[path.strip()] = reason.strip()
    return skipped


def read_marker(repo: str) -> Optional[dict]:
    path = os.path.join(repo, MARKER)
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


# --- template ----------------------------------------------------------------------


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


def branch_name(ref: str) -> str:
    return ref[len("origin/"):] if ref.startswith("origin/") else ref


# --- anchor ------------------------------------------------------------------------


def resolve_pointer(tpl: str, head: str, sha: str, origin: str, notes: List[str]) -> Optional[str]:
    """Full SHA of a recorded pointer, or None (with a note) when the template no longer has it."""
    full = git(tpl, "rev-parse", "--verify", "--quiet", sha + "^{commit}", check=False).strip()
    if not full:
        notes.append("{} points at {}, which is not in the template's history "
                     "(rewritten, or another template?); ignored".format(origin, sha))
        return None
    ancestor = subprocess.run(["git", "-C", tpl, "merge-base", "--is-ancestor", full, head],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE).returncode == 0
    if not ancestor:
        notes.append("{} points at {}, which is not an ancestor of the compared head {} "
                     "(another branch?); ignored".format(origin, sha[:10], head[:10]))
        return None
    return full


def find_anchor(der: str, tpl: str, ref: str, head: str, since: Optional[str],
                sync: Optional[dict], marker: Optional[dict],
                created_at: Optional[str]) -> Dict[str, object]:
    """Find the template commit the derived repo last matched, and say how it was found."""
    notes: List[str] = []

    def found(sha: str, method: str, confidence: str) -> Dict[str, object]:
        return {"sha": sha, "method": method, "confidence": confidence, "notes": notes}

    if since:
        return found(git(tpl, "rev-parse", since).strip(), "explicit --since", "high")
    if sync:
        sha = resolve_pointer(tpl, head, sync["trailers"][TRAILER_SYNC][0],
                              "sync commit {}".format(sync["sha"][:10]), notes)
        if sha:
            return found(sha, "sync commit {} ({} trailer, {})".format(
                sync["sha"][:10], TRAILER_SYNC, sync["date"][:10]), "high")
    if marker and marker.get("last_synced_sha"):
        sha = resolve_pointer(tpl, head, marker["last_synced_sha"], "marker file " + MARKER, notes)
        if sha:
            return found(sha, "marker file {} (legacy)".format(MARKER), "high")

    # No usable pointer: detect the anchor from the two histories. This is the one
    # path that walks the template's whole log; a sync commit avoids it next time.
    tpl_commits = git(tpl, "log", "--format=%H %T", ref).split("\n")
    tpl_commits = [line.split() for line in tpl_commits if line.strip()]
    tpl_shas = {sha for sha, _ in tpl_commits}

    # A clone or fork of the template shares history: the newest shared commit is the anchor.
    for sha in git(der, "rev-list", "--first-parent", "HEAD").split():
        if sha in tpl_shas:
            return found(sha, "shared history (repo is a clone or fork of the template)", "high")

    # "Use this template" copies the template tree into a fresh root commit, so the root
    # commit's tree hash equals the tree of the template commit it was cut from.
    roots = git(der, "rev-list", "--max-parents=0", "HEAD").split()
    root_trees = {git(der, "rev-parse", root + "^{tree}").strip(): root for root in roots}
    first_parent = set(git(tpl, "rev-list", "--first-parent", ref).split())
    matches = [sha for sha, tree in tpl_commits if tree in root_trees]
    if matches:
        preferred = [sha for sha in matches if sha in first_parent] or matches
        return found(preferred[0], "root tree hash matches a template commit", "high")

    # Fallback: the newest template commit on the default branch older than the derived
    # repo. --first-parent matters: without it, commits merged later but authored earlier win.
    if created_at is None:
        _, created_at = discover_template(der)
    when = created_at or git(der, "log", "-1", "--format=%cI", roots[-1]).strip()
    sha = git(tpl, "rev-list", "-1", "--first-parent", "--before=" + when, ref).strip()
    if not sha:
        raise RuntimeError("no template commit predates the derived repo ({}); pass --since".format(when))
    return found(sha, "date fallback (template default branch before {})".format(when), "low")


# --- file comparison ---------------------------------------------------------------


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


BUMP_AUTHORS = re.compile(r"dependabot|renovate|greenkeeper|depfu|snyk-bot", re.I)
BUMP_SUBJECTS = re.compile(
    r"^(?:chore|build|fix|deps)\(deps(?:-dev)?\):"          # conventional-commit deps scope
    r"|^bump\s+(?!version\b)"                               # "Bump X from A to B" (Dependabot)
    r"|^(?:update|upgrade)\s+(?:dependency\s|dependencies\b|all\s+(?:non-major\s+)?dependencies"
    r"|\S+\s+(?:monorepo\s+)?to\s+v?\d)"                    # Renovate subjects
    r"|^lock ?file maintenance"
    r"|^merge pull request #\d+ from \S+/(?:dependabot|renovate)/",  # merged bot branch
    re.I)


def commit_kind(author: str, subject: str) -> str:
    """'dependency-bump' for a routine version bump (bot, or a bump-shaped subject);
    'change' for everything else. A heuristic: the skill reads the commit when in doubt."""
    if BUMP_AUTHORS.search(author) or BUMP_SUBJECTS.search(subject):
        return "dependency-bump"
    return "change"


def package_key_history(tpl: str, anchor: str, head: str, path: str) -> Dict[str, List[str]]:
    """key -> template commits (anchor..head, first parent) whose diff of `path` touched a
    line declaring that key. One git call; blob-less clones fetch the blobs in one batch."""
    log = git(tpl, "log", "--first-parent", "--diff-merges=first-parent", "--no-renames", "-p",
              "--format=%x1e%H", "{}..{}".format(anchor, head), "--", path)
    history: Dict[str, List[str]] = {}
    for block in log.split("\x1e"):
        if not block.strip():
            continue
        sha, _, diff = block.partition("\n")
        sides: Dict[str, Dict[str, str]] = {"-": {}, "+": {}}
        for match in re.finditer(r"^([-+])\s*\"([^\"]+)\"\s*:\s*(.*?),?\s*$", diff, re.M):
            sides[match.group(1)][match.group(2)] = match.group(3)
        # A key whose line only gained or lost a trailing comma did not change.
        for key in set(sides["-"]) | set(sides["+"]):
            if sides["-"].get(key) != sides["+"].get(key):
                shas = history.setdefault(key, [])
                if sha not in shas:
                    shas.append(sha)
    return history


def template_commits(tpl: str, anchor: str, head: str) -> List[dict]:
    """First-parent commits anchor..head with the files each touched, from one git call.

    One `git log` instead of one `git diff` per commit; `--no-renames` keeps git from
    fetching blob contents for rename detection on a blob-less clone.
    """
    log = git(tpl, "log", "--first-parent", "--diff-merges=first-parent", "--no-renames",
              "--name-only", "--format=%x1e%H%x1f%cI%x1f%an%x1f%s", "{}..{}".format(anchor, head))
    commits = []
    for block in log.split("\x1e"):
        if not block.strip():
            continue
        header, _, body = block.partition("\n")
        sha, date, author, subject = header.split("\x1f")
        pr = re.search(r"(?:pull request |\(|^)#(\d+)", subject)
        commits.append({"sha": sha, "date": date, "author": author, "subject": subject,
                        "pr": int(pr.group(1)) if pr else None,
                        "kind": commit_kind(author, subject),
                        "files": [line for line in body.splitlines() if line.strip()]})
    return commits


def split_patches(diff: str) -> Dict[str, str]:
    """One combined `git diff` split per file, keyed by its `diff --git` header line."""
    patches: Dict[str, str] = {}
    header, chunk = None, []
    for line in diff.splitlines(keepends=True):
        if line.startswith("diff --git "):
            if header is not None:
                patches[header] = "".join(chunk)
            header, chunk = line.rstrip("\n"), []
        chunk.append(line)
    if header is not None:
        patches[header] = "".join(chunk)
    return patches


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


def sync_commit_message(spec: str, branch: str, anchor: str, head: str, commit_count: int) -> str:
    """The predefined message of the commit that closes this sync; skipped files are
    added as `Template-Skipped` trailers by whoever makes the commit."""
    return (
        SYNC_SUBJECT.format(spec=spec, short=head[:7]) + "\n\n"
        + "Template {} ({}): {}..{}, {} commits.\n\n".format(
            spec, branch, anchor[:10], head[:10], commit_count)
        + "{}: {}\n{}: {}\n{}: {}\n".format(TRAILER_SYNC, head, TRAILER_SOURCE, spec,
                                            TRAILER_REF, branch)
    )


# --- main --------------------------------------------------------------------------


def main() -> int:
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

    sync_commits = read_sync_commits(der)
    sync = sync_commits[0] if sync_commits else None
    sync_trailers = sync["trailers"] if sync else {}
    marker = read_marker(der)

    # Template and branch: the command line, then the last sync commit, then the legacy
    # marker, and only then GitHub (a network call, needed only once per project).
    gh_template, created_at = None, None
    if args.template:
        spec, source = args.template, "--template"
    elif sync_trailers.get(TRAILER_SOURCE):
        spec, source = sync_trailers[TRAILER_SOURCE][0], "sync commit trailer " + TRAILER_SOURCE
    elif marker and marker.get("template"):
        spec, source = marker["template"], "marker file {} (legacy)".format(MARKER)
    else:
        gh_template, created_at = discover_template(der)
        spec, source = gh_template, "github templateRepository"
    if not spec:
        print("ERROR: cannot tell which template this repo came from: GitHub reports no "
              "templateRepository, there is no sync commit with a {} trailer and no {} "
              "marker. Re-run with --template OWNER/NAME|URL|PATH.".format(TRAILER_SOURCE, MARKER),
              file=sys.stderr)
        return 2
    ref_arg = args.ref or (sync_trailers.get(TRAILER_REF) or [None])[0] or (marker or {}).get("ref")

    tpl, kind = open_template(spec, workdir)
    ref = template_ref(tpl, kind, ref_arg)
    head = git(tpl, "rev-parse", ref).strip()
    anchor = find_anchor(der, tpl, ref, head, args.since, sync, marker, created_at)
    anchor_sha = str(anchor["sha"])

    commits = template_commits(tpl, anchor_sha, head)

    old_tree = ls_tree(tpl, anchor_sha)
    new_tree = ls_tree(tpl, head)
    cur_tree = ls_tree(der, "HEAD")

    skipped = skipped_from_syncs(sync_commits)
    for item in (marker or {}).get("skipped", []):
        for path in item.get("paths", []):
            skipped.setdefault(path, item.get("reason", ""))

    files = []
    name_status = git(tpl, "diff", "--name-status", "-M", anchor_sha, head)
    for line in name_status.splitlines():
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
        files.append(entry)

    # One diff for every file that gets a patch (one batched blob fetch on a blob-less
    # clone, and none for lockfiles or already-applied files), split per file
    # afterwards; a per-file diff only for a header the split could not match.
    wanted = [e for e in files if e["category"] != "lockfile" and e["state"] != "already-applied"]
    pathspec = sorted({p for e in wanted for p in (e["old_path"] or e["path"], e["path"])})
    patches = split_patches(git(tpl, "diff", "-M", anchor_sha, head, "--", *pathspec)) if wanted else {}
    for index, entry in enumerate(wanted):
        old_path, new_path = entry["old_path"] or entry["path"], entry["path"]
        patch = patches.get("diff --git a/{} b/{}".format(old_path, new_path))
        if patch is None:
            patch = git(tpl, "diff", "-M", anchor_sha, head, "--", old_path, new_path)
        patch_path = os.path.join(workdir, "patches", "{:03d}-{}.patch".format(
            index, re.sub(r"[^\w.-]+", "_", new_path)))
        with open(patch_path, "w", encoding="utf-8") as handle:
            handle.write(patch)
        entry["template_patch"] = patch_path
        entry["patch_lines"] = patch.count("\n")

    for entry in wanted:
        old_path, new_path = entry["old_path"] or entry["path"], entry["path"]
        if os.path.basename(new_path) == "package.json":
            rows = package_json_delta(
                show(tpl, anchor_sha, old_path), show(tpl, head, new_path),
                show(der, "HEAD", new_path) or show(der, "HEAD", old_path))
            # Which commits moved each row, and whether all of them were routine bumps:
            # a row only routine bumps touched is not a change on its own.
            history = package_key_history(tpl, anchor_sha, head, new_path)
            kinds = {c["sha"]: c["kind"] for c in commits}
            for row in rows:
                shas = history.get(row["key"] or row["section"], [])
                row["touched_by"] = [sha[:10] for sha in shas]
                row["routine_only"] = bool(shas) and all(
                    kinds.get(sha) == "dependency-bump" for sha in shas)
            entry["package_json_delta"] = rows

    own_files = re.compile(r"^.. (template-sync-plan-[\d-]+\.md|{})$".format(re.escape(MARKER)))
    dirty = "\n".join(line for line in git(der, "status", "--porcelain").splitlines()
                      if not own_files.match(line))

    message_path = os.path.join(workdir, "sync-commit-message.txt")
    with open(message_path, "w", encoding="utf-8") as handle:
        handle.write(sync_commit_message(spec, branch_name(ref), anchor_sha, head, len(commits)))

    report = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "derived_repo": der,
        "derived_head": git(der, "rev-parse", "HEAD").strip(),
        "derived_has_uncommitted_changes": bool(dirty),
        "template": {"spec": spec, "found_via": source, "local_dir": tpl, "ref": ref,
                     "head": head, "github_template": gh_template,
                     "web_url": web_url(spec, gh_template)},
        "anchor": anchor,
        "last_sync": {"commit": sync["sha"], "date": sync["date"], "subject": sync["subject"],
                      "template_sha": sync_trailers[TRAILER_SYNC][0]} if sync else None,
        "sync_count": len(sync_commits),
        "legacy_marker": bool(marker),
        "up_to_date": anchor_sha == head,
        "commits": commits,
        "files": files,
        "sync_commit_message": message_path,
        "workdir": workdir,
    }
    out_path = os.path.join(workdir, "drift.json")
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print("template   {} ({}) via {}".format(spec, ref, source))
    if sync:
        print("last sync  {} on {} → template {}".format(
            sync["sha"][:10], sync["date"][:10], sync_trailers[TRAILER_SYNC][0][:10]))
    print("anchor     {} — {} [{} confidence]".format(anchor_sha[:10], anchor["method"],
                                                     anchor["confidence"]))
    for note in anchor["notes"]:  # type: ignore[union-attr]
        print("NOTE       " + note)
    if marker:
        print("NOTE       legacy {} found; the next sync commit replaces it — delete the file "
              "in that commit".format(MARKER))
    if anchor_sha == head:
        print("range      up to date: the template has no commits after the anchor")
    else:
        bumps = sum(1 for c in commits if c["kind"] == "dependency-bump")
        print("range      {}..{}  {} commits ({} routine dependency bumps), {} files".format(
            anchor_sha[:10], head[:10], len(commits), bumps, len(files)))
    if dirty:
        print("WARNING    derived repo has uncommitted changes; states compare against HEAD")
    counts: Dict[str, int] = {}
    for entry in files:
        key = "{} / {}".format(entry["category"], entry["state"])
        counts[key] = counts.get(key, 0) + 1
    for key in sorted(counts):
        print("  {:>3}  {}".format(counts[key], key))
    print("report     " + out_path)
    print("message    " + message_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
