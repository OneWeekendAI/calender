//! Month-per-file JSON store plus the rule-enforcing operations.
use crate::rules::*;
use std::{fs, path::{Path, PathBuf}};

pub struct Store { pub dir: PathBuf }

pub fn valid_month(m: &str) -> bool {
    let b = m.as_bytes();
    b.len() == 7 && b[4] == b'-' && b.iter().enumerate().all(|(i, c)| i == 4 || c.is_ascii_digit())
}
pub fn valid_date(d: &str) -> bool {
    let b = d.as_bytes();
    b.len() == 10 && b[4] == b'-' && b[7] == b'-' && b.iter().enumerate().all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit())
}

impl Store {
    pub fn new(dir: impl Into<PathBuf>) -> Self { Store { dir: dir.into() } }
    fn file(&self, month: &str) -> PathBuf { self.dir.join(format!("{month}.json")) }

    pub fn read(&self, month: &str) -> Result<Vec<Note>, String> {
        if !valid_month(month) { return Err("month must be YYYY-MM".into()); }
        match fs::read_to_string(self.file(month)) {
            Ok(s) => serde_json::from_str(&s).map_err(|e| format!("corrupt {month}.json: {e}")),
            Err(_) => Ok(vec![]),
        }
    }
    fn write(&self, month: &str, notes: &[Note]) -> Result<(), String> {
        fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        let tmp = self.dir.join(format!("{month}.json.tmp"));
        fs::write(&tmp, serde_json::to_string_pretty(notes).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
        fs::rename(tmp, self.file(month)).map_err(|e| e.to_string())
    }

    pub fn add(&self, date: &str, text: &str, color: &str, now: i64) -> Result<Note, String> {
        if text.trim().is_empty() || !valid_date(date) { return Err("date (YYYY-MM-DD) and non-empty text required".into()); }
        let color = if COLORS.contains(&color) { color } else { "yellow" };
        let note = Note { id: uuid::Uuid::new_v4().to_string(), date: date.into(), text: text.into(), color: color.into(), completed: false, created_at: now, comments: vec![] };
        let month = &date[..7];
        let mut notes = self.read(month)?;
        notes.push(note.clone());
        self.write(month, &notes)?;
        Ok(note)
    }

    pub fn comment(&self, month: &str, id: &str, text: &str, now: i64) -> Result<Note, String> {
        if text.trim().is_empty() { return Err("month, id and comment required".into()); }
        let mut notes = self.read(month)?;
        let n = notes.iter_mut().find(|n| n.id == id).ok_or("not found")?;
        n.comments.push(Comment { id: uuid::Uuid::new_v4().to_string(), text: text.into(), created_at: now });
        let out = n.clone();
        self.write(month, &notes)?;
        Ok(out)
    }

    pub fn patch(&self, month: &str, id: &str, p: Patch, now: i64, today: &str) -> Result<Note, String> {
        let mut notes = self.read(month)?;
        let n = notes.iter_mut().find(|n| n.id == id).ok_or("not found")?;
        if is_overdue(&n.date, n.completed, today) && p.completed == Some(true) {
            return Err("note is overdue; it can no longer be marked completed (comments are still allowed)".into());
        }
        if !can_patch(n, &p, now, today) {
            return Err("note is locked (older than 1 hour); only marking it completed or adding a comment is allowed".into());
        }
        if let Some(t) = p.text.filter(|t| !t.trim().is_empty()) { n.text = t; }
        if let Some(c) = p.completed { n.completed = c; }
        if let Some(c) = p.color.filter(|c| COLORS.contains(&c.as_str())) { n.color = c; }
        let out = n.clone();
        self.write(month, &notes)?;
        Ok(out)
    }

    pub fn delete(&self, month: &str, id: &str, now: i64) -> Result<(), String> {
        let mut notes = self.read(month)?;
        let n = notes.iter().find(|n| n.id == id).ok_or("not found")?;
        if is_locked(n.created_at, now) { return Err("note is locked (older than 1 hour)".into()); }
        notes.retain(|n| n.id != id);
        self.write(month, &notes)
    }

    /// Merge every YYYY-MM.json in `from` into the store, adding notes whose id is new.
    /// Returns the number of notes added.
    pub fn import_dir(&self, from: &Path) -> Result<usize, String> {
        let mut added = 0;
        for e in fs::read_dir(from).map_err(|e| e.to_string())?.flatten() {
            let p = e.path();
            let Some(month) = p.file_stem().and_then(|s| s.to_str()).map(String::from) else { continue };
            if p.extension().and_then(|s| s.to_str()) != Some("json") || !valid_month(&month) { continue; }
            let Ok(incoming) = fs::read_to_string(&p).map_err(|e| e.to_string()).and_then(|s| serde_json::from_str::<Vec<Note>>(&s).map_err(|e| e.to_string())) else { continue };
            let mut notes = self.read(&month)?;
            let before = notes.len();
            for n in incoming {
                if n.date.len() == 10 && n.date[..7] == month && !notes.iter().any(|x| x.id == n.id) { notes.push(n); }
            }
            if notes.len() > before { added += notes.len() - before; self.write(&month, &notes)?; }
        }
        Ok(added)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const MIN: i64 = 60 * 1000;
    const NOW: i64 = 1_795_000_000_000;
    fn tmp(name: &str) -> Store {
        let d = std::env::temp_dir().join(format!("meetcal-test-{name}-{}", uuid::Uuid::new_v4()));
        Store::new(d)
    }
    #[test] fn add_and_read_roundtrip() {
        let s = tmp("rt");
        let n = s.add("2026-11-24", "hi", "pink", NOW).unwrap();
        assert_eq!(s.read("2026-11").unwrap(), vec![n]);
    }
    #[test] fn locked_note_cannot_be_deleted() {
        let s = tmp("del");
        let n = s.add("2026-11-24", "hi", "pink", NOW - 61 * MIN).unwrap();
        assert!(s.delete("2026-11", &n.id, NOW).is_err());
        let n2 = s.add("2026-11-24", "new", "pink", NOW - 59 * MIN).unwrap();
        assert!(s.delete("2026-11", &n2.id, NOW).is_ok());
    }
    #[test] fn locked_note_rejects_edit_but_allows_complete_and_comment() {
        let s = tmp("lock");
        let n = s.add("2026-11-24", "hi", "pink", NOW - 61 * MIN).unwrap();
        let edit = Patch { text: Some("x".into()), ..Default::default() };
        assert!(s.patch("2026-11", &n.id, edit, NOW, "2026-11-24").is_err());
        let c = Patch { completed: Some(true), ..Default::default() };
        assert!(s.patch("2026-11", &n.id, c, NOW, "2026-11-24").unwrap().completed);
        assert_eq!(s.comment("2026-11", &n.id, "note", NOW).unwrap().comments.len(), 1);
    }
    #[test] fn overdue_cannot_complete_but_can_comment() {
        let s = tmp("od");
        let n = s.add("2026-11-23", "hi", "pink", NOW).unwrap();
        let c = Patch { completed: Some(true), ..Default::default() };
        assert!(s.patch("2026-11", &n.id, c, NOW, "2026-11-24").is_err());
        assert!(s.comment("2026-11", &n.id, "late", NOW).is_ok());
    }
    #[test] fn import_merges_without_duplicates() {
        let a = tmp("ia"); let b = tmp("ib");
        a.add("2026-11-24", "one", "blue", NOW).unwrap();
        b.import_dir(&a.dir).unwrap();
        assert_eq!(b.import_dir(&a.dir).unwrap(), 0);
        assert_eq!(b.read("2026-11").unwrap().len(), 1);
    }
}
