# -*- coding: UTF-8 -*-
from typing import Set
from app import app
from app.dataService.dataService import DataService
import json
import os
import numpy as np
from flask import send_file, request, jsonify, send_from_directory
from datetime import datetime
from os.path import dirname, abspath, join

# Alter: abspath('') is called from back/run.py
rootDir = dirname(abspath(''))
dataService = DataService()


def default(o):
    if isinstance(o, np.int_):
        return int(o)
    raise TypeError


@app.route('/')
def _index():
    return json.dumps("back end")


@app.route('/getMatrixData/<model>', methods=['GET'])
def _matrix_data_by_method(model):
    data = dataService.get_matrix_data(model)
    return json.dumps({'data': data})  # response can't be a list


@app.route("/getTokenData/<model>", methods=['GET'])
def _token_data_by_method(model):
    data = dataService.get_token_data(model)
    return data


@app.route('/getAttentionByToken/<model>', methods=['POST'])
def _get_attention_by_token(model):
    post_data = json.loads(request.data.decode())
    return dataService.get_attention_by_token(post_data, model)


if __name__ == '__main__':
    pass
