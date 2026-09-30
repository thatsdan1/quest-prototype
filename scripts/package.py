"""Package the rebuilt offline app and review instructions. No source attachments."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
files = [root / name for name in (
    "QUEST Prototype.html", "START HERE.txt", "README.md",
    "ARCHITECTURE.md", "MEETING FOLLOW-UP.md",
)]
for folder in ("dist", "scripts", "tests"):
    files.extend(p for p in (root / folder).rglob("*")
                 if p.is_file() and not any(part.startswith(".") or part == "__pycache__"
                                           for part in p.relative_to(root).parts))
output = root / "QUEST Prototype.zip"
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(path, Path("QUEST Prototype") / path.relative_to(root))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    for path in files:
        assert archive.read(str(Path("QUEST Prototype") / path.relative_to(root))) == path.read_bytes()
print(f"Packaged and verified {len(files)} files: {output.name}")
