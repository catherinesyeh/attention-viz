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

# get the /TableCharts
# Alter: abspath('') is called from back/run.py
rootDir = dirname(abspath(''))
print(rootDir)


def read_matrix_data(model):
    matrix_data = []
    time_start = time.time()

    for f in sorted(glob(join(rootDir, 'data', model, 'byLayerHead', '*.json'))):
        d = json.load(open(f, 'r'))
        matrix_data.append(d)

    print('{} MatrixData Done! Time elapsed: {} seconds'.format(
        model, time.time()-time_start))
    return matrix_data


def read_attention_data(model):
    time_start = time.time()
    attention_data = []

    for f in sorted(glob(join(rootDir, 'data', model, 'attention', '*.json'))):
        d = json.load(open(f, 'r'))
        attention_data.append(d)

    print('{} AttentionData Done! Time elapsed: {} seconds'.format(model,
                                                                   time.time()-time_start))
    return attention_data


def read_token_data(model):
    time_start = time.time()
    d = json.load(open(join(rootDir, 'data', model, 'tokens.json')))
    print('{} TokenData Done! Time elapsed: {} seconds'.format(
        model, time.time()-time_start))
    return d


class DataService(object):
    def __init__(self):
        print('------inited------')
        # self.df = pd.read_csv(join(rootDir, 'prodata', 'pro_data_results.csv')) .h5 .npy
        # read data here

        # bert
        self.matrix_data_bert = read_matrix_data("bert")
        self.attention_data_bert = read_attention_data("bert")
        self.token_data_bert = read_token_data("bert")

        # gpt
        self.matrix_data_gpt = read_matrix_data("gpt")
        self.attention_data_gpt = read_attention_data("gpt")
        self.token_data_gpt = read_token_data("gpt")

        # VIT-32
        self.matrix_data_vit_32 = read_matrix_data("vit_32")
        self.token_data_vit_32 = read_token_data("vit_32")

        # VIT-16
        self.matrix_data_vit_16 = read_matrix_data("vit_16")
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
            # print(self.token_data_vit_16)
            return self.token_data_vit_16
        elif model == "vit-32":
            # print(self.token_data_vit_32)
            return self.token_data_vit_32
        return self.token_data_gpt

    def get_attention_by_token(self, token, model):
        layer = token['layer']
        head = token['head']
        index = token['index']

        if model == "bert":
            all_token_info = self.token_data_bert['tokens'][index]
        else:
            all_token_info = self.token_data_gpt['tokens'][index]
        start = index - all_token_info['pos_int']
        end = start + all_token_info['length']

        if model == "bert":
            attn_data = self.attention_data_bert
        else:
            attn_data = self.attention_data_gpt

        for plot in attn_data:
            if plot['layer'] == layer and plot['head'] == head:
                attns = plot['tokens'][start:end]
                break

        attn = [t['attention'] for t in attns]
        norms = [] if model != "gpt" else [t['value_norm'] for t in attns]
        # norms = []

        return {
            'layer': layer,
            'head': head,
            'attns': attn,
            'norms': norms,
            'token': all_token_info
        }


if __name__ == '__main__':
    print('start dataservice')
    dataService = DataService()
