import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import * as dataService from "@/services/dataService";

// init default 
import { Typing } from "@/utils/typing";

// Vuex docs: https://vuex.vuejs.org/

const starter_model = "vit-32";

export interface State {
  matrixData: Typing.MatrixData[];
  tokenData: Typing.TokenData[];

  // current layer and head
  layer: number | string;
  head: number | string;

  renderState: boolean; // true when the canvas is being rendered; false upon finished
  attentionLoading: boolean; 
  transitionInProgress: boolean;
  doneLoading: boolean;
  clearSelection: boolean;
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

  modelType: string; // bert or gpt
  projectionMethod: keyof Typing.PointCoordinate; // tsne or umap
  colorBy: keyof Typing.PointColor; // different colorings (e.g., type, position, norm, etc.)

  // adjust plot in single view
  showAll: boolean; // labels
  showAttention: boolean; // attention lines
  sizeByNorm: boolean; // dot size
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state: {
    matrixData: [],
    tokenData: [],
    layer: "",
    head: "",
    doneLoading: false,
    renderState: true,
    showAttn: false,
    resetAttn: false,
    attentionLoading: false,
    transitionInProgress: false,
    clearSelection: false,
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
    modelType: starter_model,
    projectionMethod: 'tsne',
    colorBy: starter_model.includes('vit') ? 'no_outline' : 'query_key',
    highlightedTokenIndices: [],
    mode: 'matrix',
    view: 'none',
    dimension: '2D',
    userTheme: 'light-theme',
    showAll: false,
    showAttention: false,
    sizeByNorm: false,
  },
  modules: { // each module can contain its own state, mutations, actions, etc.
  },
  getters: {
  },
  mutations: {
    setMatrixData(state, matrixData) {
      state.matrixData = matrixData
    },
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
    },
    updateTransitionInProgress(state, inProgress) {
      state.transitionInProgress = inProgress;
    },
    updateRenderState(state, renderState) {
      state.renderState = renderState;
      console.log('state: renderState', renderState);
    }, 
    setClearSelection(state, clearSelection) {
      state.clearSelection = clearSelection;
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
  },
  actions: { // actions commit mutations
    async init({ state, dispatch }) {
      dispatch('computeData');
    },
    async computeData({state, commit}) {
      commit("updateRenderState", true);
      const matrixData = (await dataService.getMatrixData(state.modelType)).data;
      commit('setMatrixData', Object.freeze(matrixData));

      const tokenData = (await dataService.getTokenData(state.modelType)).tokens;
      commit('setTokenData', Object.freeze(tokenData));

      commit('updateDoneLoading', true);
    },
    async switchModel({state, commit, dispatch}, model: string) {
      commit('setModelType', model);
      commit('updateDoneLoading', false);
      dispatch('computeData');
    },
    async setClickedPoint({state, commit}, pt: Typing.Point) {
      console.log('setClickedPoint', pt);
      const attentionByToken = (await dataService.getAttentionByToken(pt, state.modelType));
      console.log('attentionDataByToken', attentionByToken);
      commit('setAttentionByToken', attentionByToken);
    }
  },
  strict: process.env.NODE_ENV !== "production"
});

// define your own `useStore` composition function
export function useStore() {
  return baseUseStore(key)
}