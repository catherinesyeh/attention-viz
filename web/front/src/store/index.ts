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
  attentionData: Typing.AttentionData[];
  tokenData: Typing.TokenData[];
  renderState: boolean; // true when the canvas is being rendered; false upon finished
  attentionByToken: Typing.AttnByToken;
  attentionByTokenLock: boolean; 
  projectionMethod: keyof Typing.PointCoordinate;
  colorBy: keyof Typing.PointColor;
  highlightedTokenIndices: number[];
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state: {
    matrixData: [],
    attentionData: [],
    tokenData: [],
    renderState: true,
    attentionByToken: {attns: [], token: {} as Typing.TokenData},
    attentionByTokenLock: false,
    projectionMethod: 'tsne',
    colorBy: 'position',
    highlightedTokenIndices: []
  },
  modules: { // each module can contain its own state, mutations, actions, etc.
  },
  getters: {
  },
  mutations: {
    setMatrixData(state, matrixData) {
      state.matrixData = matrixData
    },
    setAttentionData(state, attentionData) {
      state.attentionData = attentionData
    },
    setTokenData(state, tokenData) {
      state.tokenData = tokenData
    },
    updateRenderState(state, renderState) {
      state.renderState = renderState;
      console.log('state: renderState', renderState);
    },
    setAttentionByToken(state, attentionByToken) {
      state.attentionByToken = attentionByToken
    },
    setAttentionByTokenLock(state, attentionByTokenLock) {
      state.attentionByTokenLock = attentionByTokenLock;
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
    }
  },
  actions: { // actions commit mutations
    async init({ state, commit }) {
      const matrixData = (await dataService.getMatrixData()).data;
      commit('setMatrixData', Object.freeze(matrixData));
      // console.log('setMatrixData', Object.freeze(matrixData));

      const tokenData = (await dataService.getTokenData()).tokens;
      commit('setTokenData', Object.freeze(tokenData));
      // console.log('setTokenData', Object.freeze(tokenData));
    },
    async setClickedPoint({state, commit}, pt: Typing.Point) {
      // if (state.attentionByTokenLock) {
      //   console.log('Lock');
      //   return;
      // } 
      // commit('setAttentionByTokenLock', true); 
      console.log('setClickedPoint', pt);
      const attentionByToken = (await dataService.getAttentionByToken(pt));
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