# convert tsv to js
import os
import pandas as pd
dir = "../tsv/"
new_dir = "../attention/"

for file in os.listdir(dir):
    if "layer" not in file:  # skip unrelated files
        continue
    f = os.path.join(dir, file)

    df = pd.read_csv(f, sep="\t")
    #attn = "var attention = {"
    for c in df.columns:
        if "Unnamed" in c:
            continue
        attn = "var attention = ["
        for v in df[c].values:
            attn += str(v) + ","
        attn = attn[:-1] + "];"
        with open(new_dir + file[:-4] + "_head" + c + ".js", "w") as o:
            o.write(attn)
        # break
    #attn = attn[:-1] + "};"

    # break
