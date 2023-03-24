import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import * as dataService from "@/services/dataService";
import {computeMatrixProjection} from "@/utils/dataTransform";

import { TypeOfList } from "underscore";

// init default 
import { Typing } from "@/utils/typing";
import { ConsoleSqlOutlined } from '@ant-design/icons-vue';

// Vuex docs: https://vuex.vuejs.org/

export interface State {
  matrixData: Typing.MatrixData[];
  // attentionData: Typing.AttentionData[];
  tokenData: Typing.TokenData[];

  // current layer and head
  layer: number | string;
  head: number | string;

  renderState: boolean; // true when the canvas is being rendered; false upon finished
  attentionLoading: boolean; 
  doneLoading: boolean;
  userTheme: string; // dark or light
  view: string; // none, search, or attention
  mode: string; // single or matrix
  dimension: string; // 2D or 3D

  // attention
  showAttn: boolean;
  resetAttn: boolean;
  attentionByToken: Typing.AttnByToken;
  highlightedTokenIndices: number[]; 
  curAttn: number[][];
  attnIndex: number;
  attnSide: string;
  hideFirst: boolean;
  hideLast: boolean;
  weightByNorm: boolean;
  showAgg: boolean;
  // attentionByTokenLock: boolean; 

  vitDataset: string; // current vit dataset
  vitOptions: string[];
  llmDataset: string; // current bert/gpt dataset
  llmOptions: string[];
  modelType: string; // bert/gpt/vit-16/vit-32
  projectionMethod: keyof Typing.PointCoordinate; // tsne or umap
  colorBy: keyof Typing.PointColor; // different colorings (e.g., type, position, norm, etc.)

