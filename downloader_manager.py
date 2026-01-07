from .downloader import Downloader
from .civitai_downloader import CivitaiDownloader
from typing import Literal

class DownloaderManager:
    def __init__(self):
        self.default_downloader = Downloader("")
        self.civitai_downloader = CivitaiDownloader("")
        self.downloaders = {
            "default": self.default_downloader,
            "civitai": self.civitai_downloader
        }
        self.downloader = self.default_downloader

    def set_path(self, path):
        for d in self.downloaders.values():
            d.set_path(path)

    def set_url(self, url):
        for d in self.downloaders.values():
            d.set_url(url)

    def set_civitai_api_key(self, api_key):
        self.civitai_downloader.set_api_key(api_key)

    def set_mode(self, mode: Literal["default", "civitai"]):
        self.downloader = self.downloaders[mode]

    def get_info(self):
        return self.downloader.get_info()

    def cancel(self):
        return self.downloader.cancel()

    def download(self, filename=None):
        self.downloader.download(filename)

    @property
    def process(self):
        return self.downloader.process

    @property
    def time_spent(self):
        return self.downloader.time_spent

    @property
    def time_spent_f(self):
        return self.downloader.time_spent_f

    @property
    def speed(self):
        return self.downloader.speed

    @property
    def speed_f(self):
        return self.downloader.speed_f

    @property
    def eta(self):
        return self.downloader.eta

    @property
    def eta_f(self):
        return self.downloader.eta_f
