import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import * as dataService from "@/services/dataService";
import { TypeOfList } from "underscore";

// init default 
import { Typing } from "@/utils/typing";

// Vuex docs: https://vuex.vuejs.org/

export interface State {
  matrixData: Typing.MatrixData[];
  attentionData: Typing.AttentionData[];
  tokenData: Typing.TokenData[];
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state: {
    matrixData: [],
    attentionData: [],
    tokenData: []
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
    }
  },
  actions: { // actions commit mutations
    async init({ state, commit }) {
      const matrixData = (await dataService.getMatrixData()).data;
      commit('setMatrixData', matrixData);
      console.log('setMatrixData', matrixData);

      const attentionData = (await dataService.getAttentionData()).data;
      commit('setAttentionData', attentionData);
      console.log('setAttentionData', attentionData);

      const tokenData = (await dataService.getTokenData()).tokens;
      commit('setTokenData', tokenData);
      console.log('setTokenData', tokenData);
    }
  },
  strict: process.env.NODE_ENV !== "production"
});

// define your own `useStore` composition function
export function useStore() {
  return baseUseStore(key)
}