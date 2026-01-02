import os

EXTENSION_PATH = os.path.dirname(os.path.realpath(__file__))
ASSETS_PATH = os.path.join(EXTENSION_PATH, "assets")

WEB_DIRECTORY = "./web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

print(f"Loaded ComfyUI-MiniTools from {EXTENSION_PATH}")