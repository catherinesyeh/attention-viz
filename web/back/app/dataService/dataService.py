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


class DataService(object):
    def __init__(self):
        print('------inited------')
        # self.df = pd.read_csv(join(rootDir, 'prodata', 'pro_data_results.csv')) .h5 .npy
        # read data here
        f = open(join(rootDir, 'data', 'layer0_head0.json'))
        self.data = json.load(f)
        return None

    def get_raw_data(self):
        # return data to the front end
        return self.data


if __name__ == '__main__':
    print('start dataservice')
    dataService = DataService()
