#!/usr/bin/env python3
"""
Excel2ERP - tkinter Desktop Application

Main entry point with data preview before export.
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path

from openpyxl import load_workbook

from config import load_config
from model import Config, Source, ResultProperty
from engine import (
    extract_header, extract_detail, missing_properties,
    generate_content, create_zip, expand, normalize_date
)


class Excel2ErpApp:
    def __init__(self, config: Config):
        self.config = config
        self.selected_source: Source | None = None
        self.selected_file: Path | None = None
        self.missing_props: list[ResultProperty] = []
        self.field_vars: dict[str, tk.StringVar] = {}

        # Extracted data (for preview)
        self.header_data: dict[str, str] = {}
        self.detail_data: list[dict[str, str]] = []

        self.root = tk.Tk()
        self.root.title(config.description)
        self.root.geometry("600x500")
        self._build_ui()

    def _build_ui(self):
        main = ttk.Frame(self.root, padding=16)
        main.pack(fill=tk.BOTH, expand=True)

        # Title
        ttk.Label(main, text=self.config.description, font=("", 14, "bold")).pack(anchor=tk.W)
        ttk.Separator(main, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=(8, 12))

        # Source selector
        src_frame = ttk.Frame(main)
        src_frame.pack(fill=tk.X, pady=4)
        ttk.Label(src_frame, text=f"{self.config.param('source')}:").pack(side=tk.LEFT)
        self.source_var = tk.StringVar()
        combo = ttk.Combobox(src_frame, textvariable=self.source_var,
                             values=[s.description for s in self.config.sources],
                             state="readonly", width=40)
        combo.pack(side=tk.LEFT, padx=(8, 0))
        combo.bind("<<ComboboxSelected>>", self._on_source_selected)

        # Dynamic form area
        self.form_frame = ttk.Frame(main)
        self.form_frame.pack(fill=tk.X, pady=8)

        # File picker + Load button
        file_frame = ttk.Frame(main)
        file_frame.pack(fill=tk.X, pady=4)
        ttk.Button(file_frame, text=self.config.param("workbook"), command=self._pick_file).pack(side=tk.LEFT)
        self.file_label = ttk.Label(file_frame, text="—")
        self.file_label.pack(side=tk.LEFT, padx=(12, 0))

        # Preview area
        ttk.Separator(main, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=12)
        self.preview_frame = ttk.LabelFrame(main, text="Preview", padding=8)
        self.preview_frame.pack(fill=tk.BOTH, expand=True)

        self.preview_text = tk.Text(self.preview_frame, height=10, state=tk.DISABLED, wrap=tk.NONE)
        self.preview_text.pack(fill=tk.BOTH, expand=True)

        # Export button
        btn_frame = ttk.Frame(main)
        btn_frame.pack(fill=tk.X, pady=(12, 0))
        self.export_btn = ttk.Button(btn_frame, text=self.config.param("submit"),
                                      command=self._export, state=tk.DISABLED)
        self.export_btn.pack(side=tk.RIGHT)

        # Status
        self.status_var = tk.StringVar()
        ttk.Label(main, textvariable=self.status_var).pack(anchor=tk.W, pady=(8, 0))

    def _on_source_selected(self, event=None):
        idx = self.source_var.get()
        self.selected_source = next((s for s in self.config.sources if s.description == idx), None)
        for widget in self.form_frame.winfo_children():
            widget.destroy()
        self.field_vars.clear()
        self._clear_preview()

        if not self.selected_source:
            return

        self.missing_props = missing_properties(self.selected_source, self.config.result.header)
        for prop in self.missing_props:
            row = ttk.Frame(self.form_frame)
            row.pack(fill=tk.X, pady=2)
            ttk.Label(row, text=f"{prop.prompt}:", width=20).pack(side=tk.LEFT)
            var = tk.StringVar()
            self.field_vars[prop.name] = var
            ttk.Entry(row, textvariable=var, width=30).pack(side=tk.LEFT, padx=(8, 0))

    def _pick_file(self):
        path = filedialog.askopenfilename(
            title="Select Excel File",
            filetypes=[("Excel files", "*.xlsx"), ("All files", "*.*")]
        )
        if path:
            self.selected_file = Path(path)
            self.file_label.config(text=self.selected_file.name)
            self._load_and_preview()

    def _load_and_preview(self):
        if not self.selected_source or not self.selected_file:
            return
        try:
            self.status_var.set("Loading...")
            self.root.update()

            wb = load_workbook(self.selected_file, data_only=True)
            sheet = wb.worksheets[self.selected_source.sheet_index]

            self.header_data = extract_header(sheet, self.selected_source, self.config.result.header)
            self.detail_data = extract_detail(sheet, self.selected_source)

            self._show_preview()
            self.export_btn.config(state=tk.NORMAL)
            self.status_var.set(f"Loaded: {len(self.detail_data)} detail rows")

        except Exception as e:
            self.status_var.set(f"✗ Load error")
            messagebox.showerror("Error", str(e))
            self._clear_preview()

    def _show_preview(self):
        self.preview_text.config(state=tk.NORMAL)
        self.preview_text.delete("1.0", tk.END)

        # Header preview
        self.preview_text.insert(tk.END, "═══ Header ═══\n")
        for k, v in self.header_data.items():
            self.preview_text.insert(tk.END, f"  {k}: {v}\n")

        # Detail preview (first 5 rows)
        self.preview_text.insert(tk.END, f"\n═══ Detail ({len(self.detail_data)} rows) ═══\n")
        for i, row in enumerate(self.detail_data[:5]):
            self.preview_text.insert(tk.END, f"  [{i}] {row}\n")
        if len(self.detail_data) > 5:
            self.preview_text.insert(tk.END, f"  ... and {len(self.detail_data) - 5} more\n")

        self.preview_text.config(state=tk.DISABLED)

    def _clear_preview(self):
        self.preview_text.config(state=tk.NORMAL)
        self.preview_text.delete("1.0", tk.END)
        self.preview_text.config(state=tk.DISABLED)
        self.export_btn.config(state=tk.DISABLED)
        self.header_data = {}
        self.detail_data = []

    def _export(self):
        try:
            # Merge user input
            for prop in self.missing_props:
                value = self.field_vars[prop.name].get()
                if prop.type == "date":
                    value = normalize_date(value)
                self.header_data[prop.name] = value

            self.header_data["sourceName"] = self.selected_source.name

            header_content = generate_content(self.config.result.header,
                                               self.config.result.separator, [self.header_data])
            detail_content = generate_content(self.config.result.detail,
                                               self.config.result.separator, self.detail_data)

            zip_bytes = create_zip(header_content, detail_content, self.config.result)
            zip_filename = expand(self.config.result.base_name, self.header_data) + ".zip"

            output_path = filedialog.asksaveasfilename(
                title="Save ERP File", defaultextension=".zip",
                initialfile=zip_filename, filetypes=[("ZIP files", "*.zip")]
            )
            if output_path:
                Path(output_path).write_bytes(zip_bytes)
                self.status_var.set(f"✓ Saved: {Path(output_path).name}")
            else:
                self.status_var.set("Cancelled")

        except Exception as e:
            self.status_var.set("✗ Export error")
            messagebox.showerror("Error", str(e))

    def run(self):
        self.root.mainloop()


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Excel2ERP")
    parser.add_argument("config", nargs="?", default="shared/excel2erp.yaml")
    parser.add_argument("--basedir", default=".")
    args = parser.parse_args()

    base_dir = Path(args.basedir).resolve()
    config_path = base_dir / args.config if not Path(args.config).is_absolute() else Path(args.config)

    config = load_config(str(config_path))
    Excel2ErpApp(config).run()


if __name__ == "__main__":
    main()
