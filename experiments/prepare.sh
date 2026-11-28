#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
prepare_reference() {
  local reference_path="$1" reference_url="$2" reference_commit="$3"
  if [ ! -d "$reference_path/.git" ]; then
    git clone --no-checkout "$reference_url" "$reference_path"
    git -C "$reference_path" checkout --detach "$reference_commit"
  fi
  test "$(git -C "$reference_path" rev-parse HEAD)" = "$reference_commit"
  test -z "$(git -C "$reference_path" status --porcelain)"
}
mkdir -p work/academic/classes
prepare_reference work/academic/hybrid-reference https://github.com/RizzqiAkbar/Algoritma-Hybrid-Kelompok-8.git 2c0dd4b97489b4bc147e28d01bfa0acd9c37c80b
prepare_reference work/academic/meta-reference https://github.com/farelrafli/soka-cloudsim-metaheuristik.git ded59903791064cc8f7084fbc3b74ac31aa363b3
javac -d work/academic/classes experiments/InfrastructureAudit.java
java -cp work/academic/classes InfrastructureAudit > work/academic/meta-infrastructure.json
python3 experiments/audit.py
