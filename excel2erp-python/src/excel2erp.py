#!/usr/bin/env python3
"""
Excel2ERP - tkinter Desktop Application

Main entry point for the Python implementation of Excel2ERP. This module
provides a desktop GUI using tkinter that allows users to:
1. Select an Excel file format (source)
2. Pick an Excel file to import
3. Preview extracted data before export
4. Provide any missing field values
5. Generate the ERP import ZIP file

ARCHITECTURAL CONTEXT:
----------------------
This is the GUI layer—a thin shell that orchestrates user interaction while
delegating all business logic to the domain modules:

    excel2erp.py (this file - presentation only)
        │
        │  User interaction
        │  ────────────────
        │  - Source selection
        │  - File picking
        │  - Missing field input
        │  - Export triggering
        │
        ▼
    engine.py (domain logic)
        │
        ▼
    excel.py → openpyxl

The GUI knows NOTHING about Excel cell addresses, data extraction, or file
generation. It only knows how to display data and collect user input.

GUI STRUCTURE:
--------------
The window is organized vertically:

    ┌─────────────────────────────────────────┐
    │  [Logo]  Application Title               │  ← Header with optional logo
    ├─────────────────────────────────────────┤
    │  [Source Logo] Cliente: [Dropdown ▼]     │  ← Source selector
    ├─────────────────────────────────────────┤
    │  Fecha: [Date Picker]                    │  ← Dynamic form fields
    │  Campo: [Text Entry ]                    │    (only for missing props)
    ├─────────────────────────────────────────┤
    │  [Action Button]  filename.xlsx          │  ← Single morphing button
    ├─────────────────────────────────────────┤
    │  Preview                                 │
    │  ┌─────────────────────────────────────┐ │
    │  │ Header (key-value pairs)            │ │  ← Treeview showing metadata
    │  └─────────────────────────────────────┘ │
    │  ┌─────────────────────────────────────┐ │
    │  │ Detail (table with columns)         │ │  ← Treeview showing line items
    │  │ col1 | col2 | col3 | ...           │ │
    │  │ val  | val  | val  | ...           │ │
    │  └─────────────────────────────────────┘ │
    ├─────────────────────────────────────────┤
    │  Status message                          │  ← Feedback to user
    └─────────────────────────────────────────┘

USER WORKFLOW:
--------------
The application implements a two-phase workflow with a SINGLE morphing button:

PHASE 1 - File Selection:
    1. User selects a source (vendor format) from dropdown
    2. Dynamic form fields appear for any missing properties
    3. Button shows "Archivo pedido" (or configured file picker label)
    4. User clicks button → file picker dialog opens
    5. User selects Excel file → data is extracted and previewed
    6. Button MORPHS to "Generar Archivo ERP" (export label)

PHASE 2 - Export:
    7. User reviews preview data
    8. User fills in any missing form fields
    9. User clicks button (now showing export label) → ZIP is generated
    10. Save dialog opens for ZIP location
    11. After save, button MORPHS back to file picker mode

SINGLE BUTTON PATTERN:
----------------------
Instead of separate "Pick File" and "Export" buttons, this application uses
ONE button that changes behavior based on application state:

    data_loaded = False:
        Button text: config.param("workbook")  # e.g., "Archivo pedido"
        Button action: Opens file picker dialog

    data_loaded = True:
        Button text: config.param("submit")    # e.g., "Generar Archivo ERP"
        Button action: Generates ZIP and opens save dialog

This pattern:
- Reduces visual clutter (one button, not two)
- Guides the user through the workflow (button changes after file load)
- Prevents premature export (button only becomes "Export" after file is loaded)
- Resets cleanly after export (morphs back to file picker mode)

State transitions:
    [Start] → _on_source_selected() → data_loaded = False, button = "Archivo pedido"
    [Pick]  → _load_and_preview()   → data_loaded = True,  button = "Generar Archivo ERP"
    [Save]  → _reset_to_file_picker() → data_loaded = False, button = "Archivo pedido"
    [Error] → _reset_to_file_picker() → data_loaded = False, button = "Archivo pedido"
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path

from openpyxl import load_workbook
from tkcalendar import DateEntry

from config import load_config
from model import Config, Source, ResultProperty
from engine import (
    extract_header, extract_detail, missing_properties,
    generate_content, create_zip, expand, normalize_date
)


class Excel2ErpApp:
    """
    Main application class managing the tkinter GUI and workflow.

    This class encapsulates the entire GUI state and behavior. It creates
    the window, builds the UI components, handles user interactions, and
    coordinates with the domain layer for data extraction and generation.

    Instance Attributes:
        config: The loaded Config object from YAML.
        basedir: Base directory for resolving relative paths (assets, config).

        selected_source: Currently selected Source from dropdown, or None.
        selected_file: Path to the currently loaded Excel file, or None.
        missing_props: List of ResultProperty needing user input for current source.
        field_widgets: Maps property names to their input widgets (Entry or DateEntry).
        data_loaded: Boolean flag controlling button behavior (see SINGLE BUTTON PATTERN).

        header_data: Extracted header values from current Excel file.
        detail_data: Extracted detail rows from current Excel file.

        root: The tkinter Tk root window.
        logo_image: Scaled application logo (kept as reference to prevent GC).
        source_logo_image: Scaled source/vendor logo (kept as reference to prevent GC).

        source_var: StringVar bound to source dropdown.
        form_frame: Frame containing dynamic input fields.
        action_btn: The morphing action button.
        file_label: Label showing selected filename.
        header_tree: Treeview displaying header key-value pairs.
        detail_tree: Treeview displaying detail table rows.
        detail_label: Label showing detail row count.
        status_var: StringVar for status message display.
    """

    def __init__(self, config: Config, basedir: Path):
        """
        Initialize the application with configuration.

        Args:
            config: Loaded Config object defining sources, parameters, etc.
            basedir: Base directory for asset paths. Typically the project root
                     where "shared/fixtures/assets/" can be found.
        """
        # Store configuration
        self.config = config
        self.basedir = basedir

        # Initialize state variables
        self.selected_source: Source | None = None
        self.selected_file: Path | None = None
        self.missing_props: list[ResultProperty] = []
        self.field_widgets: dict[str, tk.Widget] = {}
        self.data_loaded = False  # Controls button behavior (see module docstring)

        # Extracted data storage (populated after file load)
        self.header_data: dict[str, str] = {}
        self.detail_data: list[dict[str, str]] = []

        # Create the main window
        self.root = tk.Tk()
        self.root.title(config.description)
        self.root.geometry("800x700")  # Reasonable default size

        # Load logos and build UI
        self._load_logo()
        self._build_ui()

    def _load_logo(self):
        """
        Load the main application logo from assets.

        The logo path is constructed from config.logo relative to
        basedir/shared/fixtures/assets/. The image is scaled down
        using PhotoImage.subsample() for appropriate display size.

        tkinter's PhotoImage requires us to keep a reference to the
        image object, otherwise it gets garbage collected and disappears
        from the display. We store both the full-size and scaled versions.
        """
        self.logo_image = None

        if self.config.logo:
            # Construct path using local shared/ symlink
            logo_path = self.basedir / "shared" / "fixtures" / "assets" / self.config.logo

            if logo_path.exists():
                # Load full-size image
                full_image = tk.PhotoImage(file=str(logo_path))

                # Scale down by factor of 2 in each dimension
                # subsample(2, 2) takes every 2nd pixel → 50% size
                self.logo_image = full_image.subsample(2, 2)

                # Keep reference to prevent garbage collection
                self._logo_full = full_image

    def _build_ui(self):
        """
        Construct all UI components.

        This method creates the entire window layout as described in
        the module docstring's GUI STRUCTURE section. Components are
        built top-to-bottom in display order.
        """
        # Main container with padding
        main = ttk.Frame(self.root, padding=16)
        main.pack(fill=tk.BOTH, expand=True)

        # ─────────────────────────────────────────────────────────────
        # HEADER SECTION: Logo + Title
        # ─────────────────────────────────────────────────────────────
        header_frame = ttk.Frame(main)
        header_frame.pack(fill=tk.X)

        # Show logo if loaded successfully
        if self.logo_image:
            logo_label = ttk.Label(header_frame, image=self.logo_image)
            logo_label.pack(side=tk.LEFT, padx=(0, 12))

        # Application title from config
        ttk.Label(
            header_frame,
            text=self.config.description,
            font=("", 14, "bold")
        ).pack(side=tk.LEFT, anchor=tk.W)

        ttk.Separator(main, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=(8, 12))

        # ─────────────────────────────────────────────────────────────
        # SOURCE SELECTOR: Dropdown with vendor logo
        # ─────────────────────────────────────────────────────────────
        src_frame = ttk.Frame(main)
        src_frame.pack(fill=tk.X, pady=4)

        # Placeholder for source logo (updated when source is selected)
        self.source_logo_label = ttk.Label(src_frame)
        self.source_logo_label.pack(side=tk.LEFT, padx=(0, 8))
        self.source_logo_image = None  # Reference holder

        # Label for dropdown (from config parameters)
        ttk.Label(src_frame, text=f"{self.config.param('source')}:").pack(side=tk.LEFT)

        # Source selection dropdown
        self.source_var = tk.StringVar()
        combo = ttk.Combobox(
            src_frame,
            textvariable=self.source_var,
            values=[s.description for s in self.config.sources],
            state="readonly",  # User can only select, not type
            width=40
        )
        combo.pack(side=tk.LEFT, padx=(8, 0))
        combo.bind("<<ComboboxSelected>>", self._on_source_selected)

        # ─────────────────────────────────────────────────────────────
        # DYNAMIC FORM AREA: Input fields for missing properties
        # ─────────────────────────────────────────────────────────────
        # This frame is populated dynamically when a source is selected.
        # Fields appear for properties that can't be extracted from Excel.
        self.form_frame = ttk.Frame(main)
        self.form_frame.pack(fill=tk.X, pady=8)

        # ─────────────────────────────────────────────────────────────
        # ACTION BUTTON: Single morphing button (file picker / export)
        # ─────────────────────────────────────────────────────────────
        # See SINGLE BUTTON PATTERN in module docstring for full explanation
        action_frame = ttk.Frame(main)
        action_frame.pack(fill=tk.X, pady=4)

        # The button's text and behavior change based on data_loaded state
        self.action_btn = ttk.Button(
            action_frame,
            text=self.config.param("workbook"),  # Initial: file picker label
            command=self._on_action_click
        )
        self.action_btn.pack(side=tk.LEFT)

        # Shows filename after file is loaded
        self.file_label = ttk.Label(action_frame, text="")
        self.file_label.pack(side=tk.LEFT, padx=(12, 0))

        # ─────────────────────────────────────────────────────────────
        # PREVIEW AREA: Header + Detail Treeviews
        # ─────────────────────────────────────────────────────────────
        ttk.Separator(main, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=12)

        self.preview_frame = ttk.LabelFrame(
            main,
            text=self.config.param("previewLabel"),
            padding=8
        )
        self.preview_frame.pack(fill=tk.BOTH, expand=True)

        # Header preview: key-value pairs shown as tree nodes
        header_label = ttk.Label(
            self.preview_frame,
            text=self.config.param("headerLabel"),
            font=("", 10, "bold")
        )
        header_label.pack(anchor=tk.W)

        # Treeview with hidden header columns (shows as key-value list)
        self.header_tree = ttk.Treeview(
            self.preview_frame,
            columns=("value",),
            show="tree",  # Hide column headers
            height=5
        )
        self.header_tree.column("#0", width=150, anchor=tk.W)  # Key column
        self.header_tree.column("value", width=300, anchor=tk.W)  # Value column
        self.header_tree.pack(fill=tk.X, pady=(4, 8))

        # Detail preview: tabular data with headers
        self.detail_label = ttk.Label(
            self.preview_frame,
            text=self.config.param("detailLabel"),
            font=("", 10, "bold")
        )
        self.detail_label.pack(anchor=tk.W)

        # Container for detail treeview + scrollbars
        detail_container = ttk.Frame(self.preview_frame)
        detail_container.pack(fill=tk.BOTH, expand=True, pady=(4, 0))

        # Detail treeview (columns set dynamically based on data)
        self.detail_tree = ttk.Treeview(detail_container, show="headings", height=6)

        # Scrollbars for the detail table
        detail_scroll_y = ttk.Scrollbar(
            detail_container,
            orient=tk.VERTICAL,
            command=self.detail_tree.yview
        )
        detail_scroll_x = ttk.Scrollbar(
            detail_container,
            orient=tk.HORIZONTAL,
            command=self.detail_tree.xview
        )
        self.detail_tree.configure(
            yscrollcommand=detail_scroll_y.set,
            xscrollcommand=detail_scroll_x.set
        )

        # Grid layout for treeview + scrollbars
        self.detail_tree.grid(row=0, column=0, sticky="nsew")
        detail_scroll_y.grid(row=0, column=1, sticky="ns")
        detail_scroll_x.grid(row=1, column=0, sticky="ew")
        detail_container.columnconfigure(0, weight=1)
        detail_container.rowconfigure(0, weight=1)

        # ─────────────────────────────────────────────────────────────
        # STATUS BAR: Feedback messages
        # ─────────────────────────────────────────────────────────────
        self.status_var = tk.StringVar()
        ttk.Label(main, textvariable=self.status_var).pack(anchor=tk.W, pady=(8, 0))

    def _on_source_selected(self, event=None):
        """
        Handle source dropdown selection change.

        When the user selects a different source (vendor format):
        1. Clear any previously loaded data and reset to file picker mode
        2. Load and display the source's logo
        3. Identify missing properties for this source
        4. Create input widgets for each missing property

        Args:
            event: The tkinter event (unused, but required for binding).
        """
        # Find the Source object matching the selected description
        idx = self.source_var.get()
        self.selected_source = next(
            (s for s in self.config.sources if s.description == idx),
            None
        )

        # Clear the dynamic form area
        for widget in self.form_frame.winfo_children():
            widget.destroy()
        self.field_widgets.clear()

        # Reset to file picker mode (in case data was previously loaded)
        self._reset_to_file_picker()

        if not self.selected_source:
            # No valid source selected - clear logo
            self.source_logo_label.config(image="")
            self.source_logo_image = None
            return

        # Load and display source logo (scaled to ~64x64)
        if self.selected_source.logo:
            logo_path = (
                self.basedir / "shared" / "fixtures" / "assets" /
                self.selected_source.logo
            )
            if logo_path.exists():
                # Load and scale the logo
                self._source_logo_full = tk.PhotoImage(file=str(logo_path))
                self.source_logo_image = self._source_logo_full.subsample(4, 4)
                self.source_logo_label.config(image=self.source_logo_image)
            else:
                self.source_logo_label.config(image="")
                self.source_logo_image = None

        # Determine which properties need user input
        # These are fields required in output but not extracted from Excel
        self.missing_props = missing_properties(
            self.selected_source,
            self.config.result.header
        )

        # Create input widgets for each missing property
        for prop in self.missing_props:
            row = ttk.Frame(self.form_frame)
            row.pack(fill=tk.X, pady=2)

            # Label showing the property prompt
            ttk.Label(row, text=f"{prop.prompt}:", width=20).pack(side=tk.LEFT)

            # Create appropriate widget based on property type
            if prop.type == "date":
                # Date properties get a calendar date picker
                widget = DateEntry(row, width=27, date_pattern="yyyy-mm-dd")
                widget.pack(side=tk.LEFT, padx=(8, 0))
            else:
                # Everything else gets a text entry
                widget = ttk.Entry(row, width=30)
                widget.pack(side=tk.LEFT, padx=(8, 0))

            # Store widget reference for later value retrieval
            self.field_widgets[prop.name] = widget

    def _on_action_click(self):
        """
        Handle action button click - implements the morphing button behavior.

        The button's action depends on the current state:
        - If data_loaded is False: Open file picker to select Excel file
        - If data_loaded is True: Generate and export the ZIP file

        This is the core of the SINGLE BUTTON PATTERN described in
        the module docstring.
        """
        if self.data_loaded:
            # State: File loaded, button shows "Generar Archivo ERP"
            # Action: Generate and save the export ZIP
            self._export()
        else:
            # State: No file loaded, button shows "Archivo pedido"
            # Action: Open file picker dialog
            self._pick_file()

    def _pick_file(self):
        """
        Open file picker dialog and load the selected Excel file.

        Opens a native file dialog filtered for Excel files (.xlsx).
        If a file is selected, it's stored and preview loading begins.
        If the user cancels, nothing happens.
        """
        path = filedialog.askopenfilename(
            title="Select Excel File",
            filetypes=[("Excel files", "*.xlsx"), ("All files", "*.*")]
        )

        if path:
            self.selected_file = Path(path)
            self._load_and_preview()

    def _load_and_preview(self):
        """
        Load Excel file, extract data, and display preview.

        This method:
        1. Opens the Excel file with openpyxl
        2. Extracts header data using the engine
        3. Extracts detail data using the engine
        4. Populates the preview treeviews
        5. Switches to export mode (morphs the button)

        On error, shows a message dialog and resets to file picker mode.
        """
        # Guard: Need both source and file
        if not self.selected_source or not self.selected_file:
            return

        try:
            # Show loading feedback
            self.status_var.set("Loading...")
            self.root.update()  # Force UI refresh

            # Open the Excel workbook (data_only=True to get values, not formulas)
            wb = load_workbook(self.selected_file, data_only=True)

            # Get the correct worksheet based on source config
            sheet = wb.worksheets[self.selected_source.sheet_index]

            # Extract data using domain functions
            self.header_data = extract_header(
                sheet,
                self.selected_source,
                self.config.result.header
            )
            self.detail_data = extract_detail(sheet, self.selected_source)

            # Update UI with extracted data
            self._show_preview()
            self._set_export_mode()

            # Show success status
            self.status_var.set(f"Loaded: {len(self.detail_data)} detail rows")

        except Exception as e:
            # Show error and reset
            self.status_var.set("✗ Load error")
            messagebox.showerror("Error", str(e))
            self._reset_to_file_picker()

    def _set_export_mode(self):
        """
        Switch button to export mode after successful file load.

        This implements the state transition in the SINGLE BUTTON PATTERN:
        - Set data_loaded = True
        - Change button text to export label
        - Show the loaded filename

        After this, clicking the button will trigger export instead of
        file picking.
        """
        self.data_loaded = True
        self.action_btn.config(text=self.config.param("submit"))
        self.file_label.config(text=self.selected_file.name)

    def _reset_to_file_picker(self):
        """
        Reset button to file picker mode.

        This implements the state transition back to initial state:
        - Set data_loaded = False
        - Change button text to file picker label
        - Clear filename display
        - Clear all preview data and widgets

        Called after successful export, on error, or when source changes.
        """
        self.data_loaded = False
        self.action_btn.config(text=self.config.param("workbook"))
        self.file_label.config(text="")
        self.selected_file = None
        self._clear_tree_widgets()
        self.header_data = {}
        self.detail_data = []

    def _show_preview(self):
        """
        Populate the preview treeviews with extracted data.

        Updates both header and detail previews:
        - Header: Shows key-value pairs in a tree list
        - Detail: Shows tabular data with dynamic columns
        """
        # Clear any existing preview data
        self._clear_tree_widgets()

        # Header preview: Insert each field as a tree item
        for key, value in self.header_data.items():
            self.header_tree.insert("", tk.END, text=key, values=(value,))

        # Detail preview: Build table with dynamic columns
        if self.detail_data:
            # Get column names from first row
            columns = list(self.detail_data[0].keys())
            self.detail_tree["columns"] = columns

            # Configure column headers and widths
            for col in columns:
                self.detail_tree.heading(col, text=col)
                self.detail_tree.column(col, width=100, anchor=tk.W)

            # Insert data rows
            for row in self.detail_data:
                values = [row.get(col, "") for col in columns]
                self.detail_tree.insert("", tk.END, values=values)

        # Update detail label with row count
        self.detail_label.config(
            text=f"{self.config.param('detailLabel')} ({len(self.detail_data)} rows)"
        )

    def _clear_tree_widgets(self):
        """
        Clear all data from the preview treeviews.

        Removes all items from both header and detail trees,
        and resets the detail tree's column configuration.
        """
        # Clear header tree items
        for item in self.header_tree.get_children():
            self.header_tree.delete(item)

        # Clear detail tree items
        for item in self.detail_tree.get_children():
            self.detail_tree.delete(item)

        # Reset columns (will be reconfigured on next preview)
        self.detail_tree["columns"] = ()

    def _export(self):
        """
        Generate and save the ERP export ZIP file.

        This method:
        1. Collects values from user input widgets
        2. Merges them with extracted header data
        3. Generates header and detail file contents
        4. Creates the ZIP archive
        5. Opens save dialog for user to choose location
        6. Writes the ZIP and resets to file picker mode

        On error, shows a message dialog but does NOT reset
        (user may want to fix input and retry).
        """
        try:
            # Merge user input into header data
            for prop in self.missing_props:
                widget = self.field_widgets[prop.name]

                # Get value based on widget type
                if prop.type == "date":
                    # DateEntry returns formatted string, normalize to YYYYMMDD
                    value = normalize_date(widget.get())
                else:
                    value = widget.get()

                self.header_data[prop.name] = value

            # Add source name for use in filename template
            self.header_data["sourceName"] = self.selected_source.name

            # Generate file contents using domain functions
            header_content = generate_content(
                self.config.result.header,
                self.config.result.separator,
                [self.header_data]  # Header is always a single record
            )
            detail_content = generate_content(
                self.config.result.detail,
                self.config.result.separator,
                self.detail_data
            )

            # Create ZIP archive
            zip_bytes = create_zip(header_content, detail_content, self.config.result)

            # Generate default filename using template
            zip_filename = expand(
                self.config.result.base_name,
                self.header_data
            ) + ".zip"

            # Open save dialog
            output_path = filedialog.asksaveasfilename(
                title="Save ERP File",
                defaultextension=".zip",
                initialfile=zip_filename,
                filetypes=[("ZIP files", "*.zip")]
            )

            if output_path:
                # User confirmed save - write file
                Path(output_path).write_bytes(zip_bytes)
                self.status_var.set(f"✓ Saved: {Path(output_path).name}")

                # Reset to allow processing another file
                self._reset_to_file_picker()
            else:
                # User cancelled save dialog
                self.status_var.set("Cancelled")

        except Exception as e:
            # Show error but don't reset (user may want to fix and retry)
            self.status_var.set("✗ Export error")
            messagebox.showerror("Error", str(e))

    def run(self):
        """
        Start the tkinter main event loop.

        This method blocks until the window is closed.
        Call this after creating the Excel2ErpApp instance.
        """
        self.root.mainloop()


def main():
    """
    CLI entry point for the application.

    Parses command line arguments and launches the GUI:
    - config: Path to YAML configuration (default: shared/excel2erp.yaml)
    - --basedir: Base directory for resolving paths (default: current directory)

    Usage:
        python excel2erp.py [config] [--basedir DIR]

    Examples:
        python excel2erp.py
        python excel2erp.py shared/excel2erp.yaml
        python excel2erp.py custom-config.yaml --basedir /path/to/project
    """
    import argparse

    parser = argparse.ArgumentParser(description="Excel2ERP")
    parser.add_argument(
        "config",
        nargs="?",
        default="shared/excel2erp.yaml",
        help="Path to YAML configuration file"
    )
    parser.add_argument(
        "--basedir",
        default=".",
        help="Base directory for resolving asset paths"
    )
    args = parser.parse_args()

    # Resolve base directory to absolute path
    base_dir = Path(args.basedir).resolve()

    # Resolve config path (relative to basedir if not absolute)
    if Path(args.config).is_absolute():
        config_path = Path(args.config)
    else:
        config_path = base_dir / args.config

    # Load configuration and launch GUI
    config = load_config(str(config_path))
    Excel2ErpApp(config, base_dir).run()


if __name__ == "__main__":
    main()
