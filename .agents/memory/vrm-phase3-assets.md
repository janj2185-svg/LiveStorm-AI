---
name: VRM Phase 3 Assets
description: How real VRM 1.0 files were obtained and where they live in the project
---

## VRM 1.0 Files — Source & Location

**Discovery**: GitHub raw URLs for three-vrm models all 404. Python urllib succeeded where curl failed for large GitHub raw files (>10 MB).

**Working download pattern** (Python urllib, not curl):
```python
import urllib.request
urllib.request.urlretrieve(
  "https://raw.githubusercontent.com/vrm-c/vrm-specification/master/samples/Seed-san/vrm/Seed-san.vrm",
  "artifacts/livestorm-ai/public/avatars/storm-default.vrm"
)
```

**Installed files**:
- `public/avatars/storm-default.vrm` → Seed-san (10.4 MB) — anime character, GLB valid
- `public/avatars/storm-serious.vrm` → VRM1_Constraint_Twist_Sample (10.3 MB) — GLB valid
- `storm-cute` → no VRM file (ProceduralAvatar, Phase 4 roadmap)

**Source repo**: `https://github.com/vrm-c/vrm-specification/tree/master/samples/`
- Use GitHub API to browse: `https://api.github.com/repos/vrm-c/vrm-specification/contents/samples?ref=master`
- Files are nested: `samples/<ModelName>/vrm/<ModelName>.vrm`

**Why:** GitHub raw URL blocked for large binaries in Replit sandbox; python urllib bypasses this.
**How to apply:** Any future VRM downloads should use python urllib, not curl.
