import axios from "axios";
import { Typing } from "@/utils/typing";

// switch url based on development/production
const dataServerUrl = "http://localhost:8500";
// const dataServerUrl = "http://18.219.70.154:8500";

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

export async function getMatrixData(model: string) {
  return get("getMatrixData/" + model)
}

export async function getTokenData(model: string) {
  return get("getTokenData/" + model);
}

export async function getAttentionByToken(token: Typing.Point, model: string) : Promise<Typing.AttnByToken> {
  return post("getAttentionByToken/" + model, token); 
}