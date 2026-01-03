import os
import server
from aiohttp import web
import asyncio
import json
from character_search import search_character, cancel_flags
import win32gui, win32con
import ctypes
import uuid

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception as e:
    print(e)
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception as e:
        print(e)

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


def ask_open_file_native():
    title = "选择搜索源"
    filter_str = "表格文件 (*.csv)\0*.csv\0\0"
    try:
        file_path, _, _ = win32gui.GetOpenFileNameW(
            InitialDir=os.getcwd(),
            Flags=win32con.OFN_EXPLORER | win32con.OFN_FILEMUSTEXIST | win32con.OFN_HIDEREADONLY,
            Title=title,
            Filter=filter_str,
            DefExt="csv"
        )
        return file_path
    except Exception as e:
        print(e)
        return ""

@server.PromptServer.instance.routes.get("/minitools/get_local_path")
async def get_local_path(request):
    file_path = await asyncio.to_thread(ask_open_file_native)
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

@server.PromptServer.instance.routes.post("/minitools/search_handler")
async def search_handler(request):
    try:
        data = await request.json()
        query = data.get("query", "").strip()
        search_src = data.get("src", "").strip()
        request_id = data.get("request_id", str(uuid.uuid4()))
        results = await asyncio.to_thread(search_character, search_src, query, request_id)
        if isinstance(results, dict) and ("error" in results.keys()):
            return web.json_response({"error": results["error"]})
        if isinstance(results, dict) and results.get("canceled"):
            return web.json_response({"canceled": "Search cancelled by user"})
        return web.json_response({"results": results, "length": len(results)})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@server.PromptServer.instance.routes.post("/minitools/cancel_search")
async def cancel_handler(request):
    data = await request.json()
    request_id = data.get("request_id", "default")
    cancel_flags[request_id] = True
    return web.json_response({"canceled": "Search cancelled by user"})
