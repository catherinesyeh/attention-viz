# reduce attention files
import os
import re

directory = "../old attention/"
new_dir = "../attention/"

# iterate through all attention files
for filename in os.listdir(directory):
    a_file = os.path.join(directory, filename)
    if os.path.isfile(a_file) and a_file.endswith("js"):
        with open(a_file, "r") as a:
            contents = a.read()

        commas = [m.start() for m in re.finditer(r"],", contents)]
        query_end = commas[5020]
        key_start = commas[30069]
        key_end = commas[30069+5021]
        attention_end = contents.index("]]")
        contents = contents[:query_end] + \
            contents[key_start:key_end] + contents[attention_end:]

        with open(new_dir + filename, "w") as o:
            o.write(contents)

    # break
