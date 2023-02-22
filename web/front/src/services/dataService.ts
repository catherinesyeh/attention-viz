import Vue from "vue";
import axios from "axios";
import { Typing } from "@/utils/typing";
// import * as types from "@/utils/types";

// Assume the port of the data Server is 5000, for test only
// const dataServerUrl = "http://vastback.s44.hkustvis.org";
const dataServerUrl = "http://localhost:8500";

// const $http = (Vue as any).http;

function get(field: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = `${dataServerUrl}/` + field;
    axios
      .get(url)
      .then((response: any) => {
        console.log("promose resolve: " + field, response);
        resolve(response.data);
      })
      .catch((errResponse: any) => {
        console.log("promose reject: " + field);
        reject(errResponse);
      });
  });
}

function post(field: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = `${dataServerUrl}/` + field;
    axios
      .post(url, payload)
      .then((response: any) => {
        console.log("promose resolve: " + field, response);
        resolve(response.data);
      })
      .catch((errResponse: any) => {
        console.log("promose reject: " + field);
        reject(errResponse);
      });
  });
}

// export async function getRawData() {
//     return get(`get_raw_data`);
// }

export async function getMatrixData(model: string) {
  // return post(`getMatrixData`, {"model": model});
  return get("getMatrixData/" + model)
}

// export async function getAttentionData() {
//   return get(`getAttentionData`);
// }

export async function getTokenData(model: string) {
  return get("getTokenData/" + model);
}

export async function getAttentionByToken(token: Typing.Point, model: string) : Promise<Typing.AttnByToken> {
  return post("getAttentionByToken/" + model, token); 
}
// export async function getPitfallById(id: string) {
//   return get(`getPitfallById/${id}`);
// }

// export async function saveCurrentVideo(videoinfo: any) {
//   return post("saveCurrentVideo", videoinfo)
// }