  // adjust plot in single view
  showAll: boolean; // labels
  showAttention: boolean; // attention lines
  sizeByNorm: boolean; // dot size
  // disableLabel: boolean;
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state: {
    matrixData: [],
    // attentionData: [],
    tokenData: [],
    layer: "",
    head: "",
    doneLoading: false,
    renderState: true,
    showAttn: false,
    resetAttn: false,
    attentionLoading: false,
    attentionByToken: {
      layer: 0, 
      head: 0, 
      attns: [], 
      agg_attns: [],
      norms: [], 
      agg_norms: [],
      token: {} as Typing.TokenData
    },
    curAttn: [],
    attnIndex: -1,
    attnSide: "",
    hideFirst: false,
    hideLast: false,
    weightByNorm: false,
    showAgg: true,
    // attentionByTokenLock: false,
    vitDataset: 'color_vit',
    vitOptions: [],
    llmDataset: 'math',
    llmOptions: [],
    modelType: 'vit-32',
    projectionMethod: 'tsne',
    colorBy: 'type',
    highlightedTokenIndices: [],
    mode: 'matrix',
    view: 'none',
    dimension: '2D',
    userTheme: 'light-theme',
    showAll: false,
    showAttention: false,
    sizeByNorm: false,
    // disableLabel: false
  },
  modules: { // each module can contain its own state, mutations, actions, etc.
  },
  getters: {
  },
  mutations: {
    setMatrixData(state, matrixData) {
      state.matrixData = matrixData
    },
    // setAttentionData(state, attentionData) {
    //   state.attentionData = attentionData
    // },
    setTokenData(state, tokenData) {
      state.tokenData = tokenData
    },
    setLayer(state, layer) {
      state.layer = layer;
    },
    setHead(state, head) {
      state.head = head;
    },
    updateDoneLoading(state, doneLoading) {
      state.doneLoading = doneLoading;
      console.log('state: doneLoading', doneLoading);
    },
    updateAttentionLoading(state, attentionLoading) {
      state.attentionLoading = attentionLoading;
      console.log('state: attentionLoading', attentionLoading);
    },
    updateRenderState(state, renderState) {
      state.renderState = renderState;
      console.log('state: renderState', renderState);
    }, 
    setShowAttn(state, showAttn) {
      state.showAttn = showAttn;
    },
    setResetAttn(state, resetAttn) {
      state.resetAttn = resetAttn;
    },
    setAttentionByToken(state, attentionByToken) {
      state.attentionByToken = attentionByToken;
    },
    setCurAttn(state, curAttn) {
      state.curAttn = curAttn;
    },
    setAttnIndex(state, attnIndex) {
      state.attnIndex = attnIndex;
    },
    setAttnSide(state, attnSide) {
      state.attnSide = attnSide;
    },
    setHideFirst(state, hideFirst) {
      state.hideFirst = hideFirst;
    },
    setHideLast(state, hideLast) {
      state.hideLast = hideLast;
    },
    setWeightByNorm(state, weightByNorm) {
      state.weightByNorm = weightByNorm;
    },
    setShowAgg(state, showAgg) {
      state.showAgg = showAgg;
    },
    // setAttentionByTokenLock(state, attentionByTokenLock) {
    //   state.attentionByTokenLock = attentionByTokenLock;
    // },
    setVitDataset(state, vitData) {
      if (state.vitDataset != vitData) {
        state.vitDataset = vitData;
        console.log("setVitDataset", vitData);
      }
    },
    setVitOptions(state, vitOptions) {
      state.vitOptions = vitOptions;
      console.log("setVitOptions", vitOptions);
    },
    setLLMDataset(state, llmData) {
      if (state.llmDataset != llmData) {
        state.llmDataset = llmData;
        console.log("setLLMDataset", llmData);
      }
    },
    setLLMOptions(state, llmOptions) {
      state.llmOptions = llmOptions;
      console.log("setllmOptions", llmOptions);
    },
    setModelType(state, modelType) {
      state.modelType = modelType;
      console.log('setModelType', modelType);
    },
    setProjectionMethod(state, projectionMethod) {
      state.projectionMethod = projectionMethod;
      console.log('setProjectionMethod', projectionMethod);
    },
    setColorBy(state, colorBy) {
      state.colorBy = colorBy;
      console.log('setColorBy', colorBy);
    },
    setHighlightedTokenIndices(state, highlightedTokenIndices) {
      state.highlightedTokenIndices = highlightedTokenIndices;
    },
    setView(state, view) {
      state.view = view;
      console.log('setView', view);
    },
    setMode(state, mode) {
      state.mode = mode;
      console.log('setMode', mode);
    },
    setDimension(state, dim) {
      state.dimension = dim;
      console.log('setDimension', dim);
    },
    setUserTheme(state, theme) {
      state.userTheme = theme;
      console.log('setUserTheme', theme);
    },
    setShowAll(state, showAll) {
      state.showAll = showAll;
      console.log('setShowAll', showAll);
    },
    setShowAttention(state, showAttention) {
      state.showAttention = showAttention;
      console.log('setShowAttention', showAttention);
    },
    setSizeByNorm(state, sizeByNorm) {
      state.sizeByNorm = sizeByNorm;
      console.log('setSizeByNorm', sizeByNorm);
    },
    // setDisableLabel(state, disableLabel) {
    //   state.disableLabel = disableLabel;
    //   console.log('setDisableLabel', disableLabel);
    // }
  },
  actions: { // actions commit mutations
    async init({ state, dispatch }) {
      await dispatch('getDataOptions');
      await dispatch('computeData');
    },
    async getDataOptions({state, commit}) {
      // load in dataset options
      const img_datasets: string[] = (await dataService.getDataOptions("image")).data;
      const text_datasets: string[] = (await dataService.getDataOptions("text")).data;

      // reset dataset if original option doesn't exist
      if (!text_datasets.includes(state.llmDataset)) {
          commit("setLLMDataset", text_datasets[0]);
      }

      if (!img_datasets.includes(state.vitDataset)) {
          commit("setVitDataset", img_datasets[0]);
      }

      // read in data
      await dataService.getNewDataset("image", state.vitDataset);
      await dataService.getNewDataset("text", state.llmDataset);

      commit("setLLMOptions", text_datasets.map((x) => ({ value: x, label: x })));
      commit("setVitOptions", img_datasets.map((x) => ({ value: x, label: x })));
  },
    async computeData({state, dispatch, commit}) {
      if (!state.renderState) {
        commit("updateRenderState", true);
      }

      // console.log("computing data!");
      const matrixData = (await dataService.getMatrixData(state.modelType)).data;
      commit('setMatrixData', Object.freeze(matrixData));
      // console.log('setMatrixData', Object.freeze(matrixData));

      const tokenData = (await dataService.getTokenData(state.modelType)).tokens;
      commit('setTokenData', Object.freeze(tokenData));
      // console.log('setTokenData', Object.freeze(tokenData));

      commit('updateDoneLoading', true);
    },
    async changeVitDataset({state, commit, dispatch}, dataset: string) {
      commit('updateDoneLoading', false);
      if (state.modelType == "vit-32" || state.modelType == "vit-16") {
        commit("updateRenderState", true);
      }

      commit('setVitDataset', dataset);
      await dataService.getNewDataset("image", state.vitDataset);
      if (state.modelType == "vit-32" || state.modelType == "vit-16") {
        dispatch('computeData');
      } else {
        commit('updateDoneLoading', true);
      }
    },
    async changeLLMDataset({state, commit, dispatch}, dataset: string) {
      commit('updateDoneLoading', false);
      if (state.modelType == "gpt" || state.modelType == "bert") {
        commit("updateRenderState", true);
      }

      commit('setLLMDataset', dataset);
      await dataService.getNewDataset("text", state.llmDataset);
      if (state.modelType == "gpt" || state.modelType == "bert") {
        dispatch('computeData');
      } else {
        commit('updateDoneLoading', true);
      }
    },
    async switchModel({state, commit, dispatch}, model: string) {
      commit('setModelType', model);
      commit('updateDoneLoading', false);
      dispatch('computeData');
    },
    async setClickedPoint({state, commit}, pt: Typing.Point) {
      // if (state.attentionByTokenLock) {
      //   console.log('Lock');
      //   return;
      // } 
      // commit('setAttentionByTokenLock', true); 
      console.log('setClickedPoint', pt);
      const attentionByToken = (await dataService.getAttentionByToken(pt, state.modelType));
      console.log('attentionDataByToken', attentionByToken);
      commit('setAttentionByToken', attentionByToken);
      // commit('setAttentionByTokenLock', false)
    }
  },
  strict: process.env.NODE_ENV !== "production"
});

// define your own `useStore` composition function
export function useStore() {
  return baseUseStore(key)
}