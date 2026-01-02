import pandas as pd
import os

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


def search_character(file_path, query):
    if not os.path.exists(file_path):
        return {"error": "搜索源不存在"}

    try:
        encodings = ['utf-8', 'gbk', 'gb18030', 'utf-8-sig']
        for enc in encodings:
            try:
                df = pd.read_csv(file_path, encoding=enc)
                break
            except (UnicodeDecodeError, Exception):
                continue
        required_columns = ['character', 'trigger', 'core_tags']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return {"error": f"搜索源格式不规范, 缺失列: {missing_columns}"}
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

        for _, row in df.iterrows():
            row_dict = row.to_dict()
            max_row_score = 0
            match_found = False
            for column, value in row_dict.items():
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

        sorted_results = sorted(results_with_score, key=lambda x: x['score'], reverse=True)
        return [item['data'] for item in sorted_results]

    except Exception as e:
        return {"error": f"搜索出错: {str(e)}"}
