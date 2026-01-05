import pandas as pd
import os
import server
import re
import traceback
from .matcher import Matcher

CSV_CACHE = {}
cancel_flags = {}

def get_dataframe(file_path):
    if file_path not in CSV_CACHE:
        encodings = ['utf-8', 'gbk', 'gb18030', 'utf-8-sig']
        for enc in encodings:
            try:
                CSV_CACHE[file_path] = pd.read_csv(file_path, encoding=enc)
                break
            except (UnicodeDecodeError, Exception):
                continue
    return CSV_CACHE[file_path]

def search_character(file_path, query, request_id):
    matcher = Matcher(query)
    cancel_flags[request_id] = False
    if not os.path.exists(file_path):
        return {"error": "Search source does not exist"}

    try:
        df = get_dataframe(file_path)
        search_cols = ['character', 'trigger', 'core_tags', 'copyright']
        for col in search_cols:
            if col in df.columns:
                df[col] = df[col].fillna("").astype(str)

        total_rows = len(df)
        required_columns = ['character', 'trigger', 'core_tags']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return {"error": f"Invalid search source, missing columns: {missing_columns}"}
        df = df.astype(str).replace('nan', '')
        query = re.sub(r'\s+', ' ', query).strip()
        if not query:
            return []

        all_records = df.to_dict('records')
        results_with_score = []

        last_progress = -1
        for index, row in enumerate(all_records):
            current_progress = int((index / total_rows) * 90)
            if current_progress != last_progress:
                server.PromptServer.instance.send_sync("minitools_progress", {"value": current_progress})
                last_progress = current_progress

            max_row_score = 0
            for col in search_cols:
                value = row.get(col, "")
                if not value: continue
                if cancel_flags.get(request_id):
                    print("[MiniTools]Search progress " + request_id + " canceled")
                    return {"canceled": True}
                val_lower = value.lower().strip()
                rapid_match = matcher.rapid_match(val_lower)
                if max_row_score < rapid_match:
                    max_row_score = rapid_match
            results_with_score.append({
                "data": row,
                "score": max_row_score
            })

        results_with_score = sorted(results_with_score, key=lambda x: x["score"], reverse=True)[:5000]
        total_top_k = len(results_with_score)
        for idx, item in enumerate(results_with_score):
            current_progress = 90 + int((idx / total_top_k) * 9)
            if current_progress != last_progress:
                server.PromptServer.instance.send_sync("minitools_progress", {"value": current_progress})
                last_progress = current_progress
            if cancel_flags.get(request_id):
                print("[MiniTools]Search progress " + request_id + " canceled")
                return {"canceled": True}
            best_match = {"score": 0, "match_count": 0, "first_match": 0}
            row_dict = item["data"]
            for col in search_cols:
                val = row_dict.get(col, "").lower().strip()
                if not val: continue
                detail = matcher.match_info(val)
                if best_match["score"] < detail["score"]:
                    best_match = detail
            item.update(best_match)

        max_score = max([i["score"] for i in results_with_score])
        score_threshold = max_score * 0.5
        valid_results = [i for i in results_with_score if i["score"] >= score_threshold]
        cancel_flags.pop(request_id, None)
        sorted_results = sorted(
            valid_results,
            key=lambda x: (
                x["score"],
                int(x["data"]["count"]) + int(x["data"]["solo_count"]),
                x["match_count"] + x["first_match"]
            ),
            reverse=True
        )
        server.PromptServer.instance.send_sync("minitools_progress", {"value": 100})
        return [item['data'] for item in sorted_results[:1000]]

    except Exception as e:
        traceback.print_exc()
        return {"error": f"Search error: {str(e)}"}
