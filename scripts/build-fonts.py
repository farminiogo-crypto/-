#!/usr/bin/env python3
"""يبني ملفات الخطوط المستضافة محليًا: يقتطع العربي واللاتيني من حزم @fontsource ويدمجهما في ملف واحد لكل وزن.
الاستخدام: pip install fonttools brotli && python3 scripts/build-fonts.py
"""
import os, shutil, subprocess, tempfile
from fontTools.merge import Merger

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'fonts')
FS = os.path.join(ROOT, 'node_modules', '@fontsource')
# الحروف العربية الأساسية + الحركات + الأرقام العربية + حروف الفارسية والأردية الشائعة (تكفي لكل نصوص الموقع)
AR = ('U+0020,U+060C,U+061B,U+061F,U+0621-0652,U+0660-066D,U+0670,U+0640,'
      'U+067E,U+0686,U+0698,U+06A9,U+06AF,U+06BE,U+06C1,U+06CC,U+200C-200F,U+2026,U+00AB,U+00BB')
LAT = 'U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2212,U+00D7'

# Amiri للعناوين العربية فقط؛ أي حرف لاتيني في العناوين يُرسم بخط Lora (الخط التالي في القائمة)
ARABIC_ONLY = [
    ('amiri/files/amiri-arabic-700-normal.woff2', 'amiri-700.woff2'),
]
MERGED = [
    ('ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-{s}-400-normal.woff2', 'plex-400.woff2'),
    ('ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-{s}-600-normal.woff2', 'plex-600.woff2'),
]
COPIED = [
    ('lora/files/lora-latin-400-normal.woff2', 'lora-400.woff2'),
]

def main():
    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            os.remove(os.path.join(OUT, f))
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for pattern, out in MERGED:
        parts = []
        for script, uni in (('arabic', AR), ('latin', LAT)):
            dst = os.path.join(tmp, f'{out}-{script}.ttf')
            subprocess.run(['pyftsubset', os.path.join(FS, pattern.format(s=script)), f'--unicodes={uni}',
                            '--layout-features=*', '--notdef-outline', '--name-IDs=*', f'--output-file={dst}'], check=True)
            parts.append(dst)
        font = Merger().merge(parts)
        font.flavor = 'woff2'
        font.save(os.path.join(OUT, out))
    for src, out in ARABIC_ONLY:
        subprocess.run(['pyftsubset', os.path.join(FS, src), f'--unicodes={AR}', '--layout-features=*',
                        '--flavor=woff2', f'--output-file={os.path.join(OUT, out)}'], check=True)
    for src, out in COPIED:
        shutil.copy(os.path.join(FS, src), os.path.join(OUT, out))
    for f in sorted(os.listdir(OUT)):
        print(f'{os.path.getsize(os.path.join(OUT, f)):>8}  {f}')

if __name__ == '__main__':
    main()
