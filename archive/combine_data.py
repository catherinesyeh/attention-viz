# combine all data into single file
# import os
import numpy as np
import pandas as pd
import time
import pickle

label_file = "labels0.tsv"
new_csv = "data.csv"
tsv_dir = "../tsv/"
coord_dir = "../coords/"

# get common columns to all attn heads/layers
# df = pd.read_csv(label_file, sep='\t')
# df1 = df.iloc[:5021, :5]
# df2 = df.iloc[30070:30070+5021, :5]
# df_cropped = pd.concat([df1, df2])

# df_cropped.to_csv(new_csv, index=False)


def save_numpickle(df, outfpath, all_numeric=False):
    arr, colnames, rownames = df.to_numpy(), df.columns, df.index
    np.save(arr=arr, file=outfpath)
    pickle.dump({'colnames': colnames,
                 'rownames': rownames,
                 'dtypes': None if all_numeric else df.dtypes},
                open(outfpath + ".pckl", "wb"))


def load_numpickle(fpath):
    df = pd.DataFrame(np.load(fpath, allow_pickle=True))
    with open(fpath + ".pckl", "rb") as fin:
        meta = pickle.load(fin)
    # if no 'types' present, assuming all_numeric
    df.index, df.columns, dtypes = \
        meta['rownames'], meta['colnames'], meta.get('dtypes', None)
    if dtypes is not None:
        df = df.astype(dtypes)
    return df


def extract_coords(coords):
    x = ""
    y = ""

    min_x = 0
    min_y = 0

    for i in range(2):
        # get x coords
        fx_start = coords.index('x = [', min_x) + 5
        fx_end = coords.index(']', fx_start)
        x += coords[fx_start:fx_end]
        min_x = fx_end

        # get y coords
        fy_start = coords.index('y = [', min_y) + 5
        fy_end = coords.index(']', fy_start)
        y += coords[fy_start:fy_end]
        min_y = fy_end

        if i == 0:
            # add extra comma
            x += ","
            y += ","

    # convert to float arrays
    x = x.split(",")
    y = y.split(",")
    x = [float(i) for i in x]
    y = [float(i) for i in y]
    return x, y


# load csv
# start = time.time()
df = pd.read_csv(new_csv)
# end = time.time()

# print("csv took {} seconds to run".format(end - start))

# # load npy/pckl
# start = time.time()
# df_new = load_numpickle("data.npy")
# end = time.time()

# print("npy/pckl took {} seconds to run".format(end - start))

# load pkl
# start = time.time()
# df_unpkl = pd.read_pickle("test.pkl")
# end = time.time()

# print("pkl took {} seconds to run".format(end - start))
# print(df_unpkl.head(10))
# print(df_unpkl.dtypes)

# test other pickle method
# pd.to_pickle(df, "data.pkl")

# df = pd.read_pickle("data.pkl")
columns = df.columns
# print(len(columns))


# len_col = df["sentence"].str.split().str.len() - 1
# df.insert(loc=3, column='length', value=len_col)
# print(df['length'][:100])

# df.drop("pos_int", inplace=True, axis=1)
# df.drop("sentence", inplace=True, axis=1)

# for col in columns:
#     #     if "attn" in col or "norm" in col or "dp" in col:
#     #         df.drop(col, inplace=True, axis=1)
#     print("col: {}, len: {}".format(col, len(df[col])))

# print(df.isna().any())

# print(len(df.columns))

# df.to_csv(new_csv, index=False)
# pd.to_pickle(df, "data_small.pkl")

# convert to npy pckl file
# save_numpickle(df, "data.npy")

# print(df.head(20))

# add columns for x/y coords, attn, dot prod, norms

# print(df['tsne_x_0_0'].tail(20))

for layer in range(12):
    for head in range(12):
        #         print("layer {}, head {}".format(layer, head))

        #         tsne_file = coord_dir + "layer{}_head{}_tsne.js".format(layer, head)
        #         umap_file = coord_dir + "layer{}_head{}_umap.js".format(layer, head)
        # info_file = tsv_dir + "layer{}/labels{}.tsv".format(layer, head)

        #         # extract coords
        #         with open(tsne_file, "r") as f:
        #             tsne_coords = f.read()
        #         tsne_x, tsne_y = extract_coords(tsne_coords)

        #         with open(umap_file, "r") as f:
        #             umap_coords = f.read()
        #         umap_x, umap_y = extract_coords(umap_coords)

        # reverse coords
        new_tx = df['tsne_x_{}_{}'.format(
            layer, head)][5021:].append(df['tsne_x_{}_{}'.format(layer, head)][:5021], ignore_index=True)
        new_ty = df['tsne_y_{}_{}'.format(
            layer, head)][5021:].append(df['tsne_y_{}_{}'.format(layer, head)][:5021], ignore_index=True)
        new_qx = df['umap_x_{}_{}'.format(
            layer, head)][5021:].append(df['umap_x_{}_{}'.format(layer, head)][:5021], ignore_index=True)
        new_qy = df['umap_y_{}_{}'.format(
            layer, head)][5021:].append(df['umap_y_{}_{}'.format(layer, head)][:5021], ignore_index=True)
        df['tsne_x_{}_{}'.format(layer, head)] = new_tx
        df['tsne_y_{}_{}'.format(layer, head)] = new_ty
        df['umap_x_{}_{}'.format(layer, head)] = new_qx
        df['umap_y_{}_{}'.format(layer, head)] = new_qy

#         # add other info
        # df_mini = pd.read_csv(info_file, sep='\t')
        # df1 = df_mini.iloc[:5021, 5:]
        # df2 = df_mini.iloc[30070:30070+5021, 5:]
        # df_merge = pd.concat([df1, df2])

        # df.drop(['attn_{}_{}'.format(layer, head), 'dp_{}_{}'.format(
        #     layer, head), 'norm_{}_{}'.format(layer, head)], axis=1)
        # df['attn_{}_{}'.format(layer, head)][5021:] = df2['attn']
        # df['dp_{}_{}'.format(layer, head)][5021:] = df2['dot_prod']
        # df['norm_{}_{}'.format(layer, head)][5021:] = df2['norm']

    #     break
    # break

# print(df.head(20))
# print(df.dtypes)
# print(df['tsne_x_0_0'].tail(20))
df.to_csv("new_data.csv", index=False)  # save updated file
