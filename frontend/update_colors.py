import os
import re

d = os.path.join(os.getcwd(), 'src')

patterns = {
    # App Background
    r'bg-\[\#(080808|050508|000000|000)\]': 'bg-sigma-bg',
    r'bg-black\b': 'bg-sigma-bg',
    
    # Surface
    r'bg-\[\#(121212|111111|111|141414|0c0c0c|0d0d0d|0f0f0f|0a1428)\]': 'bg-sigma-surface',
    
    # Elevated
    r'bg-\[\#(181818|171717|1a1a1a|222222|222|252525|242424)\]': 'bg-sigma-elevated',
    
    # Borders
    r'border-\[\#(222|222222|2b2b2b|282828|292929|252525|333|333333|383838|3d3d3d)\]': 'border-sigma-border'
}

if os.path.exists(d):
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for pat, repl in patterns.items():
                    new_content = re.sub(pat, repl, new_content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {path}")
