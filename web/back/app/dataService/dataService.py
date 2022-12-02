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

# get the /TableCharts
# Alter: abspath('') is called from back/run.py
rootDir = dirname(abspath(''))
print(rootDir)

def read_matrix_data():
    matrix_data = []

    for f in sorted(glob(join(rootDir, 'data', 'byLayerHead', '*.json'))):
        d = json.load(open(f, 'r'))
        matrix_data.append(d)
    
    return matrix_data

def read_token_data():
    d = json.load(open(join(rootDir, 'data', 'tokens.json')))
    return d

class DataService(object):
    def __init__(self):
        print('------inited------')
        # self.df = pd.read_csv(join(rootDir, 'prodata', 'pro_data_results.csv')) .h5 .npy
        # read data here
        self.matrix_data = read_matrix_data()
        self.token_data = read_token_data()

        return None

    def get_raw_data(self):
        # return data to the front end
        return self.data

    def get_matrix_data(self):
        return self.matrix_data

    def get_token_data(self):
        return self.token_data


if __name__ == '__main__':
    print('start dataservice')
    dataService = DataService()
