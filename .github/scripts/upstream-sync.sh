#!/usr/bin/env bash
# Applies everything upstream changed since .upstream-sha onto this checkout,
# as one patch. Upstream's commits are not merged in, so this fork keeps its own
# history. Exits 1 and leaves conflict markers in the tree if it can't apply.
set -euo pipefail

UPSTREAM_URL=${UPSTREAM_URL:-https://github.com/monkeytypegame/monkeytype.git}
IGNORE_FILE=.github/upstream-sync-ignore

old=$(cat .upstream-sha)
git fetch --quiet "$UPSTREAM_URL" master
new=$(git rev-parse FETCH_HEAD)
git cat-file -e "$old^{commit}"

if [ "$old" = "$new" ]; then
  echo "already up to date with $new"
  echo "changed=false" >> "${GITHUB_OUTPUT:-/dev/null}"
  exit 0
fi

pathspecs=(.)
while read -r path; do
  case "$path" in "" | \#*) continue ;; esac
  pathspecs+=(":(exclude)$path")
done < "$IGNORE_FILE"

# a change to a file this fork deleted is not a conflict, the file stays gone
while IFS=$'\t' read -r status path; do
  if [ "$status" != "A" ] && [ ! -e "$path" ]; then
    pathspecs+=(":(exclude,literal)$path")
  fi
done < <(git diff --no-renames --name-status "$old" "$new")

git diff --binary --no-renames "$old" "$new" -- "${pathspecs[@]}" > upstream.patch

if [ -s upstream.patch ] && ! git apply --3way --index upstream.patch; then
  rm upstream.patch
  echo "conflicts=$(git diff --name-only --diff-filter=U | paste -sd ' ' -)" \
    >> "${GITHUB_OUTPUT:-/dev/null}"
  echo "Upstream changes conflict with this fork. Conflicted files:" >&2
  git diff --name-only --diff-filter=U >&2
  echo "Fix them, then: echo $new > .upstream-sha" >&2
  exit 1
fi
rm upstream.patch

echo "$new" > .upstream-sha
git add .upstream-sha
echo "changed=true" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "range=${old:0:9}..${new:0:9}" >> "${GITHUB_OUTPUT:-/dev/null}"
