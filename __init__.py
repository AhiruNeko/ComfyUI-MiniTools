import os
import server
from aiohttp import web
import tkinter as tk
from tkinter import filedialog
import json

EXTENSION_PATH = os.path.dirname(os.path.realpath(__file__))
ASSETS_PATH = os.path.join(EXTENSION_PATH, "assets")

WEB_DIRECTORY = "./web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

print(f"Loaded ComfyUI-MiniTools from {EXTENSION_PATH}")

CURRENT_DIR = os.path.dirname(__file__)
DEFAULT_ASSETS_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "assets", "characterSearchSrc","danbooru_character_webui.csv"))

@server.PromptServer.instance.routes.get("/minitools/get_init_config")
async def get_init_config(request):
    try:
        with open(os.path.join(CURRENT_DIR, "assets", "characterSearchSrc","config.json"), "r") as file:
            config = json.load(file)
            if os.path.exists(config["src"]) and os.path.isfile(config["src"]):
                return web.json_response(config)
    except Exception as e:
        print(e)
    default_path = DEFAULT_ASSETS_PATH if os.path.exists(DEFAULT_ASSETS_PATH) else ""
    return web.json_response({
        "src": default_path
    })

@server.PromptServer.instance.routes.get("/minitools/get_local_path")
async def get_local_path(request):
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    file_path = filedialog.askopenfilename(
        title="选择搜索源",
        filetypes=[("表格文件", "*.csv")]
    )
    root.destroy()
    if file_path:
        try:
            with open(os.path.join(CURRENT_DIR, "assets", "characterSearchSrc", "config.json"), "r") as file:
                config = json.load(file)
            config["src"] = file_path
            with open(os.path.join(CURRENT_DIR, "assets", "characterSearchSrc", "config.json"), "w") as file:
                json.dump(config, file)
        except Exception as e:
            print(e)

        return web.json_response({"src": os.path.abspath(file_path)})
    else:
        return web.json_response({"src": ""})