<img src="https://github.com/catherinesyeh/attention-viz/blob/main/img/matrix.gif" width="33%" height="auto"><img src="https://github.com/catherinesyeh/attention-viz/blob/main/img/single.gif" width="33%" height="auto"><img src="https://github.com/catherinesyeh/attention-viz/blob/main/img/sent_img.gif" width="33%" height="auto">

# attention-viz
Visualizing query-key interactions in language + vision transformers

* Paper: [https://ieeexplore.ieee.org/document/10297591](https://ieeexplore.ieee.org/document/10297591)
* Demo: [http://attentionviz.com/](http://attentionviz.com/)
* Docs: [https://catherinesyeh.github.io/attn-docs/](https://catherinesyeh.github.io/attn-docs/)

## abstract
> Transformer models are revolutionizing machine learning, but their inner workings remain mysterious. In this work, we present a new visualization technique designed to help researchers understand the self-attention mechanism in transformers that allows these models to learn rich, contextual relationships between elements of a sequence. The main idea behind our method is to visualize a joint embedding of the query and key vectors used by transformer models to compute attention. Unlike previous attention visualization techniques, our approach enables the analysis of global patterns across multiple input sequences. We create an interactive visualization tool, AttentionViz, based on these joint query-key embeddings, and use it to study attention mechanisms in both language and vision transformers. We demonstrate the utility of our approach in improving model understanding and offering new insights about query-key interactions through several application scenarios and expert feedback.

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

## citation
If you find this work helpful, please consider citing our paper:
```
@article{yeh2023attentionviz,
  title={Attentionviz: A global view of transformer attention},
  author={Yeh, Catherine and Chen, Yida and Wu, Aoyu and Chen, Cynthia and Vi{\'e}gas, Fernanda and Wattenberg, Martin},
  journal={IEEE Transactions on Visualization and Computer Graphics},
  year={2023},
  publisher={IEEE}
}
```
Thank you for checking out AttentionViz!


