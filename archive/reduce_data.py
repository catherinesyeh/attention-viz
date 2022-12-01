# reduce # of data points in plot
import re

template = "template.html"

with open(template, 'r') as t:
    contents = t.read()

    min_start = 0

    for i in range(2):
        # i = 0 ==> Key; i = 1 ==> Query
        # fix color
        color_start = contents.index('"color":[', min_start) + 9
        color_end = contents.index("]", color_start)
        colors = contents[color_start:color_end]
        # only take first ~5000 vals
        commas = [m.start() for m in re.finditer(r",", colors)]
        comma_ind = commas[5020]
        contents = contents[:color_start+comma_ind] + contents[color_end:]

        # fix x
        x_start = contents.index('"x":[', color_start) + 5
        x_end = contents.index(']', x_start)
        x = contents[x_start:x_end]
        # only take first ~5000 vals
        commas = [m.start() for m in re.finditer(r",", x)]
        comma_ind = commas[5020]
        contents = contents[:x_start+comma_ind] + contents[x_end:]

        # fix y
        y_start = contents.index('"y":[', x_start) + 5
        y_end = contents.index(']', y_start)
        y = contents[y_start:y_end]
        # only take first ~5000 vals
        commas = [m.start() for m in re.finditer(r",", y)]
        comma_ind = commas[5020]
        contents = contents[:y_start+comma_ind] + contents[y_end:]

        # fix customdata
        custom_start = contents.index('"customdata":[', y_start) + 14
        custom_end = contents.index("]]", custom_start)
        custom = contents[custom_start:custom_end]
        # only take first ~5000 vals
        commas = [m.start() for m in re.finditer(r"],", custom)]
        comma_ind = commas[5020]
        contents = contents[:custom_start+comma_ind] + contents[custom_end:]

        min_start = custom_start

    with open("new_template.html", 'w') as o:
        o.write(contents)
