"""Load a FastAPI app from a service directory (handles hyphenated folder names)."""

from __future__ import annotations

import importlib.util
import os
import sys


def load_service_app(service_dir: str, module_name: str):
    """Import `main.py` from `services/<service_dir>/`."""
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    service_root = os.path.join(root, "services", service_dir)
    main_path = os.path.join(service_root, "main.py")

    if root not in sys.path:
        sys.path.insert(0, root)
    if service_root not in sys.path:
        sys.path.insert(0, service_root)

    spec = importlib.util.spec_from_file_location(module_name, main_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load service app from {main_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.app
