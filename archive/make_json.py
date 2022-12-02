import pandas as pd
import json

# convert data into json format
csv_file = "data_small.csv"

# json templates
token_temp = {
    "value": "",
    "type": "",
    "position": 0,
    "tsne_x": 0,
    "tsne_y": 0,
    "umap_x": 0,
    "umap_y": 0
}
json_temp = {
    "layer": 0,
    "head": 0,
    "tokens": []
}

df = pd.read_csv(csv_file)
num_tokens = len(df)

# save all shared data first
shared_json = {"tokens": []}
for i in range(num_tokens):
    new_token = {}
    new_token["value"] = df['token'][i]
    new_token["type"] = df['type'][i]
    new_token["position"] = df['position'][i]
    shared_json["tokens"].append(new_token)

json_str = json.dumps(shared_json)
with open("json/shared.json", "w") as f:
    f.write(json_str)

# now generate file for each layer/head
for layer in range(12):
    for head in range(12):
        new_json = {}
        new_json["layer"] = layer
        new_json["head"] = head
        new_json["tokens"] = []

        for i in range(num_tokens):
            new_token = {}
            new_token["tsne_x"] = df['tsne_x_{}_{}'.format(layer, head)][i]
            new_token["tsne_y"] = df['tsne_y_{}_{}'.format(layer, head)][i]
            new_token["umap_x"] = df['umap_x_{}_{}'.format(layer, head)][i]
            new_token["umap_y"] = df['umap_y_{}_{}'.format(layer, head)][i]

            new_json["tokens"].append(new_token)

        json_str = json.dumps(new_json)
        with open("json/layer{}_head{}.json".format(layer, head), "w") as f:
            f.write(json_str)

        # break
    # break
