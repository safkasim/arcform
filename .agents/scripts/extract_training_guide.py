from pathlib import Path

import fitz


SOURCE = Path("attached_assets/TrainingLLM_1789366912194.pdf")
OUTPUT = Path(".agents/outputs/training-guide")
OUTPUT.mkdir(parents=True, exist_ok=True)

document = fitz.open(SOURCE)
pages = []

for index, page in enumerate(document):
    text = page.get_text("text").strip()
    pages.append(f"\n\n===== PAGE {index + 1} =====\n\n{text}")

    if index < 6:
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        pixmap.save(OUTPUT / f"page-{index + 1}.png")

(OUTPUT / "full-text.txt").write_text("".join(pages), encoding="utf-8")
print(f"Extracted {document.page_count} pages and rendered the first 6 pages.")