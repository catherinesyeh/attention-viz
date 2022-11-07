# generate plots from template
import os
import shutil
import re

directory = "../plots/"
# directory = "../umap/"
# coord_dir = "../coords/"
coord_dir = directory
template = "template.html"

with open(template, 'r') as t:
    contents = t.read()

    start_ind = contents.index("</head>")
    contents = contents[:start_ind] + \
        '<link rel="stylesheet" type="text/css" href="graph.css" />' + \
        contents[start_ind:]

    start_ind = contents.index("</body>")
    contents = contents[:start_ind] + \
        '<script src="graph.js" type="text/javascript"></script>' + \
        contents[start_ind:]

    replace = {',"title":{"text":"TSNE Plot for BERT (Layer 0, Head 0)"},"height":800': '',
               'plotly-graph-div': 'plotly-graph-div loading',
               'style="height:800px; width:100%;"': 'style="height:calc(200px + 40vw); max-height:750px; width:100%;"',
               '"type":"scattergl","customdata"': '"type":"scatter","customdata"',
               '"hoverlabel":{"font': '"hoverlabel":{"bgcolor":"black","font'}

    for r in replace:
        contents = contents.replace(r, replace[r])
    og_contents = contents

    # find indices to replace x and y coords
    # tx_start = contents.rindex('"x":[')
    tx_start = contents.rindex('"x":[') + 5
    # tx_end = contents.index("]", tx_start) + 1
    tx_end = contents.index("]", tx_start)

    # ty_start = contents.rindex('"y":[')
    ty_start = contents.rindex('"y":[') + 5
    # ty_end = contents.index("]", ty_start) + 1
    ty_end = contents.index("]", ty_start)

    for filename in os.listdir(coord_dir):
       # for filename in os.listdir(directory):
        #file = os.path.join(directory, filename)
        file = os.path.join(coord_dir, filename)
        # checking if it is a file
        # if os.path.isfile(file) and file.endswith("txt"):
        if os.path.isfile(file) and file.endswith("html"):
            print(file)

            # layer number
            attention_file = "../attention/" + filename[:-4] + "js"
            # attention_file = "../attention/" + filename[:-3] + "js"
            with open(attention_file, "r") as a:
                attention = a.read()

            with open(file, "r") as c:
                coords = c.read()

                # x_start = 5
                # y_start = coords.index('"y":[')
                # x = coords[x_start:y_start - 2]
                # y = coords[y_start + 5:-1]

            # attach attention info
            new_f = file[:-4] + "txt"
            start_ind = contents.index("</body>")
            contents = contents[:start_ind] + \
                '<script>' + attention + '</script>' + \
                contents[start_ind:]

            shutil.copyfile(file, new_f)  # convert to txt file to read
            with open(new_f, 'r') as f:
                f_contents = f.read()
                # coords = f_contents

                # find x and y coords
                min_x = 0
                min_y = 0
                for i in range(2):
                    # x-coords
                    fx_start = coords.index('"x":[', min_x) + 5
                    fx_end = coords.index(']', fx_start)
                    x = coords[fx_start:fx_end]

                    # only take first ~5000 coords
                    # commas = [m.start() for m in re.finditer(r",", x)]
                    # comma_ind = commas[5020]
                    # x = coords[fx_start:fx_start+comma_ind]

                    min_x = fx_end

                    tx_s = tx_start
                    tx_e = tx_end

                    if i == 1:  # find second round of indices
                        tx_s = contents.index('"x":[') + 5
                        tx_e = contents.index("]", tx_s)
                        # tx_s = contents.index('"x":[')
                        # tx_e = contents.index("]", tx_s) + 1

                    # y-coords
                    fy_start = coords.index('"y":[', min_y) + 5
                    fy_end = coords.index(']', fy_start)
                    y = coords[fy_start:fy_end]
                    min_y = fy_end

                    # only take first ~5000 coords
                    # commas = [m.start() for m in re.finditer(r",", y)]
                    # comma_ind = commas[5020]
                    # y = coords[fy_start:fy_start+comma_ind]

                    ty_s = ty_start
                    ty_e = ty_end

                    if i == 1:  # find second round of indices
                        ty_s = contents.index('"y":[') + 5
                        ty_e = contents.index("]", ty_s)
                        # ty_s = contents.index('"y":[')
                        # ty_e = contents.index("]", ty_s) + 1

                    contents = contents[:tx_s] + x + \
                        contents[tx_e:ty_s] + y + contents[ty_e:]

                    # if i == 0:
                    #     x += ","
                    #     y += ","

                # contents = contents[:tx_start] + x + \
                #     contents[tx_end:ty_start] + y + contents[ty_end:]
                with open(directory + filename, 'w') as o:
                    # with open(directory + filename[:-3] + "html", 'w') as o:
                    o.write(contents)
                os.remove(new_f)
                contents = og_contents
        break
