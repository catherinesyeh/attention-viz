file = "../test.html"
output = "data.txt"

with open(file, 'r') as f:
    contents = f.read()
    # start = contents.index('"color":"#636efa",') + 18
    start = contents.index('"customdata":')
    end = contents.index('},{"hovertemplate"', start)

    opacity = contents[start:end]

    with open(output, 'w') as o:
        o.write(opacity)
