#!/usr/bin/env python3
"""Read a legacy Top-of-Mind SQLite database without changing it; produce an import archive.
The old database has no chat IDs: messages are grouped into one imported thread per folder.
API keys and .env files are deliberately excluded.
"""
import argparse
import json
import sqlite3
from pathlib import Path


def export(database):
    db = sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    try:
        messages = [dict(r) for r in db.execute('SELECT * FROM messages ORDER BY ts, rowid')]
        folders = sorted({m.get('folder') or 'inbox' for m in messages})
        archive = {
            'version': 1,
            'folders': [{'id': 'legacy-folder-' + f, 'name': f, 'parent': None} for f in folders],
            'threads': [{'id': 'legacy-thread-' + f, 'title': 'Imported: ' + f, 'folder': 'legacy-folder-' + f} for f in folders],
            'messages': [{
                'id': 'legacy-' + m['id'], 'thread': 'legacy-thread-' + (m.get('folder') or 'inbox'),
                'role': m['role'] or 'user', 'source': m['source'] or 'User',
                'content': m['content'] or '', 'client_id': None, 'error': False,
            } for m in messages],
            'library': {
                'notes': [{'id': 'legacy-note-' + str(r['id']), 'title': r['title'] or r['lane'],
                           'content': r['body'], 'lane': r['lane']} for r in db.execute('SELECT * FROM lane_notes')],
                'legacy_clipboards': [dict(r) for r in db.execute('SELECT * FROM lane_clipboard')],
                'legacy_knowledge': [dict(r) for r in db.execute('SELECT * FROM knowledge')],
            },
            'documents': [],
            'sources': [],
        }
        for row in archive['library']['legacy_knowledge']:
            archive['documents'].append({
                'id': 'legacy-knowledge-' + str(row['id']), 'name': row['path'] or ('Lane ' + row['lane']),
                'folder': 'legacy-knowledge', 'chunks': [row['chunk']], 'vectors': [], 'engine': None,
            })
        if archive['documents']:
            archive['folders'].append({'id': 'legacy-knowledge', 'name': 'Imported knowledge', 'parent': None})
        return archive
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    archive = export(args.database)
    # Refuse to overwrite any existing export or user file.
    with args.output.open('x', encoding='utf-8') as out:
        json.dump(archive, out, ensure_ascii=False, indent=2)
    args.output.chmod(0o600)
    print(f"Exported {len(archive['messages'])} messages, {len(archive['documents'])} knowledge entries; original database unchanged.")


if __name__ == '__main__':
    main()
