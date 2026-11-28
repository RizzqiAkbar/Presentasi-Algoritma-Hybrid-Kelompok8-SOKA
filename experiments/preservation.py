"""Record source and HTML-section preservation against the synchronized baseline."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE='694229d2abbeb78a39c5b848a8f0a41ccc69efd2'
def original(path):
    return subprocess.check_output(['git','show',f'{BASE}:{path}'],cwd=ROOT)
def digest(value):
    return hashlib.sha256(value).hexdigest()

paths=[p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'cloud-ops').rglob('*')) if p.is_file()]
paths+=['dunia3d.html','ui/cloud-ops.js','presentation.js','simulation.js','simulation.css','package.json']
paths+=[p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'engine').glob('*')) if p.is_file()]
paths+=[f'ui/{name}.js' for name in ['benchmark','configuration','guided','learning','playback','renderers','walkthrough']]
paths+=['tests/engine.test.js','tests/benchmark.test.js','tests/guided.test.js','tests/cloud-ops.test.js','tests/JavaParity.java','tests/java-parity.js','tests/contrast.py']
records=[]
for path in paths:
    before=digest(original(path));after=digest((ROOT/path).read_bytes())
    assert before==after, f'Protected file changed: {path}'
    records.append({'file':path,'beforeSha256':before,'afterSha256':after,'identical':True})
sections=[]
before_index=original('index.html').decode();after_index=(ROOT/'index.html').read_text()
for number in [2,3,4]:
    pattern=rf'<section class="slide[^\"]*" id="slide-{number}".*?</section>'
    before=re.search(pattern,before_index,re.S).group();after=re.search(pattern,after_index,re.S).group()
    assert before==after,f'Protected slide section changed: {number}'
    sections.append({'slide':number,'beforeSha256':digest(before.encode()),'afterSha256':digest(after.encode()),'identical':True})
for name in ['hybrid-reference','meta-reference']:
    assert not subprocess.check_output(['git','status','--porcelain'],cwd=ROOT/'work/academic'/name).strip(),f'Reference modified: {name}'
result={'baselineCommit':BASE,'files':records,'htmlSections':sections,'referenceWorkingTreesClean':True}
(ROOT/'data/benchmarks/preservation.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'{len(records)} protected files and slide sections 2–4 unchanged; both reference checkouts clean')
