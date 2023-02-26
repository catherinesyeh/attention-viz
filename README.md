# attention-viz
Interactive TSNE plots of query + key vectors generated from BERT and GPT

Old version: [https://catherinesyeh.github.io/attention-viz/](https://catherinesyeh.github.io/attention-viz/)

## set up instructions
1. Clone repo and navigate into folder: 
```
git clone https://github.com/catherinesyeh/attention-viz.git
cd attention-viz
```

2. Ask Catherine for ```data``` folder. It should be included in the ```web``` folder like so:
<img width="415" alt="image" src="https://user-images.githubusercontent.com/43099514/219905589-17dc4aa1-1785-4d48-aabe-794f777b2dd9.png">

3. Navigate to back end:
```
cd web/back/
```

4. Create virtual env and activate:
```
python3 -m venv env
source env/bin/activate
```

5. Install requirements:
```
pip3 install -r requirements.txt
```

6. Start back end:
```
python3 run.py
```

7. Navigate to front end:
```
cd ../front
```

8. Install necessary packages and start front end:
```
npm i
npm run serve
```

9. The interface should be running at: [http://localhost:8561](http://localhost:8561)


