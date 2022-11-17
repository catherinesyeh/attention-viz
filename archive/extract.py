# extract coords from plotly html output
import os
directory = "../extract/"
# directory = "../umap/"
output_dir = "../coords/"
# output_umap = "../coords_umap/"

for filename in os.listdir(directory):
    file = os.path.join(directory, filename)
    if os.path.isfile(file) and file.endswith("html"):
        print(file)

    with open(file, 'r') as f:
        contents = f.read()

        coords = ""

        # find x and y coords
        min_x = 0
        min_y = 0
        for i in range(2):
            # x-coords
            fx_start = contents.index('"x":[', min_x) + 5
            fx_end = contents.index(']', fx_start)
            x = contents[fx_start:fx_end]
            min_x = fx_end

            coords += "var key_x" if i == 0 else "var query_x"
            coords += " = [" + x + "];\n"

            # y-coords
            fy_start = contents.index('"y":[', min_y) + 5
            fy_end = contents.index(']', fy_start)
            y = contents[fy_start:fy_end]
            min_y = fy_end

            coords += "var key_y" if i == 0 else "var query_y"
            coords += " = [" + y + "];\n"

        # save to js file
        # output_dir = output_tsne if "tsne" in filename else output_umap
        output = output_dir + filename[:-4] + "js"

        with open(output, 'w') as o:
            o.write(coords)
    # break
