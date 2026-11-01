#!/usr/bin/env python3
"""
Extract and process contents from Libro-Conduccion.pdf for the React learning app.
Uses poppler-utils (pdftotext) and parses text into structured JSON and Markdown files.
"""

import os
import re
import json
import subprocess
from pathlib import Path

PDF_PATH = "resources/Libro-Conduccion.pdf"
DATA_DIR = Path("data")
RAW_DIR = DATA_DIR / "raw"
PAGES_DIR = RAW_DIR / "pages"
PROCESSED_DIR = DATA_DIR / "processed"
CHAPTERS_DIR = PROCESSED_DIR / "chapters"

CHAPTER_DEFS = [
    {
        "id": "intro",
        "type": "preliminary",
        "title": "Presentación y Datos Generales",
        "start_page": 1,
        "end_page": 4
    },
    {
        "id": "cap-1",
        "type": "chapter",
        "number": 1,
        "title": "Los siniestros de tránsito",
        "start_page": 5,
        "end_page": 9
    },
    {
        "id": "cap-2",
        "type": "chapter",
        "number": 2,
        "title": "Los principios de la conducción",
        "start_page": 10,
        "end_page": 31
    },
    {
        "id": "cap-3",
        "type": "chapter",
        "number": 3,
        "title": "Convivencia Vial",
        "start_page": 32,
        "end_page": 35
    },
    {
        "id": "cap-4",
        "type": "chapter",
        "number": 4,
        "title": "La persona en el tránsito",
        "start_page": 36,
        "end_page": 66
    },
    {
        "id": "cap-5",
        "type": "chapter",
        "number": 5,
        "title": "Las y los usuarios vulnerables",
        "start_page": 67,
        "end_page": 75
    },
    {
        "id": "cap-6",
        "type": "chapter",
        "number": 6,
        "title": "Normas de circulación",
        "start_page": 76,
        "end_page": 107
    },
    {
        "id": "cap-7",
        "type": "chapter",
        "number": 7,
        "title": "Conducción en circunstancias especiales",
        "start_page": 108,
        "end_page": 125
    },
    {
        "id": "cap-8",
        "type": "chapter",
        "number": 8,
        "title": "Conducción eficiente",
        "start_page": 126,
        "end_page": 134
    },
    {
        "id": "cap-9",
        "type": "chapter",
        "number": 9,
        "title": "Informaciones importantes",
        "start_page": 135,
        "end_page": 148
    },
    {
        "id": "anexo-1",
        "type": "anexo",
        "number": 1,
        "title": "Señales de tránsito verticales",
        "start_page": 149,
        "end_page": 160
    },
    {
        "id": "anexo-2",
        "type": "anexo",
        "number": 2,
        "title": "Glosario y referencias",
        "start_page": 161,
        "end_page": 166
    },
    {
        "id": "anexo-3",
        "type": "anexo",
        "number": 3,
        "title": "Proceso de obtención de licencia de conducir",
        "start_page": 167,
        "end_page": 170
    }
]

def clean_page_text(raw_text: str, page_num: int) -> str:
    """Clean header, footer and artifacts from page text."""
    lines = raw_text.splitlines()
    cleaned = []
    
    header_patterns = [
        re.compile(r'^libro para la conducción en chile', re.IGNORECASE),
        re.compile(r'^(los siniestros de tránsito|los principios de la conducción|convivencia vial|la persona en el tránsito|las y los usuarios vulnerables|normas de circulación|conducción en circunstancias especiales|conducción eficiente|informaciones importantes|señales de tránsito verticales|glosario)$', re.IGNORECASE)
    ]
    
    for line in lines:
        stripped = line.strip()
        # Skip empty lines at top
        if not cleaned and not stripped:
            continue
            
        # Skip running headers
        if any(p.match(stripped) for p in header_patterns):
            continue
            
        # Skip isolated page number lines
        if re.match(r'^\d{1,3}$', stripped):
            continue
            
        cleaned.append(line)
        
    return "\n".join(cleaned).strip()

