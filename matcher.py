from rapidfuzz import fuzz

class Matcher:
    def __init__(self, target: str):
        self.target = target.lower()
        self.target_len = len(self.target)
        self.tg_codes = [ord(c) for c in self.target]
        self.tg_map = {}
        for i, code in enumerate(self.tg_codes):
            if code not in self.tg_map:
                self.tg_map[code] = []
            self.tg_map[code].append(i)
        self.match_threshold = 1
        self.consecutive_threshold = 1

    def rapid_match(self, element):
        return fuzz.partial_ratio(self.target, element)

    def match_info(self, element: str):
        if not element:
            return None

        el_origin_len = len(element)
        el_codes = [ord(c) for c in element.lower()]

        if el_origin_len > self.target_len:
            min_len = self.target_len
        else:
            min_len = el_origin_len
        self.match_threshold = min(10, max(1, int(min_len * 0.3)))
        self.consecutive_threshold = 2 if min_len > 2 else 1

        score = 0.0
        match_total_count = 0
        first_match_idx = el_origin_len
        calculated_pts = set()

        for i, char_code in enumerate(el_codes):
            if char_code in self.tg_map:
                for target_pos in self.tg_map[char_code]:
                    pt = i - target_pos
                    if pt in calculated_pts:
                        continue
                    num = 0
                    consecutive = 0
                    max_consecutive = 0
                    current_first_match = el_origin_len
                    for j in range(self.target_len):
                        el_idx = pt + j
                        if 0 <= el_idx < el_origin_len:
                            if el_codes[el_idx] == self.tg_codes[j]:
                                num += 1
                                consecutive += 1
                                if el_idx < current_first_match:
                                    current_first_match = el_idx
                                if consecutive > max_consecutive:
                                    max_consecutive = consecutive
                            else:
                                consecutive = 0
                        else:
                            consecutive = 0
                    if consecutive > max_consecutive:
                        max_consecutive = consecutive
                    if num >= self.match_threshold and max_consecutive >= self.consecutive_threshold:
                        match_total_count += 1
                        if current_first_match < first_match_idx:
                            first_match_idx = current_first_match
                        cur_score = (num * 80 + max_consecutive * 20) / self.target_len
                        if cur_score > score:
                            score = cur_score
                    calculated_pts.add(pt)
        return {
            "score": score,
            "match_count": match_total_count / (el_origin_len - self.match_threshold + self.target_len - self.consecutive_threshold + 1) * 100,
            "first_match": (1 - first_match_idx / el_origin_len) * 100 if el_origin_len > 0 else 0
        }

