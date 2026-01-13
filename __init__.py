import os
import server
import traceback
from .utils import MODEL_DIR, get_folders
from aiohttp import web
import asyncio
import json
import ctypes
import uuid
import sys
import subprocess
import importlib.util
from .downloader_manager import DownloaderManager
import tkinter as tk
from tkinter import filedialog

package_name = 'rapidfuzz'
spec = importlib.util.find_spec(package_name)
if spec is None:
    print("Installing " + package_name)
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        print(f"{package_name} installed")
    except Exception as e:
        print(e)
        print(traceback.format_exc())
from .character_search import search_character, cancel_flags

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception as e:
    print(traceback.format_exc())
    print(e)
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception as e:
        print(traceback.format_exc())
        print(e)

EXTENSION_PATH = os.path.dirname(os.path.realpath(__file__))
ASSETS_PATH = os.path.join(EXTENSION_PATH, "assets")

WEB_DIRECTORY = "./web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

print(f"[ComfyUI-MiniTools]Loaded ComfyUI-MiniTools from {EXTENSION_PATH}")

CURRENT_DIR = os.path.dirname(__file__)
DEFAULT_SRC_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "assets", "characterSearchSrc", "danbooru_character_webui.csv"))

DOWNLOADER = DownloaderManager()

@server.PromptServer.instance.routes.get("/minitools/get_init_config")
async def get_init_config(request):
    try:
        with open(os.path.join(CURRENT_DIR, "config.json"), "r") as file:
            config = json.load(file)
            if os.path.exists(config["src"]) and os.path.isfile(config["src"]):
                return web.json_response(config)
    except Exception as exception:
        print(traceback.format_exc())
        print(exception)
    default_path = DEFAULT_SRC_PATH if os.path.exists(DEFAULT_SRC_PATH) else ""
    config["src"] = default_path
    return web.json_response(config)

@server.PromptServer.instance.routes.post("/minitools/save_src_config")
async def save_src_config(request):
    data = await request.json()
    src = data.get("src", None)
    if not (src is None):
        edit_config("src", src)
    return web.json_response(status=204)

@server.PromptServer.instance.routes.get("/minitools/get_default_src")
async def get_default_src(request):
    edit_config("src", DEFAULT_SRC_PATH)
    return web.json_response({
        "src": DEFAULT_SRC_PATH
    })


def ask_open_file_native(filter_str="所有文件 (*.*)\0*.*\0\0", initial_path=None):
    title = "选择搜索源"
    initial_dir = initial_path if initial_path and os.path.exists(initial_path) else os.getcwd()
    root = tk.Tk()
    root.withdraw()
    filter_list = filter_str.split("\0")
    filetypes = [(filter_list[i], filter_list[i + 1]) for i in range(0, len(filter_list) - 1, 2)]
    try:
        file_path = filedialog.askopenfilename(
            title=title,
            initialdir=initial_dir,
            filetypes=filetypes
        )
    except Exception as exception:
        print(exception)
        file_path = ""
    root.destroy()
    return file_path if file_path else ""

def edit_config(key, val):
    try:
        with open(os.path.join(CURRENT_DIR, "config.json"), "r") as file:
            config = json.load(file)
        config[key] = val
        with open(os.path.join(CURRENT_DIR, "config.json"), "w") as file:
            json.dump(config, file)
    except Exception as exception:
        print(exception)
        print(traceback.format_exc())


@server.PromptServer.instance.routes.post("/minitools/get_local_path")
async def get_local_path(request):
    data = await request.json()
    initial_path = data.get("initialPath", "")
    filter_config = "表格文件 (*.csv)\0*.csv\0\0"
    file_path = await asyncio.to_thread(ask_open_file_native, filter_config, initial_path)
    if file_path:
        edit_config("src", file_path)
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
    except Exception as exception:
        print(exception)
        print(traceback.format_exc())
        return web.json_response({"error": str(exception)}, status=500)

@server.PromptServer.instance.routes.post("/minitools/cancel_search")
async def cancel_handler(request):
    data = await request.json()
    request_id = data.get("request_id", "default")
    cancel_flags[request_id] = True
    return web.json_response({"canceled": "Search cancelled by user"})

@server.PromptServer.instance.routes.post("/minitools/get_download_info")
async def get_download_info(request):
    global DOWNLOADER
    data = await request.json()
    url = data.get("url", "")
    civitai_api_key = data.get("civitaiApiKey", "")
    mode = data.get("mode", "default")
    DOWNLOADER.set_url(url)
    DOWNLOADER.set_mode(mode)
    DOWNLOADER.set_civitai_api_key(civitai_api_key)
    info = await asyncio.to_thread(DOWNLOADER.get_info)
    return web.json_response(info)

@server.PromptServer.instance.routes.post("/minitools/save_civitai_api_config")
async def save_civitai_api_config(request):
    data = await request.json()
    edit_config("civitai_api_key", data.get("civitai_api_key", ""))
    return web.Response(status=204)

@server.PromptServer.instance.routes.post("/minitools/get_classifications")
async def get_classifications(request):
    data = await request.json()
    path = data.get("path", utils.MODEL_DIR)
    return web.json_response({"folders": get_folders(MODEL_DIR, *path)})

@server.PromptServer.instance.routes.get("/minitools/get_model_path")
async def get_model_path(request):
    return web.json_response({"model_path": MODEL_DIR})

def ask_save_folder(initial_path=None):
    initial_dir = initial_path if initial_path and os.path.exists(initial_path) else MODEL_DIR
    root = tk.Tk()
    root.withdraw()
    path = filedialog.askdirectory(
        title="选择保存路径",
        initialdir=initial_dir,
        mustexist=False
    )
    root.destroy()
    return path or ""

@server.PromptServer.instance.routes.post("/minitools/choose_save_path")
async def choose_save_path(request):
    data = await request.json()
    initial_path = data.get("initialPath", MODEL_DIR)
    file_path = await asyncio.to_thread(ask_save_folder, initial_path)
    if file_path:
        return web.json_response({"save_path": file_path})
    else:
        return web.json_response({"save_path": ""})