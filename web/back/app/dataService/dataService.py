# -*- coding: utf-8 -*-
import numpy as np
import json
from os.path import dirname, abspath, join
import copy
import io
from PIL import Image
from glob import glob
import json
import time
import base64
import cv2

# set root directory for data
# Alter: abspath('') is called from back/run.py
rootDir = dirname(abspath(''))
# rootDir = "E:\\attention-viz\\web\\"
print(rootDir)

# data unique to each layer/head (e.g., tsne/umap coordinates + norms)


def read_matrix_data(model):
    matrix_data = []
    time_start = time.time()

    for f in sorted(glob(join(rootDir, 'data', model, 'byLayerHead', '*.json'))):
        d = json.load(open(f, 'r'))
        matrix_data.append(d)

    print('{} MatrixData Done! Time elapsed: {} seconds'.format(
        model, time.time()-time_start))
    return matrix_data

# attention info for each layer/head


def read_attention_data(model):
    time_start = time.time()
    attention_data = []

    for f in sorted(glob(join(rootDir, 'data', model, 'attention', '*.json'))):
        d = json.load(open(f, 'r'))
        attention_data.append(d)

    print('{} AttentionData Done! Time elapsed: {} seconds'.format(model,
                                                                   time.time()-time_start))
    return attention_data

# data shared across attention heads (e.g., token value, type, sentence)


def read_token_data(model):
    time_start = time.time()
    d = json.load(open(join(rootDir, 'data', model, 'tokens.json')))
    print('{} TokenData Done! Time elapsed: {} seconds'.format(
        model, time.time()-time_start))
    return d

# aggregate attention info for each head


def read_agg_attn_data(model):
    time_start = time.time()
    d = json.load(open(join(rootDir, 'data', model, 'agg_attn.json')))
    print('{} AggAttnData Done! Time elapsed: {} seconds'.format(
        model, time.time()-time_start))
    return d

# HELPER FUNCTIONS
# helper function for normalizing aggregate attn data


def normalize_attn(data):
    normalized_data = []
    for row in data:
        row_sum = sum(row)
        normalized_row = [0 if r == 0 else round(
            (r / row_sum), 3) for r in row]
        normalized_data.append(normalized_row)
    return normalized_data

# decode image url


def read_image_from_dataurl64(dataurl):
    image_bytes = base64.b64decode(str(dataurl[dataurl.find(",") + 1:]))
    image = np.asarray(Image.open(io.BytesIO(image_bytes)))

    return image

# highlight patch in image


def highlight_a_patch(image, row, col, patch_size, width=3, c=[255, 230, 10]):
    c = copy.copy(c)
    if col < 0:
        return image
    if image.shape[-1] == 4:
        c.append(255)
    image[row * patch_size: (row + 1) * patch_size,
          col * patch_size: col * patch_size + width] = c
    image[row * patch_size: (row + 1) * patch_size, (col + 1)
          * patch_size - width: (col + 1) * patch_size] = c
    image[row * patch_size: row * patch_size + width,
          col * patch_size: (col + 1) * patch_size] = c
    image[(row + 1) * patch_size - width: (row + 1) * patch_size,
          col * patch_size: (col + 1) * patch_size] = c

    return image

# highlight image patches


def highlight_patches(image, patch_size):
    image_copy = image.copy()

    for i in range(0, image.shape[0], patch_size):
        if i == 0:
            continue
        for j in range(0, image.shape[1], patch_size):
            if j == 0:
                continue
            image_copy[i - 1:i + 1, :] = 255
            image_copy[:, j - 1: j + 1] = 255

    return image_copy

# convert image to url


def convert_np_image_to_dataurl64(np_image, compression_scheme="png"):
    if np_image.max() < 1 and np_image.dtype != np.uint8:
        np_image *= 255

    image = Image.fromarray(np_image.astype("uint8"))
    rawBytes = io.BytesIO()
    image.save(rawBytes, "PNG")
    rawBytes.seek(0)  # return to the start of the file
    serialized = base64.b64encode(rawBytes.read())
    dataurl = f'data:image/{compression_scheme};base64,{str(serialized)[2:-1]}'

    return dataurl

# overlay attention info on image


