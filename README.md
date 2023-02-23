# attention-viz
Interactive TSNE plots of query + key vectors generated from BERT and GPT

Old version: [https://catherinesyeh.github.io/attention-viz/](https://catherinesyeh.github.io/attention-viz/)

## set up instructions
1. Clone repo: 
```
git clone https://github.com/catherinesyeh/attention-viz.git
```

2. Ask Catherine for ```data``` folder. It should be included in the ```web``` folder like so:
<img width="415" alt="image" src="https://user-images.githubusercontent.com/43099514/219905589-17dc4aa1-1785-4d48-aabe-794f777b2dd9.png">

3. Navigate to back end:
```
cd web/back/
```

4. Install [Flask-CORS](https://flask-cors.readthedocs.io/en/latest/) if you don't have it already:
```
pip install -U flask-cors
```

5. Start back end:
```
python3 run.py
```

6. Navigate to front end:
```
cd ../front
```

7. Install necessary packages and start front end:
```
npm i
npm run serve
```

7. The interface should be running at: [http://localhost:8561](http://localhost:8561)


