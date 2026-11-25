import importlib.util
import sys

spec = importlib.util.spec_from_file_location("antislop_contrast", sys.argv[1])
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
pairs = [(c, "#fffefa", 4.5) for c in ["#12675e", "#9c4426", "#466480", "#76602d", "#68506c", "#3f6d3c", "#252c2a", "#59615c"]]
pairs += [("#59615c", "#f4f2eb", 4.5), ("#12675e", "#e5efea", 4.5), ("#9c4426", "#f7e9e0", 4.5), ("#80887f", "#fffefa", 3.0), ("#80887f", "#f4f2eb", 3.0)]
for foreground, background, threshold in pairs:
    ratio = checker.contrast_ratio(checker.parse_hex(foreground), checker.parse_hex(background))
    assert ratio >= threshold, f"{foreground}/{background}: {ratio:.2f} < {threshold}"
    print(f"PASS {foreground}/{background}: {ratio:.2f}:1 (threshold {threshold}:1)")
