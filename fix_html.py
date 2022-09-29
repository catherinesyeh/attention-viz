# fix lines in html plot files
import os

directory = "plots"

for filename in os.listdir(directory):
    file = os.path.join(directory, filename)
    # checking if it is a file
    if os.path.isfile(file) and file.endswith("html"):
        print(file)
        ls = file.index("layer") + 5
        le = file.index("_")
        layer = file[ls:le]

        hs = file.index("head") + 4
        he = file.index(".")
        head = file[hs:he]

        replace = {',"title":{"text":"TSNE Plot for BERT (Layer ' + str(layer) + ', Head ' + str(head) + ')"},"height":800': '',
                   'style="height:800px; width:100%;"': 'style="height:calc(200px + 40vw); max-height:750px; width:100%;"'
                   }

        new_f = file[:-4] + "txt"
        os.rename(file, new_f)
        with open(new_f, 'r') as f:
            contents = f.read()
            for r in replace:
                contents = contents.replace(r, replace[r])
            with open('new_plots/' + filename, 'w') as o:
                o.write(contents)
            os.remove(new_f)
