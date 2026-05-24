#!/usr/bin/env python3
"""bapX OCR & PDF tool — Extract text from images, PDFs, scans"""
import sys, json, os, subprocess, tempfile

def cmd_ocr(args):
    """OCR an image file and return extracted text"""
    path = args.get("path", "")
    if not path:
        return {"error": "path required"}
    if not os.path.exists(path):
        return {"error": f"File not found: {path}"}
    try:
        import pytesseract
        from PIL import Image
        text = pytesseract.image_to_string(Image.open(path))
        return {"status": "ok", "text": text, "length": len(text)}
    except ImportError:
        # Fallback to tesseract CLI
        result = subprocess.run(["tesseract", path, "stdout"], capture_output=True, text=True)
        if result.returncode == 0:
            return {"status": "ok", "text": result.stdout, "length": len(result.stdout)}
        return {"error": result.stderr[:500]}

def cmd_pdf_text(args):
    """Extract text from a PDF"""
    path = args.get("path", "")
    if not path:
        return {"error": "path required"}
    try:
        import fitz  # pymupdf
        doc = fitz.open(path)
        pages = []
        for i, page in enumerate(doc):
            pages.append({"page": i+1, "text": page.get_text()})
        return {"status": "ok", "pages": pages, "total_pages": len(pages)}
    except ImportError:
        # Fallback to pdftotext
        result = subprocess.run(["pdftotext", path, "-"], capture_output=True, text=True)
        if result.returncode == 0:
            return {"status": "ok", "text": result.stdout}
        return {"error": result.stderr[:500]}

def cmd_pdf_ocr(args):
    """OCR a scanned PDF (image-based PDF)"""
    path = args.get("path", "")
    if not path:
        return {"error": "path required"}
    try:
        import fitz
        import pytesseract
        from PIL import Image
        import io
        doc = fitz.open(path)
        pages = []
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=300)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img)
            pages.append({"page": i+1, "text": text})
        return {"status": "ok", "pages": pages, "total_pages": len(pages)}
    except ImportError as e:
        return {"error": f"Missing dependency: {e}. Install: pip install pytesseract pymupdf Pillow"}

def cmd_pdf_edit(args):
    """Edit PDF: merge, split, extract pages"""
    action = args.get("action", "")
    path = args.get("path", "")
    try:
        import fitz
        doc = fitz.open(path)
        if action == "merge":
            paths = args.get("paths", [])
            output = args.get("output", "merged.pdf")
            final = fitz.open()
            for p in [path] + paths:
                final.insert_pdf(fitz.open(p))
            final.save(output)
            return {"status": "ok", "output": output}
        elif action == "extract":
            pages = args.get("pages", [0])
            output = args.get("output", "extracted.pdf")
            out = fitz.open()
            out.insert_pdf(doc, from_page=pages[0], to_page=pages[-1])
            out.save(output)
            return {"status": "ok", "output": output, "pages": len(pages)}
        return {"error": f"Unknown action: {action}"}
    except ImportError as e:
        return {"error": f"Missing dependency: {e}"}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"ocr": cmd_ocr, "pdf-text": cmd_pdf_text, "pdf-ocr": cmd_pdf_ocr, "pdf-edit": cmd_pdf_edit}
    if cmd == "help":
        print(json.dumps({"commands": list(cmds.keys())}))
    elif cmd in cmds:
        print(json.dumps(cmds[cmd](args)))
    else:
        print(json.dumps({"error": f"Unknown command: {cmd}"}))
