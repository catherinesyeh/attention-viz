# fix plot html files
import os
import shutil
import re

# directory = "../plots/"
directory = "../umap/"

for filename in os.listdir(directory):
    file = os.path.join(directory, filename)
    if os.path.isfile(file) and file.endswith("html"):
        print(file)

        new_f = file[:-4] + "txt"
        shutil.copyfile(file, new_f)  # convert to txt file to read

        with open(new_f, 'r') as t:
            contents = t.read()

            start_ind = contents.index("</head>")
            contents = contents[:start_ind] + \
                '<link rel="stylesheet" type="text/css" href="graph.css" />' + \
                contents[start_ind:]

            start_ind = contents.index("</body>")
            contents = contents[:start_ind] + \
                '<script src="graph.js" type="text/javascript"></script>' + \
                contents[start_ind:]

            ls = filename.index("layer") + 5
            le = filename.index("_")
            layer = filename[ls:le]

            hs = filename.index("head") + 4
            he = filename.index(".")
            head = filename[hs:he]

            plot_type = 'TSNE' if directory == "../plots/" else 'UMAP'

            replace = {',"title":{"text":"' + plot_type + ' Plot for BERT (Layer ' + str(layer) + ', Head ' + str(head) + ')"},"height":800': '',
                       'plotly-graph-div': 'plotly-graph-div loading',
                       'style="height:800px; width:100%;"': 'style="height:calc(200px + 40vw); max-height:750px; width:100%;"',
                       '"type":"scattergl","customdata"': '"type":"scatter","customdata"',
                       '"hoverlabel":{"font': '"hoverlabel":{"bgcolor":"black","font'}

            for r in replace:
                contents = contents.replace(r, replace[r])

            attention_file = "../attention/" + filename[:-4] + "js"
            with open(attention_file, "r") as a:
                attention = a.read()

            # attach attention info
            start_ind = contents.index("</body>")
            contents = contents[:start_ind] + \
                '<script>' + attention + '</script>' + \
                contents[start_ind:]

            with open(directory + filename, 'w') as o:
                o.write(contents)
            os.remove(new_f)
    # break
