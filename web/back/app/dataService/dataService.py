# -*- coding: utf-8 -*-
from collections import OrderedDict
import os
import datetime
import math
import numpy as np
import pandas as pd
import re
import sys
import json
import itertools
from typing import List
from os.path import dirname, abspath, join, relpath
import copy
import io
from PIL import Image
from base64 import encodebytes
from glob import glob
from flask import jsonify
import zipfile
import json
import time
import base64
import io
import copy

# get the /TableCharts
# Alter: abspath('') is called from back/run.py
rootDir = dirname(abspath(''))
print(rootDir)

# data unique to each layer/head (e.g., tsne/umap coordinates + norms)


def read_matrix_data(model):
    matrix_data = []
    time_start = time.time()

    for f in sorted(glob(join(rootDir, 'data', model, 'byLayerHead', '*.json'))):
        d = json.load(open(f, 'r'))
        matrix_data.append(d)

    print('{} MatrixData Done! Time elapsed: {} seconds'.format(
        model, time.time()-time_start))
    return matrix_data

# attention info for each layer/head


def read_attention_data(model):
    time_start = time.time()
    attention_data = []

    for f in sorted(glob(join(rootDir, 'data', model, 'attention', '*.json'))):
        d = json.load(open(f, 'r'))
        attention_data.append(d)

    print('{} AttentionData Done! Time elapsed: {} seconds'.format(model,
                                                                   time.time()-time_start))
    return attention_data

# data shared across attention heads (e.g., token value, type, sentence)


def read_token_data(model):
    time_start = time.time()
    d = json.load(open(join(rootDir, 'data', model, 'tokens.json')))
    print('{} TokenData Done! Time elapsed: {} seconds'.format(
        model, time.time()-time_start))
    return d

# aggregate attention info for each head


def read_agg_attn_data(model):
    time_start = time.time()
    d = json.load(open(join(rootDir, 'data', model, 'agg_attn.json')))
    print('{} AggAttnData Done! Time elapsed: {} seconds'.format(
        model, time.time()-time_start))
    return d

# helper function for normalizing aggregate attn data


def normalize_attn(data):
    normalized_data = []
    for row in data:
        row_sum = sum(row)
        normalized_row = [0 if r == 0 else round(
            (r / row_sum), 3) for r in row]
        normalized_data.append(normalized_row)
    return normalized_data


def read_image_from_dataurl64(dataurl):
    image_bytes = base64.b64decode(str(dataurl[dataurl.find(",") + 1:]))
    image = np.asarray(Image.open(io.BytesIO(image_bytes)))

    return image


def highlight_a_patch(image, row, col, patch_size, width=3, c=[255, 230, 10]):
    c = copy.copy(c)
    if image.shape[-1] == 4:
        c.append(255)
    image[row * patch_size: (row + 1) * patch_size,
          col * patch_size: col * patch_size + width] = c
    image[row * patch_size: (row + 1) * patch_size, (col + 1)
          * patch_size - width: (col + 1) * patch_size] = c
    image[row * patch_size: row * patch_size + width,
          col * patch_size: (col + 1) * patch_size] = c
    image[(row + 1) * patch_size - width: (row + 1) * patch_size,
          col * patch_size: (col + 1) * patch_size] = c

    return image


def highlight_patches(image, patch_size):
    image_copy = image.copy()

    for i in range(0, image.shape[0], patch_size):
        if i == 0:
            continue
        for j in range(0, image.shape[1], patch_size):
            if j == 0:
                continue
            image_copy[i - 1:i + 1, :] = 255
            image_copy[:, j - 1: j + 1] = 255

    return image_copy


def convert_np_image_to_dataurl64(np_image, compression_scheme="png"):
    if np_image.max() < 1 and np_image.dtype != np.uint8:
        np_image *= 255

    image = Image.fromarray(np_image.astype("uint8"))
    rawBytes = io.BytesIO()
    image.save(rawBytes, "PNG")
    rawBytes.seek(0)  # return to the start of the file
    serialized = base64.b64encode(rawBytes.read())
    dataurl = f'data:image/{compression_scheme};base64,{str(serialized)[2:-1]}'

    return dataurl


