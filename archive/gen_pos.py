# generate position plots
import os
import shutil

directory = "../plots/"
template = "template.html"

with open(template, 'r') as t:
    contents = t.read()

    start_ind = contents.index("</body>")
    contents = contents[:start_ind] + \
        '<script src="graph.js" type="text/javascript"></script>' + \
        contents[start_ind:]

    replace = {',"title":{"text":"TSNE Plot for BERT (Layer 0, Head 0)"},"height":800': '',
               'style="height:800px; width:100%;"': 'style="height:calc(200px + 40vw); max-height:750px; width:100%;"',
               '"type":"scattergl","customdata"': '"type":"scatter","customdata"',
               '"hoverlabel":{"font': '"hoverlabel":{"bgcolor":"black","font'}

    for r in replace:
        contents = contents.replace(r, replace[r])
    og_contents = contents

    # find indices to replace x and y coords
    tx_start = contents.rindex('"x":[') + 5
    tx_end = contents.index("]", tx_start)

    ty_start = contents.rindex('"y":[') + 5
    ty_end = contents.index("]", ty_start)

    for filename in os.listdir(directory):
        file = os.path.join(directory, filename)
        # checking if it is a file
        if os.path.isfile(file) and file.endswith("html"):
            print(file)

            new_f = file[:-4] + "txt"
            shutil.copyfile(file, new_f)  # convert to txt file to read
            with open(new_f, 'r') as f:
                f_contents = f.read()

                # find x and y coords
                min_x = 0
                min_y = 0
                # x = ""
                # y = ""
                for i in range(2):
                    # x-coords
                    fx_start = f_contents.index('"x":[', min_x) + 5
                    fx_end = f_contents.index(']', fx_start)
                    x = f_contents[fx_start:fx_end]
                    min_x = fx_end

                    tx_s = tx_start
                    tx_e = tx_end

                    if i == 1:  # find second round of indices
                        tx_s = contents.index('"x":[') + 5
                        tx_e = contents.index("]", tx_s)

                    # y-coords
                    fy_start = f_contents.index('"y":[', min_y) + 5
                    fy_end = f_contents.index(']', fy_start)
                    y = f_contents[fy_start:fy_end]
                    min_y = fy_end

                    ty_s = ty_start
                    ty_e = ty_end

                    if i == 1:  # find second round of indices
                        ty_s = contents.index('"y":[') + 5
                        ty_e = contents.index("]", ty_s)

                    contents = contents[:tx_s] + x + \
                        contents[tx_e:ty_s] + y + contents[ty_e:]

                    # if i == 0:
                    #     x += ","
                    #     y += ","

                # contents = contents[:tx_start] + x + \
                #     contents[tx_end:ty_start] + y + contents[ty_end:]
                with open('../plots_pos/' + filename, 'w') as o:
                    o.write(contents)
                os.remove(new_f)
                contents = og_contents
        # break
