# rename downloaded plot imgs
import os
import sys

directory = "../plot_imgs/"

layer = sys.argv[1]  # layer num

for filename in os.listdir(directory):
    file = os.path.join(directory, filename)
    # checking if it is a file
    if os.path.isfile(file) and "newplot" in file:
        print(file)

        # head num
        if "(" not in file:
            head = 0
        else:
            i = file.index("(") + 1
            j = file.index(")")
            head = file[i:j]

        new_f = directory + "layer" + str(layer) + "_head" + str(head) + ".png"
        os.rename(file, new_f)
