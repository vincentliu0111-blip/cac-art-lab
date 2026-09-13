def feature_ranges(features):
    ranges = {}
    names = sorted(next(iter(features.values())))
    for name in names:
        values = []
        for painting in features.values():
            values.append(painting[name])
        ranges[name] = max(values) - min(values)
    return ranges


def top_differences(a, b, ranges, limit=3):
    differences = []
    for name in sorted(a):
        delta = a[name] - b[name]
        if ranges[name] == 0:
            scaled_delta = 0.0
        else:
            scaled_delta = delta / ranges[name]
        differences.append({
            "name": name,
            "group": name.split("_")[0],
            "delta": delta,
            "scaled_delta": scaled_delta,
        })

    def difference_size(row):
        return abs(row["scaled_delta"])

    return sorted(differences, key=difference_size, reverse=True)[:limit]


def make_thumbnail(src, dst):
    from PIL import Image
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as image:
        image.thumbnail((400, 400), Image.Resampling.LANCZOS)
        image.convert("RGB").save(dst, "JPEG", quality=88)