def extract_raw_pages():
    """Extract raw full text and individual pages."""
    print("-> Extracting raw full text with pdftotext...")
    full_text_path = RAW_DIR / "full_text.txt"
    subprocess.run(["pdftotext", "-layout", PDF_PATH, str(full_text_path)], check=True)
    
    with open(full_text_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        
    pages = content.split('\x0c')
    # Filter out empty trailing page from final form-feed
    if pages and not pages[-1].strip():
        pages = pages[:-1]
        
    print(f"-> Extracted {len(pages)} pages. Saving individual page files...")
    page_texts = {}
    for idx, page_content in enumerate(pages, start=1):
        page_file = PAGES_DIR / f"page_{idx:03d}.txt"
        with open(page_file, "w", encoding="utf-8") as f:
            f.write(page_content)
        page_texts[idx] = page_content
        
    return page_texts

def parse_glosario(page_texts):
    """Extract glossary terms and definitions from pages 162-165."""
    print("-> Parsing Glosario (Anexo 2)...")
    glosario_pages = [page_texts[p] for p in range(162, 166) if p in page_texts]
    full_glosario_raw = "\n".join(glosario_pages)
    
    # Clean running headers
    lines = full_glosario_raw.splitlines()
    filtered_lines = []
    for l in lines:
        s = l.strip()
        if re.match(r'^(libro para la conducción en chile|glosario|\d{1,3})$', s, re.IGNORECASE):
            continue
        filtered_lines.append(l)
        
    text = "\n".join(filtered_lines)
    
    # Matches patterns like 'Término: Definición'
    term_regex = re.compile(r'^(?:[ \t]*)([A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s\/\,\.\-\(\)]+?):\s+(.*)$')
    
    items = []
    current_term = None
    current_def = []
    
    for line in filtered_lines:
        s = line.strip()
        if not s:
            continue
            
        # Check if line starts with 'Term:'
        match = re.match(r'^([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ\s\/\,\.\-\(\)]+?):\s*(.*)$', s)
        if match and len(match.group(1).split()) <= 6:
            if current_term:
                items.append({
                    "id": f"term-{len(items)+1:03d}",
                    "term": current_term,
                    "definition": " ".join(current_def).strip()
                })
            current_term = match.group(1).strip()
            current_def = [match.group(2).strip()] if match.group(2).strip() else []
        else:
            if current_term:
                current_def.append(s)
                
    if current_term:
        items.append({
            "id": f"term-{len(items)+1:03d}",
            "term": current_term,
            "definition": " ".join(current_def).strip()
        })
        
    out_path = PROCESSED_DIR / "glosario.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
        
    print(f"-> Saved {len(items)} glosario terms to {out_path}")
    return items

def parse_senales(page_texts):
    """Use the spatial catalog builder; retain the record interface for game seeds."""
    from build_sign_catalog import build

    print("-> Parsing Señales de Tránsito (Anexo 1)...")
    return build()

def process_chapters(page_texts):
    """Process each chapter into JSON and Markdown."""
    print("-> Processing chapters into structured JSON and Markdown...")
    processed_chapters = []
    
    for ch in CHAPTER_DEFS:
        ch_pages = []
        for p in range(ch["start_page"], ch["end_page"] + 1):
            if p in page_texts:
                cleaned = clean_page_text(page_texts[p], p)
                ch_pages.append({
                    "page_number": p,
                    "content": cleaned
                })
                
        full_content = "\n\n".join([f"### Página {p['page_number']}\n\n{p['content']}" for p in ch_pages])
        
        # Word count & quick stats
        word_count = sum(len(p["content"].split()) for p in ch_pages)
        
        chapter_record = {
            "id": ch["id"],
            "type": ch["type"],
            "number": ch.get("number"),
            "title": ch["title"],
            "start_page": ch["start_page"],
            "end_page": ch["end_page"],
            "total_pages": ch["end_page"] - ch["start_page"] + 1,
            "word_count": word_count,
            "pages": ch_pages
        }
        
        # Save JSON
        json_file = CHAPTERS_DIR / f"{ch['id']}.json"
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(chapter_record, f, indent=2, ensure_ascii=False)
            
        # Save Markdown
        md_file = CHAPTERS_DIR / f"{ch['id']}.md"
        with open(md_file, "w", encoding="utf-8") as f:
            f.write(f"# {ch['title']}\n\n")
            f.write(f"- **Tipo**: {ch['type'].capitalize()}\n")
            f.write(f"- **Páginas**: {ch['start_page']} a {ch['end_page']}\n")
            f.write(f"- **Palabras aproximadas**: {word_count}\n\n---\n\n")
            f.write(full_content)
            
        processed_chapters.append({
            "id": ch["id"],
            "type": ch["type"],
            "number": ch.get("number"),
            "title": ch["title"],
            "start_page": ch["start_page"],
            "end_page": ch["end_page"],
            "total_pages": ch["end_page"] - ch["start_page"] + 1,
            "word_count": word_count,
            "file_json": f"data/processed/chapters/{ch['id']}.json",
            "file_md": f"data/processed/chapters/{ch['id']}.md"
        })
        
    return processed_chapters

def generate_games_seed(glosario, senales):
    """Generate seed data for React games (Memorice, Puzzles, Quiz)."""
    print("-> Generating games seed data...")
    
    # Memorice Cards (Term <-> Definition, Sign <-> Category/Name)
    memorice_pairs = []
    # Pick top 20 crisp glosario terms (definitions under 140 chars)
    short_defs = [item for item in glosario if len(item["definition"]) <= 160]
    for item in short_defs[:16]:
        memorice_pairs.append({
            "id": item["id"],
            "type": "concept",
            "item_a": item["term"],
            "item_b": item["definition"]
        })
        
    # Pick top signs
    sign_pairs = []
    for sig in senales[:16]:
        sign_pairs.append({
            "id": sig["id"],
            "type": "signal",
            "name": sig["name"],
            "category": sig["category"]
        })
        
    # Word Search / Crucigrama words
    puzzle_words = []
    for item in glosario:
        term_clean = re.sub(r'[^A-ZÁÉÍÓÚÑ]', '', item["term"].upper())
        if 4 <= len(term_clean) <= 12:
            puzzle_words.append({
                "word": term_clean,
                "display": item["term"],
                "clue": item["definition"]
            })
            
    # One canonical bank shared with the app; independent of the caller's cwd.
    quiz_path = Path(__file__).resolve().parents[1] / "src/data/quiz_questions.json"
    with quiz_path.open(encoding="utf-8") as quiz_file:
        quiz_questions = json.load(quiz_file)
    
    games_seed = {
        "memorice": {
            "concept_cards": memorice_pairs,
            "signal_cards": sign_pairs
        },
        "puzzle": {
            "words": puzzle_words
        },
        "quiz": {
            "questions": quiz_questions
        }
    }
    
    out_path = PROCESSED_DIR / "games_seed.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(games_seed, f, indent=2, ensure_ascii=False)
        
    print(f"-> Saved games seed data to {out_path}")
    return games_seed

def main():
    print("=== LIBRO DE CONDUCCIÓN - EXTRACTION PIPELINE ===")
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PAGES_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(CHAPTERS_DIR, exist_ok=True)
    
    # 1. Extract raw pages
    page_texts = extract_raw_pages()
    
    # 2. Glosario
    glosario = parse_glosario(page_texts)
    
    # 3. Señales
    senales = parse_senales(page_texts)
    
    # 4. Chapters
    chapters = process_chapters(page_texts)
    
    # 5. Games Seed
    games_seed = generate_games_seed(glosario, senales)
    
    # 6. Global Manifest
    manifest = {
        "book_title": "Libro para la Conducción en Chile",
        "audience": "Automovilistas - Licencia Clase B",
        "publisher": "Comisión Nacional de Seguridad de Tránsito (CONASET)",
        "year": 2024,
        "total_pages": len(page_texts),
        "total_chapters": len([c for c in chapters if c["type"] == "chapter"]),
        "total_anexos": len([c for c in chapters if c["type"] == "anexo"]),
        "total_glosario_terms": len(glosario),
        "total_signals": len(senales),
        "chapters": chapters,
        "resources": {
            "glosario_json": "data/processed/glosario.json",
            "senales_json": "data/processed/senales.json",
            "games_seed_json": "data/processed/games_seed.json",
            "raw_text": "data/raw/full_text.txt"
        }
    }
    
    manifest_path = PROCESSED_DIR / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        
    print(f"\n[SUCCESS] Extraction complete! Master manifest saved to {manifest_path}")

if __name__ == "__main__":
    main()
