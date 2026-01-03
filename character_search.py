import pandas as pd
import os
import server

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

def match_score(element: str, sub_str: list[str]):
    target = sub_str[-1]
    sub_str = sub_str[0:len(sub_str) - 1]
    placeholder = "\x01"
    if target == element:
        return 100
    if target in element:
        return 90 + (len(element) - element.find(target)) / len(element) * 5
    if len(element) == 0:
        return 0
    score = 0

    sum_sub_len = 0
    element_len = len(element)
    target_len = len(target)
    can_score = False
    for string in sub_str[::-1]:
        if string in element:
            sum_sub_len += len(string)
            target = target.replace(string, placeholder)
            if len(string) >= 5:
                can_score = True
                score = score + element.count(string) / (element_len / len(string)) * 10
            element = element.replace(string, placeholder)
    if can_score:
        target = target.replace(placeholder, "")
        len_reduce = (target_len - len(target)) / target_len
        if len_reduce > 0.5:
            score += 50 * len_reduce
        else:
            score -= 50 * len_reduce
        proportion = sum_sub_len / element_len
        if proportion > 0.4:
            score += sum_sub_len / element_len * 40
        else:
            score -= sum_sub_len / element_len * 40
    return min(100, score)


def search_character(file_path, query, request_id):
    cancel_flags[request_id] = False
    if not os.path.exists(file_path):
        return {"error": "Search source does not exist"}

    try:
        df = get_dataframe(file_path)
        total_rows = len(df)
        required_columns = ['character', 'trigger', 'core_tags']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return {"error": f"Invalid search source, missing columns: {missing_columns}"}
        df = df.astype(str).replace('nan', '')
        query = str(query).lower().strip()
        if not query:
            return []

        results_with_score = []
        sub_str = []
        for i in range(2, len(query) + 1):
            for j in range(0, len(query) - i + 1):
                if not (query[j:j + i] in sub_str):
                    sub_str.append(query[j:j + i])

        last_progress = -1
        for index, row in df.iterrows():
            current_progress = int((index / total_rows) * 100)
            if current_progress != last_progress:
                server.PromptServer.instance.send_sync("minitools_progress", {"value": current_progress})
                last_progress = current_progress

            row_dict = row.to_dict()
            max_row_score = 0
            match_found = False
            for column, value in row_dict.items():
                if cancel_flags.get(request_id):
                    print("[MiniTools]Search progress " + request_id + " canceled")
                    return {"canceled": True}
                val_lower = value.lower()
                score = match_score(val_lower, sub_str)
                if score > 60:
                    match_found = True
                    max_row_score = max(max_row_score, score)
            if match_found:
                results_with_score.append({
                    "data": row_dict,
                    "score": max_row_score
                })
        max_count = max([int(i["data"]["count"]) + int(i["data"]["solo_count"]) for i in results_with_score])
        for result_element in results_with_score:
            result_element["score"] = min(100, result_element["score"] + (int(result_element["data"]["count"]) + int(result_element["data"]["solo_count"])) / max_count * 15)
        cancel_flags.pop(request_id, None)
        sorted_results = sorted(results_with_score, key=lambda x: x['score'], reverse=True)
        return [item['data'] for item in sorted_results]

    except Exception as e:
        return {"error": f"Search error: {str(e)}"}
