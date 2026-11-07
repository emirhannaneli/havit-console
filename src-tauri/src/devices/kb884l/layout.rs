use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct KeyDef {
    pub hid_code: u8,
    pub label: &'static str,
    pub x: u16,
    pub y: u16,
    pub w: u16,
    pub h: u16,
    pub key_index: u8,
    pub light_index: u8,
    pub fn_locked: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScreenSlot {
    pub x: u16,
    pub y: u16,
    pub w: u16,
    pub h: u16,
    pub pixel_width: u16,
    pub pixel_height: u16,
}

#[derive(Debug, Clone, Serialize)]
pub struct Kb884lPhysicalLayout {
    pub canvas_width: u16,
    pub canvas_height: u16,
    pub screen: ScreenSlot,
    pub keys: Vec<KeyDef>,
}

const fn k(
    hid_code: u8,
    label: &'static str,
    x: u16,
    y: u16,
    w: u16,
    h: u16,
    idx: u8,
    fn_locked: bool,
) -> KeyDef {
    KeyDef {
        hid_code,
        label,
        x,
        y,
        w,
        h,
        key_index: idx,
        light_index: idx,
        fn_locked,
    }
}

pub fn get_kb884l_layout() -> Kb884lPhysicalLayout {
    let keys = vec![
        // Row 0: Esc + F1..F12 (TFT screen sits on the right at x=662..742, y=24..72)
        k(0x29, "Esc", 56, 33, 30, 30, 1, true),
        k(0x3A, "F1", 137, 33, 30, 30, 2, false),
        k(0x3B, "F2", 177, 33, 30, 30, 3, false),
        k(0x3C, "F3", 217, 33, 30, 30, 4, false),
        k(0x3D, "F4", 258, 33, 30, 30, 5, false),
        k(0x3E, "F5", 316, 33, 30, 30, 6, true),
        k(0x3F, "F6", 357, 33, 30, 30, 7, true),
        k(0x40, "F7", 397, 33, 30, 30, 8, false),
        k(0x41, "F8", 437, 33, 30, 30, 9, false),
        k(0x42, "F9", 496, 33, 30, 30, 10, false),
        k(0x43, "F10", 536, 33, 30, 30, 11, false),
        k(0x44, "F11", 576, 33, 30, 30, 12, false),
        k(0x45, "F12", 617, 33, 30, 30, 13, false),
        // Row 1: Number row + Backspace + Ins + Home
        k(0x35, "~", 56, 85, 30, 30, 19, false),
        k(0x1E, "1", 97, 85, 30, 30, 20, false),
        k(0x1F, "2", 137, 85, 30, 30, 21, false),
        k(0x20, "3", 177, 85, 30, 30, 22, false),
        k(0x21, "4", 217, 85, 30, 30, 23, false),
        k(0x22, "5", 257, 85, 30, 30, 24, false),
        k(0x23, "6", 297, 85, 30, 30, 25, false),
        k(0x24, "7", 337, 85, 30, 30, 26, false),
        k(0x25, "8", 377, 85, 30, 30, 27, false),
        k(0x26, "9", 417, 85, 30, 30, 28, false),
        k(0x27, "0", 457, 85, 30, 30, 29, false),
        k(0x2D, "-", 497, 85, 30, 30, 30, false),
        k(0x2E, "=", 537, 85, 30, 30, 31, false),
        k(0x2A, "Bksp", 577, 85, 70, 30, 103, true),
        k(0x49, "Ins", 671, 85, 30, 30, 116, false),
        k(0x4A, "Home", 712, 85, 30, 30, 117, false),
        // Row 2: Tab + QWERTY + Del + End
        k(0x2B, "Tab", 56, 124, 52, 30, 37, false),
        k(0x14, "Q", 117, 124, 30, 30, 38, false),
        k(0x1A, "W", 157, 124, 30, 30, 39, false),
        k(0x08, "E", 197, 124, 30, 30, 40, false),
        k(0x15, "R", 237, 124, 30, 30, 41, false),
        k(0x17, "T", 277, 124, 30, 30, 42, false),
        k(0x1C, "Y", 317, 124, 30, 30, 43, false),
        k(0x18, "U", 357, 124, 30, 30, 44, false),
        k(0x0C, "I", 397, 124, 30, 30, 45, false),
        k(0x12, "O", 437, 124, 30, 30, 46, false),
        k(0x13, "P", 477, 124, 30, 30, 47, false),
        k(0x2F, "[", 517, 124, 30, 30, 48, false),
        k(0x30, "]", 557, 124, 30, 30, 49, false),
        k(0x31, "\\", 598, 124, 50, 30, 67, true),
        k(0x4C, "Del", 671, 124, 30, 30, 119, false),
        k(0x4D, "End", 712, 124, 30, 30, 120, false),
        // Row 3: Caps + ASDF + Enter + PgUp + PgDn
        k(0x39, "Caps", 56, 163, 62, 30, 55, false),
        k(0x04, "A", 128, 163, 30, 30, 56, false),
        k(0x16, "S", 168, 163, 30, 30, 57, false),
        k(0x07, "D", 208, 163, 30, 30, 58, false),
        k(0x09, "F", 248, 163, 30, 30, 59, false),
        k(0x0A, "G", 288, 163, 30, 30, 60, false),
        k(0x0B, "H", 328, 163, 30, 30, 61, false),
        k(0x0D, "J", 368, 163, 30, 30, 62, false),
        k(0x0E, "K", 408, 163, 30, 30, 63, false),
        k(0x0F, "L", 448, 163, 30, 30, 64, false),
        k(0x33, ";", 488, 163, 30, 30, 65, false),
        k(0x34, "'", 528, 163, 30, 30, 66, false),
        k(0x28, "Enter", 568, 163, 81, 30, 85, false),
        k(0x4B, "PgUp", 671, 163, 30, 30, 118, false),
        k(0x4E, "PgDn", 712, 163, 30, 30, 121, false),
        // Row 4: Shift + ZXCV + RShift + Up
        k(0xE1, "Shift", 56, 203, 83, 30, 73, false),
        k(0x1D, "Z", 147, 203, 30, 30, 74, false),
        k(0x1B, "X", 187, 203, 30, 30, 75, false),
        k(0x06, "C", 227, 203, 30, 30, 76, false),
        k(0x19, "V", 267, 203, 30, 30, 77, false),
        k(0x05, "B", 307, 203, 30, 30, 78, false),
        k(0x11, "N", 347, 203, 30, 30, 79, false),
        k(0x10, "M", 387, 203, 30, 30, 80, false),
        k(0x36, ",", 427, 203, 30, 30, 81, false),
        k(0x37, ".", 467, 203, 30, 30, 82, false),
        k(0x38, "/", 507, 203, 30, 30, 83, false),
        k(0xE5, "Shift", 548, 203, 100, 30, 84, false),
        k(0x52, "↑", 671, 212, 30, 30, 101, false),
        // Row 5: Bottom modifiers + Space + Arrows
        k(0xE0, "Ctrl", 56, 243, 42, 30, 91, false),
        k(0xE3, "Win", 107, 243, 42, 30, 92, true),
        k(0xE2, "Alt", 157, 243, 42, 30, 93, false),
        k(0x2C, "Space", 210, 243, 236, 30, 94, false),
        k(0xE6, "Alt", 456, 243, 42, 30, 95, false),
        k(0xAF, "Fn", 507, 243, 42, 30, 96, true),
        k(0xE4, "Ctrl", 557, 243, 42, 30, 98, false),
        k(0x50, "←", 632, 252, 30, 30, 99, false),
        k(0x51, "↓", 671, 252, 30, 30, 100, false),
        k(0x4F, "→", 712, 252, 30, 30, 102, false),
    ];

    Kb884lPhysicalLayout {
        canvas_width: 800,
        canvas_height: 300,
        screen: ScreenSlot {
            x: 662,
            y: 25,
            w: 80,
            h: 48,
            pixel_width: 160,
            pixel_height: 96,
        },
        keys,
    }
}
