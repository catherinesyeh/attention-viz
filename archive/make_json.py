import pandas as pd
import json

# convert data into json format
# csv_file = "data_small.csv"
csv_file = "data.csv"

df = pd.read_csv(csv_file)
num_tokens = len(df)

# print(df.dtypes)

# save all shared data first
# shared_json = {"tokens": []}
# for i in range(num_tokens):
#     new_token = {}
#     new_token["value"] = df['token'][i]
#     new_token["type"] = df['type'][i]
#     new_token["pos_int"] = int(df['pos_int'][i])
#     new_token["length"] = int(df['length'][i])
#     new_token["position"] = df['position'][i]
#     new_token["sentence"] = df['sentence'][i]

#     shared_json["tokens"].append(new_token)
#     # break

# json_str = json.dumps(shared_json)
# with open("json/shared.json", "w") as f:
#     f.write(json_str)

# now generate file for each layer/head
for layer in range(12):
    for head in range(12):
        new_json = {}
        new_json["layer"] = layer
        new_json["head"] = head
        new_json["tokens"] = []

        for i in range(num_tokens):
            new_token = {}
            # new_token["tsne_x"] = df['tsne_x_{}_{}'.format(layer, head)][i]
            # new_token["tsne_y"] = df['tsne_y_{}_{}'.format(layer, head)][i]
            # new_token["umap_x"] = df['umap_x_{}_{}'.format(layer, head)][i]
            # new_token["umap_y"] = df['umap_y_{}_{}'.format(layer, head)][i]
            # new_token["norm"] = df['norm_{}_{}'.format(layer, head)][i]
            attn = df['attn_{}_{}'.format(layer, head)][i]
            attn = attn[1:-1].split(", ")
            new_token["attention"] = [float(i) for i in attn]  # add attn info

            new_json["tokens"].append(new_token)

        json_str = json.dumps(new_json)
        with open("json/layer{}_head{}.json".format(layer, head), "w") as f:
            f.write(json_str)

        # break
    # break
