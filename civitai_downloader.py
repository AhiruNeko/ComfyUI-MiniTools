import re
import requests
from downloader import Downloader


class CivitaiDownloader(Downloader):
    def __init__(self, url, path_or_dir="", api_key=None):
        super().__init__(url, path_or_dir)
        self.api_key = api_key
        self.api_headers = self.headers.copy()
        if self.api_key:
            self.api_headers["Authorization"] = f"Bearer {self.api_key}"

    @property
    def info(self):
        auth_headers = self.headers.copy()
        if hasattr(self, 'api_key') and self.api_key:
            auth_headers["Authorization"] = f"Bearer {self.api_key}"
        base_info = {}
        try:
            with requests.get(self.url, headers=auth_headers, allow_redirects=False, timeout=10) as r:
                if r.status_code in [301, 302, 307, 308]:
                    real_signed_url = r.headers.get('Location')
                    with requests.get(real_signed_url, stream=True, timeout=15) as r_final:
                        base_info = self._build_info_dict(r_final)
                else:
                    base_info = self._build_info_dict(r)
        except Exception as e:
            return {"error": str(e)}
        version_id_match = re.search(r'(?:models/|modelVersionId=)(\d+)', self.url)
        if version_id_match:
            version_id = version_id_match.group(1)
            api_url = f"https://civitai.com/api/v1/model-versions/{version_id}"
            try:
                api_resp = requests.get(api_url, headers=self.api_headers, timeout=10)
                if api_resp.status_code == 200:
                    data = api_resp.json()
                    model_data = data.get("model", {})
                    base_info["model_info"] = {
                        "name": model_data.get("name", ""),
                        "version": data.get("name", ""),
                        "type": model_data.get("type", ""),
                        "base_model": data.get("baseModel", "")
                    }
            except Exception as e:
                base_info["civitai_api_error"] = str(e)

        return base_info

    def _run_download(self, filename=None):
        super()._run_download(filename)
