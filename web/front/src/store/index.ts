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
  attentionByToken: Typing.AttnByToken;
  highlightedTokenIndices: number[]; 
  // attentionByTokenLock: boolean; 

  modelType: string; // bert or gpt
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
    attentionLoading: false,
    attentionByToken: {layer: 0, head: 0, attns: [], token: {} as Typing.TokenData},
    // attentionByTokenLock: false,
    modelType: 'gpt',
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
    setAttentionByToken(state, attentionByToken) {
      state.attentionByToken = attentionByToken
    },
    // setAttentionByTokenLock(state, attentionByTokenLock) {
    //   state.attentionByTokenLock = attentionByTokenLock;
    // },
    setModelType(state, modelType) {
      state.modelType = modelType
      console.log('setModelType', modelType);
    },
    setProjectionMethod(state, projectionMethod) {
      state.projectionMethod = projectionMethod
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
      dispatch('computeData');
    },
    async computeData({state, commit}) {
      commit("updateRenderState", true);
      // console.log("computing data!");
      const matrixData = (await dataService.getMatrixData(state.modelType)).data;
      commit('setMatrixData', Object.freeze(matrixData));
      // console.log('setMatrixData', Object.freeze(matrixData));

      const tokenData = (await dataService.getTokenData(state.modelType)).tokens;
      commit('setTokenData', Object.freeze(tokenData));
      // console.log('setTokenData', Object.freeze(tokenData));

      commit('updateDoneLoading', true);
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
      commit('updateAttentionLoading', false);
      // commit('setAttentionByTokenLock', false)
    }
  },
  strict: process.env.NODE_ENV !== "production"
});

// define your own `useStore` composition function
export function useStore() {
  return baseUseStore(key)
}