def overlay_image_with_attention(image, attention, patch_size, norm_attention=True):
    image_h = image.shape[0]
    image_w = image.shape[1]
    attention = copy.copy(attention)
    # add cls attention
    if norm_attention:
        attention.append(1 - sum(attention))
        attention = np.array(attention)
        if norm_attention:
            attention -= attention.min()
            attention /= attention.max()
        # attention *= 6
        attention = np.clip(attention, 0, 1)
        attention = attention[:-1]
    else:
        attention = np.array(attention)

    attention = attention.reshape(image_h // patch_size, image_w // patch_size)

    image = image.astype("float")
    for i in range(0, image_h, patch_size):
        for j in range(0, image_w, patch_size):
            if image.shape[-1] == 4:
                image[i: i + patch_size, j: j+patch_size, :-
                      1] *= attention[i // patch_size, j // patch_size]
            elif image.shape[-1] == 3:
                image[i: i + patch_size, j: j +
                      patch_size] *= attention[i // patch_size, j // patch_size]

    image = image.astype("uint8")

    return image


class DataService(object):
    def __init__(self):
        print('------inited------')
        # self.df = pd.read_csv(join(rootDir, 'prodata', 'pro_data_results.csv')) .h5 .npy
        # read data here

        # self.all_data = {}
        # for model in os.listdir(join(rootDir, 'data')):
        #     if model.startswith("."):
        #         continue
        #     self.all_data[model] = {}
        #     self.all_data[model]["matrix"] = read_matrix_data(model)
        #     self.all_data[model]["attention"] = read_attention_data(model)
        #     self.all_data[model]["token"] = read_token_data(model)

        # bert
        self.matrix_data_bert = read_matrix_data("bert")
        self.attention_data_bert = read_attention_data("bert")
        self.agg_att_data_bert = read_agg_attn_data("bert")
        self.token_data_bert = read_token_data("bert")

        # gpt
        self.matrix_data_gpt = read_matrix_data("gpt")
        self.attention_data_gpt = read_attention_data("gpt")
        self.agg_att_data_gpt = read_agg_attn_data("gpt")
        self.token_data_gpt = read_token_data("gpt")

        # VIT-32
        self.matrix_data_vit_32 = read_matrix_data("vit_32")
        self.attention_data_vit_32 = read_attention_data("vit_32")
        self.token_data_vit_32 = read_token_data("vit_32")

        # VIT-16
        self.matrix_data_vit_16 = read_matrix_data("vit_16")
        self.attention_data_vit_16 = read_attention_data("vit_16")
        self.token_data_vit_16 = read_token_data("vit_16")

        return None

    # def get_raw_data(self):
    #     # return data to the front end
    #     return self.data

    def get_matrix_data(self, model):
        if model == "bert":
            return self.matrix_data_bert
        elif model == "vit-16":
            return self.matrix_data_vit_16
        elif model == "vit-32":
            return self.matrix_data_vit_32
        return self.matrix_data_gpt

    # def get_attention_data(self, model):
    #     if model == "bert":
    #         return self.attention_data_bert
    #     return self.attention_data_gpt

    def get_token_data(self, model):
        if model == "bert":
            return self.token_data_bert
        elif model == "vit-16":
            return self.token_data_vit_16
        elif model == "vit-32":
            return self.token_data_vit_32
        return self.token_data_gpt

    def get_attention_by_token(self, token, model):
        print(model)
        layer = token['layer']
        head = token['head']
        index = token['index']

        # get info for the clicked on token
        if model == "bert":
            all_token_info = self.token_data_bert['tokens'][index]
            offset = len(self.token_data_bert['tokens']) / 2
        elif model == "vit-32":
            print(index)
            print(len(self.token_data_vit_32['tokens']))
            all_token_info = self.token_data_vit_32['tokens'][index]
        elif model == "vit-16":
            all_token_info = self.token_data_vit_16['tokens'][index]
        else:
            all_token_info = self.token_data_gpt['tokens'][index]
            offset = len(self.token_data_gpt['tokens']) / 2

        if model == "vit-32":
            start = index - \
                (all_token_info['position'] * 7 + all_token_info['pos_int'])
            end = start + 49
            image = read_image_from_dataurl64(
                self.token_data_vit_32['tokens'][start]['originalImagePath']).copy()
            if self.token_data_vit_32['tokens'][index]['type'] == "key":
                color = [227, 55, 143]
                start -= 49
                end -= 49
            else:
                color = [71, 222, 93]
            highlighted_image = highlight_a_patch(image, all_token_info['position'], all_token_info['pos_int'],
                                                  32, width=2, c=color)

            all_token_info['originalImagePath'] = convert_np_image_to_dataurl64(
                highlighted_image)
        elif model == "vit-16":
            start = index - \
                (all_token_info['position'] * 14 + all_token_info['pos_int'])
            end = start + 196
            image = read_image_from_dataurl64(
                self.token_data_vit_16['tokens'][start]['originalImagePath']).copy()
            if self.token_data_vit_16['tokens'][index]['type'] == "key":
                color = [227, 55, 143]
                start -= 196
                end -= 196
            else:
                color = [71, 222, 93]
            highlighted_image = highlight_a_patch(image, all_token_info['position'], all_token_info['pos_int'],
                                                  16, width=2, c=color)

            all_token_info['originalImagePath'] = convert_np_image_to_dataurl64(
                highlighted_image)
        else:
            # find start/end position for sentence
            start = index - all_token_info['pos_int']
            if all_token_info['type'] == "key":  # pass same attn info for key
                start -= int(offset)
            num_tokens = all_token_info['length']
            end = start + num_tokens

        # now get attn info
        if model == "bert":
            attn_data = self.attention_data_bert
            agg_attns = self.agg_att_data_bert['{}_{}'.format(
                layer, head)][:num_tokens]
        elif model == "vit-32":
            attn_data = self.attention_data_vit_32
        elif model == "vit-16":
            attn_data = self.attention_data_vit_16
        else:
            attn_data = self.attention_data_gpt
            agg_attns = self.agg_att_data_gpt['{}_{}'.format(
                layer, head)][:num_tokens]

        for plot in attn_data:
            if plot['layer'] == layer and plot['head'] == head:
                attns = plot['tokens'][start:end]
                break

        attn = [t['attention'] for t in attns]
        agg_attn = [] if model not in ["bert", "gpt"] else normalize_attn([t['attention'][:num_tokens]
                                                                           for t in agg_attns])
        norms = [] if model != "gpt" else [t['value_norm'] for t in attns]
        agg_norms = [] if model != "gpt" else [t['value_norm'] for t in agg_attns]

        if model == "vit-32":
            # overlaid_image = overlay_image_with_attention(image.copy(), attn[index % 49], 32,
            #                                               norm_attention=True if self.token_data_vit_32['tokens'][index]['type'] == "query" else False)
            overlaid_image = overlay_image_with_attention(
                image.copy(), attn[index % 49], 32)
            overlaid_image = highlight_patches(overlaid_image, 32)
            if self.token_data_vit_32['tokens'][index]['type'] == "key":
                color = [227, 55, 143]
            else:
                color = [71, 222, 93]
            overlaid_image = highlight_a_patch(overlaid_image, all_token_info['position'], all_token_info['pos_int'],
                                               32, width=3, c=color)
            all_token_info['originalPatchPath'] = convert_np_image_to_dataurl64(
                overlaid_image)
        elif model == "vit-16":
            overlaid_image = overlay_image_with_attention(
                image.copy(), attn[index % 196], 16)
            overlaid_image = highlight_patches(overlaid_image, 16)
            if self.token_data_vit_16['tokens'][index]['type'] == "key":
                color = [227, 55, 143]
            else:
                color = [71, 222, 93]
            overlaid_image = highlight_a_patch(overlaid_image, all_token_info['position'], all_token_info['pos_int'],
                                               16, width=2, c=color)
            all_token_info['originalPatchPath'] = convert_np_image_to_dataurl64(
                overlaid_image)

        return {
            'layer': layer,
            'head': head,
            'attns': attn,
            'agg_attns': agg_attn,
            'norms': norms,
            'agg_norms': agg_norms,
            'token': all_token_info
        }


if __name__ == '__main__':
    print('start dataservice')
    dataService = DataService()
