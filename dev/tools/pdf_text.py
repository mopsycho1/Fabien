"""Reads the text of a simple PDF with no PDF program installed (this Mac has no poppler).

Works for PDFs written by ReportLab, which is what Suleiman's design sheets are (Gaha_Spearman_Build.pdf, Gadara_the_Greater_Class_Sheet.pdf):
the page text sits in ASCII85 + Flate streams as plain "(text) Tj" lines. It does NOT read scanned pages, pictures, or PDFs with
embedded font encodings (then it prints nothing useful). Found 16 Nov 2026; before that the two sheets were logged as "not opened".

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/pdf_text.py <file.pdf>
Bullets show as \\177, an em dash as \\227 (the PDF's own codes): read them as "- " and a dash.
"""
import base64
import re
import sys
import zlib


def page_texts(path):
    data = open(path, 'rb').read()
    pages = []
    for m in re.finditer(rb'stream\r?\n(.*?)endstream', data, re.S):
        raw = m.group(1).strip()
        try:
            s = zlib.decompress(base64.a85decode(raw[:-2] if raw.endswith(b'~>') else raw))
        except Exception:
            continue  # not a text stream (a font or a picture)
        out = []
        for line in s.split(b'\n'):
            for t in re.findall(rb'\((.*?)(?<!\\)\)\s*Tj', line):
                out.append(t.decode('cp1252', 'replace').replace('\\(', '(').replace('\\)', ')'))
            if line.strip().endswith(b'ET') or b'T*' in line:
                out.append('\n')
        pages.append(''.join(out))
    return pages


if __name__ == '__main__':
    for i, text in enumerate(page_texts(sys.argv[1]), 1):
        print('-----PAGE %d-----' % i)
        print(re.sub(r'\n+', '\n', text))