def overlay_image_with_attention(image, attention, patch_size, norm_attention=True, boost=True):
    image_h = image.shape[0]
    image_w = image.shape[1]
    attention = copy.copy(attention)
    if norm_attention:
        attention = np.array(attention)
        attention -= (attention.min() * 0.25)
        attention /= attention.max()
        attention = np.clip(attention, 0, 1)
    else:
        attention = np.array(attention)

    if boost:
        attention = attention ** (1/2)

    attention = attention[1:]

    attention = attention.reshape(image_h // patch_size, image_w // patch_size)

    image = image.astype("float")
    for i in range(0, image_h, patch_size):
        for j in range(0, image_w, patch_size):
            if image.shape[-1] == 4:
                image[i: i + patch_size, j: j+patch_size, :-
                      1] *= attention[i // patch_size, j // patch_size]
            elif image.shape[-1] == 3:
                image[i: i + patch_size, j: j +
                      patch_size] *= attention[i // patch_size, j // patch_size]

    image = image.astype("uint8")

    return image

# append cls token to image viz


def append_cls(image, attention, color=[255, 255, 255, 255], border_width=4, norm_attention=True, boost=True):
    if norm_attention:
        attention = np.array(attention)
        attention -= (attention.min() * 0.25)
        attention /= attention.max()
        attention = np.clip(attention, 0, 1)
    if boost:
        attention = attention ** (1/2)

    pad = np.ones(shape=(50, 224, 4)) * 255
    pad[..., :3] = [255, 255, 255]
    pad = pad.astype("uint8")

    pad = cv2.putText(pad, "<CLS>", (35, 30), cv2.FONT_HERSHEY_DUPLEX, 0.6, [
                      0, 0, 0, 255], 1, cv2.LINE_AA)

    pad[15 - border_width:15, 135:175, :3] = color
    pad[35:35 + border_width, 135:175, :3] = color

    pad[15: 35, 135:135 + border_width, :3] = color
    pad[15: 35, 175 - border_width:175, :3] = color

    pad[15: 35, 135 + border_width:175 - border_width] = [int(255 * attention[0]), int(255 * attention[0]), int(255 * attention[0]),
                                                          255]

    if image.shape[-1] == 3:
        image = np.concatenate([image, (np.ones(
            shape=(image.shape[0], image.shape[1], 1)) * 255).astype("uint8")], axis=-1)

    return np.concatenate([image, pad], axis=0)


def hilo(a, b, c):
    # Adopted from https://stackoverflow.com/questions/40233986/python-is-there-a-function-or-formula-to-find-the-complementary-colour-of-a-rgb
    if c < b:
        b, c = c, b
    if b < a:
        a, b = b, a
    if c < b:
        b, c = c, b
    return a + c


def complement(r, g, b):
    # Adopted from https://stackoverflow.com/questions/40233986/python-is-there-a-function-or-formula-to-find-the-complementary-colour-of-a-rgb
    k = hilo(r, g, b)
    return tuple(k - u for u in (r, g, b))

# draw arrow on image


def draw_arrow_on_image(image, attentions, patch_size, thickness=1, color=[245, 230, 50], enhance_contrast=False):
    image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
    median_rgb = np.median(image.reshape(-1, image.shape[-1]), axis=0)
    complement_color = complement(median_rgb[0], median_rgb[1], median_rgb[2])
    if enhance_contrast:
        color = np.array([int(c) for c in complement_color])
        pic_luminance = 0.2126 * \
            median_rgb[0] + 0.7152 * median_rgb[1] + 0.0722 * median_rgb[2]
        arrow_luminance = 0.2126 * color[0] + \
            0.7152 * color[1] + 0.0722 * color[2]
        if pic_luminance < 140:
            color = color * 235 / arrow_luminance
        else:
            color = color * (100 / arrow_luminance)
        color = np.clip(color, 0, 255).astype("uint8")
        color = color.tolist()

    attentions = copy.copy(attentions)
    attentions = np.array(attentions)

    num_patches = len(attentions)
    num_patches_per_row = int((num_patches - 1) ** (1/2))

    for i in range(num_patches):
        if max(attentions[i]) < 0.05:
            continue
        cur_patch_index = [(i - 1) // num_patches_per_row,
                           (i - 1) % num_patches_per_row]
        argmax_patch_index = np.argmax(attentions[i]) - 1
        argmax_patch_index = [
            argmax_patch_index // num_patches_per_row, argmax_patch_index % num_patches_per_row]

        if (argmax_patch_index == cur_patch_index) and (i != 0):
            radius = int(patch_size * 0.7) // 2
            image = cv2.circle(image,
                               center=(argmax_patch_index[1] * patch_size + patch_size // 2,
                                       argmax_patch_index[0] * patch_size + patch_size // 2),
                               radius=radius,
                               thickness=thickness,
                               color=color,
                               lineType=cv2.LINE_AA)

            image = cv2.arrowedLine(image,
                                    pt1=(argmax_patch_index[1] * patch_size + patch_size // 2 + radius,
                                         argmax_patch_index[0] * patch_size + patch_size // 2),
                                    pt2=(argmax_patch_index[1] * patch_size + patch_size // 2 + radius,
                                         argmax_patch_index[0] * patch_size + patch_size // 2 + 1),
                                    thickness=thickness,
                                    color=color,
                                    line_type=cv2.LINE_AA,
                                    tipLength=7)
        elif i == 0:
            if argmax_patch_index[0] >= 0:
                image = cv2.drawMarker(image,
                                       position=(argmax_patch_index[1] * patch_size + patch_size // 2,
                                                 argmax_patch_index[0] * patch_size + patch_size // 2),
                                       markerType=cv2.MARKER_SQUARE,
                                       markerSize=thickness * 12,
                                       thickness=thickness,
                                       color=color,
                                       line_type=cv2.LINE_AA)
        elif argmax_patch_index[0] == -1:
            image = cv2.drawMarker(image,
                                   position=(cur_patch_index[1] * patch_size + patch_size // 2,
                                             cur_patch_index[0] * patch_size + patch_size // 2),
                                   markerType=cv2.MARKER_SQUARE,
                                   markerSize=thickness * 12,
                                   thickness=thickness,
                                   color=color,
                                   line_type=cv2.LINE_AA)
        else:
            line_length = np.sqrt((cur_patch_index[1] - argmax_patch_index[1]) ** 2 + (
                cur_patch_index[0] - argmax_patch_index[0]) ** 2)

            cos = (cur_patch_index[1] - argmax_patch_index[1]) / line_length
            sin = (cur_patch_index[0] - argmax_patch_index[0]) / line_length

            image = cv2.arrowedLine(image,
                                    pt1=(cur_patch_index[1] * patch_size + patch_size // 2 - int(cos * patch_size // 8),
                                         cur_patch_index[0] * patch_size + patch_size // 2 - int(sin * patch_size // 8)),
                                    pt2=(argmax_patch_index[1] * patch_size + patch_size // 2 + int(cos * patch_size // 8),
                                         argmax_patch_index[0] * patch_size + patch_size // 2 + int(sin * patch_size // 8),),
                                    thickness=thickness,
                                    color=color,
                                    line_type=cv2.LINE_AA,
                                    tipLength=0.25 / line_length)

    return image

# resize image


def resize_image(image, factor=1, interp_method=cv2.INTER_NEAREST):
    image = cv2.resize(image, (0, 0), fx=factor, fy=factor,
                       interpolation=interp_method)
    return image

# draw arrow


def draw_arrow(image, pt1, pt2, color, thickness=1, lineType=cv2.LINE_AA):
    start_point = pt1
    end_point = pt2
    arrow_color = color

    cv2.line(image, start_point, end_point,
             arrow_color, thickness, lineType=lineType)
    return image


def draw_arrow_only(image, attentions, patch_size, thickness=1, color=[245, 230, 50], enhance_contrast=True,
                    resize_factor=1):
    hoffset = list(range(-75, 76, 25))
    voffset = list(range(-75, 76, 25))

    if resize_factor != 1:
        image = resize_image(image, factor=resize_factor)

    median_rgb = np.median(image.reshape(-1, image.shape[-1]), axis=0)
    complement_color = complement(median_rgb[0], median_rgb[1], median_rgb[2])
    if enhance_contrast:
        color = np.array([int(c) for c in complement_color])
        pic_luminance = 0.2126 * \
            median_rgb[0] + 0.7152 * median_rgb[1] + 0.0722 * median_rgb[2]
        arrow_luminance = 0.2126 * color[0] + \
            0.7152 * color[1] + 0.0722 * color[2]
        if pic_luminance < 140:
            color = color * 245 / arrow_luminance
        else:
            color = color * (50 / arrow_luminance)
        color = np.clip(color, 0, 255).astype("uint8")
        color = color.tolist()
    color = color + [255]

    attentions = copy.copy(attentions)
    attentions = np.array(attentions)

    num_patches = len(attentions)
    num_patches_per_row = int((num_patches - 1) ** (1/2))

    for i in range(num_patches):
        offset_offset = 3 - \
            np.sum(np.array(attentions[i]) * thickness >= 3) // 2
        if max(attentions[i]) < 0.05:
            continue
        cur_patch_index = [(i - 1) // num_patches_per_row,
                           (i - 1) % num_patches_per_row]

        for argmax_patch_index in range(0, len(attentions[i])):
            attention_score = attentions[i][argmax_patch_index]
            argmax_patch_index -= 1
            if attention_score * thickness < 3:
                continue
            argmax_patch_index = [
                argmax_patch_index // num_patches_per_row, argmax_patch_index % num_patches_per_row]
            if (argmax_patch_index == cur_patch_index) and (i != 0):
                radius = int(patch_size * 0.7 * attention_score) // 2
                image = cv2.circle(image,
                                   center=(argmax_patch_index[1] * patch_size + patch_size // 2,
                                           argmax_patch_index[0] * patch_size + patch_size // 2),
                                   radius=radius,
                                   thickness=int(
                                       thickness * attention_score) + 1,
                                   color=color[:3] +
                                   [int(color[3] * (attention_score ** (1/4)))],
                                   lineType=cv2.LINE_AA)

                image = cv2.arrowedLine(image,
                                        pt1=(argmax_patch_index[1] * patch_size + patch_size // 2 + radius,
                                             argmax_patch_index[0] * patch_size + patch_size // 2),
                                        pt2=(argmax_patch_index[1] * patch_size + patch_size // 2 + radius,
                                             argmax_patch_index[0] * patch_size + patch_size // 2 + 1),
                                        thickness=int(
                                            thickness * attention_score) + 1,
                                        color=color[:3] +
                                        [int(color[3] * (attention_score ** (1/4)))],
                                        line_type=cv2.LINE_AA,
                                        tipLength=50 * attention_score)
            elif i == 0:
                if argmax_patch_index[0] >= 0:
                    image = cv2.drawMarker(image,
                                           position=(argmax_patch_index[1] * patch_size + patch_size // 2,
                                                     argmax_patch_index[0] * patch_size + patch_size // 2),
                                           markerType=cv2.MARKER_SQUARE,
                                           markerSize=thickness * 10,
                                           thickness=int(
                                               thickness * attention_score) + 1,
                                           color=color[:3] +
                                           [int(color[3] * (attention_score ** (1/4)))],
                                           line_type=cv2.LINE_AA)
            elif argmax_patch_index[0] == -1:
                image = cv2.drawMarker(image,
                                       position=(cur_patch_index[1] * patch_size + patch_size // 2,
                                                 cur_patch_index[0] * patch_size + patch_size // 2),
                                       markerType=cv2.MARKER_SQUARE,
                                       markerSize=int(
                                           thickness * 7 * attention_score),
                                       thickness=int(
                                           thickness * attention_score) + 1,
                                       color=color[:3] +
                                       [int(color[3] * (attention_score ** (1/4)))],
                                       line_type=cv2.LINE_AA)
            else:
                line_length = np.sqrt((cur_patch_index[1] - argmax_patch_index[1]) ** 2 + (
                    cur_patch_index[0] - argmax_patch_index[0]) ** 2)

                cos = (cur_patch_index[1] -
                       argmax_patch_index[1]) / line_length
                sin = (cur_patch_index[0] -
                       argmax_patch_index[0]) / line_length

                image = draw_arrow(image,
                                   pt1=(cur_patch_index[1] * patch_size + patch_size // 2 - int(cos * patch_size // 8)
                                        + hoffset[abs(argmax_patch_index[0] - cur_patch_index[0] + offset_offset) % 7],
                                        cur_patch_index[0] * patch_size +
                                        patch_size // 2 -
                                        int(sin * patch_size // 8)
                                        + voffset[abs(argmax_patch_index[1] - cur_patch_index[1] + offset_offset) % 7]),
                                   pt2=(argmax_patch_index[1] * patch_size + patch_size // 2 + int(cos * patch_size // 8)
                                        + hoffset[abs(argmax_patch_index[0] - cur_patch_index[0] + offset_offset) % 7],
                                        argmax_patch_index[0] * patch_size +
                                        patch_size // 2 +
                                        int(sin * patch_size // 8)
                                        + voffset[abs(argmax_patch_index[1] - cur_patch_index[1] + offset_offset) % 7],),
                                   thickness=int(
                                       thickness * attention_score) + 2,
                                   color=color[:3] +
                                   [int(color[3] * (attention_score ** (1/4)))],
                                   lineType=cv2.LINE_AA
                                   )

    return image

# dataservice object


class DataService(object):
    def __init__(self):
        print('------inited------')
        # reading in data
        # bert
        self.matrix_data_bert = read_matrix_data("bert")
        self.attention_data_bert = read_attention_data("bert")
        self.agg_att_data_bert = read_agg_attn_data("bert")
        self.token_data_bert = read_token_data("bert")

        # gpt
        self.matrix_data_gpt = read_matrix_data("gpt")
        self.attention_data_gpt = read_attention_data("gpt")
        self.agg_att_data_gpt = read_agg_attn_data("gpt")
        self.token_data_gpt = read_token_data("gpt")

        # VIT-32
        self.matrix_data_vit_32 = read_matrix_data("vit_32")
        self.attention_data_vit_32 = read_attention_data("vit_32")
        self.token_data_vit_32 = read_token_data("vit_32")

        # VIT-16
        self.matrix_data_vit_16 = read_matrix_data("vit_16")
        self.attention_data_vit_16 = read_attention_data("vit_16")
        self.token_data_vit_16 = read_token_data("vit_16")

        return None

    def get_matrix_data(self, model):
        if model == "bert":
            return self.matrix_data_bert
        elif model == "vit-16":
            return self.matrix_data_vit_16
        elif model == "vit-32":
            return self.matrix_data_vit_32
        return self.matrix_data_gpt

    def get_token_data(self, model):
        if model == "bert":
            return self.token_data_bert
        elif model == "vit-16":
            return self.token_data_vit_16
        elif model == "vit-32":
            return self.token_data_vit_32
        return self.token_data_gpt

    def get_attention_by_token(self, token, model):
        layer = token['layer']
        head = token['head']
        index = token['index']

        # get info for the clicked on token
        if model == "bert":
            all_token_info = self.token_data_bert['tokens'][index]
            offset = len(self.token_data_bert['tokens']) / 2
        elif model == "vit-32":
            all_token_info = copy.copy(self.token_data_vit_32['tokens'][index])
        elif model == "vit-16":
            all_token_info = copy.copy(self.token_data_vit_16['tokens'][index])
        else:
            all_token_info = self.token_data_gpt['tokens'][index]
            offset = len(self.token_data_gpt['tokens']) / 2

        if model == "vit-32":
            start = index - \
                (all_token_info['position_row'] * 7 +
                 all_token_info['position_col'] + 1)
            end = start + 50
            image = read_image_from_dataurl64(
                self.token_data_vit_32['tokens'][start]['originalImagePath']).copy()
            if self.token_data_vit_32['tokens'][index]['type'] == "key":
                color = [227, 55, 143]
                start -= 50
                end -= 50
            else:
                color = [71, 222, 93]
            highlighted_image = highlight_a_patch(image.copy(), all_token_info['position_row'], all_token_info['position_col'],
                                                  32, width=3, c=color)

            all_token_info['originalImagePath'] = convert_np_image_to_dataurl64(
                highlighted_image)
        elif model == "vit-16":
            start = index - \
                (all_token_info['position_row'] * 14 +
                 all_token_info['position_col'] + 1)
            end = start + 197
            image = read_image_from_dataurl64(
                self.token_data_vit_16['tokens'][start]['originalImagePath']).copy()
            if self.token_data_vit_16['tokens'][index]['type'] == "key":
                color = [227, 55, 143]
                start -= 197
                end -= 197
            else:
                color = [71, 222, 93]
            highlighted_image = highlight_a_patch(image.copy(), all_token_info['position_row'], all_token_info['position_col'],
                                                  16, width=2, c=color)

            all_token_info['originalImagePath'] = convert_np_image_to_dataurl64(
                highlighted_image)
        else:
            # find start/end position for sentence
            start = index - all_token_info['pos_int']
            if all_token_info['type'] == "key":  # pass same attn info for key
                start -= int(offset)
            num_tokens = all_token_info['length']
            end = start + num_tokens

        # now get attn info
        if model == "bert":
            attn_data = self.attention_data_bert
            agg_attns = self.agg_att_data_bert['{}_{}'.format(
                layer, head)][:num_tokens]
        elif model == "vit-32":
            attn_data = self.attention_data_vit_32
        elif model == "vit-16":
            attn_data = self.attention_data_vit_16
        else:
            attn_data = self.attention_data_gpt
            agg_attns = self.agg_att_data_gpt['{}_{}'.format(
                layer, head)][:num_tokens]

        for plot in attn_data:
            if plot['layer'] == layer and plot['head'] == head:
                attns = plot['tokens'][start:end]
                if model == "vit-32" and all_token_info['type'] == "key":
                    attns_vis = plot['tokens'][start + 50:end + 50]
                elif model == "vit-16" and all_token_info['type'] == "key":
                    attns_vis = plot['tokens'][start + 197:end + 197]
                else:
                    attns_vis = plot['tokens'][start:end]
                break

        attn = [t['attention'] for t in attns]
        attns_vis = [t['attention'] for t in attns_vis]
        agg_attn = [] if model not in ["bert", "gpt-2"] else normalize_attn([t['attention'][:num_tokens]
                                                                             for t in agg_attns])
        norms = [] if model != "gpt-2" else [t['value_norm'] for t in attns]
        agg_norms = [] if model != "gpt-2" else [t['value_norm'] for t in agg_attns]

        if model == "vit-32":
            overlaid_image = overlay_image_with_attention(
                image.copy(), attns_vis[index % 50], 32)
            overlaid_image = highlight_patches(overlaid_image, 32)

            if self.token_data_vit_32['tokens'][index]['type'] == "key":
                color = [227, 55, 143]
            else:
                color = [71, 222, 93]

            if index % 50 == 0:
                cls_color = color
            else:
                cls_color = [0, 0, 0]
            overlaid_image = append_cls(
                overlaid_image, attn[index % 50], cls_color, )
            overlaid_image = highlight_a_patch(overlaid_image, all_token_info['position_row'], all_token_info['position_col'],
                                               32, width=3, c=color)
            all_token_info['originalPatchPath'] = convert_np_image_to_dataurl64(
                overlaid_image)

            arrowed_image = highlight_patches(image.copy(), 32)
            arrowed_image = draw_arrow_on_image(
                arrowed_image, attn, 32, thickness=2)

            all_token_info['sentence'] = convert_np_image_to_dataurl64(
                arrowed_image)

            resize_factor = 8
            arrowed_image = draw_arrow_only(np.zeros(shape=image.shape, dtype="uint8"), attn,
                                            32 * resize_factor,
                                            thickness=30,
                                            resize_factor=resize_factor,
                                            enhance_contrast=False,
                                            color=[0, 0, 0])
            arrowed_image = resize_image(
                arrowed_image, factor=2 / resize_factor)
            all_token_info['length'] = convert_np_image_to_dataurl64(
                arrowed_image)

            arrowed_image = highlight_patches(image.copy(), 32)
            all_token_info['value'] = convert_np_image_to_dataurl64(
                arrowed_image)

        elif model == "vit-16":
            overlaid_image = overlay_image_with_attention(
                image.copy(), attns_vis[index % 197], 16)
            overlaid_image = highlight_patches(overlaid_image, 16)
            if self.token_data_vit_16['tokens'][index]['type'] == "key":
                color = [227, 55, 143]
            else:
                color = [71, 222, 93]

            if index % 197 == 0:
                cls_color = color
            else:
                cls_color = [0, 0, 0]
            overlaid_image = append_cls(
                overlaid_image, attn[index % 50], cls_color, )
            overlaid_image = highlight_a_patch(overlaid_image, all_token_info['position_row'], all_token_info['position_col'],
                                               16, width=2, c=color)
            all_token_info['originalPatchPath'] = convert_np_image_to_dataurl64(
                overlaid_image)

            arrowed_image = highlight_patches(image.copy(), 16)
            arrowed_image = draw_arrow_on_image(
                arrowed_image, attn, 16, thickness=1)

            all_token_info['sentence'] = convert_np_image_to_dataurl64(
                arrowed_image)

            resize_factor = 8
            arrowed_image = draw_arrow_only(np.zeros(shape=image.shape, dtype="uint8"), attn,
                                            16 * resize_factor,
                                            thickness=30,
                                            resize_factor=resize_factor,
                                            enhance_contrast=False,
                                            color=[0, 0, 0])
            arrowed_image = resize_image(
                arrowed_image, factor=1 / resize_factor)
            all_token_info['length'] = convert_np_image_to_dataurl64(
                arrowed_image)

            arrowed_image = highlight_patches(image.copy(), 16)
            all_token_info['value'] = convert_np_image_to_dataurl64(
                arrowed_image)

        return {
            'layer': layer,
            'head': head,
            'attns': attn,
            'agg_attns': agg_attn,
            'norms': norms,
            'agg_norms': agg_norms,
            'token': all_token_info,
        }


if __name__ == '__main__':
    print('start dataservice')
    dataService = DataService()
