# reduce attention files
import os
import re

directory = "../attention/"
new_dir = "../new_attention/"

# iterate through all attention files
for filename in os.listdir(directory):
    a_file = os.path.join(directory, filename)
    if os.path.isfile(a_file) and a_file.endswith("js"):
        with open(a_file, "r") as a:
            contents = a.read()

        commas = [m.start() for m in re.finditer(r"],", contents)]
        key_end = commas[5020]
        query_start = commas[30070]
        query_end = commas[30070+5020]
        attention_end = contents.index("]]")
        contents = contents[:key_end] + \
            contents[query_start:query_end] + contents[attention_end:]

        with open(new_dir + filename, "w") as o:
            o.write(contents)

    # break
