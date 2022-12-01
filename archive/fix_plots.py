# fix plot html files
import os
import shutil
import re
import pandas as pd

directory = "../plots/"
# directory = "../extract/"
# directory = "../umap/"

for filename in os.listdir(directory):
    file = os.path.join(directory, filename)
    if os.path.isfile(file) and file.endswith("html"):
        print(file)

        new_f = file[:-4] + "txt"
        shutil.copyfile(file, new_f)  # convert to txt file to read

        with open(new_f, 'r') as t:
            contents = t.read()

            # layer number
            # attention_file = "../attention/" + filename[:-4] + "js"
            # with open(attention_file, "r") as a:
            #     attention = a.read()

            # # fix attention info
            # start_ind = contents.index("var attention")
            # end_ind = contents.index("</script>", start_ind)
            # contents = contents[:start_ind] + \
            #     attention + \
            #     contents[end_ind:]

            # start_ind = contents.index("</head>")
            # contents = contents[:start_ind] + \
            #     '<link rel="stylesheet" type="text/css" href="graph.css" />' + \
            #     contents[start_ind:]

            # df = pd.read_csv("../extract/test.tsv", sep='\t')
            # attention = df['attn']
            # attn = "var attention = ["
            # for v in attention.values:
            #     attn += str(v) + ","
            # attn = attn[:-1] + "];"
            # print(attn[:30])
            # print(attn[-30:])

            # start_ind = contents.index("</body>")
            # contents = contents[:start_ind] + \
            #     '<script src="graph.js" type="text/javascript"></script>' + \
            #     '<script type="text/javascript">' + attn + '</script>' + \
            #     contents[start_ind:]

            # ls = filename.index("layer") + 5
            # le = filename.index("_")
            # layer = filename[ls:le]

            # hs = filename.index("head") + 4
            # he = filename.index(".")
            # head = filename[hs:he]

            # tsne_coords_file = "../coords/" + filename[:-5] + "_tsne.js"
            # umap_coords_file = "../coords/" + filename[:-5] + "_umap.js"
            tsne_coords_file = "../coords/layer9_head8_tsne.js"
            with open(tsne_coords_file, "r") as a:
                coords = a.read()

            # with open(umap_coords_file, "r") as b:
            #     umap_coords = b.read()

            # attach coords info
            # find indices to replace x and y coords
            tx_start = contents.index('"x":[') + 5
            tx_end = contents.index("]", tx_start)

            ty_start = contents.index('"y":[') + 5
            ty_end = contents.index("]", ty_start)

            # fix TSNE
            min_x = 0
            min_y = 0
            for i in range(2):
                # x-coords
                fx_start = coords.index('x = [', min_x) + 5
                fx_end = coords.index(']', fx_start)
                x = coords[fx_start:fx_end]
                min_x = fx_end

                tx_s = tx_start
                tx_e = tx_end

                if i == 1:  # find second round of indices
                    tx_s = contents.index('"x":[', tx_e) + 5
                    tx_e = contents.index("]", tx_s)

                # y-coords
                fy_start = coords.index('y = [', min_y) + 5
                fy_end = coords.index(']', fy_start)
                y = coords[fy_start:fy_end]
                min_y = fy_end

                ty_s = ty_start
                ty_e = ty_end

                if i == 1:  # find second round of indices
                    ty_s = contents.index('"y":[', ty_e) + 5
                    ty_e = contents.index("]", ty_s)

                contents = contents[:tx_s] + x + \
                    contents[tx_e:ty_s] + y + contents[ty_e:]

            # replace UMAP coords
            # start_ind = contents.index("</body>")
            # start_ind = contents.index("var key_x")
            # end_ind = contents.index("</script>", start_ind)
            # contents = contents[:start_ind] + umap_coords + contents[end_ind:]
            # contents = contents[:start_ind] + \
            #     '<script>' + coords + '</script>' + \
            #     contents[start_ind:]

            # plot_type = 'TSNE' if directory == "../plots/" else 'UMAP'

            # replace = {',"title":{"text":"' + plot_type + ' Plot for BERT (Layer ' + str(layer) + ', Head ' + str(head) + ')"},"height":800': '',
            #            'plotly-graph-div': 'plotly-graph-div loading',
            #            'style="height:800px; width:100%;"': 'style="height:calc(200px + 40vw); max-height:750px; width:100%;"',
            #            '"type":"scattergl","customdata"': '"type":"scatter","customdata"',
            #            '"hoverlabel":{"font': '"hoverlabel":{"bgcolor":"black","font'}

            # for r in replace:
            #     contents = contents.replace(r, replace[r])

            with open(directory + filename, 'w') as o:
                o.write(contents)
            os.remove(new_f)
    break
