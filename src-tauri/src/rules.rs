//! Faithful port of lib/rules.ts. Times are epoch milliseconds, dates "YYYY-MM-DD".
use serde::{Deserialize, Serialize};

pub const DELETE_WINDOW_MS: i64 = 60 * 60 * 1000;
pub const COLORS: [&str; 5] = ["yellow", "pink", "blue", "green", "orange"];

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Comment {
    pub id: String,
    pub text: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Note {
    pub id: String,
    pub date: String,
    pub text: String,
    pub color: String,
    pub completed: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(default)]
    pub comments: Vec<Comment>,
}

/// A requested change; `None` means "not in the patch".
#[derive(Default, Clone, Debug)]
pub struct Patch {
    pub text: Option<String>,
    pub color: Option<String>,
    pub completed: Option<bool>,
}

/// After 1 hour a note is fully locked.
pub fn is_locked(created_at: i64, now: i64) -> bool {
    now - created_at > DELETE_WINDOW_MS
}

pub fn is_overdue(date: &str, completed: bool, today: &str) -> bool {
    date < today && !completed
}

/// Overdue notes can never be completed. Unlocked: anything. Locked: only the
/// one-way change completed false -> true, with no text/color in the patch.
pub fn can_patch(note: &Note, patch: &Patch, now: i64, today: &str) -> bool {
    if is_overdue(&note.date, note.completed, today) && patch.completed == Some(true) {
        return false;
    }
    if !is_locked(note.created_at, now) {
        return true;
    }
    if patch.text.is_some() || patch.color.is_some() {
        return false;
    }
    patch.completed == Some(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    const MIN: i64 = 60 * 1000;
    const NOW: i64 = 1_795_000_000_000;
    const TODAY: &str = "2026-11-24";

    fn note(age_min: i64, completed: bool, date: &str) -> Note {
        Note { id: "a".into(), date: date.into(), text: "t".into(), color: "yellow".into(), completed, created_at: NOW - age_min * MIN, comments: vec![] }
    }
    fn done(v: bool) -> Patch { Patch { completed: Some(v), ..Default::default() } }

    #[test] fn unlocked_at_59_minutes() { assert!(!is_locked(NOW - 59 * MIN, NOW)); }
    #[test] fn locked_at_61_minutes() { assert!(is_locked(NOW - 61 * MIN, NOW)); }
    #[test] fn overdue_past_uncompleted() { assert!(is_overdue("2026-11-23", false, TODAY)); }
    #[test] fn overdue_past_completed_is_false() { assert!(!is_overdue("2026-11-23", true, TODAY)); }
    #[test] fn overdue_today_is_false() { assert!(!is_overdue(TODAY, false, TODAY)); }
    #[test] fn locked_complete_true_allowed() { assert!(can_patch(&note(61, false, TODAY), &done(true), NOW, TODAY)); }
    #[test] fn locked_complete_false_rejected() { assert!(!can_patch(&note(61, true, TODAY), &done(false), NOW, TODAY)); }
    #[test] fn locked_text_rejected() { assert!(!can_patch(&note(61, false, TODAY), &Patch { text: Some("x".into()), ..Default::default() }, NOW, TODAY)); }
    #[test] fn locked_color_rejected() { assert!(!can_patch(&note(61, false, TODAY), &Patch { color: Some("blue".into()), ..Default::default() }, NOW, TODAY)); }
    #[test] fn unlocked_anything_allowed() {
        let p = Patch { text: Some("x".into()), completed: Some(false), ..Default::default() };
        assert!(can_patch(&note(59, true, TODAY), &p, NOW, TODAY));
    }
    #[test] fn overdue_locked_cannot_complete() { assert!(!can_patch(&note(61, false, "2026-11-23"), &done(true), NOW, TODAY)); }
    #[test] fn overdue_unlocked_cannot_complete() { assert!(!can_patch(&note(0, false, "2026-11-23"), &done(true), NOW, TODAY)); }
    #[test] fn locked_due_today_may_complete() { assert!(can_patch(&note(61, false, TODAY), &done(true), NOW, TODAY)); }
    #[test] fn overdue_unlocked_may_edit() {
        assert!(can_patch(&note(0, false, "2026-11-23"), &Patch { text: Some("x".into()), ..Default::default() }, NOW, TODAY));
    }
}
