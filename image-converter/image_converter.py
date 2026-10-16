from __future__ import annotations

import ctypes
import logging
import logging.handlers
import os
import queue
import sys
import tempfile
import threading
import time
from pathlib import Path
from tkinter import filedialog
import tkinter as tk
from tkinter import ttk
from typing import Iterable

from PIL import Image, ImageFile, ImageOps

try:
    from tkinterdnd2 import COPY, DND_FILES, TkinterDnD
except ImportError:  # Keep the file picker usable if the optional DnD runtime is missing.
    COPY = "copy"
    DND_FILES = None
    TkinterDnD = None


APP_NAME = "Image Drop Converter"
MAX_FILES = 999
FORMATS = {
    "JPG": ("JPEG", ".jpg"),
    "PNG": ("PNG", ".png"),
    "BMP": ("BMP", ".bmp"),
}

COLORS = {
    "background": "#0d1117",
    "panel": "#151b23",
    "panel_alt": "#1b2430",
    "border": "#2b3644",
    "text": "#f1f5f7",
    "muted": "#91a0ad",
    "faint": "#627181",
    "accent": "#d6f36a",
    "accent_text": "#182016",
    "orange": "#ffb86b",
    "danger": "#ff9a9a",
}

# Let Pillow make a best-effort attempt on files that are slightly truncated.
# A truly unsupported/corrupt file is still caught and skipped per file.
ImageFile.LOAD_TRUNCATED_IMAGES = True


def app_directory() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def log_directory() -> Path:
    preferred = app_directory()
    try:
        preferred.mkdir(parents=True, exist_ok=True)
        test_file = preferred / ".write-test"
        test_file.write_text("", encoding="utf-8")
        test_file.unlink(missing_ok=True)
        return preferred
    except OSError:
        fallback = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "ImageDropConverter"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


def configure_logger() -> tuple[logging.Logger, Path]:
    log_path = log_directory() / "conversion.log"
    logger = logging.getLogger("image_drop_converter")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if not logger.handlers:
        handler = logging.handlers.RotatingFileHandler(
            log_path,
            maxBytes=2_000_000,
            backupCount=1,
            encoding="utf-8",
        )
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        logger.addHandler(handler)
    return logger, log_path


def path_key(path: Path) -> str:
    try:
        return str(path.resolve()).casefold()
    except OSError:
        return str(path.absolute()).casefold()


def iter_files(path: Path) -> Iterable[Path]:
    try:
        if path.is_file():
            yield path
            return
        if not path.is_dir():
            return
    except OSError:
        return

    pending = [path]
    while pending:
        current = pending.pop()
        try:
            with os.scandir(current) as entries:
                for entry in entries:
                    try:
                        if entry.is_file(follow_symlinks=False):
                            yield Path(entry.path)
                        elif entry.is_dir(follow_symlinks=False):
                            pending.append(Path(entry.path))
                    except OSError:
                        # A single inaccessible child should not block the rest.
                        continue
        except OSError:
            continue


def has_transparency(image: Image.Image) -> bool:
    return image.mode in {"RGBA", "LA", "PA"} or "transparency" in image.info


def safe_output_path(source: Path, destination: Path, extension: str) -> Path:
    destination.mkdir(parents=True, exist_ok=True)
    stem = source.stem
    if source.suffix.casefold() == extension.casefold():
        stem = f"{stem}_converted"

    candidate = destination / f"{stem}{extension}"
    index = 1
    while candidate.exists() or path_key(candidate) == path_key(source):
        candidate = destination / f"{stem} ({index}){extension}"
        index += 1
    return candidate


def flatten_to_rgb(image: Image.Image, transparent: bool) -> Image.Image:
    if transparent:
        rgba = image.convert("RGBA")
        background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        background.alpha_composite(rgba)
        return background.convert("RGB")
    return image.convert("RGB")


def prepare_output(image: Image.Image, target: str, transparent: bool) -> Image.Image:
    if target == "PNG":
        if transparent:
            return image.convert("RGBA")
        if image.mode in {"1", "L", "P", "RGB", "I", "I;16"}:
            return image.copy()
        return image.convert("RGB")
    return flatten_to_rgb(image, transparent)


