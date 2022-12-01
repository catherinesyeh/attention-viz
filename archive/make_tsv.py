# combine attention info into tsv file
import os
import pandas as pd
directory = "../tsv/"
new_dir = "../new_tsv/"

for folder in os.listdir(directory):
    if "layer" not in folder:  # skip unrelated files
        continue
    folder_path = os.path.join(directory, folder)
    print(folder_path)
    ls = folder.index("layer") + 5
    layer = folder[ls:]

    # create new df for each layer
    df = pd.DataFrame()
    for f in os.listdir(folder_path):
        file = os.path.join(folder_path, f)
        if os.path.isfile(file) and "labels" in file:
            print("\t", file)
            df_mini = pd.read_csv(file, sep='\t')

            hs = f.index("labels") + 6
            he = f.index(".")
            head = f[hs:he]
            df[head] = df_mini["attn"]  # add each head as a col

    # df.sort_index(axis=1, inplace=True)  # sort columns
    # print(df.head(20))

    # save output
    new_f = new_dir + "layer" + layer + ".tsv"
    df.to_csv(new_f, sep="\t")
    # break
