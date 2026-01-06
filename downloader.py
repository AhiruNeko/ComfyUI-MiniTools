import requests
import threading
import os
import cgi
import time
import traceback
from urllib.parse import unquote


class Downloader:
    def __init__(self, url, path_or_dir=""):
        self.url = url
        self.path = path_or_dir
        self._process = 0
        self.is_downloading = False
        self._cancelled = False
        self._time_start = 0
        self._time_end = 0
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        self._total_bytes = 0
        self._downloaded_bytes = 0

    @property
    def process(self):
        return self._process

    @property
    def time_spent(self):
        if self.is_downloading:
            return time.perf_counter() - self._time_start
        return self._time_end - self._time_start

    @property
    def time_spent_f(self):
        seconds = int(self.time_spent)
        if seconds < 0:
            return "00:00"
        m, s = divmod(seconds, 60)
        h, m = divmod(m, 60)
        if h > 0:
            return f"{h:02d}:{m:02d}:{s:02d}"
        return f"{m:02d}:{s:02d}"

    @property
    def speed(self):
        spent = self.time_spent
        if spent <= 0 or self._downloaded_bytes == 0:
            return 0
        return self._downloaded_bytes / spent

    @property
    def speed_f(self):
        s = self.speed
        if s >= 1024 * 1024:
            return f"{s / (1024 * 1024):.2f} MB/s"
        return f"{s / 1024:.2f} KB/s"

    @property
    def eta(self):
        s = self.speed
        if s <= 0 or self._total_bytes <= 0:
            return 0
        remaining = self._total_bytes - self._downloaded_bytes
        return remaining / s

    @property
    def eta_f(self):
        seconds = int(self.eta)
        if seconds <= 0: return "00:00"
        m, s = divmod(seconds, 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

    @property
    def info(self):
        try:
            with requests.get(self.url, headers=self.headers, stream=True, allow_redirects=True, timeout=15) as r:
                if r.status_code == 403:
                    with requests.get(self.url, stream=True, allow_redirects=True, timeout=15) as r_clean:
                        return self._build_info_dict(r_clean)
                return self._build_info_dict(r)
        except Exception as e:
            return {"error": str(e)}

    def _build_info_dict(self, response):
        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "url": response.url,
            "suggested_filename": self._extract_filename(response),
            "size": int(response.headers.get('Content-Length', 0))
        }

    @staticmethod
    def _extract_filename(response):
        cd = response.headers.get('Content-Disposition')
        filename = None
        if cd:
            _, params = cgi.parse_header(cd)
            filename = params.get('filename*')
            if filename and filename.lower().startswith("utf-8''"):
                filename = unquote(filename[7:])
            else:
                filename = params.get('filename')

        if not filename:
            path_part = response.url.split('?')[0]
            filename = os.path.basename(path_part)

        return unquote(filename).strip('"') if filename else ""

    def cancel(self):
        if self.is_downloading:
            self._cancelled = True
            print("Download canceling...")

    def _run_download(self, filename=None):
        try:
            details = self.info
            final_url = details.get("url", self.url)
            current_save_path = self.path

            if os.path.isdir(current_save_path) or not current_save_path:
                target_name = filename if filename else details.get("suggested_filename", "")
                if not target_name:
                    raise Exception("No filename provided.")
                current_save_path = os.path.join(current_save_path, target_name)

            headers = None if "X-Amz-Signature" in final_url else self.headers

            with requests.get(final_url, headers=headers, stream=True, timeout=30) as r:
                r.raise_for_status()
                total_len = r.headers.get('content-length')
                self._total_bytes = int(total_len) if total_len else 0

                parent_dir = os.path.dirname(os.path.abspath(current_save_path))
                os.makedirs(parent_dir, exist_ok=True)

                with open(current_save_path, 'wb') as f:
                    self._downloaded_bytes = 0  # 重置已下载量
                    for chunk in r.iter_content(chunk_size=1024 * 1024):
                        if self._cancelled:
                            break
                        if chunk:
                            f.write(chunk)
                            self._downloaded_bytes += len(chunk)

                            if self._total_bytes > 0:
                                self._process = int(100 * self._downloaded_bytes / self._total_bytes)

            if self._cancelled:
                if os.path.exists(current_save_path):
                    os.remove(current_save_path)
                print(f"Download from \"{self.url}\" has been canceled.")
            else:
                self._process = 100

        except Exception as e:
            print(traceback.format_exc())
            print(f"Download Error: {e}")
        finally:
            self._time_end = time.perf_counter()
            self.is_downloading = False
            self._cancelled = False

    def download(self, filename=None):
        if not self.is_downloading:
            self.is_downloading = True
            self._cancelled = False
            self._process = 0
            self._downloaded_bytes = 0  # 初始化
            self._time_start = time.perf_counter()
            self._time_end = self._time_start

            thread = threading.Thread(target=self._run_download, args=(filename,), daemon=True)
            thread.start()
            return True
        return False
