import os
import folder_paths

MODEL_DIR = os.path.abspath(folder_paths.models_dir)


def get_folders(*paths: str) -> list[str]:
    full_path = os.path.join(*paths)
    if not os.path.exists(full_path) or not os.path.isdir(full_path):
        return []
    return [
        name for name in os.listdir(full_path)
        if os.path.isdir(os.path.join(full_path, name))
    ]