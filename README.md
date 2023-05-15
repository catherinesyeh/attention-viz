<img src="https://github.com/catherinesyeh/attention-viz/blob/main/img/matrix.gif" width="33%" height="auto"><img src="https://github.com/catherinesyeh/attention-viz/blob/main/img/single.gif" width="33%" height="auto"><img src="https://github.com/catherinesyeh/attention-viz/blob/main/img/sent_img.gif" width="33%" height="auto">

# attention-viz
Visualizing query-key interactions in language + vision transformers

* Preprint: [https://arxiv.org/abs/2305.03210](https://arxiv.org/abs/2305.03210)
* Demo: [http://attentionviz.com/](http://attentionviz.com/)
* Docs: [https://catherinesyeh.github.io/attn-docs/](https://catherinesyeh.github.io/attn-docs/)

## set up instructions
1. Clone repo and navigate into folder: 
```
git clone https://github.com/catherinesyeh/attention-viz.git
cd attention-viz
```

2. Download ```data``` folder [here](https://drive.google.com/file/d/11JEtmZNH9gl9K_994BLADSmV4-imslnY/view?usp=share_link) and unzip. It should be included in the ```web``` folder like so:
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


