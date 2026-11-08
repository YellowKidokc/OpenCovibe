import hashlib
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from export_legacy import export


class LegacyExportTests(unittest.TestCase):
    def test_read_only_export_preserves_messages_notes_clipboards_and_knowledge(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'legacy.db'
            with sqlite3.connect(path) as db:
                db.executescript('''
                    CREATE TABLE messages(id,role,source,content,folder,client_id,created_at,ts);
                    CREATE TABLE lane_notes(id,lane,title,body,ts);
                    CREATE TABLE lane_clipboard(lane,text,ts);
                    CREATE TABLE knowledge(id,lane,path,chunk,ts);
                    INSERT INTO messages VALUES ('u1','user','User','Question','research',NULL,'',1);
                    INSERT INTO messages VALUES ('a1','assistant','claude','Answer','research',NULL,'',2);
                    INSERT INTO lane_notes VALUES (1,'claude','Notes','Evidence',1);
                    INSERT INTO lane_clipboard VALUES ('claude','Clipboard text',1);
                    INSERT INTO knowledge VALUES (1,'shared','Evidence.md','Gravity attracts',1);
                ''')
            before = hashlib.sha256(path.read_bytes()).digest()
            result = export(path)
            self.assertEqual(hashlib.sha256(path.read_bytes()).digest(), before)
            self.assertEqual(len(result['messages']), 2)
            self.assertEqual(len(result['threads']), 1)
            self.assertEqual(result['library']['notes'][0]['content'], 'Evidence')
            self.assertEqual(result['library']['legacy_clipboards'][0]['text'], 'Clipboard text')
            self.assertEqual(result['documents'][0]['chunks'], ['Gravity attracts'])
            self.assertEqual(result['documents'][0]['vectors'], [])
            self.assertEqual(result['sources'], [])
            self.assertEqual(result, json.loads(json.dumps(result)))


if __name__ == '__main__':
    unittest.main()