def convert_one(
    source: Path,
    target: str,
    compact: bool,
    quality: int,
    destination_mode: str,
) -> Path:
    image_format, extension = FORMATS[target]
    with Image.open(source) as opened:
        # A multi-frame image becomes a single still image because the selected
        # output formats are treated as ordinary image files here.
        try:
            opened.seek(0)
        except EOFError:
            pass
        icc_profile = opened.info.get("icc_profile")
        oriented = ImageOps.exif_transpose(opened)
        try:
            oriented.load()
            transparent = has_transparency(oriented)
            image = oriented.copy()
        finally:
            oriented.close()

    output_image = prepare_output(image, target, transparent)
    if destination_mode == "downloads":
        destination = Path.home() / "Downloads"
    else:
        destination = source.parent
    output_path = safe_output_path(source, destination, extension)

    save_kwargs: dict[str, object] = {}
    if target == "JPG":
        save_kwargs.update(
            quality=max(30, min(95, quality if compact else 95)),
            optimize=True,
            progressive=compact,
        )
    elif target == "PNG":
        save_kwargs.update(
            compress_level=9 if compact else 6,
            optimize=compact,
        )

    # ICC profiles are useful for color fidelity. Compact mode intentionally
    # drops optional metadata to save space.
    if icc_profile and not compact and target in {"JPG", "PNG"}:
        save_kwargs["icc_profile"] = icc_profile

    temporary_path: Path | None = None
    try:
        fd, temp_name = tempfile.mkstemp(
            prefix=f".{output_path.stem}.",
            suffix=output_path.suffix,
            dir=str(destination),
        )
        os.close(fd)
        temporary_path = Path(temp_name)
        output_image.save(temporary_path, format=image_format, **save_kwargs)
        os.replace(temporary_path, output_path)
        return output_path
    finally:
        output_image.close()
        image.close()
        if temporary_path and temporary_path.exists():
            try:
                temporary_path.unlink()
            except OSError:
                pass


class DropZone(tk.Canvas):
    def __init__(self, master: tk.Misc, on_click, **kwargs):
        super().__init__(
            master,
            background=COLORS["panel_alt"],
            highlightthickness=0,
            bd=0,
            cursor="hand2",
            **kwargs,
        )
        self.on_click = on_click
        self.bind("<Button-1>", lambda _event: self.on_click())
        self.bind("<Configure>", lambda _event: self.redraw())
        self.bind("<Enter>", lambda _event: self._set_hover(True))
        self.bind("<Leave>", lambda _event: self._set_hover(False))
        self._hover = False
        self.redraw()

    def _set_hover(self, hovered: bool) -> None:
        if self._hover != hovered:
            self._hover = hovered
            self.redraw()

    def redraw(self) -> None:
        self.delete("all")
        width = max(self.winfo_width(), 10)
        height = max(self.winfo_height(), 10)
        border = COLORS["accent"] if self._hover else COLORS["border"]
        fill = "#232e3b" if self._hover else COLORS["panel_alt"]
        self.create_rectangle(
            8,
            8,
            width - 8,
            height - 8,
            outline=border,
            fill=fill,
            width=2,
            dash=(8, 6),
        )

        center_x = width / 2
        center_y = height / 2 - 18
        self.create_oval(
            center_x - 27,
            center_y - 27,
            center_x + 27,
            center_y + 27,
            outline=COLORS["accent"],
            width=2,
        )
        self.create_line(
            center_x,
            center_y - 12,
            center_x,
            center_y + 12,
            fill=COLORS["accent"],
            width=3,
            capstyle=tk.ROUND,
        )
        self.create_line(
            center_x - 9,
            center_y + 3,
            center_x,
            center_y + 12,
            fill=COLORS["accent"],
            width=3,
            capstyle=tk.ROUND,
        )
        self.create_line(
            center_x + 9,
            center_y + 3,
            center_x,
            center_y + 12,
            fill=COLORS["accent"],
            width=3,
            capstyle=tk.ROUND,
        )
        self.create_text(
            center_x,
            center_y + 72,
            text="画像をここへドロップ",
            fill=COLORS["text"],
            font=("Yu Gothic UI", 15, "bold"),
        )
        self.create_text(
            center_x,
            center_y + 101,
            text="ファイル / フォルダ • ドロップで自動開始 • 最大 999 件",
            fill=COLORS["muted"],
            font=("Yu Gothic UI", 9),
        )


class ImageConverterApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(APP_NAME)
        self.root.geometry("780x760")
        self.root.minsize(680, 680)
        self.root.configure(bg=COLORS["background"])

        self.logger, self.log_path = configure_logger()
        self.files: list[Path] = []
        self.file_keys: set[str] = set()
        self.worker_queue: queue.Queue[tuple[str, object]] = queue.Queue()
        self.busy = False
        self.instant_active = 0
        self.instant_sequence = 0
        self.instant_lock = threading.Lock()
        self.destroy_requested = False

        self.output_format = tk.StringVar(value="PNG")
        self.compact = tk.BooleanVar(value=False)
        self.quality = tk.IntVar(value=72)
        self.download_destination = tk.BooleanVar(value=False)
        self.instant_convert = tk.BooleanVar(value=True)
        self.status = tk.StringVar(value="待機中")
        self.queue_status = tk.StringVar(value="0 件")
        self.destination_status = tk.StringVar(value="元画像と同じフォルダ")

        self.font_body = ("Yu Gothic UI", 10)
        self.font_small = ("Yu Gothic UI", 9)
        self.font_title = ("Bahnschrift", 28, "bold")
        self.font_kicker = ("Bahnschrift", 9, "bold")

        self._build_styles()
        self._build_ui()
        self._refresh_instant_mode()
        self._register_drop_target()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self.root.after(80, self._poll_worker)
        self._append_log("ドロップ待ち。出力先は元画像のフォルダです。", "info")

    def _build_styles(self) -> None:
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure(
            "Converter.Horizontal.TProgressbar",
            troughcolor=COLORS["panel_alt"],
            background=COLORS["accent"],
            bordercolor=COLORS["panel_alt"],
            lightcolor=COLORS["accent"],
            darkcolor=COLORS["accent"],
        )

    def _label(self, parent, text="", *, font=None, color=None, **kwargs):
        return tk.Label(
            parent,
            text=text,
            background=kwargs.pop("background", parent.cget("background")),
            foreground=color or COLORS["text"],
            font=font or self.font_body,
            **kwargs,
        )

    def _card(self, parent) -> tk.Frame:
        return tk.Frame(
            parent,
            background=COLORS["panel"],
            highlightbackground=COLORS["border"],
            highlightthickness=1,
            bd=0,
        )

    def _build_ui(self) -> None:
        outer = tk.Frame(self.root, background=COLORS["background"])
        outer.pack(fill="both", expand=True, padx=28, pady=24)

        header = tk.Frame(outer, background=COLORS["background"])
        header.pack(fill="x", pady=(0, 18))
        kicker_row = tk.Frame(header, background=COLORS["background"])
        kicker_row.pack(fill="x")
        self._label(kicker_row, "LOCAL IMAGE TOOL", font=self.font_kicker, color=COLORS["accent"]).pack(side="left")
        self._label(kicker_row, "READY • OFFLINE", font=self.font_kicker, color=COLORS["faint"]).pack(side="right")
        self._label(header, "DROP / CONVERT", font=self.font_title, color=COLORS["text"]).pack(anchor="w", pady=(8, 2))
        self._label(
            header,
            "画像をまとめて放り込むだけ。1件の失敗で止まらないローカル変換ツール。",
            font=self.font_body,
            color=COLORS["muted"],
        ).pack(anchor="w")

        self.drop_zone = DropZone(outer, self._choose_files, height=220)
        self.drop_zone.pack(fill="x", pady=(0, 16))

        actions = tk.Frame(outer, background=COLORS["background"])
        actions.pack(fill="x", pady=(0, 16))
        self.add_button = self._make_button(actions, "ファイルを追加", self._choose_files, primary=True)
        self.add_button.pack(side="left")
        self.folder_button = self._make_button(actions, "フォルダを追加", self._choose_folder)
        self.folder_button.pack(side="left", padx=(8, 0))
        self.clear_button = self._make_button(actions, "キューを空にする", self._clear_queue)
        self.clear_button.pack(side="right")

        option_card = self._card(outer)
        option_card.pack(fill="x", pady=(0, 16))
        option_card.columnconfigure(0, weight=1)
        option_card.columnconfigure(1, weight=1)
        option_card.columnconfigure(2, weight=1)

        format_box = tk.Frame(option_card, background=COLORS["panel"])
        format_box.grid(row=0, column=0, sticky="nsew", padx=18, pady=16)
        self._label(format_box, "OUTPUT FORMAT", font=self.font_kicker, color=COLORS["accent"]).pack(anchor="w")
        format_row = tk.Frame(format_box, background=COLORS["panel"])
        format_row.pack(anchor="w", pady=(10, 0))
        self.format_buttons: list[tk.Radiobutton] = []
        for target in FORMATS:
            button = tk.Radiobutton(
                format_row,
                text=target,
                value=target,
                variable=self.output_format,
                indicatoron=False,
                width=5,
                padx=2,
                pady=5,
                background=COLORS["panel_alt"],
                foreground=COLORS["muted"],
                selectcolor=COLORS["accent"],
                activebackground=COLORS["accent"],
                activeforeground=COLORS["accent_text"],
                font=("Bahnschrift", 10, "bold"),
                bd=0,
                relief="flat",
                command=self._refresh_format_buttons,
            )
            button.pack(side="left", padx=(0, 6))
            self.format_buttons.append(button)
        self._refresh_format_buttons()

        compression_box = tk.Frame(option_card, background=COLORS["panel"])
        compression_box.grid(row=0, column=1, sticky="nsew", padx=18, pady=16)
        self._label(compression_box, "FILE SIZE", font=self.font_kicker, color=COLORS["accent"]).pack(anchor="w")
        self.compact_check = tk.Checkbutton(
            compression_box,
            text="容量を減らす",
            variable=self.compact,
            command=self._refresh_quality,
            background=COLORS["panel"],
            foreground=COLORS["text"],
            activebackground=COLORS["panel"],
            activeforeground=COLORS["text"],
            selectcolor=COLORS["panel_alt"],
            font=self.font_body,
            bd=0,
            highlightthickness=0,
        )
        self.compact_check.pack(anchor="w", pady=(8, 0))
        self.quality_label = self._label(compression_box, "JPEG品質 72 / メタデータ削減", font=self.font_small, color=COLORS["muted"])
        self.quality_label.pack(anchor="w", pady=(2, 0))
        self._refresh_quality()

        destination_box = tk.Frame(option_card, background=COLORS["panel"])
        destination_box.grid(row=0, column=2, sticky="nsew", padx=18, pady=16)
        self._label(destination_box, "DESTINATION", font=self.font_kicker, color=COLORS["accent"]).pack(anchor="w")
        self.destination_check = tk.Checkbutton(
            destination_box,
            text="ダウンロードフォルダへ保存",
            variable=self.download_destination,
            command=self._refresh_destination,
            background=COLORS["panel"],
            foreground=COLORS["text"],
            activebackground=COLORS["panel"],
            activeforeground=COLORS["text"],
            selectcolor=COLORS["panel_alt"],
            font=self.font_body,
            bd=0,
            highlightthickness=0,
            wraplength=170,
            justify="left",
        )
        self.destination_check.pack(anchor="w", pady=(8, 0))
        self._label(destination_box, textvariable=self.destination_status, font=self.font_small, color=COLORS["muted"]).pack(anchor="w", pady=(2, 0))

        self.instant_check = tk.Checkbutton(
            option_card,
            text="キューを使わない（即時変換）",
            variable=self.instant_convert,
            command=self._refresh_instant_mode,
            background=COLORS["panel"],
            foreground=COLORS["text"],
            activebackground=COLORS["panel"],
            activeforeground=COLORS["text"],
            selectcolor=COLORS["panel_alt"],
            font=self.font_body,
            bd=0,
            highlightthickness=0,
        )
        self.instant_check.grid(row=1, column=0, columnspan=3, sticky="w", padx=18, pady=(0, 14))

        queue_card = self._card(outer)
        queue_card.pack(fill="x", pady=(0, 16))
        queue_top = tk.Frame(queue_card, background=COLORS["panel"])
        queue_top.pack(fill="x", padx=18, pady=(14, 4))
        self._label(queue_top, "QUEUE", font=self.font_kicker, color=COLORS["accent"]).pack(side="left")
        self._label(queue_top, textvariable=self.queue_status, font=("Bahnschrift", 10, "bold"), color=COLORS["text"]).pack(side="right")
        self.queue_hint = self._label(queue_card, "まだファイルはありません。", font=self.font_small, color=COLORS["muted"])
        self.queue_hint.pack(anchor="w", padx=18, pady=(0, 14))

        progress_card = self._card(outer)
        progress_card.pack(fill="x", pady=(0, 16))
        progress_top = tk.Frame(progress_card, background=COLORS["panel"])
        progress_top.pack(fill="x", padx=18, pady=(14, 8))
        self._label(progress_top, textvariable=self.status, font=self.font_body, color=COLORS["text"]).pack(side="left")
        self.convert_button = self._make_button(progress_top, "変換を開始", self._start_conversion, primary=True)
        self.convert_button.pack(side="right")
        self.progress = ttk.Progressbar(
            progress_card,
            style="Converter.Horizontal.TProgressbar",
            mode="determinate",
            maximum=1,
            value=0,
        )
        self.progress.pack(fill="x", padx=18, pady=(0, 16))

        log_card = self._card(outer)
        log_card.pack(fill="both", expand=True)
        log_top = tk.Frame(log_card, background=COLORS["panel"])
        log_top.pack(fill="x", padx=18, pady=(12, 4))
        self._label(log_top, "QUIET LOG", font=self.font_kicker, color=COLORS["accent"]).pack(side="left")
        open_log_button = self._make_button(log_top, "ログを開く", self._open_log)
        open_log_button.pack(side="right")
        self.log_text = tk.Text(
            log_card,
            height=5,
            background=COLORS["panel"],
            foreground=COLORS["muted"],
            insertbackground=COLORS["text"],
            selectbackground=COLORS["panel_alt"],
            relief="flat",
            bd=0,
            wrap="word",
            font=("Cascadia Mono", 9),
            state="disabled",
        )
        self.log_text.pack(fill="both", expand=True, padx=18, pady=(0, 14))
        self.log_text.tag_configure("info", foreground=COLORS["muted"])
        self.log_text.tag_configure("success", foreground=COLORS["accent"])
        self.log_text.tag_configure("warning", foreground=COLORS["orange"])
        self.log_text.tag_configure("error", foreground=COLORS["danger"])

    def _make_button(self, parent, text: str, command, primary: bool = False) -> tk.Button:
        return tk.Button(
            parent,
            text=text,
            command=command,
            background=COLORS["accent"] if primary else COLORS["panel_alt"],
            foreground=COLORS["accent_text"] if primary else COLORS["text"],
            activebackground=COLORS["accent"] if primary else COLORS["border"],
            activeforeground=COLORS["accent_text"] if primary else COLORS["text"],
            font=("Yu Gothic UI", 9, "bold"),
            relief="flat",
            bd=0,
            padx=13,
            pady=8,
            cursor="hand2",
        )

    def _refresh_format_buttons(self) -> None:
        selected = self.output_format.get()
        for button in self.format_buttons:
            if button.cget("value") == selected:
                button.configure(foreground=COLORS["accent_text"])
            else:
                button.configure(foreground=COLORS["muted"])
        if hasattr(self, "quality_label"):
            self._refresh_quality()

    def _refresh_quality(self) -> None:
        if self.compact.get():
            self.quality_label.configure(text=f"JPEG品質 {self.quality.get()} / メタデータ削減")
        else:
            self.quality_label.configure(text="標準品質 / メタデータを可能な範囲で維持")

    def _refresh_destination(self) -> None:
        if self.download_destination.get():
            self.destination_status.set("Downloads フォルダ")
        else:
            self.destination_status.set("元画像と同じフォルダ")

    def _choose_files(self) -> None:
        if self.busy and not self.instant_convert.get():
            return
        selected = filedialog.askopenfilenames(
            parent=self.root,
            title="変換する画像を選択",
            initialdir=str(Path.home()),
            filetypes=[("すべてのファイル", "*"), ("画像ファイル", "*.jpg *.jpeg *.png *.bmp *.gif *.webp *.tif *.tiff *.avif")],
        )
        if selected:
            self._handle_input_paths([Path(item) for item in selected])

    def _choose_folder(self) -> None:
        if self.busy and not self.instant_convert.get():
            return
        selected = filedialog.askdirectory(parent=self.root, title="画像のあるフォルダを選択")
        if selected:
            self._handle_input_paths([Path(selected)])

    def _collect_paths(
        self,
        paths: Iterable[Path],
        known_keys: set[str] | None = None,
        limit: int = MAX_FILES,
    ) -> tuple[list[Path], int]:
        seen = known_keys if known_keys is not None else set()
        collected: list[Path] = []
        ignored = 0
        for dropped in paths:
            for path in iter_files(dropped):
                key = path_key(path)
                if key in seen:
                    continue
                if len(collected) >= limit:
                    ignored += 1
                    continue
                seen.add(key)
                collected.append(path)
        return collected, ignored

    def _handle_input_paths(self, paths: Iterable[Path]) -> None:
        if self.instant_convert.get():
            if self.busy:
                return
            batch, ignored = self._collect_paths(paths, limit=MAX_FILES)
            if ignored:
                self._append_log(f"999件を超えたため、{ignored} 件を対象外にしました。", "warning")
            if batch:
                self._append_log(f"即時受付: {len(batch)} 件。変換を開始します。", "info")
                self._start_instant_conversion(batch)
            return

        self._add_paths(paths)
        if self.files and not self.busy:
            # Queue mode also keeps the drag-and-drop workflow one action.
            self.root.after(80, self._start_conversion)

    def _add_paths(self, paths: Iterable[Path]) -> None:
        if self.busy:
            return
        remaining = max(0, MAX_FILES - len(self.files))
        collected, ignored = self._collect_paths(paths, self.file_keys, remaining)
        self.files.extend(collected)
        added = len(collected)
        if added:
            self._append_log(f"受付: {added} 件", "info")
        if ignored:
            self._append_log(f"999件を超えたため、{ignored} 件を対象外にしました。", "warning")
        self._refresh_queue()

    def _refresh_queue(self) -> None:
        if self.instant_convert.get():
            self.queue_status.set("即時変換")
            self.queue_hint.configure(text="キューなし。ドロップした分だけ変換します。")
            self.convert_button.configure(state="disabled")
            return

        count = len(self.files)
        self.queue_status.set(f"{count} 件 / {MAX_FILES}")
        if not count:
            self.queue_hint.configure(text="まだファイルはありません。")
            self.convert_button.configure(state="disabled")
            return
        preview = " / ".join(path.name for path in self.files[:3])
        if count > 3:
            preview += f" ほか {count - 3} 件"
        self.queue_hint.configure(text=preview)
        if not self.busy:
            self.convert_button.configure(state="normal")

    def _refresh_instant_mode(self) -> None:
        if self.instant_convert.get() and not self.busy and self.files:
            files = list(self.files)
            self.files.clear()
            self.file_keys.clear()
            self._refresh_queue()
            self._append_log(f"キューから即時変換へ移行: {len(files)} 件", "info")
            self._start_instant_conversion(files)
            return
        self._refresh_queue()

    def _clear_queue(self) -> None:
        if self.busy:
            return
        self.files.clear()
        self.file_keys.clear()
        self._refresh_queue()
        self.status.set("待機中")
        self.progress.configure(maximum=1, value=0)
        self._append_log("キューを空にしました。", "info")

    def _set_controls(self, enabled: bool) -> None:
        state = "normal" if enabled else "disabled"
        for widget in [
            self.add_button,
            self.folder_button,
            self.clear_button,
            self.compact_check,
            self.destination_check,
            self.instant_check,
        ]:
            widget.configure(state=state)
        for button in self.format_buttons:
            button.configure(state=state)
        if not enabled or self.instant_convert.get():
            self.convert_button.configure(state="disabled")
        else:
            self.convert_button.configure(state="normal" if self.files else "disabled")

    def _start_conversion(self) -> None:
        if self.busy or self.instant_convert.get() or not self.files:
            return
        self.busy = True
        files = list(self.files)
        target = self.output_format.get()
        compact = self.compact.get()
        quality = self.quality.get()
        destination_mode = "downloads" if self.download_destination.get() else "source"
        self.progress.configure(maximum=len(files), value=0)
        self.status.set(f"変換中 0 / {len(files)}")
        self._set_controls(False)
        self.logger.info(
            "START count=%s target=%s compact=%s quality=%s destination=%s",
            len(files), target, compact, quality, destination_mode,
        )
        worker = threading.Thread(
            target=self._conversion_worker,
            args=(files, target, compact, quality, destination_mode),
            daemon=True,
        )
        worker.start()

    def _start_instant_conversion(self, files: list[Path]) -> None:
        if not files:
            return
        target = self.output_format.get()
        compact = self.compact.get()
        quality = self.quality.get()
        destination_mode = "downloads" if self.download_destination.get() else "source"
        with self.instant_lock:
            self.instant_sequence += 1
            batch_id = self.instant_sequence
            self.instant_active += 1
            active_count = self.instant_active
        self.progress.configure(maximum=len(files), value=0)
        self.status.set(f"即時変換中 0 / {len(files)}" if active_count == 1 else f"即時変換中（{active_count} バッチ）")
        self.logger.info(
            "START_IMMEDIATE batch=%s count=%s target=%s compact=%s quality=%s destination=%s",
            batch_id, len(files), target, compact, quality, destination_mode,
        )
        worker = threading.Thread(
            target=self._instant_conversion_worker,
            args=(batch_id, files, target, compact, quality, destination_mode),
            daemon=True,
        )
        worker.start()

    def _conversion_worker(self, files: list[Path], target: str, compact: bool, quality: int, destination_mode: str) -> None:
        started = time.perf_counter()
        success = 0
        failed = 0
        total = len(files)
        for index, source in enumerate(files, start=1):
            try:
                output = convert_one(source, target, compact, quality, destination_mode)
                success += 1
                self.logger.info("OK source=%s output=%s", source, output)
            except Exception as error:  # noqa: BLE001 - each file is isolated by design
                failed += 1
                self.logger.exception("SKIP source=%s error=%s", source, error)
                self.worker_queue.put(("skip", (index, source.name)))
            self.worker_queue.put(("progress", (index, total)))
        elapsed = time.perf_counter() - started
        self.logger.info("DONE total=%s success=%s failed=%s elapsed=%.2fs", total, success, failed, elapsed)
        self.worker_queue.put(("done", (total, success, failed, elapsed)))

    def _instant_conversion_worker(
        self,
        batch_id: int,
        files: list[Path],
        target: str,
        compact: bool,
        quality: int,
        destination_mode: str,
    ) -> None:
        started = time.perf_counter()
        success = 0
        failed = 0
        total = len(files)
        for index, source in enumerate(files, start=1):
            try:
                output = convert_one(source, target, compact, quality, destination_mode)
                success += 1
                self.logger.info("OK_IMMEDIATE batch=%s source=%s output=%s", batch_id, source, output)
            except Exception as error:  # noqa: BLE001 - each file is isolated by design
                failed += 1
                self.logger.exception("SKIP_IMMEDIATE batch=%s source=%s error=%s", batch_id, source, error)
                self.worker_queue.put(("instant_skip", (batch_id, index, source.name)))
            self.worker_queue.put(("instant_progress", (batch_id, index, total)))
        elapsed = time.perf_counter() - started
        self.logger.info(
            "DONE_IMMEDIATE batch=%s total=%s success=%s failed=%s elapsed=%.2fs",
            batch_id, total, success, failed, elapsed,
        )
        with self.instant_lock:
            self.instant_active = max(0, self.instant_active - 1)
            active_after = self.instant_active
        self.worker_queue.put(("instant_done", (batch_id, total, success, failed, elapsed, active_after)))

    def _poll_worker(self) -> None:
        try:
            while True:
                kind, payload = self.worker_queue.get_nowait()
                if kind == "progress":
                    current, total = payload
                    self.progress.configure(value=current)
                    self.status.set(f"変換中 {current} / {total}")
                elif kind == "skip":
                    _index, name = payload
                    self._append_log(f"SKIP  {name}", "warning")
                elif kind == "done":
                    self._finish_conversion(*payload)
                elif kind == "instant_progress":
                    _batch_id, current, total = payload
                    self.progress.configure(maximum=total, value=current)
                    self.status.set(f"即時変換中 {current} / {total}")
                elif kind == "instant_skip":
                    _batch_id, _index, name = payload
                    self._append_log(f"SKIP  {name}", "warning")
                elif kind == "instant_done":
                    self._finish_instant_conversion(*payload)
        except queue.Empty:
            pass
        if not self.destroy_requested:
            self.root.after(80, self._poll_worker)

    def _finish_conversion(self, total: int, success: int, failed: int, elapsed: float) -> None:
        self.busy = False
        # Completed files are consumed. The next drop must never re-run them.
        self.files.clear()
        self.file_keys.clear()
        self._refresh_queue()
        self._set_controls(True)
        self.progress.configure(value=total)
        self.status.set(f"完了  成功 {success} / スルー {failed} / 合計 {total}")
        level = "success" if failed == 0 else "warning"
        self._append_log(f"完了: 成功 {success} 件 / スルー {failed} 件 / {elapsed:.1f} 秒", level)

    def _finish_instant_conversion(
        self,
        _batch_id: int,
        total: int,
        success: int,
        failed: int,
        elapsed: float,
        active_after: int,
    ) -> None:
        if active_after:
            self.status.set(f"即時変換中（残り {active_after} バッチ）")
        else:
            self.progress.configure(maximum=total, value=total)
            self.status.set(f"完了  成功 {success} / スルー {failed} / 合計 {total}")
        level = "success" if failed == 0 else "warning"
        self._append_log(f"即時変換完了: 成功 {success} 件 / スルー {failed} 件 / {elapsed:.1f} 秒", level)

    def _append_log(self, message: str, tag: str = "info") -> None:
        timestamp = time.strftime("%H:%M:%S")
        self.log_text.configure(state="normal")
        self.log_text.insert("end", f"{timestamp}  {message}\n", tag)
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def _open_log(self) -> None:
        try:
            os.startfile(self.log_path)  # type: ignore[attr-defined]
        except OSError:
            self._append_log(f"ログ: {self.log_path}", "info")

    def _register_drop_target(self) -> None:
        if DND_FILES is None:
            self.logger.warning("tkinterdnd2 is unavailable; using the file picker only")
            return
        try:
            self.drop_zone.drop_target_register(DND_FILES)
            self.drop_zone.dnd_bind("<<Drop>>", self._on_drop_event)
        except Exception as error:  # noqa: BLE001 - the file picker remains available if DnD setup fails
            self.logger.exception("Drag-and-drop setup unavailable: %s", error)

    def _on_drop_event(self, event) -> str:
        try:
            dropped = [Path(item) for item in self.root.tk.splitlist(event.data)]
        except tk.TclError as error:
            self.logger.exception("Could not read dropped paths: %s", error)
            self._append_log("ドロップ内容を読み取れませんでした。", "warning")
            return COPY

        self._handle_input_paths(dropped)
        return COPY

    def _on_close(self) -> None:
        with self.instant_lock:
            instant_active = self.instant_active
        if self.busy or instant_active:
            self.status.set("処理中です。完了するまで閉じられません。")
            self._append_log("処理中のため、完了まで画面を閉じられません。", "warning")
            return
        self.destroy_requested = True
        self.root.destroy()


def main() -> None:
    root = TkinterDnD.Tk() if TkinterDnD is not None else tk.Tk()
    try:
        # Windows 10/11で高DPI表示を崩しにくくする。
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except (AttributeError, OSError):
        pass
    app = ImageConverterApp(root)
    _ = app
    root.mainloop()


if __name__ == "__main__":
    main()
