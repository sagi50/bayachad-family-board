"""Package tracked and unignored source files, excluding secrets and build output."""
from pathlib import Path
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
destination = Path(sys.argv[1]).resolve()
paths = subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
count = 0
with zipfile.ZipFile(destination,'w',compression=zipfile.ZIP_DEFLATED) as archive:
    for relative in sorted(set(filter(None,paths))):
        file = root / relative
        if not file.is_file() or file.is_symlink() or file.resolve()==destination:
            continue
        if any(part in {'.secrets','.git','node_modules','__pycache__','.pytest_cache','backups','dist','dist-web'} for part in file.relative_to(root).parts):
            raise RuntimeError('Refusing to include a private or generated directory')
        if file.name.startswith('.env') and file.name != '.env.example':
            raise RuntimeError('Refusing to include local environment secrets')
        archive.write(file,'bayachad/'+relative)
        count += 1
print(f'Packaged {count} source files. No local secrets or dependencies included.')
