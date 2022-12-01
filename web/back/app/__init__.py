# -*- coding: UTF-8 -*-
from flask import Flask
from flask_cors import CORS
app = Flask(__name__)
app.config['DEBUG'] = True
app.config['TEMPLATES_AUTO_RELOAD'] = True
# app.config['RESTFUL_JSON'] = {
#     'ensure_ascii': False
# }
app.config['JSON_AS_ASCII'] = False

# flask_cors: Cross Origin Resource Sharing (CORS), making cross-origin AJAX possible.
CORS(app)

from app.routes import index