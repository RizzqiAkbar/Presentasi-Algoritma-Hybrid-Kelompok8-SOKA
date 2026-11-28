#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
task_root="$PWD"
ref_root="$task_root/work/academic"
hybrid_ref="$ref_root/hybrid-reference"
meta_ref="$ref_root/meta-reference"
mkdir -p "$ref_root/classes"
test "$(git -C "$hybrid_ref" rev-parse HEAD)" = 2c0dd4b97489b4bc147e28d01bfa0acd9c37c80b
test "$(git -C "$meta_ref" rev-parse HEAD)" = ded59903791064cc8f7084fbc3b74ac31aa363b3
math_jar="$HOME/.m2/repository/org/apache/commons/commons-math3/3.6.1/commons-math3-3.6.1.jar"
if [ ! -f "$math_jar" ]; then mvn -q dependency:get -Dartifact=org.apache.commons:commons-math3:3.6.1; fi
classpath="$hybrid_ref/lib/cloudsim-3.0.3.jar:$math_jar:$ref_root/classes"
javac -cp "$classpath" -d "$ref_root/classes" "$hybrid_ref/Hybrid.java" "$meta_ref/src/main/java/org/example/MetaScheduler.java" experiments/ControlledBenchmark.java
java -Xms256m -Xmx1536m -cp "$classpath" ControlledBenchmark "$hybrid_ref/Datasets" "${1:-$task_root/data/benchmarks}" "${2:-1000}" "${3:-tuned}"
