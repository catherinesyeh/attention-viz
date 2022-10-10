# generate position plots
import os
import shutil

directory = "../plots/"
template = "test.html"

with open(template, 'r') as t:
    contents = t.read()

    replace = {',"title":{"text":"TSNE Plot for BERT (Layer 0, Head 0)"},"height":800': '',
               'style="height:800px; width:100%;"': 'style="height:calc(200px + 40vw); max-height:750px; width:100%;"'
               }

    for r in replace:
        contents = contents.replace(r, replace[r])
    og_contents = contents

    # find indices to replace x and y coords
    tx_start = contents.index('"x":[') + 5
    tx_end = contents.index("]", tx_start)

    ty_start = contents.index('"y":[') + 5
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
                x = ""
                y = ""
                for i in range(2):
                    # x-coords
                    fx_start = f_contents.index('"x":[', min_x) + 5
                    fx_end = f_contents.index(']', fx_start)
                    x += f_contents[fx_start:fx_end]
                    min_x = fx_end

                    # y-coords
                    fy_start = f_contents.index('"y":[', min_y) + 5
                    fy_end = f_contents.index(']', fy_start)
                    y += f_contents[fy_start:fy_end]
                    min_y = fy_end

                    if i == 0:
                        x += ","
                        y += ","

                contents = contents[:tx_start] + x + \
                    contents[tx_end:ty_start] + y + contents[ty_end:]
                with open('plots_pos/' + filename, 'w') as o:
                    o.write(contents)
                os.remove(new_f)
                contents = og_contents
       # break
